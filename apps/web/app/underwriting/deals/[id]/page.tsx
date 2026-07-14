import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { DownloadPDFButton } from "@/components/underwriting/download-pdf-button";
import { RerunDealModal } from "@/components/underwriting/rerun-deal-modal";
import type { ConditionGrade, RepairMode } from "@/lib/underwriting/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ── Badges ────────────────────────────────────────────────────────────────────

function RecommendationBadge({ value }: { value: string }) {
  const map: Record<string, { style: string; icon: React.ReactNode }> = {
    pursue:    { style: "bg-uw-success/10 text-uw-success border-uw-success/20", icon: <CheckCircle2 size={12} /> },
    negotiate: { style: "bg-uw-warn/10 text-uw-warn border-uw-warn/20",      icon: <AlertCircle size={12} /> },
    pass:      { style: "bg-uw-danger/10 text-uw-danger border-uw-danger/20",            icon: <XCircle size={12} /> },
  };
  const { style, icon } = map[value] ?? map.negotiate;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${style}`}>
      {icon}{value}
    </span>
  );
}

function ConditionBadge({ grade }: { grade: string }) {
  const map: Record<string, string> = {
    excellent: "bg-uw-success/10 text-uw-success border-uw-success/20",
    good:      "bg-brand/10 text-brand border-brand/20",
    fair:      "bg-uw-warn/10 text-uw-warn border-uw-warn/20",
    poor:      "bg-uw-danger/10 text-uw-danger border-uw-danger/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${map[grade] ?? map.fair}`}>
      {grade}
    </span>
  );
}

function CategoryBadge({ cat }: { cat: string | null }) {
  if (!cat) return <span className="text-muted text-[11px]">—</span>;
  const map: Record<string, string> = {
    arv:     "bg-brand/10 text-brand border-brand/20",
    turnkey: "bg-uw-success/10 text-uw-success border-uw-success/20",
    as_is:   "bg-uw-warn/10 text-uw-warn border-uw-warn/20",
  };
  const labels: Record<string, string> = {
    arv: "ARV", turnkey: "Turnkey", as_is: "As-Is",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${map[cat] ?? ""}`}>
      {labels[cat] ?? cat}
    </span>
  );
}

function flagStyle(flag: string) {
  const f = flag.toLowerCase();
  if (/verify|confirm|check/.test(f))
    return "bg-uw-warn/10 text-uw-warn border-uw-warn/20";
  if (/no |missing|unknown|risk|conflict/.test(f))
    return "bg-uw-danger/10 text-uw-danger border-uw-danger/20";
  return "bg-brand/10 text-brand border-brand/20";
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  if (highlight) {
    return (
      <div className="rounded-xl p-5 border border-brand/40 relative overflow-hidden transition-all duration-200 hover:border-brand/65 hover:shadow-lg hover:shadow-brand/10" style={{ background: 'linear-gradient(135deg, rgba(48,125,192,0.12) 0%, rgba(48,125,192,0.04) 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #307DC0, transparent)' }} />
        <p className="text-brand text-[11px] font-bold uppercase tracking-wider mb-2">{label}</p>
        <p className="text-[26px] font-extrabold text-white leading-tight tracking-tight">{value}</p>
        {sub && <p className="text-muted text-[11px] mt-2 leading-relaxed">{sub}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-xl p-5 border border-edge bg-card transition-all duration-200 hover:border-brand/25 hover:bg-brand/[0.03]">
      <p className="text-muted text-[11px] font-bold uppercase tracking-wider mb-2">{label}</p>
      <p className="text-[26px] font-extrabold text-white leading-tight tracking-tight">{value}</p>
      {sub && <p className="text-muted text-[11px] mt-2 leading-relaxed">{sub}</p>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-[3px] h-3.5 rounded-full bg-brand shrink-0" />
      <p className="text-muted text-[11px] font-bold uppercase tracking-wider m-0">{children}</p>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-edge rounded-xl p-5 transition-all duration-200 hover:border-brand/25 ${className}`}>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: deal }, { data: report }] = await Promise.all([
    supabase.from("deals").select("*").eq("id", id).single(),
    supabase.from("underwriting_reports").select("*").eq("deal_id", id).single(),
  ]);

  if (!deal) notFound();

  const ai        = report?.ai_assessment as any ?? {};
  const condition = ai.conditionAssessment ?? {};
  const calc      = report?.calculations  as any ?? {};
  const repairs   = calc.repairCosts      ?? {};
  const prop      = report?.property_data as any ?? {};
  const comps: any[]  = report?.comps  ?? [];
  const flags: string[] = report?.flags ?? [];

  const investorProfitPctVal = calc.maxOfferResult?.investorProfitPct
    ?? (report?.investor_profit && report?.net_sales_price ? report.investor_profit / report.net_sales_price : 0.15);

  const initialRepairMode: RepairMode =
    repairs.sqft === 0 && repairs.baseLow > 0 ? "known_cost" :
    repairs.sqft === 0 ? "scope_known" : "standard";
  const initialKnownRepairCost = initialRepairMode === "known_cost" ? (repairs.low ?? 0) : 0;
  const initialCustomPerSqft =
    initialRepairMode === "standard" &&
    repairs.per_sqft_low != null && repairs.per_sqft_low > 0 &&
    repairs.per_sqft_low === repairs.per_sqft_high
      ? repairs.per_sqft_low : 0;
  const DEFAULT_ITEM_LABELS = new Set([
    "Entire Roof Replacement", "HVAC Replacement",
    "Entire Plumbing Replacement", "Entire Electrical Replacement",
    "Light Foundation", "Heavy Foundation",
    "Septic Tank Replacement", "Well Replacement",
  ]);
  const initialCustomItems: { label: string; cost: number }[] =
    (repairs.checkedExtraItems ?? []).filter((i: { label: string; cost: number }) => !DEFAULT_ITEM_LABELS.has(i.label));

  return (
    <div className="space-y-5 max-w-6xl mx-auto w-full">

      {/* ── Header ── */}
      <div>
        <Link href="/underwriting/deals" className="inline-flex items-center gap-1.5 text-muted hover:text-white text-[13px] transition-colors mb-4 print:hidden">
          <ArrowLeft size={14} />
          Back to Deals
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold text-xl leading-snug">{deal.address}</h2>
            <p className="text-muted text-sm mt-1">{fmtDate(deal.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {report?.condition && <ConditionBadge grade={report.condition} />}
            {deal.recommendation && <RecommendationBadge value={deal.recommendation} />}
            {report?.confidence && (
              <span className="text-muted text-[12px] font-medium border border-edge px-2.5 py-1 rounded-lg">
                {report.confidence}/10 confidence
              </span>
            )}
            {report && (
              <RerunDealModal
                dealId={id}
                address={deal.address}
                initialCondition={(report.condition as ConditionGrade) ?? "fair"}
                initialMultiplier={repairs.marketMultiplier ?? 1.0}
                initialCheckedItems={repairs.checkedExtraItems ?? []}
                initialInvestorProfitPct={investorProfitPctVal}
                initialAssignmentFee={calc.maxOfferResult?.assignmentFee ?? 22_500}
                initialNotes={prop.notes ?? ""}
                existingComps={comps}
                initialRepairMode={initialRepairMode}
                initialKnownRepairCost={initialKnownRepairCost}
                initialCustomPerSqft={initialCustomPerSqft}
                initialCustomItems={initialCustomItems}
              />
            )}
            <DownloadPDFButton dealId={id} />
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="ARV Range"
            value={`${fmt(report.arv_low)} – ${fmt(report.arv_high)}`}
            sub={`Avg ${fmt(report.avg_price_per_sqft)}/sqft`}
          />
          <MetricCard
            label="Max Offer"
            value={`${fmt(report.max_offer_low)} – ${fmt(report.max_offer_high)}`}
            highlight
          />
          <MetricCard
            label="Repair Costs"
            value={`${fmt(report.repair_cost_low)} – ${fmt(report.repair_cost_high)}`}
          />
          <MetricCard
            label="Net Sales Price"
            value={fmt(report.net_sales_price)}
            sub={`Profit: ${fmt(report.investor_profit)} (${Math.round(investorProfitPctVal * 100)}%) · Assign: ${fmt(calc.maxOfferResult?.assignmentFee ?? 22_500)}`}
          />
        </div>
      )}

      {/* ── Executive Summary ── */}
      {ai.executiveSummary && (
        <Card>
          <SectionLabel>Executive Summary</SectionLabel>
          <p className="text-white text-[13px] leading-relaxed">{ai.executiveSummary}</p>
        </Card>
      )}

      {/* ── 2-col: Property · Repair ── */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Property */}
          <Card>
            <SectionLabel>Property</SectionLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-muted text-[11px]">Beds</p>
                <p className="text-white text-[13px] font-medium mt-0.5">{report.beds}</p>
                {report.beds === 0 && (
                  <div className="flex items-start gap-1 mt-1">
                    <AlertTriangle size={11} className="text-uw-warn shrink-0 mt-0.5" />
                    <p className="text-uw-warn text-[10px] leading-relaxed">Verify on site</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted text-[11px]">Baths</p>
                <p className="text-white text-[13px] font-medium mt-0.5">{report.baths}</p>
              </div>
              <div>
                <p className="text-muted text-[11px]">Sqft</p>
                <p className="text-white text-[13px] font-medium mt-0.5">{Number(report.sqft).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted text-[11px]">Year Built</p>
                <p className="text-white text-[13px] font-medium mt-0.5">{report.year_built ?? "—"}</p>
              </div>
              {prop.zestimate && (
                <div>
                  <p className="text-muted text-[11px]">Zestimate</p>
                  <p className="text-white text-[13px] font-medium mt-0.5">{fmt(prop.zestimate)}</p>
                </div>
              )}
              <div>
                <p className="text-muted text-[11px]">Pool</p>
                <p className={`text-[13px] font-medium mt-0.5 ${prop.hasPrivatePool ? "text-uw-success" : "text-muted"}`}>
                  {prop.hasPrivatePool ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-muted text-[11px]">Garage</p>
                <p className={`text-[13px] font-medium mt-0.5 ${prop.hasGarage ? "text-uw-success" : "text-muted"}`}>
                  {prop.hasGarage ? "Yes" : "No"}
                </p>
              </div>
            </div>
            {prop.constructionMaterials?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-edge">
                <p className="text-muted text-[11px] mb-1">Construction</p>
                <p className="text-white text-[13px] font-medium">{prop.constructionMaterials.join(", ")}</p>
              </div>
            )}
            {(prop.cooling?.length > 0 || prop.heating?.length > 0) && (
              <div className="mt-3 pt-3 border-t border-edge grid grid-cols-2 gap-x-4">
                {prop.cooling?.length > 0 && (
                  <div>
                    <p className="text-muted text-[11px] mb-1">Cooling</p>
                    <p className="text-white text-[13px] font-medium">{prop.cooling.join(", ")}</p>
                  </div>
                )}
                {prop.heating?.length > 0 && (
                  <div>
                    <p className="text-muted text-[11px] mb-1">Heating</p>
                    <p className="text-white text-[13px] font-medium">{prop.heating.join(", ")}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Repair Breakdown */}
          {repairs.condition ? (
            <Card>
              <SectionLabel>Repair Breakdown</SectionLabel>
              <div className="space-y-2.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Condition</span>
                  <ConditionBadge grade={repairs.condition} />
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Market multiplier</span>
                  <span className="text-white font-medium">{repairs.marketMultiplier}×</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Rate ($/sqft)</span>
                  <span className="text-white font-medium">${repairs.per_sqft_low} – ${repairs.per_sqft_high}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Base cost</span>
                  <span className="text-white font-medium">{fmt(repairs.baseLow)} – {fmt(repairs.baseHigh)}</span>
                </div>
                {repairs.checkedExtraItems?.length > 0 && (
                  <div className="border-t border-edge pt-2.5 space-y-2">
                    <p className="text-muted text-[10px] font-semibold uppercase tracking-wider">Extra Items</p>
                    {repairs.checkedExtraItems.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-[12px]">
                        <span className="text-muted">{item.label}</span>
                        <span className="text-white">{fmt(item.cost)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between text-[13px] border-t border-edge pt-2.5">
                  <span className="text-white font-semibold">Total Range</span>
                  <span className="text-white font-semibold">{fmt(repairs.low)} – {fmt(repairs.high)}</span>
                </div>
              </div>
            </Card>
          ) : <div />}
        </div>
      )}

      {/* ── Condition Assessment (full width) ── */}
      {condition.score != null && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Condition Assessment</SectionLabel>
            <div className="flex items-center gap-2 -mt-3">
              <span className="text-muted text-[12px]">{condition.score}/10</span>
              {report?.condition && <ConditionBadge grade={report.condition} />}
            </div>
          </div>
          {condition.summary && (
            <p className="text-white text-[13px] leading-relaxed mb-4">{condition.summary}</p>
          )}
          {condition.lineItems?.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2.5 border-t border-edge pt-4">
              {condition.lineItems.map((item: any, i: number) => (
                <div key={i} className="flex gap-3 text-[12px]">
                  <span className="text-brand font-medium shrink-0 capitalize w-24">{item.category}</span>
                  <span className="text-muted leading-relaxed">{item.notes}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Comps table (full width) ── */}
      {comps.length > 0 && (
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-edge flex items-center justify-between">
            <SectionLabel>Comparable Properties</SectionLabel>
            <span className="text-muted text-[11px] -mt-3">{comps.length} comp{comps.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge bg-surface/40">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Address</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">List Price</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">$/Sqft</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Beds</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Sqft</th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {comps.map((comp: any, i: number) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-white text-[12px] leading-snug">{comp.address}</p>
                      <p className="text-muted text-[11px] mt-0.5">{comp.saleDate}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-white text-[12px] font-medium">{fmt(comp.salePrice)}</td>
                    <td className="px-4 py-3 text-right text-muted text-[12px]">{fmt(comp.pricePerSqft)}</td>
                    <td className="px-4 py-3 text-right text-muted text-[12px]">{comp.beds}bd / {comp.baths}ba</td>
                    <td className="px-4 py-3 text-right text-muted text-[12px]">{comp.sqft?.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right"><CategoryBadge cat={comp.category} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 2-col: Narratives ── */}
      {(ai.propertyNarrative || ai.marketNarrative) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ai.propertyNarrative && (
            <Card>
              <SectionLabel>Property Narrative</SectionLabel>
              <p className="text-white text-[13px] leading-relaxed">{ai.propertyNarrative}</p>
            </Card>
          )}
          {ai.marketNarrative && (
            <Card>
              <SectionLabel>Market Narrative</SectionLabel>
              <p className="text-white text-[13px] leading-relaxed">{ai.marketNarrative}</p>
            </Card>
          )}
        </div>
      )}

      {/* ── 2-col: Green & Red Flags ── */}
      {(ai.greenFlags?.length > 0 || ai.redFlags?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ai.greenFlags?.length > 0 && (
            <div className="bg-card rounded-xl p-5 border border-uw-success/20 transition-all duration-200 hover:border-uw-success/35" style={{ borderLeft: '3px solid #43B749' }}>
              <p className="text-uw-success text-[11px] font-bold uppercase tracking-wider mb-3">Green Flags</p>
              <ul className="space-y-2.5">
                {ai.greenFlags.map((f: string, i: number) => (
                  <li key={i} className="flex gap-2.5 text-[12px] text-white leading-relaxed">
                    <CheckCircle2 size={14} className="text-uw-success shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ai.redFlags?.length > 0 && (
            <div className="bg-card rounded-xl p-5 border border-uw-danger/20 transition-all duration-200 hover:border-uw-danger/35" style={{ borderLeft: '3px solid #ED1F24' }}>
              <p className="text-uw-danger text-[11px] font-bold uppercase tracking-wider mb-3">Red Flags</p>
              <ul className="space-y-2.5">
                {ai.redFlags.map((f: string, i: number) => (
                  <li key={i} className="flex gap-2.5 text-[12px] text-white leading-relaxed">
                    <XCircle size={14} className="text-uw-danger shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Workflow flags ── */}
      {flags.length > 0 && (
        <Card>
          <SectionLabel>Workflow Flags</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {flags.map((f, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium ${flagStyle(f)}`}>
                {f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
