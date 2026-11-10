import { truncate, MAX_REWRITE_INPUT_CHARS } from '../guard';

export type RewriteTone = 'friendlier' | 'shorter' | 'more_professional' | 'more_urgent' | 'fix_grammar';

export interface RewriteInput {
  tenantName: string;
  brandVoice?: string | null;
  mode: 'sms' | 'email';
  tone: RewriteTone;
  draft: string; // user-authored text to rewrite
}

const TONE_DIRECTIVES: Record<RewriteTone, string> = {
  friendlier: 'Make it warmer and more conversational without losing the meaning.',
  shorter: 'Cut unnecessary words. Keep every concrete fact. Preserve the greeting and sign-off if present.',
  more_professional: 'Keep the facts. Raise the tone to polished-but-human. Do not make it corporate.',
  more_urgent: 'Keep the facts. Make it clear there is time sensitivity, without creating panic.',
  fix_grammar: 'Fix grammar, punctuation, and typos. Do not change the wording beyond what is needed.',
};

const SYSTEM_BASE_SMS = `You rewrite text messages drafted by a real estate professional.

Rules:
- Output only the rewritten message. No commentary, no labels.
- Keep it under 320 characters.
- Never invent facts, dates, addresses, prices, or commitments that were not in the original.
- Preserve any bracketed placeholders like [confirm time] verbatim.`;

const SYSTEM_BASE_EMAIL = `You rewrite emails drafted by a real estate professional.

Rules:
- Output only the rewritten email. Subject + body if a Subject line was present in the input; otherwise body only.
- Preserve paragraphs and line breaks where they serve the reader.
- Never invent facts, dates, addresses, prices, or commitments that were not in the original.
- Preserve bracketed placeholders verbatim.`;

export function buildRewritePrompt(input: RewriteInput): { system: string; user: string } {
  const base = input.mode === 'sms' ? SYSTEM_BASE_SMS : SYSTEM_BASE_EMAIL;
  const voice = input.brandVoice?.trim();
  const system = voice ? `${base}\n\nBrand voice guide for ${input.tenantName}:\n${voice}` : base;
  const directive = TONE_DIRECTIVES[input.tone];
  const draft = truncate(input.draft, MAX_REWRITE_INPUT_CHARS);

  const user = `Rewrite the following draft. ${directive}\n\nOriginal draft:\n"""\n${draft}\n"""\n\nReturn the rewritten version now.`;
  return { system, user };
}
