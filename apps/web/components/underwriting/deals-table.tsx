"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search, AlertTriangle, Loader2, ChevronDown, Check } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { deleteDeal, deleteDeals } from "@/app/actions/underwriting/deals";

// ── Custom inline dropdown (no portal — avoids Radix conflict) ────────────────

interface DropdownOption { value: string; label: string }

function InlineDropdown({
  value,
  options,
  onChange,
  placeholder = "Select…",
  minWidth = 140,
}: {
  value:       string;
  options:     DropdownOption[];
  onChange:    (v: string) => void;
  placeholder?: string;
  minWidth?:   number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", minWidth }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#f1f5f9", fontSize: 13, borderRadius: 12,
          padding: "7px 10px 7px 12px",
          cursor: "pointer", outline: "none",
          transition: "border-color 0.15s, background 0.15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(48,125,192,0.4)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = open ? "rgba(48,125,192,0.4)" : "rgba(255,255,255,0.08)"; }}
      >
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown
          size={13}
          style={{ color: "#475569", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            minWidth: "100%", zIndex: 9999,
            background: "#0F2032",
            border: "1px solid rgba(48,125,192,0.18)",
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)",
            overflow: "hidden",
            padding: "4px",
          }}
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", textAlign: "left",
                  padding: "7px 10px", borderRadius: 8, border: "none",
                  background: isActive ? "rgba(48,125,192,0.12)" : "transparent",
                  color: isActive ? "#f1f5f9" : "#94a3b8",
                  fontSize: 13, cursor: "pointer",
                  transition: "background 0.1s, color 0.1s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.color = "#f1f5f9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                  }
                }}
              >
                <span>{opt.label}</span>
                {isActive && <Check size={12} style={{ color: "#307DC0", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Deal = {
  id: string;
  address: string;
  status: string;
  recommendation: string | null;
  arv_low: number | null;
  arv_high: number | null;
  max_offer: number | null;
  created_at: string;
  user_id?: string | null;
  agent_name?: string | null;
  company_id?: string | null;
  company_name?: string | null;
};

type CompanyUser = { id: string; full_name: string | null; email: string | null };
type ViewMode = "mine" | "all";

function fmt(n: number | null) {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:   "bg-uw-warn/10 text-uw-warn border-uw-warn/20",
    completed: "bg-uw-success/10 text-uw-success border-uw-success/20",
    failed:    "bg-uw-danger/10 text-uw-danger border-uw-danger/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${styles[status] ?? styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RecommendationBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted text-[12px]">—</span>;
  const styles: Record<string, string> = {
    pursue:    "bg-uw-success/10 text-uw-success border-uw-success/20",
    negotiate: "bg-uw-warn/10 text-uw-warn border-uw-warn/20",
    pass:      "bg-uw-danger/10 text-uw-danger border-uw-danger/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${styles[value] ?? ""}`}>
      {value}
    </span>
  );
}

// ── Delete dialog (single or bulk) ────────────────────────────────────────────

function DeleteDialog({
  targets,
  open,
  onClose,
}: {
  targets: Deal[];
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isBulk = targets.length > 1;

  function handleConfirm() {
    startTransition(async () => {
      if (isBulk) {
        await deleteDeals(targets.map((d) => d.id));
      } else if (targets[0]) {
        await deleteDeal(targets[0].id);
      }
      onClose();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v && !isPending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-edge rounded-2xl shadow-2xl focus:outline-none p-6">

          <div className="flex flex-col items-center text-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-full bg-uw-danger/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-uw-danger" strokeWidth={1.5} />
            </div>
            <div>
              <Dialog.Title className="text-white font-semibold text-[15px]">
                {isBulk ? `Delete ${targets.length} Deals` : "Delete Deal"}
              </Dialog.Title>
              <Dialog.Description className="text-muted text-[13px] mt-1 leading-relaxed">
                {isBulk
                  ? `This will permanently delete ${targets.length} deals and their reports. This cannot be undone.`
                  : "This will permanently delete the deal and its report. This cannot be undone."}
              </Dialog.Description>
            </div>
          </div>

          {!isBulk && targets[0] && (
            <div className="bg-surface border border-edge rounded-lg px-4 py-2.5 mb-6 text-center">
              <p className="text-white text-[13px] font-medium truncate">{targets[0].address}</p>
            </div>
          )}

          {isBulk && (
            <div className="bg-surface border border-edge rounded-lg mb-6 max-h-36 overflow-y-auto divide-y divide-edge">
              {targets.map((d) => (
                <p key={d.id} className="px-4 py-2 text-white text-[12px] truncate">{d.address}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg border border-edge text-white text-[13px] font-medium hover:bg-white/[0.04] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-uw-danger hover:bg-uw-danger/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending
                ? <><Loader2 size={14} className="animate-spin" />Deleting…</>
                : isBulk ? `Delete ${targets.length}` : "Delete"
              }
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

export function DealsTable({
  deals,
  companies = [],
  accessRole = "user",
  currentUserId = "",
  companyUsers = [],
}: {
  deals: Deal[];
  companies?: { id: string; name: string }[];
  accessRole?: string;
  currentUserId?: string;
  companyUsers?: CompanyUser[];
}) {
  const router = useRouter();
  const isSuperAdmin = accessRole === "super_admin";
  const isAdmin = accessRole === "admin" || accessRole === "super_admin";
  const hasCompanyContext = !isSuperAdmin && companyUsers.length > 0;

  const [viewMode,      setViewMode]      = useState<ViewMode>("mine");
  const [userFilter,    setUserFilter]    = useState("all");
  const [search,        setSearch]        = useState("");
  const [companyId,     setCompanyId]     = useState("all");
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [deleteTargets, setDeleteTargets] = useState<Deal[]>([]);
  const [page,          setPage]          = useState(1);

  // Users who actually have deals (for the dropdown)
  const usersWithDeals = useMemo(() => {
    const dealUserIds = new Set(deals.map((d) => d.user_id).filter(Boolean));
    return companyUsers.filter((u) => dealUserIds.has(u.id));
  }, [deals, companyUsers]);

  const filtered = useMemo(() => deals
    .filter((d) => companyId === "all" || d.company_id === companyId)
    .filter((d) => {
      if (!hasCompanyContext) return true;
      if (viewMode === "mine") return d.user_id === currentUserId;
      if (userFilter !== "all") return d.user_id === userFilter;
      return true;
    })
    .filter((d) => d.address.toLowerCase().includes(search.toLowerCase())),
  [deals, companyId, viewMode, userFilter, search, currentUserId, hasCompanyContext]);

  const PAGE_SIZE  = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filteredIds    = filtered.map((d) => d.id);
  const allSelected    = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someSelected   = filteredIds.some((id) => selected.has(id));
  const selectedInView = filtered.filter((d) => selected.has(d.id));

  function clearSelection() { setSelected(new Set()); }

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...filteredIds]));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const showCompanyCol = isSuperAdmin && companyId === "all";

  function getUserLabel(u: CompanyUser) {
    return u.full_name?.trim() || u.email || u.id.slice(0, 8);
  }

  return (
    <>
      <DeleteDialog
        targets={deleteTargets}
        open={deleteTargets.length > 0}
        onClose={() => { setDeleteTargets([]); clearSelection(); }}
      />

      <div className="space-y-3">

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search By Address…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); clearSelection(); }}
              className="w-full bg-card border border-edge text-white text-[13px] rounded-lg pl-8 pr-3 py-2 outline-none focus:border-brand transition-colors placeholder:text-muted"
            />
          </div>

          {/* View selector — my deals / company member */}
          {hasCompanyContext && (
            <InlineDropdown
              value={viewMode === "mine" ? "mine" : userFilter}
              options={[
                { value: "mine", label: "My Deals" },
                { value: "all",  label: "All Members" },
                ...usersWithDeals
                  .filter((u) => u.id !== currentUserId)
                  .map((u) => ({ value: u.id, label: getUserLabel(u) })),
              ]}
              onChange={(v) => {
                if (v === "mine") { setViewMode("mine"); setUserFilter("all"); }
                else              { setViewMode("all");  setUserFilter(v);     }
                clearSelection();
              }}
              minWidth={150}
            />
          )}

          {/* Company filter — super_admin only */}
          {isSuperAdmin && companies.length > 0 && (
            <InlineDropdown
              value={companyId}
              options={[
                { value: "all", label: "All Companies" },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
              onChange={(v) => { setCompanyId(v); clearSelection(); }}
              minWidth={170}
            />
          )}

        </div>

        {/* Bulk action bar */}
        {isAdmin && someSelected && (
          <div className="flex items-center justify-between bg-brand/10 border border-brand/20 rounded-xl px-4 py-2.5">
            <span className="text-brand text-[13px] font-medium">
              {selectedInView.length} Deal{selectedInView.length !== 1 ? "s" : ""} Selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="text-muted hover:text-white text-[13px] transition-colors px-2 py-1"
              >
                Clear
              </button>
              <button
                onClick={() => setDeleteTargets(selectedInView)}
                className="flex items-center gap-1.5 bg-uw-danger hover:bg-uw-danger/90 text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted text-[13px]">
              No Deals Found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge">
                    {isAdmin && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          onChange={toggleAll}
                          className="w-4 h-4 accent-brand rounded"
                        />
                      </th>
                    )}
                    <th className="text-center px-4 py-3 text-[11px] font-extrabold text-white uppercase tracking-wider">Date</th>
                    <th className="text-center px-3 py-3 text-[11px] font-extrabold text-white uppercase tracking-wider">Address</th>
                    {showCompanyCol && (
                      <th className="text-center px-4 py-3 text-[11px] font-extrabold text-white uppercase tracking-wider">Company</th>
                    )}
                    <th className="text-center px-4 py-3 text-[11px] font-extrabold text-white uppercase tracking-wider">Agent</th>
                    <th className="text-center px-4 py-3 text-[11px] font-extrabold text-white uppercase tracking-wider">Status</th>
                    <th className="text-center px-4 py-3 text-[11px] font-extrabold text-white uppercase tracking-wider">Recommendation</th>
                    <th className="text-right px-4 py-3 text-[11px] font-extrabold text-white uppercase tracking-wider">ARV Range</th>
                    <th className="text-right px-4 py-3 text-[11px] font-extrabold text-white uppercase tracking-wider">Max Offer</th>
                    <th className="px-5 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {pageRows.map((deal) => {
                    const isSelected = selected.has(deal.id);
                    const isOwn = deal.user_id === currentUserId;
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => router.push(`/underwriting/deals/${deal.id}`)}
                        className={`transition-colors cursor-pointer ${isSelected ? "bg-brand/[0.04]" : "hover:bg-white/[0.02]"}`}
                      >
                        {isAdmin && (
                          <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(deal.id)}
                              className="w-4 h-4 accent-brand rounded"
                            />
                          </td>
                        )}
                        <td className="px-4 py-4 text-center" style={{ whiteSpace: "nowrap" }}>
                          <p className="text-[12px] font-semibold m-0" style={{ color: "#94a3b8" }}>{fmtDate(deal.created_at)}</p>
                          <p className="text-[11px] m-0" style={{ color: "#475569", marginTop: 2 }}>{fmtTime(deal.created_at)}</p>
                        </td>
                        <td className="px-3 py-4 text-center">
                          <p className="text-white text-[13px] font-medium leading-snug">{deal.address}</p>
                        </td>
                        {showCompanyCol && (
                          <td className="px-4 py-4 text-center">
                            <span className="text-muted text-[12px]">{deal.company_name ?? "—"}</span>
                          </td>
                        )}
                        <td className="px-4 py-4 text-center">
                          <span className="text-white text-[12px] font-medium">{deal.agent_name ?? "—"}</span>
                        </td>
                        <td className="px-4 py-4 text-center"><StatusBadge status={deal.status} /></td>
                        <td className="px-4 py-4 text-center"><RecommendationBadge value={deal.recommendation} /></td>
                        <td className="px-4 py-4 text-center">
                          {deal.arv_low && deal.arv_high ? (
                            <span className="text-white text-[13px] font-medium">
                              {fmt(deal.arv_low)} — {fmt(deal.arv_high)}
                            </span>
                          ) : (
                            <span className="text-muted text-[12px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-brand text-[13px] font-semibold">{fmt(deal.max_offer)}</span>
                        </td>
                        <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTargets([deal])}
                              className="p-1.5 rounded-md text-muted hover:text-uw-danger hover:bg-uw-danger/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-edge">
                <span className="text-[11px] font-semibold text-muted">
                  {filtered.length === 0 ? "0 deals" : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                </span>
                {filtered.length > PAGE_SIZE && (
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} onClick={() => setPage(p)} className={`min-w-[30px] h-[30px] rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors ${p === safePage ? "bg-brand text-white" : "bg-white/[0.04] text-muted hover:bg-white/[0.07]"}`}>{p}</button>
                    ))}
                  </div>
                )}
                {filtered.length > PAGE_SIZE && (
                  <div className="flex gap-1.5">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className={`px-3 py-1.5 rounded-lg border border-edge text-xs font-semibold bg-transparent transition-colors ${safePage === 1 ? "text-muted opacity-40 cursor-default" : "text-dimText hover:bg-white/[0.04] cursor-pointer"}`}>← Prev</button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className={`px-3 py-1.5 rounded-lg border border-edge text-xs font-semibold bg-transparent transition-colors ${safePage === totalPages ? "text-muted opacity-40 cursor-default" : "text-dimText hover:bg-white/[0.04] cursor-pointer"}`}>Next →</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
