# VIBE

A multi-tenant CRM and lead engine for real estate owner-operators: people who run several business lines (real estate, mortgage, insurance, investing) under one roof and want one contact record, one pipeline view and one financial picture across all of them.

It ships as a Next.js app with a marketing landing page, the authenticated CRM, public lead-capture sites and forms, and an optional Expo mobile companion app in `mobile/`.

## Features

- **Multi-tenant workspaces** with per-tenant RBAC (Owner, Admin, Producer, Transaction Coordinator) and tenant-isolated queries
- **Contacts** with cross-channel dedupe, households, activity timeline, import/export
- **Pipelines** per business line (real estate, mortgage, insurance, investing templates), deals, commission splits
- **Tasks, notifications, global search**
- **Forms and hosted lead capture** (`/s/[formId]`) with round-robin / rule-based assignment
- **Email sequences and automations** (Resend or Postmark), open/click/bounce webhooks, one-click unsubscribe
- **Twilio SMS and voice**: per-tenant encrypted credentials, inbound SMS + status webhooks, click-to-call
- **Sites**: a simple block-based page builder with public pages and blog under `/p/[siteSlug]`
- **QuickBooks Online sync** and a CFO dashboard with financial alerts
- **Stripe billing**: plans, a "founding member" checkout, usage metering for AI drafts
- **AI drafting** (email, SMS, rewrite) via Anthropic with a per-tenant budget and admin kill switch
- **Platform admin** surface for cross-tenant stats, gated by an email allowlist
- PWA manifest + service worker, OG/Twitter images, sitemap and robots

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 + shadcn/ui · Prisma 7 + PostgreSQL (Neon or any Postgres) · Better Auth · Stripe · Twilio · Resend / Postmark · QuickBooks Online API · Anthropic (via the AI SDK) · Playwright + `node:test`

## Quick start

```bash
# 1. Install (also runs `prisma generate`)
npm ci

# 2. Configure env
cp .env.example .env.local
#   at minimum set DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL

# 3. Create the schema
npx prisma migrate deploy

# 4. Run
npm run dev            # http://localhost:3000

# 5. Production build
npm run build && npm start
```

Sign up at `/sign-up`; onboarding creates your first tenant, seeds its roles, default pipeline and form. To seed roles for an existing tenant manually: `npx tsx prisma/seed.ts <tenantId>`.

### Tests and checks

```bash
npm run lint
npx tsc --noEmit
npm run test:unit                 # no database needed
npm run test:integration          # needs Postgres on localhost:55432 (see .github/workflows/ci.yml)
npm run test:e2e                  # Playwright, needs a running app + test user
```

## Environment variables

All variables are documented in [`.env.example`](.env.example). Summary:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | Session signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | yes | Public base URL used by auth |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL for links, redirects, webhooks |
| `APP_URL` | no | Server-only fallback for the base URL |
| `ENCRYPTION_KEY` | recommended | 32-byte hex key; encrypts per-tenant Twilio/QBO credentials |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | billing | Stripe API key and webhook signing secret |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE` | billing | Stripe price IDs per plan |
| `STRIPE_AI_METER_ENABLED` | no | `true` to report AI usage to a Stripe meter named `ai_draft_generated` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | email | Preferred email provider |
| `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL` | email | Fallback email provider |
| `POSTMARK_WEBHOOK_SECRET`, `POSTMARK_WEBHOOK_BASIC_AUTH` | email | Protect the Postmark webhook |
| `EMAIL_FROM` | email | Default sender identity |
| `TWILIO_WEBHOOK_AUTH_TOKEN` | SMS | Validates inbound Twilio webhook signatures |
| `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` | voice | Voice SDK key pair for click-to-call |
| `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`, `QBO_SANDBOX` | QuickBooks | Intuit OAuth app |
| `ANTHROPIC_API_KEY` | AI | Enables AI drafting (routes return 503 without it) |
| `CRON_SECRET` | cron | Bearer token required by `/api/cron/*` |
| `ADMIN_EMAILS` | no | Comma-separated platform-admin emails |
| `WAITLIST_INBOX`, `CONTACT_INBOX` | landing | Where waitlist / contact-form notifications go |
| `FOUNDING_CLAIMED_COUNT` | landing | Starting count for the founding-spots counter |

Twilio account SID/auth token and QuickBooks tokens are stored per tenant (encrypted) from the in-app Settings pages, not in env.

Mobile app (`mobile/`): copy `mobile/.env.example` to `mobile/.env` and set `EXPO_PUBLIC_API_URL` to your deployed web app.

## Deploy

- **Vercel**: `vercel.json` sets the build command and cron schedules for `/api/cron/*`. Set `CRON_SECRET` in the project env.
- **Docker** (any container host): the `Dockerfile` builds a standalone Next.js image. Inject env vars at runtime and run `npx prisma migrate deploy` against your database before first start. Schedule the cron endpoints with any scheduler (`scripts/cron-runner.mjs` is a simple in-container loop).
- Webhook endpoints to register: `/api/webhooks/stripe`, `/api/webhooks/postmark`, `/api/webhooks/twilio/sms`, `/api/webhooks/twilio/voice`, and the QuickBooks callback `/api/auth/quickbooks/callback`.

## Make it yours

Replace the placeholder branding and contact details before going live:

- `src/app/layout.tsx` (metadata, JSON-LD organization), `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`
- `src/components/landing/*` (copy, footer, wordmark) and `public/backgrounds/*`
- `src/app/privacy/page.tsx` and `src/app/terms/page.tsx`: replace "Your Company, LLC" and "[Your State]", and have them reviewed
- `src/app/robots.ts`, `src/app/sitemap.ts`, and every `example.com` address (`grep -rn example.com src`)
- `mobile/app.json` (app name, bundle identifier, icons)
- `content_log.md` feeds the public `/changelog` page
- `DESIGN.md` describes the landing page design system

## License

MIT, see [LICENSE](LICENSE).
