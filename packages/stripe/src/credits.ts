/**
 * Calculate the dollar cost of a workflow run.
 *
 * Rates are in $/1M tokens. Defaults match claude-sonnet-4-6 list pricing.
 * Override via env vars to adjust for different models or margins.
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputRatePerM  = parseFloat(process.env.AI_INPUT_TOKEN_RATE_PER_M  ?? '3.00')
  const outputRatePerM = parseFloat(process.env.AI_OUTPUT_TOKEN_RATE_PER_M ?? '15.00')
  const markup         = parseFloat(process.env.AI_MARKUP_MULTIPLIER       ?? '1.3')

  const rawCost = (inputTokens / 1_000_000) * inputRatePerM
                + (outputTokens / 1_000_000) * outputRatePerM

  // Round to 6 decimal places (sub-cent precision)
  return Math.round(rawCost * markup * 1_000_000) / 1_000_000
}
