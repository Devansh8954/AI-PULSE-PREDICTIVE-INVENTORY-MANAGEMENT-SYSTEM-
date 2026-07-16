# =============================================================================
# AI-Pulse Frontend — Dockerfile  (Multi-Stage Build)
#
# Stage 1 (builder): Compiles the Angular app into a static bundle.
# Stage 2 (runner):  Serves the bundle with Nginx — zero Node.js in prod.
#
# The result is a ~30 MB image vs ~600 MB if we shipped Node + Angular CLI.
# =============================================================================

# ── Stage 1: Build the Angular application ───────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache-optimised dependency install
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy full source (respects .dockerignore)
COPY . .

# Compile production bundle — NODE_OPTIONS increases heap limit to 1.5 GB
# so Angular's esbuild compiler doesn't OOM-crash on small servers (t2.micro)
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build -- --configuration production

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default Nginx landing page
RUN rm -rf /usr/share/nginx/html/*

# Install curl for health check (wget in alpine busybox doesn't support localhost well)
RUN apk add --no-cache curl

# Copy compiled Angular bundle from builder stage
COPY --from=builder /app/dist/ai-pulse-frontend/browser /usr/share/nginx/html

# Copy our custom Nginx config (handles Angular's HTML5 routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check — curl is more reliable than wget in nginx:alpine
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
