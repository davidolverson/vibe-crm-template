import { generateText } from 'ai';
import { prisma } from '../prisma';
import { rateLimit } from '../rate-limit';
import { aiProvider, aiConfigured, modelFor, estimateCostCents, type AiFeatureKey } from './client';
import { sanitizeOutput } from './guard';
import { recordAiMeterEvent } from './budget-sync';
import { buildDraftSmsPrompt, type DraftSmsInput } from './prompts/draft-sms';
import { buildDraftEmailPrompt, parseEmailDraft, type DraftEmailInput, type EmailDraft } from './prompts/draft-email';
import { buildRewritePrompt, type RewriteInput } from './prompts/rewrite';

export type AiResult<T> =
  | { success: true; data: T; remaining: number }
  | { success: false; error: string; code: AiErrorCode; remaining?: number };

export type AiErrorCode =
  | 'not_configured'
  | 'kill_switch'
  | 'feature_disabled'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'upstream_error'
  | 'upstream_overloaded'
  | 'invalid_input';

const PER_USER_PER_MINUTE = 10;
const PER_TENANT_PER_MINUTE = 30;

/**
 * Map raw Anthropic / AI SDK errors to user-friendly messages. The upstream
 * payload often contains credit-balance text or JSON blobs that we don't want
 * leaking into the composer toolbar.
 */
function friendlyUpstream(err: unknown): { message: string; code: AiErrorCode } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes('credit balance') || lower.includes('billing') || lower.includes('insufficient_quota')) {
    return { message: 'AI provider billing needs attention. The operator has been notified.', code: 'upstream_error' };
  }
  if (lower.includes('overloaded') || lower.includes('529') || lower.includes('rate_limit_error')) {
    return { message: 'AI provider is busy. Try again in a few seconds.', code: 'upstream_overloaded' };
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { message: 'AI request timed out. Please try again.', code: 'upstream_error' };
  }
  // Fall back to a generic sanitized message -- never surface the raw JSON.
  return { message: 'AI service hit an error. Please try again shortly.', code: 'upstream_error' };
}

interface GateResult {
  ok: boolean;
  error?: string;
  code?: AiErrorCode;
  remaining?: number;
  budget?: number;
  used?: number;
}

async function gate(tenantId: string, userId: string): Promise<GateResult> {
  if (!aiConfigured) {
    return { ok: false, error: 'AI service is not configured yet.', code: 'not_configured' };
  }

  const kill = await prisma.systemFlag.findUnique({ where: { key: 'AI_GLOBAL_KILL' } });
  if (kill?.boolValue) {
    return { ok: false, error: 'AI features are temporarily disabled.', code: 'kill_switch' };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { aiFeatureEnabled: true, aiMonthlyBudget: true },
  });
  if (!tenant) return { ok: false, error: 'Tenant not found.', code: 'invalid_input' };
  if (!tenant.aiFeatureEnabled) {
    return { ok: false, error: 'AI assistance is disabled on this workspace.', code: 'feature_disabled' };
  }

  // Two-layer rate limit: per-user keeps a single user from spamming, per-tenant
  // stops a 10-seat brokerage from burning the monthly budget in an hour.
  const rlUser = rateLimit(`ai-user:${userId}`, PER_USER_PER_MINUTE, 60_000);
  if (!rlUser.success) {
    return { ok: false, error: 'Slow down -- try again in a few seconds.', code: 'rate_limited' };
  }
  const rlTenant = rateLimit(`ai-tenant:${tenantId}`, PER_TENANT_PER_MINUTE, 60_000);
  if (!rlTenant.success) {
    return { ok: false, error: 'Workspace is drafting too fast -- try again in a minute.', code: 'rate_limited' };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const used = await prisma.aiUsageEvent.count({
    where: { tenantId, createdAt: { gte: monthStart }, success: true },
  });
  const remaining = tenant.aiMonthlyBudget - used;
  if (remaining <= 0) {
    return {
      ok: false,
      error: `Monthly AI quota reached (${used}/${tenant.aiMonthlyBudget}). Upgrade your plan for more drafts.`,
      code: 'quota_exceeded',
      remaining: 0,
      budget: tenant.aiMonthlyBudget,
      used,
    };
  }

  return { ok: true, remaining, budget: tenant.aiMonthlyBudget, used };
}

interface RunParams {
  tenantId: string;
  userId: string;
  feature: AiFeatureKey;
  system: string;
  user: string;
  maxOutputTokens?: number;
}

async function runModel(params: RunParams): Promise<{
  text: string;
  usage: { input: number; output: number; cached: number };
  model: string;
  durationMs: number;
}> {
  const model = modelFor(params.feature);
  const started = Date.now();

  // Cache the system prompt -- it includes the brand voice which is reused every call.
  const result = await generateText({
    model: aiProvider(model),
    system: params.system,
    messages: [{ role: 'user', content: params.user }],
    maxOutputTokens: params.maxOutputTokens ?? 600,
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
  });

  const durationMs = Date.now() - started;
  const usage = result.usage;
  // AI SDK normalizes usage fields but Anthropic-specific cache counters live in providerMetadata.
  const providerMeta = (result.providerMetadata?.anthropic ?? {}) as Record<string, unknown>;
  const cacheReadRaw = providerMeta.cacheReadInputTokens;
  const cached = typeof cacheReadRaw === 'number' ? cacheReadRaw : 0;

  return {
    text: result.text,
    usage: {
      input: usage?.inputTokens ?? 0,
      output: usage?.outputTokens ?? 0,
      cached,
    },
    model,
    durationMs,
  };
}

async function logUsage(params: {
  tenantId: string;
  userId: string;
  feature: AiFeatureKey;
  model: string;
  input: number;
  output: number;
  cached: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}) {
  const costCents = estimateCostCents({
    model: params.model,
    inputTokens: params.input,
    outputTokens: params.output,
    cachedTokens: params.cached,
  });

  try {
    await prisma.aiUsageEvent.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        feature: params.feature,
        model: params.model,
        inputTokens: params.input,
        outputTokens: params.output,
        cachedTokens: params.cached,
        costCents,
        durationMs: params.durationMs,
        success: params.success,
        errorMessage: params.errorMessage ?? null,
      },
    });
  } catch (err) {
    // Never let logging failures mask the actual response.
    console.error('[ai] usage log failed', err);
  }

  // Best-effort Stripe meter event; only on success. Gated by env flag so
  // local dev + pre-launch doesn't touch Stripe.
  if (params.success) {
    void recordAiMeterEvent({ tenantId: params.tenantId, feature: params.feature });
  }
}

// ──────────────────────────────────────
// Public service API
// ──────────────────────────────────────

export async function generateSmsDraft(params: {
  tenantId: string;
  userId: string;
  input: DraftSmsInput;
}): Promise<AiResult<{ text: string }>> {
  const g = await gate(params.tenantId, params.userId);
  if (!g.ok) return { success: false, error: g.error!, code: g.code!, remaining: g.remaining };

  const { system, user } = buildDraftSmsPrompt(params.input);

  try {
    const r = await runModel({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'draft_sms',
      system,
      user,
      maxOutputTokens: 300,
    });
    const clean = sanitizeOutput(r.text);
    await logUsage({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'draft_sms',
      model: r.model,
      input: r.usage.input,
      output: r.usage.output,
      cached: r.usage.cached,
      durationMs: r.durationMs,
      success: true,
    });
    return { success: true, data: { text: clean }, remaining: (g.remaining ?? 0) - 1 };
  } catch (err) {
    const { message, code } = friendlyUpstream(err);
    const rawMsg = err instanceof Error ? err.message : 'Upstream AI error';
    await logUsage({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'draft_sms',
      model: modelFor('draft_sms'),
      input: 0,
      output: 0,
      cached: 0,
      durationMs: 0,
      success: false,
      errorMessage: rawMsg,
    });
    return { success: false, error: message, code };
  }
}

export async function generateEmailDraft(params: {
  tenantId: string;
  userId: string;
  input: DraftEmailInput;
}): Promise<AiResult<EmailDraft>> {
  const g = await gate(params.tenantId, params.userId);
  if (!g.ok) return { success: false, error: g.error!, code: g.code!, remaining: g.remaining };

  const { system, user } = buildDraftEmailPrompt(params.input);

  try {
    const r = await runModel({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'draft_email',
      system,
      user,
      maxOutputTokens: 800,
    });
    const parsed = parseEmailDraft(r.text);
    const cleaned: EmailDraft = {
      subject: sanitizeOutput(parsed.subject),
      body: sanitizeOutput(parsed.body),
    };
    await logUsage({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'draft_email',
      model: r.model,
      input: r.usage.input,
      output: r.usage.output,
      cached: r.usage.cached,
      durationMs: r.durationMs,
      success: true,
    });
    return { success: true, data: cleaned, remaining: (g.remaining ?? 0) - 1 };
  } catch (err) {
    const { message, code } = friendlyUpstream(err);
    const rawMsg = err instanceof Error ? err.message : 'Upstream AI error';
    await logUsage({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'draft_email',
      model: modelFor('draft_email'),
      input: 0,
      output: 0,
      cached: 0,
      durationMs: 0,
      success: false,
      errorMessage: rawMsg,
    });
    return { success: false, error: message, code };
  }
}

export async function rewriteDraft(params: {
  tenantId: string;
  userId: string;
  input: RewriteInput;
}): Promise<AiResult<{ text: string }>> {
  const g = await gate(params.tenantId, params.userId);
  if (!g.ok) return { success: false, error: g.error!, code: g.code!, remaining: g.remaining };

  if (!params.input.draft.trim()) {
    return { success: false, error: 'Nothing to rewrite yet.', code: 'invalid_input' };
  }

  const { system, user } = buildRewritePrompt(params.input);

  try {
    const r = await runModel({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'rewrite',
      system,
      user,
      maxOutputTokens: 600,
    });
    const clean = sanitizeOutput(r.text);
    await logUsage({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'rewrite',
      model: r.model,
      input: r.usage.input,
      output: r.usage.output,
      cached: r.usage.cached,
      durationMs: r.durationMs,
      success: true,
    });
    return { success: true, data: { text: clean }, remaining: (g.remaining ?? 0) - 1 };
  } catch (err) {
    const { message, code } = friendlyUpstream(err);
    const rawMsg = err instanceof Error ? err.message : 'Upstream AI error';
    await logUsage({
      tenantId: params.tenantId,
      userId: params.userId,
      feature: 'rewrite',
      model: modelFor('rewrite'),
      input: 0,
      output: 0,
      cached: 0,
      durationMs: 0,
      success: false,
      errorMessage: rawMsg,
    });
    return { success: false, error: message, code };
  }
}
