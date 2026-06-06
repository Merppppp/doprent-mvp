# =============================================================================
# Doprent MVP — Multi-stage Dockerfile
# Base: node:20-alpine
# Stages: deps → builder → runner
# Requires: output: "standalone" in next.config.js
# =============================================================================

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --only=production=false

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (required before build)
RUN npx prisma generate

# Build-time env (NEXT_PUBLIC_* baked into bundle)
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DEFAULT_LINE_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_CLARITY_ID

# DB URL for build (Next.js prerender needs a live DB)
ARG DATABASE_URL

# Build Next.js — produces .next/standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma client (needed at runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health 2>/dev/null || wget -qO- http://localhost:3000/ 2>/dev/null || exit 1

CMD ["node", "server.js"]
