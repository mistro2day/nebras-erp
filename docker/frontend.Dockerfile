# Stage 1: Build Angular Application
FROM node:20-alpine AS build
WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
RUN npm run build:prod

# Stage 2: Serve static files
FROM alpine:latest
WORKDIR /dist
COPY --from=build /app/dist/nebras-erp/browser /dist
CMD ["sh", "-c", "sleep infinity"]
