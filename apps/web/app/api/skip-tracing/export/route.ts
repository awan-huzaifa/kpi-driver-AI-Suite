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

const FLOW_LABELS: Record<string, string> = {
  apn:               "APN",
  dnc:               "DNC",
  skiptrace:         "Normal Skiptrace",
  address_skiptrace: "Address Skiptrace",
};

type Person = { full_name?: string; phones?: { number: string }[]; emails?: { email: string }[] };

type Row = {
  id: string;
  created_at: string;
  flow_type: "apn" | "dnc" | "skiptrace";
  hit: boolean;
  is_clean: boolean | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  parcel_id: string | null;
  county: string | null;
  lead_source: string | null;
  cost_usd: number;
  phone: string | null;
  phone_type: string | null;
  national_dnc: boolean | null;
  state_dnc: boolean | null;
  dma: boolean | null;
  litigator: boolean | null;
  find_owner: boolean | null;
  persons_count: number | null;
  payload: Record<string, unknown>;
};

function getDisplayType(r: Row): string {
  return r.flow_type === "skiptrace" && r.find_owner ? "address_skiptrace" : r.flow_type;
}

const COL_MAP: Record<string, (r: Row) => string | number | null | undefined> = {
  "Date":           r => new Date(r.created_at).toLocaleDateString(),
  "Time":           r => new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  "Flow Type":      r => FLOW_LABELS[getDisplayType(r)] ?? toTitle(r.flow_type),
  "Hit":            r => r.flow_type === "dnc" ? (r.is_clean ? "Clean" : "Flagged") : (r.hit ? "Hit" : "Miss"),
  "Address":        r => r.address,
  "City":           r => r.city,
  "State":          r => r.state,
  "Zip":            r => r.zip,
  "Parcel ID":      r => r.parcel_id,
  "County":         r => r.county,
  "Lead Source":    r => toTitle(r.lead_source),
  "Cost ($)":       r => r.cost_usd,
  "Phone":          r => r.phone,
  "Is Clean":       r => r.is_clean == null ? null : r.is_clean ? "Yes" : "No",
  "National DNC":   r => r.national_dnc == null ? null : r.national_dnc ? "Yes" : "No",
  "State DNC":      r => r.state_dnc == null ? null : r.state_dnc ? "Yes" : "No",
  "DMA":            r => r.dma == null ? null : r.dma ? "Yes" : "No",
  "Litigator":      r => r.litigator == null ? null : r.litigator ? "Yes" : "No",
  "Phone Type":     r => toTitle(r.phone_type),
  "Find Owner":     r => r.find_owner == null ? null : r.find_owner ? "Yes" : "No",
  "Persons Count":  r => r.persons_count,
  "Person Names":   r => ((r.payload.persons as Person[] | undefined) ?? []).map(p => p.full_name).filter(Boolean).join("; "),
  "Person Phones":  r => ((r.payload.persons as Person[] | undefined) ?? []).flatMap(p => (p.phones ?? []).map(ph => ph.number)).join("; "),
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
  const flowType  = sp.get("flowType") ?? "all";
  const result    = sp.get("result")   ?? "all";
  const companyId = sp.get("companyId") ?? "all";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("skip_tracing_logs")
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
  // result filter pushable
  if (result === "hit")  query = query.eq("hit", true);
  if (result === "miss") query = query.eq("hit", false);

  const { data: rows, error } = await query;
  if (error) return new NextResponse("Query failed", { status: 500 });

  // flowType filter — address_skiptrace is a compound condition
  let filtered = (rows ?? []) as Row[];
  if (flowType !== "all") {
    if (flowType === "address_skiptrace") {
      filtered = filtered.filter(r => r.flow_type === "skiptrace" && r.find_owner);
    } else if (flowType === "skiptrace") {
      filtered = filtered.filter(r => r.flow_type === "skiptrace" && !r.find_owner);
    } else {
      filtered = filtered.filter(r => r.flow_type === flowType);
    }
  }

  const selectedCols = cols.length > 0 ? cols.filter(c => COL_MAP[c]) : Object.keys(COL_MAP);
  const header = selectedCols.map(c => escCSV(c)).join(",");
  const lines  = filtered.map(r => selectedCols.map(c => escCSV(COL_MAP[c](r))).join(","));
  const csv    = "﻿" + [header, ...lines].join("\n");

  const dateTag = from && to ? `${from}_to_${to}` : from ? `from-${from}` : to ? `to-${to}` : "all";
  const filename = `Skip-Tracing-${dateTag}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
