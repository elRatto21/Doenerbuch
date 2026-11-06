# Coolify builds this image (build pack "Dockerfile"). Next.js standalone output on Node 24 slim.
ARG NODE_VERSION=24-slim

# ---------- deps ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
# postinstall copies the MapLibre worker into public/
COPY scripts ./scripts
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Inlined into the client bundle at build time; Coolify passes them as build args
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MAP_STYLE_URL
# Service worker precache revision (src/app/serwist/[path]/route.ts)
ARG SOURCE_COMMIT
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL \
    SOURCE_COMMIT=$SOURCE_COMMIT \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---------- run ----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# read at startup by src/instrumentation-node.ts (migrations)
COPY --from=builder --chown=node:node /app/drizzle ./drizzle

USER node
EXPOSE 3000

# slim has no curl/wget, so check with node itself
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
