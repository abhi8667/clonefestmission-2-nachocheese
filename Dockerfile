# ===================================================
# Stage 1: Build All Packages & Web Frontend
# ===================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native build tools for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace package manifests
COPY package.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/engine/package.json ./packages/engine/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies across all workspaces
RUN npm install

# Copy source trees
COPY packages/shared-types ./packages/shared-types
COPY packages/engine ./packages/engine
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build all packages, web SPA, and API backend
RUN npm run build

# ===================================================
# Stage 2: Production All-in-One Container
# ===================================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/apps/api/data/triarc.db
ENV STATIC_DIST_PATH=/app/apps/web/dist

# Copy built monorepo from builder
COPY --from=builder /app /app

# Ensure SQLite data directory exists
RUN mkdir -p /app/apps/api/data

EXPOSE 3001

WORKDIR /app/apps/api

CMD ["node", "dist/index.js"]
