import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function escCSV(v: string | number | null | undefined): string {
  if (v == null || v === "") return "";
  return `"${String(v).replace(/"/g, '""')}"`;
}

function toTitle(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

type Row = {
  id: string;
  created_at: string;
  agent_name: string | null;
  call_direction: string | null;
  contact_phone: string | null;
  agent_phone: string | null;
  lead_source: string | null;
  cost_usd: number | null;
  ai_summary: string | null;
  normal_summary: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
};

const COL_MAP: Record<string, (r: Row) => string | number | null | undefined> = {
  "Date":           r => new Date(r.created_at).toLocaleDateString(),
  "Time":           r => new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  "Agent":          r => r.agent_name,
  "Direction":      r => toTitle(r.call_direction),
  "Contact Phone":  r => r.contact_phone,
  "Agent Phone":    r => r.agent_phone,
  "Lead Source":    r => toTitle(r.lead_source),
  "Cost ($)":       r => r.cost_usd,
  "AI Summary":     r => r.ai_summary,
  "Normal Summary": r => r.normal_summary,
  "Input Tokens":   r => r.input_tokens,
  "Output Tokens":  r => r.output_tokens,
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
  const cols        = (sp.get("cols") ?? "").split(",").filter(Boolean);
  const from        = sp.get("from");
  const to          = sp.get("to");
  const direction   = sp.get("direction")   ?? "all";
  const agentFilter = sp.get("agentFilter") ?? "all";
  const leadSource  = sp.get("leadSource")  ?? "all";
  const companyId   = sp.get("companyId")   ?? "all";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("note_taker_calls")
    .select("*")
    .order("created_at", { ascending: false });

  if (profile.access_role === "super_admin") {
    if (companyId !== "all") query = query.eq("company_id", companyId);
  } else if (profile.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }
  if (direction !== "all") query = query.eq("call_direction", direction);

  const { data: rows, error } = await query;
  if (error) return new NextResponse("Query failed", { status: 500 });

  let filtered = (rows ?? []) as Row[];
  if (agentFilter !== "all") filtered = filtered.filter(r => r.agent_name === agentFilter);
  if (leadSource  !== "all") filtered = filtered.filter(r => r.lead_source === leadSource);

  const selectedCols = cols.length > 0 ? cols.filter(c => COL_MAP[c]) : Object.keys(COL_MAP);
  const header = selectedCols.map(c => escCSV(c)).join(",");
  const lines  = filtered.map(r => selectedCols.map(c => escCSV(COL_MAP[c](r))).join(","));
  const csv    = "﻿" + [header, ...lines].join("\n");

  const filename = `note-taker-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
