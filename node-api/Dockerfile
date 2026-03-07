# NovelGrab – Node.js API Dockerfile
# Multi-stage build following docker-expert skill patterns

# ── Stage 1: Dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --production

# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S novelgrab -u 1001

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Create storage directory
RUN mkdir -p storage && chown -R novelgrab:nodejs /app

USER novelgrab

EXPOSE 3001

CMD ["node", "src/index.js"]
