"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X, Loader2, CheckCircle2, AlertCircle, Upload, Home,
  SlidersHorizontal, Wrench as WrenchIcon, Check, Plus, Trash2,
} from "lucide-react";
import type { ConditionGrade, ExtraItem, UploadedPhoto, RepairMode } from "@/lib/underwriting/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; dealId: string }
  | { phase: "error"; message: string };

const CONDITION_OPTIONS: { value: ConditionGrade; label: string; sqft: string; color: string; rgb: string }[] = [
  { value: "excellent", label: "Excellent", sqft: "$0–$15/sqft",  color: "#43B749", rgb: "67,183,73"  },
  { value: "good",      label: "Good",      sqft: "$25–$35/sqft", color: "#307DC0", rgb: "48,125,192" },
  { value: "fair",      label: "Fair",      sqft: "$40–$50/sqft", color: "#FCAF17", rgb: "252,175,23" },
  { value: "poor",      label: "Poor",      sqft: "$55–$65/sqft", color: "#ED1F24", rgb: "237,31,36"  },
];

const REPAIR_MODES: { value: RepairMode; label: string; desc: string }[] = [
  { value: "known_cost",  label: "Cost Known",  desc: "I know the exact repair cost" },
  { value: "scope_known", label: "Scope Known", desc: "Itemise what needs fixing"    },
  { value: "standard",    label: "Standard",    desc: "Condition-based estimate"     },
];

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon size={13} className="text-brand" strokeWidth={2} />
      <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider">{title}</span>
    </div>
  );
}

const DEFAULT_EXTRA_ITEMS: ExtraItem[] = [
  { label: "Entire Roof Replacement",       cost: 15_000, checked: false },
  { label: "HVAC Replacement",              cost: 10_000, checked: false },
  { label: "Entire Plumbing Replacement",   cost:  7_000, checked: false },
  { label: "Entire Electrical Replacement", cost:  7_000, checked: false },
  { label: "Light Foundation",              cost:  7_500, checked: false },
  { label: "Heavy Foundation",              cost: 15_000, checked: false },
  { label: "Septic Tank Replacement",       cost: 15_000, checked: false },
  { label: "Well Replacement",              cost: 10_000, checked: false },
];

const DRAFT_KEY = "new-deal-draft";

type DraftData = {
  address: string;
  notes: string;
  repairMode: RepairMode;
  condition: ConditionGrade;
  knownRepairCost: number;
  customPerSqft: number;
  marketMultiplier: number;
  investorProfitPct: number;
  assignmentFee: number;
  extraItems: ExtraItem[];
  customItems: { label: string; cost: number }[];
};

function fmtCost(n: number) {
  return "$" + n.toLocaleString();
}

const MAX_PHOTOS = 35;

async function compressImage(file: File): Promise<UploadedPhoto> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_DIM = 1024;
      let { width, height } = img;
      if (width > height && width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
      else if (height > width && height > MAX_DIM) { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
      else if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      resolve({ data: dataUrl.split(",")[1], mediaType: "image/jpeg" });
    };
    img.src = objectUrl;
  });
}

// ── Notes sub-component ───────────────────────────────────────────────────────

function NotesField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
        Notes <span className="normal-case text-muted/60 tracking-normal font-normal">(optional)</span>
      </label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Tenant occupied, seller motivated, permit issues..."
        rows={4} disabled={disabled}
        className="w-full bg-surface border border-edge rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-muted focus:outline-none focus:border-brand transition-colors resize-none disabled:opacity-50"
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewDealModal({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Core fields
  const [address,         setAddress]         = useState("");
  const [notes,           setNotes]           = useState("");
  const [repairMode,      setRepairMode]      = useState<RepairMode>("standard");
  const [condition,       setCondition]       = useState<ConditionGrade>("fair");
  const [knownRepairCost, setKnownRepairCost] = useState(0);
  const [customPerSqft,   setCustomPerSqft]   = useState(45);
  const [marketMultiplier,  setMarketMultiplier]  = useState(1.0);
  const [investorProfitPct, setInvestorProfitPct] = useState(20);
  const [assignmentFee,     setAssignmentFee]     = useState(22_500);
  const [extraItems,        setExtraItems]        = useState<ExtraItem[]>(DEFAULT_EXTRA_ITEMS);

  // Mode 2 custom items
  const [customItems,   setCustomItems]   = useState<{ label: string; cost: number }[]>([]);
  const [newItemLabel,  setNewItemLabel]  = useState("");
  const [newItemCost,   setNewItemCost]   = useState("");
  const [addItemErr,    setAddItemErr]    = useState("");

  // Optional property overrides
  const [overrideBeds,  setOverrideBeds]  = useState("");
  const [overrideBaths, setOverrideBaths] = useState("");
  const [overrideSqft,  setOverrideSqft]  = useState("");

  const [propertyPhotos, setPropertyPhotos] = useState<UploadedPhoto[]>([]);
  const [state,          setState]          = useState<State>({ phase: "idle" });
  const [draftRestored,  setDraftRestored]  = useState(false);

  // Draft persistence
  useEffect(() => {
    if (!open) return;
    const dirty =
      address.trim() !== "" || notes.trim() !== "" ||
      repairMode !== "standard" || condition !== "fair" ||
      knownRepairCost !== 0 || customPerSqft !== 45 ||
      marketMultiplier !== 1.0 || investorProfitPct !== 20 || assignmentFee !== 22_500 ||
      extraItems.some((item, i) => item.checked || item.cost !== DEFAULT_EXTRA_ITEMS[i].cost) ||
      customItems.length > 0;
    if (!dirty) { localStorage.removeItem(DRAFT_KEY); return; }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      address, notes, repairMode, condition, knownRepairCost, customPerSqft,
      marketMultiplier, investorProfitPct, assignmentFee, extraItems, customItems,
    }));
  }, [open, address, notes, repairMode, condition, knownRepairCost, customPerSqft, marketMultiplier, investorProfitPct, assignmentFee, extraItems, customItems]);

  function loadDraft(): boolean {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d: DraftData = JSON.parse(raw);
      setAddress(d.address ?? "");
      setNotes(d.notes ?? "");
      setRepairMode(d.repairMode ?? "standard");
      setCondition(d.condition ?? "fair");
      setKnownRepairCost(d.knownRepairCost ?? 0);
      setCustomPerSqft(d.customPerSqft ?? 45);
      setMarketMultiplier(d.marketMultiplier ?? 1.0);
      setInvestorProfitPct(d.investorProfitPct ?? 20);
      setAssignmentFee(d.assignmentFee ?? 22_500);
      setExtraItems(d.extraItems ?? DEFAULT_EXTRA_ITEMS);
      setCustomItems(d.customItems ?? []);
      return true;
    } catch { return false; }
  }

  function reset() {
    localStorage.removeItem(DRAFT_KEY);
    setAddress(""); setNotes("");
    setRepairMode("standard"); setCondition("fair");
    setKnownRepairCost(0); setCustomPerSqft(45);
    setMarketMultiplier(1.0); setInvestorProfitPct(20); setAssignmentFee(22_500);
    setExtraItems(DEFAULT_EXTRA_ITEMS); setCustomItems([]);
    setNewItemLabel(""); setNewItemCost(""); setAddItemErr("");
    setOverrideBeds(""); setOverrideBaths(""); setOverrideSqft("");
    setPropertyPhotos([]); setState({ phase: "idle" }); setDraftRestored(false);
  }

  function toggleItem(i: number) {
    setExtraItems((prev) => prev.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item));
  }

  function updateItemCost(i: number, raw: string) {
    const cost = parseInt(raw.replace(/[^0-9]/g, ""), 10) || 0;
    setExtraItems((prev) => prev.map((item, idx) => idx === i ? { ...item, cost } : item));
  }

  function addCustomItem() {
    const label = newItemLabel.trim();
    const cost  = parseInt(newItemCost.replace(/[^0-9]/g, ""), 10) || 0;
    if (!label)    { setAddItemErr("Item name is required."); return; }
    if (cost <= 0) { setAddItemErr("Cost must be greater than $0."); return; }
    setCustomItems((prev) => [...prev, { label, cost }]);
    setNewItemLabel(""); setNewItemCost(""); setAddItemErr("");
  }

  function removeCustomItem(i: number) {
    setCustomItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const toProcess = files.slice(0, MAX_PHOTOS - propertyPhotos.length);
    const compressed = await Promise.all(toProcess.map(compressImage));
    setPropertyPhotos((prev) => [...prev, ...compressed]);
  }

  function removePhoto(i: number) {
    setPropertyPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;

    // Validate Mode 2: need at least one item
    if (repairMode === "scope_known") {
      const hasItems = extraItems.some((i) => i.checked) || customItems.length > 0;
      if (!hasItems) {
        setState({ phase: "error", message: "Please select at least one repair item or add a custom item." });
        return;
      }
    }

    setState({ phase: "loading" });

    // Build extra items for submission
    let submitExtraItems: ExtraItem[];
    if (repairMode === "scope_known") {
      submitExtraItems = [
        ...extraItems.filter((i) => i.checked),
        ...customItems.map((i) => ({ ...i, checked: true })),
      ];
    } else if (repairMode === "standard") {
      submitExtraItems = [
        ...extraItems,
        ...customItems.map((i) => ({ ...i, checked: true })),
      ];
    } else {
      submitExtraItems = extraItems;
    }

    try {
      const overrides: Record<string, number> = {};
      if (overrideBeds.trim())  overrides.beds  = parseFloat(overrideBeds);
      if (overrideBaths.trim()) overrides.baths = parseFloat(overrideBaths);
      if (overrideSqft.trim())  overrides.sqft  = parseInt(overrideSqft.replace(/[^0-9]/g, ""), 10);

      const body: Record<string, unknown> = {
        address: address.trim(),
        notes: notes.trim() || undefined,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        repairMode,
        marketMultiplier,
        investorProfitPct: investorProfitPct / 100,
        assignmentFee,
        extraItems: submitExtraItems,
        propertyPhotos: propertyPhotos.length > 0 ? propertyPhotos : undefined,
      };

      if (repairMode === "known_cost") {
        body.knownRepairCost = knownRepairCost;
      } else {
        body.condition = condition;
        if (repairMode === "standard") body.customPerSqft = customPerSqft;
      }

      const res  = await fetch("/api/underwrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) { setState({ phase: "error", message: data.error ?? "Something went wrong." }); return; }

      localStorage.removeItem(DRAFT_KEY);
      setState({ phase: "success", dealId: data.dealId });
      router.push(`/underwriting/deals/${data.dealId}`);
    } catch {
      setState({ phase: "error", message: "Network error — please try again." });
    }
  }

  const disabled = state.phase === "loading";
  const selectedOpt         = CONDITION_OPTIONS.find((o) => o.value === condition)!;
  const standardItemsTotal  = extraItems.filter((i) => i.checked).reduce((s, i) => s + i.cost, 0);
  const checkedDefaultTotal = extraItems.filter((i) => i.checked).reduce((s, i) => s + i.cost, 0);
  const customItemsTotal    = customItems.reduce((s, i) => s + i.cost, 0);
  const scopeTotal          = checkedDefaultTotal + customItemsTotal;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) { const restored = loadDraft(); setDraftRestored(restored); } }}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="uw-dialog-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content onInteractOutside={(e) => e.preventDefault()} className="uw-dialog-content fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-card border border-edge rounded-2xl shadow-2xl focus:outline-none flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
            <Dialog.Title className="text-white font-semibold text-base">New Deal</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted hover:text-white transition-colors"><X size={18} /></button>
            </Dialog.Close>
          </div>

          {/* Success */}
          {state.phase === "success" && (
            <div className="flex flex-col items-center text-center py-10 px-6 gap-3">
              <CheckCircle2 size={40} className="text-brand" strokeWidth={1.5} />
              <p className="text-white font-medium">Deal underwritten successfully</p>
              <p className="text-muted text-sm">Redirecting to report…</p>
            </div>
          )}

          {/* Error */}
          {state.phase === "error" && (
            <div className="flex flex-col items-center text-center py-10 px-6 gap-3">
              <AlertCircle size={40} className="text-uw-danger" strokeWidth={1.5} />
              <p className="text-white font-medium">Something went wrong</p>
              <p className="text-muted text-sm max-w-sm">{state.message}</p>
              <button onClick={() => setState({ phase: "idle" })} className="btn-primary mt-2">Try again</button>
            </div>
          )}

          {/* Form */}
          {(state.phase === "idle" || state.phase === "loading") && (
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="overflow-y-auto px-6 pb-2 space-y-4">

                {/* Draft banner */}
                {draftRestored && (
                  <div className="flex items-center justify-between bg-uw-warn/10 border border-uw-warn/20 rounded-lg px-3.5 py-2">
                    <span className="text-uw-warn text-[12px]">Draft restored</span>
                    <button type="button" onClick={reset} className="text-uw-warn/70 hover:text-uw-warn text-[11px] underline transition-colors">Start fresh</button>
                  </div>
                )}

                {/* Address */}
                <div className="space-y-2">
                  <SectionHeader icon={Home} title="Property Details" />
                  <input
                    type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, Miami, FL 33101" required disabled={disabled}
                    className="w-full bg-surface border border-edge rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-muted focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                  />

                  {/* Optional property overrides */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">Override:</span>
                    {[
                      { label: "Beds",  value: overrideBeds,  set: setOverrideBeds,  placeholder: "—" },
                      { label: "Baths", value: overrideBaths, set: setOverrideBaths, placeholder: "—" },
                      { label: "Sqft",  value: overrideSqft,  set: setOverrideSqft,  placeholder: "—" },
                    ].map(({ label, value, set, placeholder }) => (
                      <div key={label} className="flex items-center bg-surface border border-edge rounded overflow-hidden focus-within:border-brand transition-colors">
                        <span className="text-[10px] text-muted pl-2 pr-1 whitespace-nowrap">{label}</span>
                        <input
                          type="text" value={value}
                          onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder={placeholder}
                          disabled={disabled}
                          className="w-14 bg-transparent px-1 py-1.5 text-white text-[12px] focus:outline-none disabled:opacity-50 tabular-nums"
                        />
                      </div>
                    ))}
                    <span className="text-[10px] text-muted/50">(optional — leave blank to auto-detect)</span>
                  </div>
                </div>

                {/* Repair mode toggle */}
                <div className="space-y-2">
                  <SectionHeader icon={WrenchIcon} title="Repair Cost Method" />
                  <div className="grid grid-cols-3 gap-2">
                    {REPAIR_MODES.map((m) => {
                      const active = repairMode === m.value;
                      return (
                        <button
                          key={m.value} type="button" disabled={disabled}
                          onClick={() => setRepairMode(m.value)}
                          className="text-left rounded-lg px-3 py-2.5 border transition-all disabled:opacity-50"
                          style={{
                            background:  active ? "rgba(48,125,192,0.12)" : "transparent",
                            borderColor: active ? "rgba(48,125,192,0.5)"  : "var(--color-edge)",
                          }}
                        >
                          <p className="text-[12px] font-bold" style={{ color: active ? "#307DC0" : "#fff" }}>{m.label}</p>
                          <p className="text-[10px] text-muted mt-0.5">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2-column grid */}
                <div className="grid grid-cols-2 gap-6">

                  {/* ── Left: Deal Settings (unchanged across all modes) ── */}
                  <div className="space-y-4">
                    <SectionHeader icon={SlidersHorizontal} title="Deal Settings" />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Market Multiplier</label>
                        <span className="text-brand text-[13px] font-semibold tabular-nums">{marketMultiplier.toFixed(1)}×</span>
                      </div>
                      <input type="range" min={0.5} max={3.0} step={0.1} value={marketMultiplier}
                        onChange={(e) => setMarketMultiplier(parseFloat(e.target.value))}
                        disabled={disabled} className="w-full accent-brand disabled:opacity-50"
                      />
                      <div className="flex justify-between text-muted text-[10px]">
                        <span>0.5× Low-cost</span><span>3.0× High-end</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Investor Profit</label>
                      <div className="flex items-center bg-surface border border-edge rounded-lg overflow-hidden focus-within:border-brand transition-colors">
                        <input type="number" min={1} max={99} value={investorProfitPct === 0 ? "" : investorProfitPct}
                          onChange={(e) => { if (e.target.value === "") { setInvestorProfitPct(0); return; } const n = parseInt(e.target.value, 10); if (!isNaN(n)) setInvestorProfitPct(n); }}
                          onBlur={() => setInvestorProfitPct((prev) => Math.max(1, Math.min(99, prev || 20)))}
                          disabled={disabled}
                          className="flex-1 bg-transparent px-3.5 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-muted text-[13px] pr-3.5">%</span>
                      </div>
                      <p className="text-muted text-[10px]">% of net sales price (ARV × 0.92)</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Min. Assignment Fee</label>
                        <span className="text-brand text-[13px] font-semibold tabular-nums">${assignmentFee.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center bg-surface border border-edge rounded-lg overflow-hidden focus-within:border-brand transition-colors">
                        <span className="text-muted text-[13px] pl-3">$</span>
                        <input type="text" value={assignmentFee.toLocaleString()}
                          onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); setAssignmentFee(isNaN(v) ? 0 : v); }}
                          disabled={disabled}
                          className="flex-1 bg-transparent px-2 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50 tabular-nums"
                        />
                      </div>
                      <p className="text-muted text-[10px]">Deducted from Max Offer (low &amp; high)</p>
                    </div>

                    {(repairMode === "scope_known" || repairMode === "standard") && (
                      <NotesField value={notes} onChange={setNotes} disabled={disabled} />
                    )}
                  </div>

                  {/* ── Right: mode-specific repair UI ── */}
                  <div className="space-y-4">

                    {/* ── MODE 1: Cost Known ── */}
                    {repairMode === "known_cost" && (
                      <>
                        <div className="space-y-2">
                          <SectionHeader icon={WrenchIcon} title="Known Repair Cost" />
                          <p className="text-muted text-[11px]">Enter the exact repair cost you already have for this property. Condition will be assessed by AI from photos.</p>
                          <div className="flex items-center bg-surface border border-edge rounded-lg overflow-hidden focus-within:border-brand transition-colors">
                            <span className="text-muted text-[13px] pl-3">$</span>
                            <input
                              type="text"
                              value={knownRepairCost === 0 ? "" : knownRepairCost.toLocaleString()}
                              onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); setKnownRepairCost(isNaN(v) ? 0 : v); }}
                              placeholder="0"
                              disabled={disabled}
                              className="flex-1 bg-transparent px-2 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50 tabular-nums"
                            />
                          </div>
                          {knownRepairCost > 0 && (
                            <p className="text-brand text-[12px] font-semibold tabular-nums">{fmtCost(knownRepairCost)} in repair costs</p>
                          )}
                        </div>
                        <NotesField value={notes} onChange={setNotes} disabled={disabled} />
                      </>
                    )}

                    {/* ── MODE 2: Scope Known ── */}
                    {repairMode === "scope_known" && (
                      <>
                        {/* Compact condition picker */}
                        <div className="space-y-2">
                          <SectionHeader icon={Home} title="Property Condition" />
                          <div className="grid grid-cols-4 gap-1.5">
                            {CONDITION_OPTIONS.map((o) => {
                              const active = condition === o.value;
                              return (
                                <button
                                  key={o.value} type="button" disabled={disabled}
                                  onClick={() => setCondition(o.value)}
                                  className="relative text-center rounded-lg px-2 py-2 border transition-all disabled:opacity-50"
                                  style={{
                                    background:  active ? `rgba(${o.rgb},0.12)` : "transparent",
                                    borderColor: active ? `rgba(${o.rgb},0.5)`  : "var(--color-edge)",
                                  }}
                                >
                                  {active && (
                                    <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: o.color }}>
                                      <Check size={8} className="text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                  <p className="text-[11px] font-bold" style={{ color: active ? o.color : "#fff" }}>{o.label}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Repair items + custom items */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <SectionHeader icon={WrenchIcon} title="Repair Items" />
                            {scopeTotal > 0 && <p className="text-brand text-[12px] font-semibold tabular-nums">+{fmtCost(scopeTotal)} total</p>}
                          </div>

                          <div className="space-y-1.5">
                            {extraItems.map((item, i) => (
                              <React.Fragment key={item.label}>
                                {i === 4 && <div className="pt-1"><div className="border-t border-edge" /></div>}
                                <div className="flex items-center gap-2.5">
                                  <input type="checkbox" id={`item-${i}`} checked={item.checked}
                                    onChange={() => toggleItem(i)} disabled={disabled}
                                    className="w-4 h-4 accent-brand shrink-0 disabled:opacity-50"
                                  />
                                  <label htmlFor={`item-${i}`} className={`flex-1 text-[12px] cursor-pointer select-none ${item.checked ? "text-white" : "text-muted"}`}>
                                    {item.label}
                                  </label>
                                  <div className="flex items-center">
                                    <span className="text-muted text-[11px] mr-1">$</span>
                                    <input type="text" value={item.cost.toLocaleString()}
                                      onChange={(e) => updateItemCost(i, e.target.value)}
                                      disabled={disabled || !item.checked}
                                      className="w-20 bg-surface border border-edge rounded px-2 py-1 text-white text-[12px] text-right focus:outline-none focus:border-brand transition-colors disabled:opacity-40 tabular-nums"
                                    />
                                  </div>
                                </div>
                              </React.Fragment>
                            ))}

                            {/* User-added custom items */}
                            {customItems.length > 0 && (
                              <div className="pt-1">
                                <div className="border-t border-edge mb-1.5" />
                                {customItems.map((item, i) => (
                                  <div key={i} className="flex items-center gap-2.5 mb-1.5">
                                    <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-brand" />
                                    </div>
                                    <span className="flex-1 text-[12px] text-white">{item.label}</span>
                                    <span className="text-[12px] text-brand font-semibold tabular-nums">{fmtCost(item.cost)}</span>
                                    <button type="button" onClick={() => removeCustomItem(i)} disabled={disabled}
                                      className="text-muted hover:text-uw-danger transition-colors disabled:opacity-50">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add custom item row */}
                            <div className="pt-1.5 border-t border-edge">
                              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Add Custom Item</p>
                              <div className="flex gap-2">
                                <input
                                  type="text" value={newItemLabel}
                                  onChange={(e) => { setNewItemLabel(e.target.value); setAddItemErr(""); }}
                                  placeholder="Item name"
                                  disabled={disabled}
                                  className="flex-1 bg-surface border border-edge rounded px-2.5 py-1.5 text-white text-[12px] placeholder:text-muted focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                                />
                                <div className="flex items-center bg-surface border border-edge rounded overflow-hidden focus-within:border-brand transition-colors">
                                  <span className="text-muted text-[11px] pl-2">$</span>
                                  <input
                                    type="text" value={newItemCost}
                                    onChange={(e) => { setNewItemCost(e.target.value.replace(/[^0-9]/g, "")); setAddItemErr(""); }}
                                    placeholder="0"
                                    disabled={disabled}
                                    className="w-20 bg-transparent px-1.5 py-1.5 text-white text-[12px] focus:outline-none disabled:opacity-50 tabular-nums"
                                  />
                                </div>
                                <button
                                  type="button" onClick={addCustomItem} disabled={disabled}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold transition-colors disabled:opacity-50"
                                  style={{ background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.3)", color: "#307DC0" }}
                                >
                                  <Plus size={11} /> Add
                                </button>
                              </div>
                              {addItemErr && <p className="text-uw-danger text-[11px] mt-1">{addItemErr}</p>}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── MODE 3: Standard ── */}
                    {repairMode === "standard" && (
                      <>
                        {/* Condition cards */}
                        <div className="space-y-2">
                          <SectionHeader icon={Home} title="Property Condition" />
                          <div className="grid grid-cols-4 gap-2">
                            {CONDITION_OPTIONS.map((o) => {
                              const active = condition === o.value;
                              return (
                                <button
                                  key={o.value} type="button" disabled={disabled}
                                  onClick={() => setCondition(o.value)}
                                  className="relative text-left rounded-lg px-3 py-2.5 border transition-all disabled:opacity-50"
                                  style={{
                                    background:  active ? `rgba(${o.rgb},0.12)` : "transparent",
                                    borderColor: active ? `rgba(${o.rgb},0.5)`  : "var(--color-edge)",
                                  }}
                                >
                                  {active && (
                                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: o.color }}>
                                      <Check size={10} className="text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                  <p className="text-[12px] font-bold" style={{ color: active ? o.color : "#fff" }}>{o.label}</p>
                                  <p className="text-[10px] text-muted mt-0.5">{o.sqft}</p>
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom per-sqft override */}
                          <div className="flex items-center gap-3 pt-1">
                            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">Custom $/sqft</label>
                            <div className="flex items-center bg-surface border border-edge rounded overflow-hidden focus-within:border-brand transition-colors">
                              <span className="text-muted text-[12px] pl-2">$</span>
                              <input
                                type="text"
                                value={customPerSqft === 0 ? "" : customPerSqft}
                                onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); setCustomPerSqft(isNaN(v) ? 0 : v); }}
                                placeholder="—"
                                disabled={disabled}
                                className="w-12 bg-transparent px-1 py-1.5 text-white text-[12px] focus:outline-none disabled:opacity-50 tabular-nums"
                              />
                              <span className="text-muted text-[11px] pr-2">/sqft</span>
                            </div>
                            <span className="text-muted text-[10px] whitespace-nowrap">Default: {selectedOpt.sqft}</span>
                          </div>
                        </div>

                        {/* Extra items */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <SectionHeader icon={WrenchIcon} title="Additional Repair Items" />
                            {(standardItemsTotal + customItemsTotal) > 0 && (
                              <p className="text-brand text-[12px] font-semibold tabular-nums">+{fmtCost(standardItemsTotal + customItemsTotal)} selected</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {extraItems.map((item, i) => (
                              <React.Fragment key={item.label}>
                                {i === 4 && (
                                  <div className="pt-1">
                                    <div className="border-t border-edge" />
                                    {condition === "poor" && (
                                      <p className="mt-2 text-[11px] text-uw-warn/80 leading-snug">
                                        Poor condition already includes full gut costs above. Only check foundation if applicable — it is always additive regardless of condition.
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2.5">
                                  <input type="checkbox" id={`item-${i}`} checked={item.checked}
                                    onChange={() => toggleItem(i)} disabled={disabled}
                                    className="w-4 h-4 accent-brand shrink-0 disabled:opacity-50"
                                  />
                                  <label htmlFor={`item-${i}`} className={`flex-1 text-[13px] cursor-pointer select-none ${item.checked ? "text-white" : "text-muted"}`}>
                                    {item.label}
                                  </label>
                                  <div className="flex items-center">
                                    <span className="text-muted text-[12px] mr-1">$</span>
                                    <input type="text" value={item.cost.toLocaleString()}
                                      onChange={(e) => updateItemCost(i, e.target.value)}
                                      disabled={disabled || !item.checked}
                                      className="w-20 bg-surface border border-edge rounded px-2 py-1 text-white text-[12px] text-right focus:outline-none focus:border-brand transition-colors disabled:opacity-40 tabular-nums"
                                    />
                                  </div>
                                </div>
                              </React.Fragment>
                            ))}

                            {/* User-added custom items */}
                            {customItems.length > 0 && (
                              <div className="pt-1">
                                <div className="border-t border-edge mb-1.5" />
                                {customItems.map((item, i) => (
                                  <div key={i} className="flex items-center gap-2.5 mb-1.5">
                                    <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-brand" />
                                    </div>
                                    <span className="flex-1 text-[12px] text-white">{item.label}</span>
                                    <span className="text-[12px] text-brand font-semibold tabular-nums">{fmtCost(item.cost)}</span>
                                    <button type="button" onClick={() => removeCustomItem(i)} disabled={disabled}
                                      className="text-muted hover:text-uw-danger transition-colors disabled:opacity-50">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add custom item row */}
                            <div className="pt-1.5 border-t border-edge">
                              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Add Custom Item</p>
                              <div className="flex gap-2">
                                <input
                                  type="text" value={newItemLabel}
                                  onChange={(e) => { setNewItemLabel(e.target.value); setAddItemErr(""); }}
                                  placeholder="Item name"
                                  disabled={disabled}
                                  className="flex-1 bg-surface border border-edge rounded px-2.5 py-1.5 text-white text-[12px] placeholder:text-muted focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                                />
                                <div className="flex items-center bg-surface border border-edge rounded overflow-hidden focus-within:border-brand transition-colors">
                                  <span className="text-muted text-[11px] pl-2">$</span>
                                  <input
                                    type="text" value={newItemCost}
                                    onChange={(e) => { setNewItemCost(e.target.value.replace(/[^0-9]/g, "")); setAddItemErr(""); }}
                                    placeholder="0"
                                    disabled={disabled}
                                    className="w-20 bg-transparent px-1.5 py-1.5 text-white text-[12px] focus:outline-none disabled:opacity-50 tabular-nums"
                                  />
                                </div>
                                <button
                                  type="button" onClick={addCustomItem} disabled={disabled}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold transition-colors disabled:opacity-50"
                                  style={{ background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.3)", color: "#307DC0" }}
                                >
                                  <Plus size={11} /> Add
                                </button>
                              </div>
                              {addItemErr && <p className="text-uw-danger text-[11px] mt-1">{addItemErr}</p>}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Photos — full width */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Property Photos <span className="normal-case text-muted/60 tracking-normal font-normal">(optional)</span>
                    </label>
                    {propertyPhotos.length > 0 && <span className="text-muted text-[11px]">{propertyPhotos.length}/{MAX_PHOTOS}</span>}
                  </div>
                  {propertyPhotos.length > 0 && (
                    <div className="grid grid-cols-8 gap-2">
                      {propertyPhotos.map((photo, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-surface border border-edge group">
                          <img src={`data:${photo.mediaType};base64,${photo.data}`} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removePhoto(i)} disabled={disabled}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden">
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {propertyPhotos.length < MAX_PHOTOS && (
                    <label className={`flex items-center justify-center gap-2 w-full border border-dashed border-edge rounded-lg py-2.5 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand/50 hover:bg-brand/5"}`}>
                      <Upload size={14} className="text-muted" />
                      <span className="text-muted text-[12px]">{propertyPhotos.length === 0 ? "Upload property photos" : "Add more"}</span>
                      <input type="file" accept="image/*" multiple disabled={disabled} onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                  {propertyPhotos.length > 0 && <p className="text-muted/60 text-[11px]">These replace listing photos from Zillow.</p>}
                </div>
              </div>

              {/* Submit */}
              <div className="px-6 py-4 border-t border-edge shrink-0">
                <button type="submit" disabled={!address.trim() || disabled} className="btn-primary w-full">
                  {disabled
                    ? <><Loader2 size={15} className="animate-spin" />Underwriting deal...</>
                    : "Run Underwriting"
                  }
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
