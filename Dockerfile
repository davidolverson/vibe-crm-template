# syntax=docker/dockerfile:1.7
# Multi-stage build for Next.js 16 standalone output. Final image ~150MB,
# runs as non-root, mirrors the logistics-construction pattern that ships
# cleanly on Coolify.
#
# Build pack in Coolify: Dockerfile
# Exposed port: 3000
# DATABASE_URL (Neon) and all auth secrets are injected by Coolify env vars.

ARG NODE_VERSION=22.19.0
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app


# ---------- deps: install full deps for build (prisma generate runs postinstall) ----------
FROM base AS deps
# package.json has `postinstall: prisma generate`, so the prisma/ schema must
# be present BEFORE `npm ci` or generate will fail. Copy schema first.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci


# ---------- builder: full build (prisma generate + next build) ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# `npm run build` is `prisma generate && next build`. With output: "standalone"
# in next.config.ts, this emits .next/standalone/server.js.
RUN npm run build


# ---------- runner: minimal image to serve ----------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Bind dual-stack so BusyBox wget's localhost lookup (which prefers ::1
# on alpine) reaches the server. Linux maps IPv4 traffic onto the IPv6
# socket automatically. Needed for Coolify health checks.
ENV HOSTNAME=::

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# Standalone bundle plus the static assets and public/ folder.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# server.js is emitted by Next when output: "standalone" is set in next.config.ts.
CMD ["node", "server.js"]
