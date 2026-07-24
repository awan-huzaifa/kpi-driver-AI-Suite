"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronDown, Phone, Mail, MapPin, Shield, AlertTriangle, CheckCircle, User, Download } from "lucide-react";
import { C } from "@/components/platform/brand";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { ExportModal, type ColDef } from "@/components/ui/export-modal";

/* ── Types ──────────────────────────────────────────────────────── */

interface SkipLog {
  id:               string;
  company_id:       string;
  contact_id:       string | null;
  contact_name:     string | null;
  flow_type:        "apn" | "dnc" | "skiptrace";
  hit:              boolean;
  credits_deducted: number;
  cost_usd:         number;
  persons_count:    number;
  parcel_id:        string | null;
  county:           string | null;
  phone:            string | null;
  is_clean:         boolean | null;
  national_dnc:     boolean | null;
  state_dnc:        boolean | null;
  dma:              boolean | null;
  litigator:        boolean | null;
  phone_type:       string | null;
  address:          string | null;
  city:             string | null;
  state:            string | null;
  zip:              string | null;
  find_owner:       boolean | null;
  lead_source:      string | null;
  payload:          Record<string, unknown>;
  created_at:       string;
}

interface Person {
  first_name:     string;
  last_name:      string;
  full_name:      string;
  dob:            string | null;
  age:            number | string | null;
  deceased:       boolean;
  property_owner: boolean;
  litigator:      boolean;
  mailing_address?: {
    street: string; city: string; state: string; zip: string;
  };
  phones?: { number: string; type: string; dnc: boolean; carrier: string; rank: number }[];
  emails?: { email: string; rank: number }[];
}

interface Props {
  logs:       SkipLog[];
  companies:  { id: string; name: string }[];
  accessRole: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const FLOW_LABELS: Record<string, string> = {
  apn:               "APN",
  dnc:               "DNC",
  skiptrace:         "Normal Skiptrace",
  address_skiptrace: "Address Skiptrace",
};
const FLOW_COLORS: Record<string, string> = {
  apn:               C.blue,
  dnc:               "#8b5cf6",
  skiptrace:         C.green,
  address_skiptrace: "#FCAF17",
};
const FLOW_BG: Record<string, string> = {
  apn:               "rgba(48,125,192,0.12)",
  dnc:               "rgba(139,92,246,0.12)",
  skiptrace:         "rgba(67,183,73,0.12)",
  address_skiptrace: "rgba(252,175,23,0.12)",
};

function getDisplayType(log: SkipLog): string {
  if (log.flow_type === "skiptrace" && log.find_owner) return "address_skiptrace";
  return log.flow_type;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function contextLabel(log: SkipLog) {
  if (log.flow_type === "apn")      return log.parcel_id ?? log.county ?? "—";
  if (log.flow_type === "dnc")      return log.phone ? fmtPhone(log.phone) : "—";
  if (log.address)                  return [log.address, log.city, log.state].filter(Boolean).join(", ");
  return "—";
}

function fmtPhone(p: string) {
  if (p.length === 10) return `(${p.slice(0,3)}) ${p.slice(3,6)}-${p.slice(6)}`;
  return p;
}

/* ── Stat card ──────────────────────────────────────────────────── */

function StatChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 12, padding: "14px 20px",
    }}>
      <p style={{ fontSize: 24, fontWeight: 900, color: color ?? C.white, margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: C.dimText, margin: "4px 0 0", letterSpacing: "0.04em" }}>{label}</p>
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────────── */

function DetailModal({ log, onClose, accessRole }: { log: SkipLog; onClose: () => void; accessRole: string }) {
  const persons     = (log.payload.persons as Person[] | undefined) ?? [];
  const displayType = getDisplayType(log);
  const color       = FLOW_COLORS[displayType];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(9,21,35,0.85)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f1f30",
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: 20,
          width: "100%", maxWidth: 680,
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
              padding: "4px 10px", borderRadius: 99,
              color, background: FLOW_BG[displayType],
              border: `1px solid ${color}40`,
            }}>
              {FLOW_LABELS[displayType]}
            </span>
            {log.flow_type === "dnc" ? (
              log.is_clean
                ? <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>✓ Clean — Safe to Contact</span>
                : <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>⚠ Flagged — Do Not Call</span>
            ) : (
              log.hit
                ? <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>✓ Hit — {log.persons_count} Person{log.persons_count !== 1 ? "s" : ""} Found</span>
                : <span style={{ fontSize: 13, fontWeight: 700, color: C.dimText }}>✗ Miss — No Results</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {accessRole !== "user" && (
              <span style={{ fontSize: 12, color: C.dimText }}>${log.cost_usd.toFixed(4)}</span>
            )}
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.dimText, padding: 4 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Metadata grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}>
            {log.contact_name && (
              <MetaItem label="Contact" value={log.contact_name} />
            )}
            {log.contact_id && (
              <MetaItem label="Contact ID" value={log.contact_id} mono />
            )}
            <MetaItem label="Date" value={fmt(log.created_at)} />
            {log.lead_source && (
              <MetaItem label="Lead Source" value={log.lead_source} />
            )}
            {log.flow_type === "apn" && (
              <>
                {log.parcel_id && <MetaItem label="Parcel ID"  value={log.parcel_id} mono />}
                {log.county    && <MetaItem label="County"     value={`${log.county}, ${log.state ?? ""}`} />}
              </>
            )}
            {log.flow_type === "dnc" && (
              <>
                {log.phone      && <MetaItem label="Phone"      value={fmtPhone(log.phone)} />}
                {log.phone_type && <MetaItem label="Phone Type" value={log.phone_type} />}
              </>
            )}
            {log.flow_type === "skiptrace" && (
              <>
                {log.address && (
                  <MetaItem
                    label="Address"
                    value={[log.address, log.city, log.state, log.zip].filter(Boolean).join(", ")}
                  />
                )}
                <MetaItem label="Lookup Type" value={log.find_owner ? "Owner Lookup" : "Person Lookup"} />
              </>
            )}
          </div>

          {/* DNC flags */}
          {log.flow_type === "dnc" && (
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.dimText, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>
                DNC Flags
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <DncFlag label="National DNC" flagged={log.national_dnc ?? false} />
                <DncFlag label="State DNC"    flagged={log.state_dnc    ?? false} />
                <DncFlag label="DMA"          flagged={log.dma          ?? false} />
                <DncFlag label="Litigator"    flagged={log.litigator    ?? false} />
              </div>
            </section>
          )}

          {/* Persons */}
          {persons.length > 0 && (
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.dimText, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>
                Persons ({persons.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {persons.map((p, i) => (
                  <PersonCard key={i} person={p} />
                ))}
              </div>
            </section>
          )}

          {/* Response body */}
          {log.payload.body && (
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.dimText, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>
                Response Body
              </p>
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10, padding: "14px 16px",
              }}>
                <pre style={{
                  fontSize: 12, color: C.bodyText, margin: 0,
                  whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6,
                  fontFamily: "monospace",
                }}>
                  {String(log.payload.body)}
                </pre>
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", borderRadius: 10,
      padding: "10px 14px", border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: 0, fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value}</p>
    </div>
  );
}

function DncFlag({ label, flagged }: { label: string; flagged: boolean }) {
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 12, fontWeight: 600,
      padding: "5px 12px", borderRadius: 99,
      color:       flagged ? C.red   : C.green,
      background:  flagged ? "rgba(237,31,36,0.1)"  : "rgba(67,183,73,0.1)",
      border: `1px solid ${flagged ? "rgba(237,31,36,0.25)" : "rgba(67,183,73,0.25)"}`,
    }}>
      {flagged ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
      {label}: {flagged ? "Yes" : "No"}
    </span>
  );
}

function PersonCard({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Person header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
          textAlign: "left",
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.blue,
        }}>
          <User size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>{person.full_name}</p>
          <p style={{ fontSize: 11, color: C.dimText, margin: "2px 0 0" }}>
            {person.age && `Age ${person.age}`}
            {person.dob && ` · DOB ${person.dob}`}
            {person.deceased && " · Deceased"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {person.property_owner && (
            <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: "rgba(67,183,73,0.12)", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(67,183,73,0.2)" }}>
              Owner
            </span>
          )}
          {person.litigator && (
            <span style={{ fontSize: 10, fontWeight: 700, color: C.red, background: "rgba(237,31,36,0.1)", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(237,31,36,0.2)" }}>
              Litigator
            </span>
          )}
          <ChevronDown size={13} style={{ color: C.dimText, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s" }} />
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {/* Mailing address */}
          {person.mailing_address && (
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 6px" }}>Mailing Address</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={13} style={{ color: C.dimText, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.bodyText }}>
                  {[person.mailing_address.street, person.mailing_address.city, person.mailing_address.state, person.mailing_address.zip].filter(Boolean).join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Phones */}
          {person.phones && person.phones.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px" }}>
                Phones ({person.phones.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {person.phones.map((ph, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Phone size={13} style={{ color: C.dimText, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: "monospace" }}>{fmtPhone(ph.number)}</span>
                    <span style={{ fontSize: 11, color: C.dimText }}>{ph.type}</span>
                    {ph.dnc && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.red, background: "rgba(237,31,36,0.1)", padding: "1px 7px", borderRadius: 99, border: "1px solid rgba(237,31,36,0.2)" }}>DNC</span>
                    )}
                    <span style={{ fontSize: 11, color: C.dimText, marginLeft: "auto" }}>Rank {ph.rank} · {ph.carrier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emails */}
          {person.emails && person.emails.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px" }}>
                Emails ({person.emails.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {person.emails.map((em, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Mail size={13} style={{ color: C.dimText, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: C.bodyText }}>{em.email}</span>
                    <span style={{ fontSize: 11, color: C.dimText, marginLeft: "auto" }}>Rank {em.rank}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

export default function SkipTracingClient({ logs, companies, accessRole }: Props) {
  const [search,    setSearch]    = useState("");
  const [companyId, setCompanyId] = useState<string>("all");
  const [flowType,  setFlowType]  = useState<"all" | "apn" | "dnc" | "skiptrace" | "address_skiptrace">("all");
  const [result,    setResult]    = useState<"all" | "hit" | "miss">("all");
  const [period,     setPeriod]     = useState<DatePeriod>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [selected,   setSelected]   = useState<SkipLog | null>(null);
  const [page,       setPage]       = useState(1);
  const [exportOpen, setExportOpen] = useState(false);

  const isAdmin = accessRole === "admin" || accessRole === "super_admin";

  const exportDefaultCols: ColDef<SkipLog>[] = [
    { label: "Date",        getValue: r => fmtDate(r.created_at) },
    { label: "Time",        getValue: r => fmtTime(r.created_at) },
    { label: "Flow Type",   getValue: r => FLOW_LABELS[getDisplayType(r)] ?? r.flow_type },
    { label: "Hit",         getValue: r => r.flow_type === "dnc" ? (r.is_clean ? "Clean" : "Flagged") : (r.hit ? "Hit" : "Miss") },
    { label: "Address",     getValue: r => r.address },
    { label: "City",        getValue: r => r.city },
    { label: "State",       getValue: r => r.state },
    { label: "Zip",         getValue: r => r.zip },
    { label: "Parcel ID",   getValue: r => r.parcel_id },
    { label: "County",      getValue: r => r.county },
    { label: "Lead Source", getValue: r => r.lead_source },
    { label: "Cost ($)",    getValue: r => r.cost_usd },
  ];
  const exportExtraCols: ColDef<SkipLog>[] = [
    { label: "Phone",        getValue: r => r.phone },
    { label: "Is Clean",     getValue: r => r.is_clean == null ? null : r.is_clean ? "Yes" : "No" },
    { label: "National DNC", getValue: r => r.national_dnc == null ? null : r.national_dnc ? "Yes" : "No" },
    { label: "State DNC",    getValue: r => r.state_dnc == null ? null : r.state_dnc ? "Yes" : "No" },
    { label: "DMA",          getValue: r => r.dma == null ? null : r.dma ? "Yes" : "No" },
    { label: "Litigator",    getValue: r => r.litigator == null ? null : r.litigator ? "Yes" : "No" },
    { label: "Phone Type",   getValue: r => r.phone_type },
    { label: "Find Owner",   getValue: r => r.find_owner == null ? null : r.find_owner ? "Yes" : "No" },
    { label: "Persons Count",  getValue: r => r.persons_count },
    { label: "Person Names",   getValue: r => ((r.payload.persons as { full_name?: string }[] | undefined) ?? []).map(p => p.full_name).filter(Boolean).join("; ") },
    { label: "Person Phones",  getValue: r => ((r.payload.persons as { phones?: { number: string }[] }[] | undefined) ?? []).flatMap(p => (p.phones ?? []).map(ph => ph.number)).join("; ") },
  ];

  const filtered = useMemo(() => {
    const { from: pFrom, to: pTo } = periodBounds(period, customFrom, customTo);

    return logs.filter((l) => {
      if (companyId !== "all" && l.company_id !== companyId) return false;
      if (flowType !== "all") {
        if (flowType === "address_skiptrace") {
          if (l.flow_type !== "skiptrace" || !l.find_owner) return false;
        } else if (flowType === "skiptrace") {
          if (l.flow_type !== "skiptrace" || l.find_owner) return false;
        } else {
          if (l.flow_type !== flowType) return false;
        }
      }
      if (result === "hit"  && !l.hit)  return false;
      if (result === "miss" &&  l.hit)  return false;
      if (pFrom && new Date(l.created_at) < pFrom) return false;
      if (pTo   && new Date(l.created_at) > pTo)   return false;
      if (search) {
        const q = search.toLowerCase();
        const ctx = contextLabel(l).toLowerCase();
        const cid = (l.contact_id ?? "").toLowerCase();
        if (!ctx.includes(q) && !cid.includes(q)) return false;
      }
      return true;
    });
  }, [logs, companyId, flowType, result, period, customFrom, customTo, search]);

  const PAGE_SIZE  = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalCost = filtered.reduce((s, l) => s + l.cost_usd, 0);

  return (
    <div style={{ padding: "32px 36px" }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 28 }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.white, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Skip Tracing
        </h1>
        <p style={{ fontSize: 13, color: C.dimText, margin: 0 }}>
          Skiptracing, Address Only Skiptracing, APN Lookups & DNC Checks. Click Any Row To View The Full Details.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        style={{ display: "grid", gridTemplateColumns: accessRole !== "user" ? "repeat(2, 1fr)" : "repeat(1, 1fr)", gap: 12, marginBottom: 24 }}
      >
        <StatChip label="TOTAL LOOKUPS" value={filtered.length} />
        {accessRole !== "user" && <StatChip label="COST (BILLED)" value={`$${totalCost.toFixed(2)}`} color={C.blue} />}
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        style={{
          background: "rgba(255,255,255,0.025)",
          border: `1px solid rgba(255,255,255,0.07)`,
          borderRadius: 14, padding: "14px 18px",
          display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.dimText }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Address, Parcel, Phone, Contact..."
            style={{
              width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
              background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 8, fontSize: 13, color: C.white, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Company — super_admin only */}
        {accessRole === "super_admin" && companies.length > 0 && (
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger placeholder="All Companies" className="w-auto min-w-[140px] text-xs py-1.5" />
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Flow type */}
        <FilterPills
          options={[
            { value: "all",               label: "All Types" },
            { value: "apn",               label: "APN" },
            { value: "dnc",               label: "DNC" },
            { value: "skiptrace",         label: "Normal Skiptrace" },
            { value: "address_skiptrace", label: "Address Skiptrace" },
          ]}
          value={flowType}
          onChange={(v) => setFlowType(v as typeof flowType)}
        />

        {/* Result */}
        <FilterPills
          options={[
            { value: "all",  label: "All Results" },
            { value: "hit",  label: "Hit / Clean"  },
            { value: "miss", label: "Miss / Flagged" },
          ]}
          value={result}
          onChange={(v) => setResult(v as typeof result)}
        />

        {/* Period */}
        <DateRangePicker
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          onPeriod={setPeriod}
          onCustomFrom={setCustomFrom}
          onCustomTo={setCustomTo}
          activeColor={C.blue}
        />

        {isAdmin && (
          <button
            onClick={() => setExportOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 13px", borderRadius: 9, cursor: "pointer",
              background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.25)",
              color: "#307DC0", fontSize: 12, fontWeight: 700,
            }}
          >
            <Download size={13} /> Export
          </button>
        )}
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
              {["Date", "Contact", "Type", "Result", "Context", "Lead Source", ...(accessRole !== "user" ? ["Cost"] : [])].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "center", fontSize: 10, fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 24px", textAlign: "center", color: C.dimText, fontSize: 13 }}>
                    No Lookups Found For The Current Filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((log, i) => {
                  const isHit     = log.flow_type === "dnc" ? log.is_clean !== false : log.hit;
                  const resultClr = isHit ? C.green : (log.hit === false ? C.dimText : C.red);
                  const resultLbl = log.flow_type === "dnc"
                    ? (log.is_clean ? "Clean" : "Flagged")
                    : (log.hit ? "Hit" : "Miss");

                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: i * 0.018, duration: 0.22 }}
                      onClick={() => setSelected(log)}
                      style={{ borderBottom: `1px solid rgba(255,255,255,0.04)`, cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap", textAlign: "center" }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.bodyText, margin: 0 }}>{fmtDate(log.created_at)}</p>
                        <p style={{ fontSize: 11, color: C.dimText, margin: "2px 0 0" }}>{fmtTime(log.created_at)}</p>
                      </td>
                      <td style={{ padding: "11px 14px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                        {log.contact_name ? (
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{log.contact_name}</span>
                        ) : log.contact_id ? (
                          <span style={{ fontSize: 12, color: C.dimText, fontFamily: "monospace" }}>{log.contact_id}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#334155" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        {(() => { const dt = getDisplayType(log); return (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
                            color: FLOW_COLORS[dt], background: FLOW_BG[dt],
                            border: `1px solid ${FLOW_COLORS[dt]}40`,
                          }}>
                            {FLOW_LABELS[dt]}
                          </span>
                        ); })()}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: resultClr }}>{resultLbl}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.bodyText, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                        {contextLabel(log)}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        {log.lead_source ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                            color: "#FCAF17", background: "rgba(252,175,23,0.1)",
                            border: "1px solid rgba(252,175,23,0.2)", whiteSpace: "nowrap",
                          }}>
                            {log.lead_source}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#334155" }}>—</span>
                        )}
                      </td>
                      {accessRole !== "user" && (
                        <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 700, color: "#FCAF17", textAlign: "center" }}>
                          ${log.cost_usd.toFixed(4)}
                        </td>
                      )}
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>View →</span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>
            {filtered.length === 0 ? "0 results" : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          {filtered.length > PAGE_SIZE && (
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} style={{
                  minWidth: 30, height: 30, borderRadius: 8, border: "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: p === safePage ? "#307DC0" : "rgba(255,255,255,0.04)",
                  color: p === safePage ? "#fff" : "#475569",
                  transition: "background 0.15s",
                }}>{p}</button>
              ))}
            </div>
          )}
          {filtered.length > PAGE_SIZE && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{
                padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12, fontWeight: 600, background: "transparent",
                cursor: safePage === 1 ? "default" : "pointer",
                color: safePage === 1 ? "#334155" : "#94a3b8", opacity: safePage === 1 ? 0.4 : 1,
              }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{
                padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12, fontWeight: 600, background: "transparent",
                cursor: safePage === totalPages ? "default" : "pointer",
                color: safePage === totalPages ? "#334155" : "#94a3b8", opacity: safePage === totalPages ? 0.4 : 1,
              }}>Next →</button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && <DetailModal log={selected} onClose={() => setSelected(null)} accessRole={accessRole} />}
      </AnimatePresence>

      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          data={logs as unknown as Record<string, unknown>[]}
          defaultCols={exportDefaultCols as unknown as ColDef<Record<string, unknown>>[]}
          extraCols={exportExtraCols as unknown as ColDef<Record<string, unknown>>[]}
          filenamePrefix="skip-tracing"
        />
      )}
    </div>
  );
}

/* ── Filter pills ───────────────────────────────────────────────── */

function FilterPills({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value:   string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
            border: "1px solid",
            borderColor: value === o.value ? "rgba(48,125,192,0.4)" : "rgba(255,255,255,0.08)",
            background:  value === o.value ? "rgba(48,125,192,0.12)" : "transparent",
            color:       value === o.value ? C.white : C.dimText,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
