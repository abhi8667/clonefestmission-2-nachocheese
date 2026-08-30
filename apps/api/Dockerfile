# ===================================================
# Stage 1: Build Packages and API Server
# ===================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests across monorepo for caching
COPY package.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/engine/package.json ./packages/engine/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install

# Copy source trees
COPY packages/shared-types ./packages/shared-types
COPY packages/engine ./packages/engine
COPY apps/api ./apps/api

# Build shared packages and API
RUN npm run build -w packages/shared-types && \
    npm run build -w packages/engine && \
    npm run build -w apps/api

# ===================================================
# Stage 2: Minimal Production Runtime
# ===================================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/apps/api/data/triarc.db

# Copy built workspace from builder
COPY --from=builder /app /app

# Ensure data directory exists for SQLite WAL mode
RUN mkdir -p /app/apps/api/data

EXPOSE 3001

WORKDIR /app/apps/api

CMD ["node", "dist/index.js"]
