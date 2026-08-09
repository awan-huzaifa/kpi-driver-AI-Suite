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

function fmtKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

type EnrichmentField = { key: string; value: unknown };

type Row = {
  id: string;
  created_at: string;
  contact_name: string | null;
  contact_phone: string | null;
  external_id: string | null;
  lead_source: string | null;
  cost_usd: number | null;
  fields: EnrichmentField[];
};

const BASE_COL_MAP: Record<string, (r: Row) => string | number | null | undefined> = {
  "Date":          r => new Date(r.created_at).toLocaleDateString(),
  "Time":          r => new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  "Contact Name":  r => r.contact_name,
  "Contact Phone": r => r.contact_phone,
  "External ID":   r => r.external_id,
  "Lead Source":   r => toTitle(r.lead_source),
  "Fields Count":  r => r.fields.length,
  "Cost ($)":      r => r.cost_usd,
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
  const companyId = sp.get("companyId") ?? "all";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("data_enrichment_logs")
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

  const { data: rows, error } = await query;
  if (error) return new NextResponse("Query failed", { status: 500 });

  const filtered = (rows ?? []) as Row[];

  // Build dynamic field key → label map from all rows
  const allFieldKeys = Array.from(
    new Set(filtered.flatMap(r => r.fields.map(f => f.key)))
  ).sort();

  // Determine selected columns — base cols + any requested dynamic field cols
  const baseColLabels = Object.keys(BASE_COL_MAP);
  let selectedCols: string[];
  if (cols.length > 0) {
    selectedCols = cols.filter(c => BASE_COL_MAP[c] || allFieldKeys.some(k => fmtKey(k) === c));
  } else {
    selectedCols = [...baseColLabels, ...allFieldKeys.map(fmtKey)];
  }

  const header = selectedCols.map(c => escCSV(c)).join(",");
  const lines = filtered.map(r => {
    return selectedCols.map(colLabel => {
      if (BASE_COL_MAP[colLabel]) return escCSV(BASE_COL_MAP[colLabel](r));
      // Dynamic field column: reverse fmtKey lookup
      const key = allFieldKeys.find(k => fmtKey(k) === colLabel);
      if (!key) return escCSV(null);
      const field = r.fields.find(f => f.key === key);
      return escCSV(field ? fmtValue(field.value) : null);
    }).join(",");
  });

  const csv = "﻿" + [header, ...lines].join("\n");

  const dateTag = from && to ? `${from}_to_${to}` : from ? `from-${from}` : to ? `to-${to}` : "all";
  const filename = `Data-Enrichment-${dateTag}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
