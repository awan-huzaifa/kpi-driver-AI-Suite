"use client";

import { useMemo, useState } from "react";
import { BarChart2, Wrench, MapPin, Activity, SlidersHorizontal, X } from "lucide-react";
import { AnalyticsMetricCard } from "@/components/underwriting/analytics-metric-card";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

/* ── Types ───────────────────────────────────────────────────────────── */

export interface UWReport {
  user_id:          string;
  condition:        string | null;
  arv_low:          number | null;
  arv_high:         number | null;
  repair_cost_low:  number | null;
  repair_cost_high: number | null;
  max_offer_low:    number | null;
  max_offer_high:   number | null;
  investor_profit:  number | null;
  property_data:    Record<string, unknown> | null;
  created_at:       string;
  company_id?:      string | null;
}

interface Props {
  reports:       UWReport[];
  users:         { id: string; name: string; company_id?: string | null }[];
  companies?:    { id: string; name: string }[];
  accessRole:    string;
  currentUserId: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmt(n: number | null) {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function SectionHeader({ title, sub, color = "#307DC0" }: { title: string; sub?: string; color?: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="w-[3px] h-5 rounded-full shrink-0 mt-0.5" style={{ background: color }} />
      <div>
        <h3 className="text-white font-bold text-[15px] leading-tight">{title}</h3>
        {sub && <p className="text-muted text-[12px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CardHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-5 py-3.5 border-b border-edge"
      style={{ background: "rgba(48,125,192,0.03)" }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(48,125,192,0.12)", border: "1px solid rgba(48,125,192,0.2)" }}
      >
        <Icon size={13} className="text-brand" strokeWidth={2} />
      </div>
      <p className="text-white text-[13px] font-bold">{title}</p>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-edge flex flex-col items-center justify-center py-16 gap-4" style={{ background: "#0F2032" }}>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(48,125,192,0.10)", border: "1px solid rgba(48,125,192,0.2)" }}
      >
        <BarChart2 size={22} className="text-brand" strokeWidth={1.5} />
      </div>
      <p className="text-muted text-[13px] font-medium">{message}</p>
    </div>
  );
}

const CONDITION_ORDER = ["excellent", "good", "fair", "poor"] as const;

const CONDITION_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  excellent: { color: "#43B749", bg: "rgba(67,183,73,0.12)",  border: "rgba(67,183,73,0.25)",  label: "Excellent" },
  good:      { color: "#307DC0", bg: "rgba(48,125,192,0.12)", border: "rgba(48,125,192,0.25)", label: "Good"      },
  fair:      { color: "#FCAF17", bg: "rgba(252,175,23,0.12)", border: "rgba(252,175,23,0.25)", label: "Fair"      },
  poor:      { color: "#ED1F24", bg: "rgba(237,31,36,0.12)",  border: "rgba(237,31,36,0.25)",  label: "Poor"      },
};

function ConditionBadge({ grade }: { grade: string }) {
  const m = CONDITION_META[grade];
  if (!m) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 9px", borderRadius: 6,
      fontSize: 11, fontWeight: 700,
      background: m.bg, border: `1px solid ${m.border}`, color: m.color,
    }}>
      {m.label}
    </span>
  );
}

/* ── Main ────────────────────────────────────────────────────────────── */

export default function AnalyticsClient({
  reports: allReports,
  users: allUsers,
  companies = [],
  accessRole,
  currentUserId,
}: Props) {
  const [period,     setPeriod]     = useState<DatePeriod>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [companyId,  setCompanyId]  = useState("all");
  const [userId,     setUserId]     = useState("all");
  const [city,       setCity]       = useState("all");

  const isAdmin      = accessRole === "admin" || accessRole === "super_admin";
  const isSuperAdmin = accessRole === "super_admin";

  /* users visible in the user filter — scoped to selected company when one is chosen */
  const visibleUsers = useMemo(() => {
    if (!isSuperAdmin || companyId === "all") return allUsers;
    return allUsers.filter((u) => u.company_id === companyId);
  }, [allUsers, isSuperAdmin, companyId]);

  /* city list scoped to selected company (or all companies) */
  const allCities = useMemo(() => {
    const set = new Set<string>();
    const source = companyId === "all"
      ? allReports
      : allReports.filter((r) => r.company_id === companyId);
    source.forEach((r) => {
      const c = (r.property_data as Record<string, unknown> | null)?.city;
      if (typeof c === "string" && c.trim()) set.add(c.trim());
    });
    return Array.from(set).sort();
  }, [allReports, companyId]);

  /* reset dependent filters when company changes */
  function handleCompanyChange(v: string) {
    setCompanyId(v);
    setUserId("all");
    setCity("all");
  }

  const reports = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo);
    return allReports.filter((r) => {
      if (companyId !== "all" && r.company_id !== companyId) return false;
      const d = new Date(r.created_at);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      if (userId !== "all" && r.user_id !== userId) return false;
      if (city !== "all") {
        const reportCity = ((r.property_data as Record<string, unknown> | null)?.city as string | undefined)?.trim() ?? "";
        if (reportCity !== city) return false;
      }
      return true;
    });
  }, [allReports, period, customFrom, customTo, companyId, userId, city]);

  const hasData        = reports.length > 0;
  const hasActiveFilter = period !== "all" || companyId !== "all" || userId !== "all" || city !== "all";

  const showFilters = isSuperAdmin
    ? companies.length > 0 || allUsers.length > 0 || allCities.length > 1
    : isAdmin || allCities.length > 1;

  /* financial aggregates */
  const arvMids         = reports.map((r) => ((r.arv_low ?? 0) + (r.arv_high ?? 0)) / 2);
  const maxOfferMids    = reports.map((r) => ((r.max_offer_low ?? 0) + (r.max_offer_high ?? 0)) / 2);
  const repairMids      = reports.map((r) => ((r.repair_cost_low ?? 0) + (r.repair_cost_high ?? 0)) / 2);
  const investorProfits = reports.map((r) => r.investor_profit ?? 0).filter((n) => n > 0);

  const avgARV            = avg(arvMids);
  const avgMaxOffer       = avg(maxOfferMids);
  const avgRepairCost     = avg(repairMids);
  const avgInvestorProfit = avg(investorProfits);

  /* city aggregates */
  const cityMap = new Map<string, { count: number; arvSum: number }>();
  reports.forEach((r, i) => {
    const c   = ((r.property_data as Record<string, unknown> | null)?.city as string | undefined)?.trim() || "Unknown";
    const arv = arvMids[i];
    if (!cityMap.has(c)) cityMap.set(c, { count: 0, arvSum: 0 });
    cityMap.get(c)!.count++;
    cityMap.get(c)!.arvSum += arv;
  });
  const cityStats = Array.from(cityMap.entries())
    .map(([c, { count, arvSum }]) => ({ city: c, count, avgARV: arvSum / count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxCityCount = cityStats[0]?.count ?? 1;

  /* condition aggregates */
  const conditionStats = CONDITION_ORDER.map((grade) => {
    const subset  = reports.filter((r) => r.condition === grade);
    const repairs = subset.map((r) => ((r.repair_cost_low ?? 0) + (r.repair_cost_high ?? 0)) / 2);
    return { grade, count: subset.length, avgRepair: avg(repairs) };
  });
  const maxConditionCount = Math.max(...conditionStats.map((c) => c.count), 1);
  const repairByCondition = conditionStats.filter((c) => c.count > 0);
  const maxRepair         = Math.max(...repairByCondition.map((c) => c.avgRepair ?? 0), 1);

  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full">

      {/* Page header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={13} style={{ color: "#FCAF17" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#FCAF17" }}>Analytics</span>
          </div>
          <h1 className="font-black text-[32px] leading-none tracking-tight mb-2">
            <span className="text-white">Deal </span>
            <span style={{ background: "linear-gradient(135deg, #FCAF17 0%, #43B749 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Insights
            </span>
          </h1>
          <p className="text-muted text-sm font-medium">
            {hasData
              ? `Aggregated across ${reports.length} deal${reports.length !== 1 ? "s" : ""}${hasActiveFilter ? " · filtered" : ""}`
              : hasActiveFilter
              ? "No deals match current filters"
              : "Complete your first deal to unlock analytics"}
          </p>
        </div>

        {/* Date range picker */}
        <div className="shrink-0">
          <DateRangePicker
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onPeriod={setPeriod}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
            activeColor="#FCAF17"
          />
        </div>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mr-1"
            style={{ background: "rgba(252,175,23,0.08)", border: "1px solid rgba(252,175,23,0.15)" }}
          >
            <SlidersHorizontal size={11} style={{ color: "#FCAF17" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#FCAF17", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Filters
            </span>
          </div>

          {/* Company filter — super_admin only */}
          {isSuperAdmin && companies.length > 0 && (
            <Select value={companyId} onValueChange={handleCompanyChange}>
              <SelectTrigger placeholder="All Companies" className="w-auto min-w-[150px] text-xs py-1.5" />
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* User filter — admin / super_admin, scoped to selected company */}
          {isAdmin && visibleUsers.length > 0 && (
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger placeholder="All Users" className="w-auto min-w-[140px] text-xs py-1.5" />
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {visibleUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* City filter */}
          {allCities.length > 1 && (
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger placeholder="All Cities" className="w-auto min-w-[130px] text-xs py-1.5" />
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {allCities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilter && (
            <button
              onClick={() => { setCompanyId("all"); setUserId("all"); setCity("all"); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors"
              style={{
                background: "rgba(237,31,36,0.08)",
                border: "1px solid rgba(237,31,36,0.15)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "#ED1F24",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(237,31,36,0.15)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(237,31,36,0.08)"; }}
            >
              <X size={10} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Financial Overview */}
      <section>
        <SectionHeader title="Financial Overview" sub="Averages across filtered deals" color="#43B749" />
        {!hasData ? (
          <EmptySection message={hasActiveFilter ? "No deals match current filters" : "No completed deals yet"} />
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <AnalyticsMetricCard label="Avg ARV"             value={fmt(avgARV)}            sub="After-repair value"  icon="trending-up"  color="#43B749" rgb="67,183,73"  />
            <AnalyticsMetricCard label="Avg Max Offer"       value={fmt(avgMaxOffer)}       sub="Low–high midpoint"   icon="dollar-sign"  color="#307DC0" rgb="48,125,192" />
            <AnalyticsMetricCard label="Avg Repair Cost"     value={fmt(avgRepairCost)}     sub="Low–high midpoint"   icon="wrench"       color="#FCAF17" rgb="252,175,23" />
            <AnalyticsMetricCard label="Avg Investor Profit" value={fmt(avgInvestorProfit)} sub="Target minimum"      icon="bar-chart-2"  color="#43B749" rgb="67,183,73"  />
          </div>
        )}
      </section>

      {/* Market Insights */}
      <section>
        <SectionHeader title="Market Insights" sub="Deal volume and ARV by city, repair cost by condition" color="#307DC0" />
        {!hasData ? (
          <EmptySection message={hasActiveFilter ? "No deals match current filters" : "No market data yet"} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Cities */}
            <div className="rounded-xl border border-edge overflow-hidden transition-all duration-200 hover:border-brand/25" style={{ background: "#0F2032" }}>
              <CardHeader icon={MapPin} title="Most Analyzed Cities" />
              {cityStats.length === 0 ? (
                <p className="text-muted text-[13px] text-center py-10">No city data available</p>
              ) : (
                <div>
                  {cityStats.map(({ city: c, count, avgARV: cityAvgARV }, i) => (
                    <div
                      key={c}
                      className="px-5 py-3.5 flex items-center gap-4 transition-colors hover:bg-brand/[0.04]"
                      style={{ borderBottom: i < cityStats.length - 1 ? "1px solid rgba(48,125,192,0.08)" : undefined }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-[13px] font-semibold truncate">{c}</span>
                          <span className="text-muted text-[11px] ml-2 shrink-0 font-medium">
                            {count} deal{count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(48,125,192,0.10)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(count / maxCityCount) * 100}%`, background: "linear-gradient(90deg, #307DC0, #78ABD6)" }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0 w-24">
                        <p className="text-white text-[13px] font-bold">{fmt(cityAvgARV)}</p>
                        <p className="text-muted text-[10px] font-medium">avg ARV</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Repair cost by condition */}
            <div className="rounded-xl border border-edge overflow-hidden transition-all duration-200 hover:border-brand/25" style={{ background: "#0F2032" }}>
              <CardHeader icon={Wrench} title="Avg Repair Cost by Condition" />
              {repairByCondition.length === 0 ? (
                <p className="text-muted text-[13px] text-center py-10">No data yet</p>
              ) : (
                <div>
                  {repairByCondition.map(({ grade, count, avgRepair }, i) => {
                    const m   = CONDITION_META[grade];
                    const pct = avgRepair ? (avgRepair / maxRepair) * 100 : 0;
                    return (
                      <div
                        key={grade}
                        className="px-5 py-4 transition-colors hover:bg-brand/[0.04]"
                        style={{ borderBottom: i < repairByCondition.length - 1 ? "1px solid rgba(48,125,192,0.08)" : undefined }}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <ConditionBadge grade={grade} />
                            <span className="text-muted text-[12px] font-medium">{count} deal{count !== 1 ? "s" : ""}</span>
                          </div>
                          <span className="text-white text-[13px] font-bold">{fmt(avgRepair)}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: m?.color ?? "#307DC0" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Condition Breakdown */}
      <section>
        <SectionHeader title="Condition Breakdown" sub="Deal count and average repair cost per condition grade" color="#FCAF17" />
        {!hasData ? (
          <EmptySection message={hasActiveFilter ? "No deals match current filters" : "No condition data yet"} />
        ) : (
          <div className="rounded-xl border border-edge overflow-hidden transition-all duration-200 hover:border-brand/25" style={{ background: "#0F2032" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(48,125,192,0.10)", background: "rgba(48,125,192,0.03)" }}>
                  {["Condition", "Deals", "Avg Repair Cost", "Share"].map((h, i) => (
                    <th
                      key={h}
                      className="py-3 text-[10px] font-bold text-muted uppercase tracking-wider"
                      style={{
                        paddingLeft:  i === 0 ? 20 : 16,
                        paddingRight: i === 3 ? 20 : 16,
                        textAlign:    i === 1 || i === 2 ? "right" : "left",
                        width:        i === 3 ? 200 : undefined,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conditionStats.map(({ grade, count, avgRepair }, i) => {
                  const m   = CONDITION_META[grade];
                  const pct = (count / maxConditionCount) * 100;
                  return (
                    <tr
                      key={grade}
                      className="transition-colors hover:bg-brand/[0.04]"
                      style={{
                        opacity:      count === 0 ? 0.35 : 1,
                        borderBottom: i < conditionStats.length - 1 ? "1px solid rgba(48,125,192,0.08)" : undefined,
                      }}
                    >
                      <td className="px-5 py-4"><ConditionBadge grade={grade} /></td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-white text-[13px] font-bold">{count}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-white text-[13px] font-bold">{fmt(avgRepair)}</span>
                      </td>
                      <td className="pl-4 pr-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: m?.color ?? "#307DC0" }}
                            />
                          </div>
                          <span className="text-muted text-[11px] font-medium w-8 text-right shrink-0">
                            {count > 0 ? `${Math.round(pct)}%` : "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
