# Tahap 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Salin package.json dan install dependensi
COPY package.json package-lock.json* ./
RUN npm install

# Salin seluruh kode dan build aplikasi
COPY . .
# Next.js mengabaikan pemeriksaan tipe saat build karena konfigurasi di next.config.ts
RUN npm run build

# Tahap 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Salin file yang diperlukan dari tahap build
# Standalone mode Next.js meminimalkan ukuran image
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
