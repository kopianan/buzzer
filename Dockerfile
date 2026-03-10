# ── Build Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Next.js (output standalone)
RUN npm run build

# ── Production Stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy sample data files (untuk demo mode)
COPY --from=builder /app/file\ \(\1\).json ./
COPY --from=builder /app/file\ \(\2\).json ./ 2>/dev/null || true
COPY --from=builder /app/file\ \(\3\).json ./ 2>/dev/null || true

EXPOSE 3000

CMD ["node", "server.js"]
