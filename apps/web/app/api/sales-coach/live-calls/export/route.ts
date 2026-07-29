import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function escCSV(v: string | number | null | undefined): string {
  if (v == null || v === "") return "";
  return `"${String(v).replace(/"/g, '""')}"`;
}

type Evaluation = {
  score_band?: string | null;
  call_type?: string | null;
  opportunity_level?: string | null;
  confidence?: number | null;
  score_reasoning?: string | null;
  strengths?: string[];
  missed_opportunities?: string[];
  coaching_actions?: { type: string; action: string }[];
  penalties?: { type: string; points: number; reason: string }[];
  meta?: { lead_source?: string | null };
};

type Row = {
  id: string;
  created_at: string;
  contact_name: string | null;
  contact_phone: string | null;
  agent_phone: string;
  direction: string;
  duration_sec: number;
  call_stage: string | null;
  scorable: boolean;
  score: number | null;
  call_result: string | null;
  transcript: string | null;
  crm_link: string | null;
  evaluation: Evaluation | null;
  agent: { full_name: string | null; agent_type: string } | null;
};

function toTitle(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

const COL_MAP: Record<string, (r: Row) => string | number | null | undefined> = {
  "Date":                   r => new Date(r.created_at).toLocaleDateString(),
  "Time":                   r => new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  "Contact":                r => r.contact_name,
  "Phone":                  r => r.contact_phone,
  "Agent":                  r => r.agent?.full_name ?? null,
  "Agent Phone":            r => r.agent_phone,
  "Agent Type":             r => r.agent?.agent_type?.toUpperCase() ?? null,
  "Direction":              r => toTitle(r.direction),
  "Duration":               r => `${Math.floor(r.duration_sec / 60)}:${String(r.duration_sec % 60).padStart(2, "0")}`,
  "Score":                  r => r.score,
  "Scorable":               r => r.scorable ? "Yes" : "No",
  "Result":                 r => toTitle(r.call_result),
  "Stage":                  r => toTitle(r.call_stage),
  "Lead Source":            r => toTitle(r.evaluation?.meta?.lead_source),
  "CRM Link":               r => r.crm_link,
  "Score Band":             r => toTitle(r.evaluation?.score_band),
  "Call Type":              r => toTitle(r.evaluation?.call_type),
  "Opportunity Level":      r => toTitle(r.evaluation?.opportunity_level),
  "Confidence":             r => r.evaluation?.confidence != null ? `${Math.round(r.evaluation.confidence * 100)}%` : null,
  "Score Reasoning":        r => r.evaluation?.score_reasoning ?? null,
  "Strengths":              r => r.evaluation?.strengths?.join("; ") ?? null,
  "Missed Opportunities":   r => r.evaluation?.missed_opportunities?.join("; ") ?? null,
  "Coaching Actions":       r => r.evaluation?.coaching_actions?.map(a => `[${toTitle(a.type)}] ${a.action}`).join(" | ") ?? null,
  "Penalties":              r => r.evaluation?.penalties?.map(p => `${toTitle(p.type)} -${p.points}pts: ${p.reason}`).join(" | ") ?? null,
  "Transcript":             r => r.transcript,
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return new NextResponse("Unauthorized", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const cols      = (sp.get("cols") ?? "").split(",").filter(Boolean);
  const from      = sp.get("from");
  const to        = sp.get("to");
  const direction = sp.get("direction") ?? "all";
  const duration  = sp.get("duration")  ?? "all";
  const role      = sp.get("role")      ?? "all";
  const scorable  = sp.get("scorable")  ?? "all";
  const leadSrc   = sp.get("leadSource") ?? "all";
  const agentIds  = (sp.get("agentIds") ?? "").split(",").filter(Boolean);
  const companyId = sp.get("companyId") ?? "all";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("live_calls")
    .select("*, agent:users(full_name, agent_type, access_role)")
    .order("created_at", { ascending: false });

  // Access scoping — mirrors middleware + page.tsx logic
  if (profile.access_role === "super_admin") {
    if (companyId !== "all") query = query.eq("company_id", companyId);
  } else if (profile.access_role === "admin" && profile.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else {
    // user role: own calls only
    query = query.eq("user_id", profile.id);
  }

  // Date range
  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }

  // Pushable filters
  if (direction !== "all")  query = query.eq("direction", direction);
  if (duration  !== "all")  query = query.gte("duration_sec", Number(duration) * 60);
  if (scorable  === "scorable") query = query.eq("scorable", true);
  if (agentIds.length > 0)  query = query.in("user_id", agentIds);

  const { data: rows, error } = await query;
  if (error) return new NextResponse("Query failed", { status: 500 });

  // Filters that can't be pushed to DB (JSONB field + agent join)
  let filtered = (rows ?? []) as Row[];
  if (role !== "all")   filtered = filtered.filter(r => (r.agent?.agent_type ?? "none") === role);
  if (leadSrc !== "all") filtered = filtered.filter(r => (r.evaluation?.meta?.lead_source ?? null) === leadSrc);

  // Build CSV
  const selectedCols = cols.length > 0 ? cols.filter(c => COL_MAP[c]) : Object.keys(COL_MAP);
  const header = selectedCols.map(c => escCSV(c)).join(",");
  const lines  = filtered.map(r => selectedCols.map(c => escCSV(COL_MAP[c](r))).join(","));
  const csv    = "﻿" + [header, ...lines].join("\n");

  const filename = `live-calls-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
