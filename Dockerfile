FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
# 관측: production analytics (analytics.deepcraft.app). NEXT_PUBLIC 는 빌드타임에 번들로 freeze 되므로
# 여기 builder 스테이지에서 ARG/ENV 로 받아야 클라이언트 번들에 baked 됨 (런타임 .env.production 으로는 안 됨).
ARG NEXT_PUBLIC_ANALYTICS_URL
ARG NEXT_PUBLIC_ANALYTICS_TOKEN

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_ANALYTICS_URL=$NEXT_PUBLIC_ANALYTICS_URL
ENV NEXT_PUBLIC_ANALYTICS_TOKEN=$NEXT_PUBLIC_ANALYTICS_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
