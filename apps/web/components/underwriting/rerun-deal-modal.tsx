"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X, Loader2, CheckCircle2, AlertCircle, RefreshCw, Upload, Plus, ChevronDown,
  Home, SlidersHorizontal, Wrench as WrenchIcon, Check, Trash2,
} from "lucide-react";
import type { ConditionGrade, ExtraItem, UploadedPhoto, NormalizedComp, ManualComp, CompCategory, RepairMode } from "@/lib/underwriting/types";
import { SingleDateInput } from "@/components/ui/date-range-picker";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

// ── Constants ─────────────────────────────────────────────────────────────────

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success" }
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

const COMP_TYPE_OPTIONS: { value: CompCategory | ""; label: string }[] = [
  { value: "",        label: "— Let AI decide —" },
  { value: "arv",     label: "ARV Comp" },
  { value: "turnkey", label: "Turnkey" },
  { value: "as_is",   label: "As-Is" },
];

const CONSTRUCTION_OPTIONS = [
  "", "Wood Frame", "Brick", "Concrete Block", "Stone", "Stucco", "Metal",
];

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

const MAX_PHOTOS = 35;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManualCompForm {
  id: string;
  address: string;
  compType: string;
  salePrice: string;
  saleDate: string;
  beds: string;
  baths: string;
  sqft: string;
  lotSizeSqft: string;
  yearBuilt: string;
  constructionType: string;
  expanded: boolean;
}

interface EditableCompForm {
  included: boolean;
  address: string;
  salePrice: string;
  sqft: string;
  lotSizeSqft: string;
  pricePerSqft: string;
  beds: string;
  baths: string;
  saleDate: string;
  category: CompCategory | "";
  photos: string[];
}

interface Props {
  dealId: string;
  address: string;
  initialCondition: ConditionGrade;
  initialMultiplier: number;
  initialCheckedItems: { label: string; cost: number }[];
  initialInvestorProfitPct: number;
  initialAssignmentFee: number;
  initialNotes: string;
  existingComps: NormalizedComp[];
  initialRepairMode: RepairMode;
  initialKnownRepairCost: number;
  initialCustomPerSqft: number;
  initialCustomItems: { label: string; cost: number }[];
  initialBeds?: number | null;
  initialBaths?: number | null;
  initialSqft?: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildInitialItems(checkedItems: { label: string; cost: number }[]): ExtraItem[] {
  return DEFAULT_EXTRA_ITEMS.map((item) => {
    const found = checkedItems.find((c) => c.label === item.label);
    return found ? { ...item, cost: found.cost, checked: true } : item;
  });
}

function buildEditableComps(comps: NormalizedComp[]): EditableCompForm[] {
  return comps.map((c) => ({
    included: true,
    address: c.address,
    salePrice: c.salePrice ? String(c.salePrice) : "",
    sqft: c.sqft ? String(c.sqft) : "",
    lotSizeSqft: c.lotSizeSqft ? String(c.lotSizeSqft) : "",
    pricePerSqft: c.pricePerSqft ? String(c.pricePerSqft) : "",
    beds: c.beds ? String(c.beds) : "",
    baths: c.baths ? String(c.baths) : "",
    saleDate: c.saleDate ?? "",
    category: c.category ?? "",
    photos: c.photos ?? [],
  }));
}

function newCompForm(): ManualCompForm {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    address: "", compType: "", salePrice: "", saleDate: "",
    beds: "", baths: "", sqft: "", lotSizeSqft: "",
    yearBuilt: "", constructionType: "", expanded: false,
  };
}

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

function catBadge(cat: string | null) {
  if (!cat) return null;
  const map: Record<string, string> = {
    arv:     "bg-brand/10 text-brand border-brand/20",
    turnkey: "bg-uw-success/10 text-uw-success border-uw-success/20",
    as_is:   "bg-uw-warn/10 text-uw-warn border-uw-warn/20",
  };
  const labels: Record<string, string> = { arv: "ARV", turnkey: "Turnkey", as_is: "As-Is" };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${map[cat] ?? ""}`}>
      {labels[cat] ?? cat}
    </span>
  );
}

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

// ── Component ─────────────────────────────────────────────────────────────────

export function RerunDealModal({
  dealId, address, initialCondition, initialMultiplier, initialCheckedItems,
  initialInvestorProfitPct, initialAssignmentFee, initialNotes, existingComps,
  initialRepairMode, initialKnownRepairCost, initialCustomPerSqft, initialCustomItems,
  initialBeds, initialBaths, initialSqft,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "comps" | "photos">("settings");

  // Core inputs
  const [notes, setNotes] = useState(initialNotes);
  const [condition, setCondition] = useState<ConditionGrade>(initialCondition);
  const [marketMultiplier, setMarketMultiplier] = useState(initialMultiplier);
  const [investorProfitPct, setInvestorProfitPct] = useState(Math.round(initialInvestorProfitPct * 100));
  const [assignmentFee, setAssignmentFee] = useState(initialAssignmentFee);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>(() => buildInitialItems(initialCheckedItems));
  const [propertyPhotos, setPropertyPhotos] = useState<UploadedPhoto[]>([]);

  // Repair mode
  const [repairMode, setRepairMode] = useState<RepairMode>(initialRepairMode);
  const [knownRepairCost, setKnownRepairCost] = useState(initialKnownRepairCost);
  const [customPerSqft, setCustomPerSqft] = useState(initialCustomPerSqft);
  const [customItems, setCustomItems] = useState<{ label: string; cost: number }[]>(initialCustomItems);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [addItemErr, setAddItemErr] = useState("");

  const [arvSqftOverride, setArvSqftOverride] = useState("");

  // Property overrides — empty = keep original, typed value = override
  const [overrideBeds,  setOverrideBeds]  = useState("");
  const [overrideBaths, setOverrideBaths] = useState("");
  const [overrideSqft,  setOverrideSqft]  = useState("");

  // Comp management
  const [editableComps, setEditableComps] = useState<EditableCompForm[]>(() => buildEditableComps(existingComps));
  const [manualComps, setManualComps] = useState<ManualCompForm[]>([]);


  const [state, setState] = useState<State>({ phase: "idle" });

  function reset() {
    setNotes(initialNotes);
    setCondition(initialCondition);
    setMarketMultiplier(initialMultiplier);
    setInvestorProfitPct(Math.round(initialInvestorProfitPct * 100));
    setAssignmentFee(initialAssignmentFee);
    setExtraItems(buildInitialItems(initialCheckedItems));
    setPropertyPhotos([]);
    setRepairMode(initialRepairMode);
    setKnownRepairCost(initialKnownRepairCost);
    setCustomPerSqft(initialCustomPerSqft);
    setCustomItems(initialCustomItems);
    setNewItemLabel(""); setNewItemCost(""); setAddItemErr("");
    setArvSqftOverride("");
    setOverrideBeds(""); setOverrideBaths(""); setOverrideSqft("");
    setEditableComps(buildEditableComps(existingComps));
    setManualComps([]);
    setActiveTab("settings");
    setState({ phase: "idle" });
  }

  // Extra items
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

  // Photos
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const compressed = await Promise.all(files.slice(0, MAX_PHOTOS - propertyPhotos.length).map(compressImage));
    setPropertyPhotos((prev) => [...prev, ...compressed]);
  }
  function removePhoto(i: number) {
    setPropertyPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Existing comps
  function updateEditableComp(i: number, field: keyof EditableCompForm, value: string | boolean) {
    setEditableComps((prev) => prev.map((c, idx) => {
      if (idx !== i) return c;
      const updated = { ...c, [field]: value };
      // Auto-recalculate $/SF when price or sqft changes
      if (field === "salePrice" || field === "sqft") {
        const price = parseInt((field === "salePrice" ? value as string : updated.salePrice).replace(/[^0-9]/g, ""), 10);
        const sqft  = parseInt((field === "sqft"       ? value as string : updated.sqft).replace(/[^0-9]/g, ""), 10);
        if (price > 0 && sqft > 0) updated.pricePerSqft = String(Math.round(price / sqft));
      }
      return updated;
    }));
  }

  // Manual comps
  function addManualComp() {
    setManualComps((prev) => [...prev, newCompForm()]);
  }
  function removeManualComp(id: string) {
    setManualComps((prev) => prev.filter((c) => c.id !== id));
  }
  function updateComp(id: string, field: keyof ManualCompForm, value: string | boolean) {
    setManualComps((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ phase: "loading" });

    const baseComps: NormalizedComp[] = editableComps
      .filter((c) => c.included)
      .map((c) => {
        const sqft       = parseInt(c.sqft.replace(/[^0-9]/g, ""), 10) || 0;
        const salePrice  = parseInt(c.salePrice.replace(/[^0-9]/g, ""), 10) || 0;
        const psf        = parseFloat(c.pricePerSqft) || (sqft > 0 ? Math.round(salePrice / sqft) : 0);
        const lotSizeSqft = parseInt(c.lotSizeSqft.replace(/[^0-9]/g, ""), 10) || undefined;
        return {
          address:      c.address,
          salePrice,
          saleDate:     c.saleDate,
          sqft,
          lotSizeSqft,
          pricePerSqft: psf,
          beds:         parseFloat(c.beds) || 0,
          baths:        parseFloat(c.baths) || 0,
          photos:       c.photos,
          category:     (c.category as CompCategory) || null,
        };
      });

    const manualCompsPayload: ManualComp[] = manualComps
      .filter((c) => c.address.trim())
      .map((c) => ({
        address: c.address.trim(),
        ...(c.compType         ? { compType: c.compType as CompCategory }        : {}),
        ...(c.salePrice        ? { salePrice: parseInt(c.salePrice.replace(/[^0-9]/g, ""), 10) }  : {}),
        ...(c.saleDate         ? { saleDate: c.saleDate }                         : {}),
        ...(c.beds             ? { beds: parseFloat(c.beds) }                     : {}),
        ...(c.baths            ? { baths: parseFloat(c.baths) }                   : {}),
        ...(c.sqft             ? { sqft: parseInt(c.sqft.replace(/[^0-9]/g, ""), 10) }            : {}),
        ...(c.lotSizeSqft      ? { lotSizeSqft: parseInt(c.lotSizeSqft.replace(/[^0-9]/g, ""), 10) } : {}),
        ...(c.yearBuilt        ? { yearBuilt: parseInt(c.yearBuilt, 10) }         : {}),
        ...(c.constructionType ? { constructionType: c.constructionType }         : {}),
      }));

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
      const propOverrides: Record<string, number> = {};
      if (overrideBeds.trim())  propOverrides.beds  = parseFloat(overrideBeds);
      if (overrideBaths.trim()) propOverrides.baths = parseFloat(overrideBaths);
      if (overrideSqft.trim())  propOverrides.sqft  = parseInt(overrideSqft.replace(/[^0-9]/g, ""), 10);

      const body: Record<string, unknown> = {
        dealId,
        address,
        notes: notes.trim() || undefined,
        overrides: Object.keys(propOverrides).length > 0 ? propOverrides : undefined,
        repairMode,
        marketMultiplier,
        investorProfitPct: investorProfitPct / 100,
        assignmentFee,
        extraItems: submitExtraItems,
        baseComps,
        manualComps: manualCompsPayload.length > 0 ? manualCompsPayload : undefined,
        propertyPhotos: propertyPhotos.length > 0 ? propertyPhotos : undefined,
        arvOverride: arvSqftOverride
          ? { mode: "per_sqft" as const, value: parseFloat(arvSqftOverride) }
          : undefined,
      };

      if (repairMode === "known_cost") {
        body.knownRepairCost = knownRepairCost;
      } else {
        body.condition = condition;
        if (repairMode === "standard") body.customPerSqft = customPerSqft;
      }

      const res = await fetch("/api/underwrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setState({ phase: "error", message: data.error ?? "Something went wrong." });
        return;
      }
      setState({ phase: "success" });
      setOpen(false);
      router.refresh();
    } catch {
      setState({ phase: "error", message: "Network error — please try again." });
    }
  }

  const disabled = state.phase === "loading";
  const includedCount = editableComps.filter((c) => c.included).length;
  const selectedOpt = CONDITION_OPTIONS.find((o) => o.value === condition)!;
  const standardItemsTotal = extraItems.filter((i) => i.checked).reduce((s, i) => s + i.cost, 0);
  const customItemsTotal   = customItems.reduce((s, i) => s + i.cost, 0);
  const checkedDefaultTotal = standardItemsTotal;
  const scopeTotal = checkedDefaultTotal + customItemsTotal;
  function fmtCost(n: number) { return "$" + n.toLocaleString(); }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-uw-warn/10 border border-uw-warn/30 text-uw-warn hover:bg-uw-warn/20 hover:border-uw-warn/50 text-[12px] font-semibold transition-colors print:hidden">
          <RefreshCw size={13} />
          Re-run
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content onInteractOutside={(e) => e.preventDefault()} className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl bg-card border border-edge rounded-2xl shadow-2xl focus:outline-none flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
            <div>
              <Dialog.Title className="text-white font-semibold text-base">Re-run Underwriting</Dialog.Title>
              <p className="text-muted text-[12px] mt-0.5 truncate max-w-sm">{address}</p>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted hover:text-white transition-colors"><X size={18} /></button>
            </Dialog.Close>
          </div>

          {/* Success */}
          {state.phase === "success" && (
            <div className="flex flex-col items-center text-center py-10 px-6 gap-3">
              <CheckCircle2 size={40} className="text-brand" strokeWidth={1.5} />
              <p className="text-white font-medium">Re-run complete</p>
              <p className="text-muted text-sm">Report updated with fresh analysis.</p>
            </div>
          )}

          {/* Error */}
          {state.phase === "error" && (
            <div className="flex flex-col items-center text-center py-10 px-6 gap-3">
              <AlertCircle size={40} className="text-uw-danger" strokeWidth={1.5} />
              <p className="text-white font-medium">Something went wrong</p>
              <p className="text-muted text-sm max-w-sm">{state.message}</p>
              <button onClick={() => setState({ phase: "idle" })} className="btn-primary mt-2">
                Try again
              </button>
            </div>
          )}

          {/* Form */}
          {(state.phase === "idle" || state.phase === "loading") && (
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">

              {/* Address + tabs — fixed, never scrolls */}
              <div className="px-6 pt-2 pb-0 shrink-0 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Property Address</label>
                  <input type="text" value={address} readOnly
                    className="w-full bg-surface/50 border border-edge rounded-lg px-3.5 py-2.5 text-muted text-sm focus:outline-none cursor-not-allowed"
                  />
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">Override:</span>
                    {[
                      { label: "Beds",  value: overrideBeds,  set: setOverrideBeds,  ph: initialBeds  != null ? String(initialBeds)  : "—" },
                      { label: "Baths", value: overrideBaths, set: setOverrideBaths, ph: initialBaths != null ? String(initialBaths) : "—" },
                      { label: "Sqft",  value: overrideSqft,  set: setOverrideSqft,  ph: initialSqft  != null ? String(initialSqft)  : "—" },
                    ].map(({ label, value, set, ph }) => (
                      <div key={label} className="flex items-center bg-surface border border-edge rounded overflow-hidden focus-within:border-brand transition-colors">
                        <span className="text-[10px] text-muted pl-2 pr-1 whitespace-nowrap">{label}</span>
                        <input
                          type="text" value={value}
                          onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder={ph}
                          disabled={disabled}
                          className="w-14 bg-transparent px-1 py-1.5 text-white text-[12px] focus:outline-none disabled:opacity-50 tabular-nums"
                        />
                      </div>
                    ))}
                    <span className="text-[10px] text-muted/50">(leave blank to keep original)</span>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 border-b border-edge">
                  {(["settings", "comps", "photos"] as const).map((tab) => {
                    const labels: Record<string, string> = {
                      settings: "Settings",
                      comps: `Comps${editableComps.length > 0 ? ` (${includedCount}/${editableComps.length})` : ""}`,
                      photos: `Photos${propertyPhotos.length > 0 ? ` (${propertyPhotos.length})` : ""}`,
                    };
                    return (
                      <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-[12px] font-semibold transition-colors border-b-2 -mb-px ${
                          activeTab === tab
                            ? "text-white border-brand"
                            : "text-muted border-transparent hover:text-white/70"
                        }`}
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content — scrollable */}
              <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">

                {/* ── Settings tab ────────────────────────────────────────── */}
                {activeTab === "settings" && (<>

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

                {/* 2-col: Deal Settings + Repair UI */}
                <div className="grid grid-cols-2 gap-6">

                  {/* ── Left: Deal Settings ── */}
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
                        <input type="number" min={0} max={99} value={investorProfitPct}
                          onChange={(e) => { const n = parseInt(e.target.value, 10); setInvestorProfitPct(isNaN(n) ? 0 : n); }}
                          onBlur={() => setInvestorProfitPct((prev) => Math.max(0, Math.min(99, prev)))}
                          disabled={disabled}
                          className="flex-1 bg-transparent px-3.5 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-muted text-[13px] pr-3.5">%</span>
                      </div>
                      <p className="text-muted text-[10px]">% of net sales price (ARV × 0.92)</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Min. Assignment Fee</label>
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

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                        ARV Value Override <span className="normal-case text-muted/60 tracking-normal font-normal">(optional)</span>
                      </label>
                      <div className="flex items-center bg-surface border border-edge rounded-lg overflow-hidden focus-within:border-brand transition-colors">
                        <input type="text" value={arvSqftOverride}
                          onChange={(e) => setArvSqftOverride(e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder="e.g. 170"
                          disabled={disabled}
                          className="flex-1 bg-transparent px-3.5 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50 tabular-nums"
                        />
                        <span className="text-muted text-[13px] pr-3.5">$/sqft</span>
                      </div>
                      <p className="text-muted text-[10px]">Overrides comp-based ARV estimate. Leave blank to use comps.</p>
                    </div>

                    {(repairMode === "scope_known" || repairMode === "standard") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                          Notes <span className="normal-case text-muted/60 tracking-normal font-normal">(optional)</span>
                        </label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                          placeholder="Updated observations, new info from site visit..."
                          rows={3} disabled={disabled}
                          className="w-full bg-surface border border-edge rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-muted focus:outline-none focus:border-brand transition-colors resize-none disabled:opacity-50"
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Right: mode-specific repair UI ── */}
                  <div className="space-y-4">

                    {/* ── MODE 1: Cost Known ── */}
                    {repairMode === "known_cost" && (
                      <>
                        <div className="space-y-2">
                          <SectionHeader icon={WrenchIcon} title="Known Repair Cost" />
                          <p className="text-muted text-[11px]">Enter the exact repair cost you already have for this property.</p>
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
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                            Notes <span className="normal-case text-muted/60 tracking-normal font-normal">(optional)</span>
                          </label>
                          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                            placeholder="Updated observations, new info from site visit..."
                            rows={3} disabled={disabled}
                            className="w-full bg-surface border border-edge rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-muted focus:outline-none focus:border-brand transition-colors resize-none disabled:opacity-50"
                          />
                        </div>
                      </>
                    )}

                    {/* ── MODE 2: Scope Known ── */}
                    {repairMode === "scope_known" && (
                      <>
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
                                  <input type="checkbox" id={`rerun-item-${i}`} checked={item.checked}
                                    onChange={() => toggleItem(i)} disabled={disabled}
                                    className="w-4 h-4 accent-brand shrink-0 disabled:opacity-50"
                                  />
                                  <label htmlFor={`rerun-item-${i}`} className={`flex-1 text-[12px] cursor-pointer select-none ${item.checked ? "text-white" : "text-muted"}`}>
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

                            <div className="pt-1.5 border-t border-edge">
                              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Add Custom Item</p>
                              <div className="flex gap-2">
                                <input type="text" value={newItemLabel}
                                  onChange={(e) => { setNewItemLabel(e.target.value); setAddItemErr(""); }}
                                  placeholder="Item name" disabled={disabled}
                                  className="flex-1 bg-surface border border-edge rounded px-2.5 py-1.5 text-white text-[12px] placeholder:text-muted focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                                />
                                <div className="flex items-center bg-surface border border-edge rounded overflow-hidden focus-within:border-brand transition-colors">
                                  <span className="text-muted text-[11px] pl-2">$</span>
                                  <input type="text" value={newItemCost}
                                    onChange={(e) => { setNewItemCost(e.target.value.replace(/[^0-9]/g, "")); setAddItemErr(""); }}
                                    placeholder="0" disabled={disabled}
                                    className="w-20 bg-transparent px-1.5 py-1.5 text-white text-[12px] focus:outline-none disabled:opacity-50 tabular-nums"
                                  />
                                </div>
                                <button type="button" onClick={addCustomItem} disabled={disabled}
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

                          <div className="flex items-center gap-3 pt-1">
                            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">Custom $/sqft</label>
                            <div className="flex items-center bg-surface border border-edge rounded overflow-hidden focus-within:border-brand transition-colors">
                              <span className="text-muted text-[12px] pl-2">$</span>
                              <input type="text"
                                value={customPerSqft === 0 ? "" : customPerSqft}
                                onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); setCustomPerSqft(isNaN(v) ? 0 : v); }}
                                placeholder="—" disabled={disabled}
                                className="w-12 bg-transparent px-1 py-1.5 text-white text-[12px] focus:outline-none disabled:opacity-50 tabular-nums"
                              />
                              <span className="text-muted text-[11px] pr-2">/sqft</span>
                            </div>
                            <span className="text-muted text-[10px] whitespace-nowrap">Default: {selectedOpt.sqft}</span>
                          </div>
                        </div>

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
                                        Poor condition already includes full gut costs above. Only check foundation if applicable.
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2.5">
                                  <input type="checkbox" id={`rerun-item-${i}`} checked={item.checked}
                                    onChange={() => toggleItem(i)} disabled={disabled}
                                    className="w-4 h-4 accent-brand shrink-0 disabled:opacity-50"
                                  />
                                  <label htmlFor={`rerun-item-${i}`} className={`flex-1 text-[13px] cursor-pointer select-none ${item.checked ? "text-white" : "text-muted"}`}>
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

                            <div className="pt-1.5 border-t border-edge">
                              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Add Custom Item</p>
                              <div className="flex gap-2">
                                <input type="text" value={newItemLabel}
                                  onChange={(e) => { setNewItemLabel(e.target.value); setAddItemErr(""); }}
                                  placeholder="Item name" disabled={disabled}
                                  className="flex-1 bg-surface border border-edge rounded px-2.5 py-1.5 text-white text-[12px] placeholder:text-muted focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                                />
                                <div className="flex items-center bg-surface border border-edge rounded overflow-hidden focus-within:border-brand transition-colors">
                                  <span className="text-muted text-[11px] pl-2">$</span>
                                  <input type="text" value={newItemCost}
                                    onChange={(e) => { setNewItemCost(e.target.value.replace(/[^0-9]/g, "")); setAddItemErr(""); }}
                                    placeholder="0" disabled={disabled}
                                    className="w-20 bg-transparent px-1.5 py-1.5 text-white text-[12px] focus:outline-none disabled:opacity-50 tabular-nums"
                                  />
                                </div>
                                <button type="button" onClick={addCustomItem} disabled={disabled}
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

                </>)}

                {/* ── Comps tab ────────────────────────────────────────────── */}
                {activeTab === "comps" && (<>

                {/* ── Existing Comps ──────────────────────────────────────── */}
                {editableComps.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Comps from Previous Run</label>
                      <span className="text-muted text-[11px]">{includedCount} / {editableComps.length} included</span>
                    </div>
                    <div className="space-y-2">
                      {editableComps.map((comp, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 space-y-2 transition-colors ${
                            comp.included ? "bg-surface border-edge" : "bg-transparent border-edge/40 opacity-50"
                          }`}
                        >
                          {/* Row 1: checkbox + address + category */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={comp.included}
                              onChange={(e) => updateEditableComp(i, "included", e.target.checked)}
                              disabled={disabled}
                              className="w-4 h-4 accent-brand shrink-0 disabled:opacity-50"
                            />
                            <input
                              type="text"
                              value={comp.address}
                              onChange={(e) => updateEditableComp(i, "address", e.target.value)}
                              disabled={disabled || !comp.included}
                              className="flex-1 bg-transparent border-b border-edge text-white text-[12px] placeholder:text-muted/50 focus:outline-none focus:border-brand pb-0.5 transition-colors disabled:opacity-50"
                            />
                            <Select
                              value={comp.category || "_ai"}
                              onValueChange={(v) => updateEditableComp(i, "category", v === "_ai" ? "" : v)}
                              disabled={disabled || !comp.included}
                            >
                              <SelectTrigger placeholder="AI decides" className="w-auto min-w-[120px] text-[10px] py-1 px-2.5 rounded-lg" />
                              <SelectContent>
                                <SelectItem value="_ai">— Let AI decide —</SelectItem>
                                <SelectItem value="arv">ARV Comp</SelectItem>
                                <SelectItem value="turnkey">Turnkey</SelectItem>
                                <SelectItem value="as_is">As-Is</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Row 2: editable fields */}
                          <div className="grid grid-cols-8 gap-1.5 pl-6">
                            {/* Price */}
                            <div className="col-span-2">
                              <label className="text-[9px] text-muted uppercase tracking-wider">Price</label>
                              <div className="flex items-center bg-card border border-edge rounded-md overflow-hidden focus-within:border-brand transition-colors mt-0.5">
                                <span className="text-muted text-[11px] pl-1.5">$</span>
                                <input
                                  type="text"
                                  value={comp.salePrice}
                                  onChange={(e) => updateEditableComp(i, "salePrice", e.target.value.replace(/[^0-9]/g, ""))}
                                  disabled={disabled || !comp.included}
                                  className="flex-1 bg-transparent px-1 py-1 text-white text-[11px] focus:outline-none disabled:opacity-50 tabular-nums"
                                />
                              </div>
                            </div>

                            {/* Sqft */}
                            <div>
                              <label className="text-[9px] text-muted uppercase tracking-wider">Sqft</label>
                              <input
                                type="text"
                                value={comp.sqft}
                                onChange={(e) => updateEditableComp(i, "sqft", e.target.value.replace(/[^0-9]/g, ""))}
                                disabled={disabled || !comp.included}
                                className="mt-0.5 w-full bg-card border border-edge rounded-md px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>

                            {/* $/SF — highlighted */}
                            <div>
                              <label className="text-[9px] text-brand uppercase tracking-wider font-semibold">$/SF</label>
                              <input
                                type="text"
                                value={comp.pricePerSqft}
                                onChange={(e) => updateEditableComp(i, "pricePerSqft", e.target.value.replace(/[^0-9]/g, ""))}
                                disabled={disabled || !comp.included}
                                className="mt-0.5 w-full bg-brand/5 border border-brand/40 rounded-md px-1.5 py-1 text-brand text-[11px] font-semibold focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>

                            {/* Beds */}
                            <div>
                              <label className="text-[9px] text-muted uppercase tracking-wider">Beds</label>
                              <input
                                type="text"
                                value={comp.beds}
                                onChange={(e) => updateEditableComp(i, "beds", e.target.value.replace(/[^0-9.]/g, ""))}
                                disabled={disabled || !comp.included}
                                className="mt-0.5 w-full bg-card border border-edge rounded-md px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>

                            {/* Baths */}
                            <div>
                              <label className="text-[9px] text-muted uppercase tracking-wider">Baths</label>
                              <input
                                type="text"
                                value={comp.baths}
                                onChange={(e) => updateEditableComp(i, "baths", e.target.value.replace(/[^0-9.]/g, ""))}
                                disabled={disabled || !comp.included}
                                className="mt-0.5 w-full bg-card border border-edge rounded-md px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>

                            {/* Lot Size */}
                            <div>
                              <label className="text-[9px] text-muted uppercase tracking-wider">Lot sqft</label>
                              <input
                                type="text"
                                value={comp.lotSizeSqft}
                                placeholder="—"
                                onChange={(e) => updateEditableComp(i, "lotSizeSqft", e.target.value.replace(/[^0-9]/g, ""))}
                                disabled={disabled || !comp.included}
                                className="mt-0.5 w-full bg-card border border-edge rounded-md px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>

                            {/* Date */}
                            <div>
                              <label className="text-[9px] text-muted uppercase tracking-wider">Date</label>
                              <SingleDateInput
                                value={comp.saleDate}
                                onChange={(v) => updateEditableComp(i, "saleDate", v)}
                                disabled={disabled || !comp.included}
                                placeholder="—"
                                className="mt-0.5 w-full bg-card border border-edge rounded-md px-1.5 py-1 text-white text-[11px] focus:outline-none transition-colors disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Add Your Own Comps ──────────────────────────────────── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Add Your Own Comps</label>
                    {manualComps.length > 0 && (
                      <span className="text-muted text-[11px]">{manualComps.length} added</span>
                    )}
                  </div>

                  {manualComps.map((comp) => (
                    <div key={comp.id} className="bg-surface border border-edge rounded-lg p-3 space-y-2.5">

                      {/* Address row */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Full address (required)"
                          value={comp.address}
                          onChange={(e) => updateComp(comp.id, "address", e.target.value)}
                          disabled={disabled}
                          className="flex-1 bg-transparent border-b border-edge text-white text-[13px] placeholder:text-muted/50 focus:outline-none focus:border-brand pb-1 transition-colors disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => removeManualComp(comp.id)}
                          disabled={disabled}
                          className="text-muted hover:text-uw-danger transition-colors disabled:opacity-50 shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Toggle details */}
                      <button
                        type="button"
                        onClick={() => updateComp(comp.id, "expanded", !comp.expanded)}
                        disabled={disabled}
                        className="flex items-center gap-1 text-[11px] text-brand hover:text-brand/80 transition-colors disabled:opacity-50"
                      >
                        <ChevronDown size={12} className={`transition-transform ${comp.expanded ? "rotate-180" : ""}`} />
                        {comp.expanded ? "Hide details" : "Fill in details"}
                        {!comp.expanded && <span className="text-muted normal-case font-normal">(or we'll look up via address)</span>}
                      </button>

                      {comp.expanded && (
                        <div className="space-y-2.5 pt-1 border-t border-edge">

                          {/* Type */}
                          <div>
                            <label className="text-[10px] text-muted uppercase tracking-wider">Comp Type</label>
                            <div className="mt-1">
                              <Select
                                value={comp.compType || "_ai"}
                                onValueChange={(v) => updateComp(comp.id, "compType", v === "_ai" ? "" : v)}
                                disabled={disabled}
                              >
                                <SelectTrigger placeholder="— Let AI decide —" className="text-xs py-2" />
                                <SelectContent>
                                  <SelectItem value="_ai">— Let AI decide —</SelectItem>
                                  <SelectItem value="arv">ARV Comp</SelectItem>
                                  <SelectItem value="turnkey">Turnkey</SelectItem>
                                  <SelectItem value="as_is">As-Is</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Row: Price + Date + Beds + Baths */}
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-[10px] text-muted uppercase tracking-wider">Price Sold</label>
                              <div className="mt-1 flex items-center bg-card border border-edge rounded-md overflow-hidden focus-within:border-brand transition-colors">
                                <span className="text-muted text-[11px] pl-2">$</span>
                                <input
                                  type="text"
                                  placeholder="0"
                                  value={comp.salePrice}
                                  onChange={(e) => updateComp(comp.id, "salePrice", e.target.value.replace(/[^0-9]/g, ""))}
                                  disabled={disabled}
                                  className="flex-1 min-w-0 bg-transparent px-1.5 py-1.5 text-white text-[11px] focus:outline-none disabled:opacity-50 tabular-nums"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted uppercase tracking-wider">Sold Date</label>
                              <SingleDateInput
                                value={comp.saleDate}
                                onChange={(v) => updateComp(comp.id, "saleDate", v)}
                                disabled={disabled}
                                placeholder="—"
                                className="mt-1 w-full bg-card border border-edge rounded-md px-2 py-1.5 text-white text-[11px] focus:outline-none transition-colors disabled:opacity-50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted uppercase tracking-wider">Beds</label>
                              <input type="text" placeholder="—" value={comp.beds}
                                onChange={(e) => updateComp(comp.id, "beds", e.target.value.replace(/[^0-9.]/g, ""))}
                                disabled={disabled}
                                className="mt-1 w-full bg-card border border-edge rounded-md px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted uppercase tracking-wider">Baths</label>
                              <input type="text" placeholder="—" value={comp.baths}
                                onChange={(e) => updateComp(comp.id, "baths", e.target.value.replace(/[^0-9.]/g, ""))}
                                disabled={disabled}
                                className="mt-1 w-full bg-card border border-edge rounded-md px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>
                          </div>

                          {/* Row: Sqft + Lot Size + Year Built + Construction */}
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-[10px] text-muted uppercase tracking-wider">Sqft</label>
                              <input type="text" placeholder="—" value={comp.sqft}
                                onChange={(e) => updateComp(comp.id, "sqft", e.target.value.replace(/[^0-9.]/g, ""))}
                                disabled={disabled}
                                className="mt-1 w-full bg-card border border-edge rounded-md px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted uppercase tracking-wider">Lot sqft</label>
                              <input type="text" placeholder="—" value={comp.lotSizeSqft}
                                onChange={(e) => updateComp(comp.id, "lotSizeSqft", e.target.value.replace(/[^0-9]/g, ""))}
                                disabled={disabled}
                                className="mt-1 w-full bg-card border border-edge rounded-md px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted uppercase tracking-wider">Year Built</label>
                              <input type="text" placeholder="—" value={comp.yearBuilt}
                                onChange={(e) => updateComp(comp.id, "yearBuilt", e.target.value.replace(/[^0-9]/g, ""))}
                                disabled={disabled}
                                className="mt-1 w-full bg-card border border-edge rounded-md px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 tabular-nums"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted uppercase tracking-wider">Construction</label>
                              <div className="mt-1">
                                <Select
                                  value={comp.constructionType || "_none"}
                                  onValueChange={(v) => updateComp(comp.id, "constructionType", v === "_none" ? "" : v)}
                                  disabled={disabled}
                                >
                                  <SelectTrigger placeholder="— None —" className="text-xs py-2" />
                                  <SelectContent>
                                    <SelectItem value="_none">— None —</SelectItem>
                                    {CONSTRUCTION_OPTIONS.filter(Boolean).map((o) => (
                                      <SelectItem key={o} value={o}>{o}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addManualComp}
                    disabled={disabled}
                    className="flex items-center gap-1.5 w-full justify-center py-2 border border-dashed border-edge rounded-lg text-muted hover:text-white hover:border-brand/50 text-[12px] transition-colors disabled:opacity-50"
                  >
                    <Plus size={13} />
                    Add Comp
                  </button>
                </div>

                </>)}

                {/* ── Photos tab ───────────────────────────────────────────── */}
                {activeTab === "photos" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Property Photos <span className="normal-case text-muted/60 tracking-normal font-normal">(optional)</span>
                    </label>
                    {propertyPhotos.length > 0 && <span className="text-muted text-[11px]">{propertyPhotos.length}/{MAX_PHOTOS}</span>}
                  </div>
                  {propertyPhotos.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {propertyPhotos.map((photo, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-surface border border-edge group">
                          <img src={`data:${photo.mediaType};base64,${photo.data}`} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removePhoto(i)} disabled={disabled}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden">
                            <X size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {propertyPhotos.length < MAX_PHOTOS && (
                    <label className={`flex items-center justify-center gap-2 w-full border border-dashed border-edge rounded-lg py-3 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand/50 hover:bg-brand/5"}`}>
                      <Upload size={14} className="text-muted" />
                      <span className="text-muted text-[12px]">{propertyPhotos.length === 0 ? "Upload your own photos" : "Add more"}</span>
                      <input type="file" accept="image/*" multiple disabled={disabled} onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                  {propertyPhotos.length > 0 && <p className="text-muted/60 text-[11px]">These will be used instead of listing photos from Zillow.</p>}
                </div>
                )}

              </div>

              {/* Submit */}
              <div className="px-6 py-4 border-t border-edge shrink-0">
                <button type="submit" disabled={disabled}
                  className="btn-primary w-full"
                >
                  {disabled ? <><Loader2 size={15} className="animate-spin" />Re-running...</> : "Re-run Underwriting"}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
