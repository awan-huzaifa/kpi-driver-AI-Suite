export const FUS_CRITERIA: Record<string, string> = {
  F1: "F1 — Opening & Purpose",
  F2: "F2 — Rapport & Connection",
  F3: "F3 — Qualification Capture",
  F4: "F4 — Motivation Discovery",
  F5: "F5 — Listening & Control",
  F6: "F6 — Objection Handling",
  F7: "F7 — Compliance & CRM",
  F8: "F8 — Soft Skills",
};

export const ACQ_CRITERIA: Record<string, string> = {
  A1: "A1 — Authority & Credibility",
  A2: "A2 — Rapport & Connection",
  A3: "A3 — Motivation & Leverage",
  A4: "A4 — Deal & Property Understanding",
  A5: "A5 — Listening & Control",
  A6: "A6 — Objection Handling",
  A7: "A7 — Compliance & Accuracy",
  A8: "A8 — Soft Skills",
};

export const BASE_CATEGORIES = ["FROM Block", "TO Block"] as const;

export function getDisputeCategories(agentType?: string | null): string[] {
  const criteria =
    agentType === "fus" ? Object.values(FUS_CRITERIA) :
    agentType === "acq" ? Object.values(ACQ_CRITERIA) :
    [];
  return [...BASE_CATEGORIES, ...criteria, "Other"];
}

// Fallback static list (used when agent type unknown)
export const DISPUTE_CATEGORIES = getDisputeCategories(null);

export type DisputeCategory = string;
