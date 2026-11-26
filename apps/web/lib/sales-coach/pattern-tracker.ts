import { FUS_CRITERIA, ACQ_CRITERIA } from "./dispute-constants";

export interface PatternFlag {
  id:         string;   // e.g. "A3"
  label:      string;   // e.g. "Motivation & Leverage"
  failCount:  number;   // how many calls it failed in
  totalCalls: number;   // total scored calls checked
}

interface ScoredCall {
  evaluation?: Record<string, unknown> | null;
}

const CRITERION_LABELS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(FUS_CRITERIA).map(([k, v]) => [k, v.replace(/^F\d+ — /, "")])),
  ...Object.fromEntries(Object.entries(ACQ_CRITERIA).map(([k, v]) => [k, v.replace(/^A\d+ — /, "")])),
};

export function detectPatterns(calls: ScoredCall[], threshold = 3): PatternFlag[] {
  const failCounts: Record<string, number> = {};
  let totalScored = 0;

  for (const call of calls) {
    const ev = call.evaluation as Record<string, unknown> | null;
    if (!ev) continue;
    const criteria = ev.criteria as { id: string; band: string; na: boolean }[] | undefined;
    if (!Array.isArray(criteria) || !criteria.length) continue;
    totalScored++;
    for (const c of criteria) {
      if (!c.na && c.band === "fail") {
        failCounts[c.id] = (failCounts[c.id] ?? 0) + 1;
      }
    }
  }

  if (totalScored === 0) return [];

  return Object.entries(failCounts)
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([id, failCount]) => ({
      id,
      label:      CRITERION_LABELS[id] ?? id,
      failCount,
      totalCalls: totalScored,
    }));
}
