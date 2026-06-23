# syntax=docker/dockerfile:1
# Imagen única: el backend Express/Socket.io sirve también el frontend compilado.
# Pensada para plataformas de contenedor long-running (Railway, Render, Fly.io).

# ---- Build frontend (Vite → /app/dist) ----
FROM node:22-alpine AS frontend
RUN corepack enable
WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
# Sin VITE_BACKEND_URL: el cliente conecta a window.location.origin (mismo servicio).
RUN pnpm build

# ---- Build backend (tsc → /app/dist) ----
FROM node:22-alpine AS backend
RUN corepack enable
WORKDIR /app
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY backend/ ./
RUN pnpm build

# ---- Runtime ----
FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
# Solo dependencias de producción (express, socket.io, cors).
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts --prod
# JS del backend + frontend estático en ./public (lo que index.ts espera).
COPY --from=backend /app/dist ./dist
COPY --from=frontend /app/dist ./public
EXPOSE 4000
CMD ["node", "dist/index.js"]
