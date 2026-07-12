import { createAdminClient } from "@/lib/supabase/admin";

export interface CostBreakdown {
  property_api_1?: number;
  property_api_2?: number;
  ai?: number;
  transcription?: number;
  voice_agent?: number;
}

export interface UsageLog {
  company_id:      string;
  app:             "underwriting" | "sales_coach" | "training_coach" | "note_taker" | "data_enrichment";
  entity_id:       string;
  entity_type:     "deal" | "live_call" | "training_call" | "note_taker_call" | "data_enrichment_log";
  input_tokens:    number;
  output_tokens:   number;
  cost_usd:        number;
  model:           string;
  cost_breakdown?: CostBreakdown | null;
}

export async function logUsage(entry: UsageLog): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("ai_usage_logs").insert(entry);
  if (error) {
    console.error("[ai-usage] failed to log usage:", error.message);
  }
}
