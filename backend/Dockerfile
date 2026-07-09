# =============================================================================
# AI-Pulse Backend — Dockerfile
# Stage 1 (deps):   Install production-only dependencies
# Stage 2 (runner): Copy only what's needed — no dev tools, no secrets
# =============================================================================

# ── Stage 1: Install production dependencies ─────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy lockfile and manifest first for layer-cache efficiency
COPY package.json package-lock.json ./

# Install PRODUCTION deps only
RUN npm ci --omit=dev --prefer-offline

# ── Stage 2: Production runtime image ────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package.json ./

# Ensure log directory exists and is owned by appuser
RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

# Expose the API port (matches PORT env var default)
EXPOSE 3000

# Health check — Docker will mark container unhealthy if /health fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "src/server.js"]
