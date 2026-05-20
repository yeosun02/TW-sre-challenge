# Build context: repository root (docker build -f www/Dockerfile .)
FROM node:20-alpine AS builder
WORKDIR /build/www

COPY www/package.json www/package-lock.json ./
RUN npm ci

COPY www ./
COPY proto /build/proto

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PROTO_ROOT=/proto \
    METRICS_SERVER_HOST=metrics-server \
    METRICS_SERVER_PORT=3000

COPY --from=builder /build/proto /proto
COPY --from=builder /build/www/.next/standalone ./
COPY --from=builder /build/www/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
