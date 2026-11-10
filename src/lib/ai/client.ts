import { anthropic, createAnthropic } from '@ai-sdk/anthropic';

/**
 * Centralized Anthropic client + model selection for VIBE AI features.
 *
 * Model strategy (from Phase 11 research brief):
 *   - Sonnet 4.6  for email drafts (longer context, higher stakes)
 *   - Haiku 4.5   for SMS drafts + rewrite (short, forgiving, ~3x cheaper)
 *
 * Pricing (verified 2026-04-21):
 *   Sonnet 4.6:  $3 / 1M input,  $15 / 1M output
 *   Haiku 4.5:   $1 / 1M input,  $5  / 1M output
 *   Cache hits:  0.10x base input price
 */

const API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

export const aiConfigured = !!API_KEY;

// createAnthropic accepts optional key; when unset, any SDK call throws.
// We gate upstream via aiConfigured so failures are graceful 503 errors.
export const aiProvider = API_KEY
  ? createAnthropic({ apiKey: API_KEY })
  : anthropic;

// Anthropic provides a short alias for Sonnet 4.6 but Haiku 4.5 requires the
// dated model ID. Keep both explicit so a silent 404 can't bite us.
export const MODEL_SONNET = 'claude-sonnet-4-6';
export const MODEL_HAIKU = 'claude-haiku-4-5-20251001';

export type AiFeatureKey = 'draft_email' | 'draft_sms' | 'rewrite';

export function modelFor(feature: AiFeatureKey): string {
  switch (feature) {
    case 'draft_email':
      return MODEL_SONNET;
    case 'draft_sms':
    case 'rewrite':
      return MODEL_HAIKU;
  }
}

// Pricing in tenth-of-a-cent precision (cents * 1000) to avoid floats.
// Numbers below are in cents per 1M tokens.
const PRICE_TABLE = {
  [MODEL_SONNET]: { input: 300, output: 1500 },
  [MODEL_HAIKU]: { input: 100, output: 500 },
} as const;

/**
 * Estimate cost in whole cents given token counts + model.
 * cachedTokens is input that hit the prompt cache (0.10x price).
 */
export function estimateCostCents(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}): number {
  const price = PRICE_TABLE[params.model as keyof typeof PRICE_TABLE];
  if (!price) return 0;
  const cached = params.cachedTokens ?? 0;
  const uncachedIn = Math.max(0, params.inputTokens - cached);
  const costTenths =
    (uncachedIn * price.input) / 1_000_000 +
    (cached * price.input * 0.10) / 1_000_000 +
    (params.outputTokens * price.output) / 1_000_000;
  // Cost values above are in cents; round up to keep projections conservative.
  return Math.ceil(costTenths);
}
