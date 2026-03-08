# Tahap 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Salin package files
COPY package.json package-lock.json* ./
RUN npm install

# Salin seluruh kode dan build
COPY . .
RUN npm run build

# Tahap 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Salin file yang diperlukan dari tahap build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
