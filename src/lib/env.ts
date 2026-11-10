/**
 * Environment variable validation.
 * Import this in server-side entry points to fail fast on missing config.
 */

interface EnvVar {
  key: string;
  critical: boolean; // critical = app won't start without it
  validate?: (value: string) => boolean;
  errorHint?: string;
}

const ENV_VARS: EnvVar[] = [
  { key: 'DATABASE_URL', critical: true },
  { key: 'BETTER_AUTH_SECRET', critical: true },
  { key: 'BETTER_AUTH_URL', critical: true },
  {
    key: 'ENCRYPTION_KEY',
    critical: false,
    validate: (v) => v.length === 64,
    errorHint: 'Must be a 64-char hex string. Generate with: openssl rand -hex 32',
  },
  { key: 'NEXT_PUBLIC_APP_URL', critical: false },
  { key: 'CRON_SECRET', critical: false },
  { key: 'POSTMARK_SERVER_TOKEN', critical: false },
  { key: 'RESEND_API_KEY', critical: false },
  { key: 'STRIPE_SECRET_KEY', critical: false },
  { key: 'STRIPE_WEBHOOK_SECRET', critical: false },
];

export function validateEnv(): void {
  const critical: string[] = [];
  const warnings: string[] = [];

  for (const { key, critical: isCritical, validate, errorHint } of ENV_VARS) {
    const value = process.env[key];

    if (!value) {
      const msg = `  ${key} -- MISSING`;
      if (isCritical) critical.push(msg);
      else warnings.push(msg);
      continue;
    }

    if (validate && !validate(value)) {
      const msg = `  ${key} -- INVALID${errorHint ? ` (${errorHint})` : ''}`;
      if (isCritical) critical.push(msg);
      else warnings.push(msg);
    }
  }

  if (warnings.length > 0) {
    console.warn(`[env] Optional environment variables missing (some features disabled):\n${warnings.join('\n')}`);
  }

  if (critical.length > 0) {
    const msg = `[env] Critical environment variables missing:\n${critical.join('\n')}`;
    console.error(msg);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
  }
}
