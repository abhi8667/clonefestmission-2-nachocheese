# ===================================================
# Stage 1: Build Packages and Web Application
# ===================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package manifests across monorepo for caching
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/engine/package.json ./packages/engine/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install

# Copy source trees
COPY packages/shared-types ./packages/shared-types
COPY packages/engine ./packages/engine
COPY apps/web ./apps/web

# Build shared packages and Vite Web bundle
RUN npm run build -w @triarc/shared-types && \
    npm run build -w @triarc/engine && \
    npm run build -w @triarc/web

# ===================================================
# Stage 2: High-Performance Nginx Web Server
# ===================================================
FROM nginx:alpine AS runner

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SSE & SPA routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
