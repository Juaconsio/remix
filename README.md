# Remix — juego de timeline musical

Monorepo **Vite + Express/Socket.io** (multijugador en tiempo real). Adivina el orden
cronológico de canciones por su año. No es Next.js.

```
frontend/   React + Vite + TypeScript   (dev :3000)
backend/    Express + Socket.io + TS     (dev :4000, sirve el front en producción)
```

## Desarrollo

```bash
# Con Docker (ambos servicios)
pnpm dev            # docker compose -f docker-compose.dev.yml up
pnpm dev:build      # primera vez o tras cambios en Dockerfile
pnpm down

# Sin Docker
cd backend && pnpm dev     # :4000 (tsx watch)
cd frontend && pnpm dev    # :3000 (Vite HMR, proxea /api y /socket.io al backend)
```

Copia `.env.example` → `backend/.env` antes del primer arranque. El proveedor por
defecto (**Deezer**) no necesita claves; YouTube/Spotify sí.

## Producción — un solo servicio

En producción el backend Express sirve el frontend compilado (`./public`) y expone
Socket.io en el **mismo origen**, así que es un único contenedor sin CORS ni proxy.
El cliente conecta a `window.location.origin` (no hace falta `VITE_BACKEND_URL`).

```bash
# Probar el build de producción localmente
docker compose up --build      # → http://localhost:4000
```

### Desplegar en Railway (o Render / Fly.io)

1. Conecta el repo en [railway.app](https://railway.app) → *Deploy from GitHub*.
2. Railway detecta el [`Dockerfile`](./Dockerfile) raíz (config en [`railway.json`](./railway.json),
   healthcheck en `/health`).
3. Variables de entorno (Settings → Variables):
   - `NODE_ENV=production`
   - `YOUTUBE_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (opcionales)
   - `PORT` la inyecta Railway automáticamente; el server la respeta.
4. Deploy. La URL pública sirve front + API + WebSocket juntos.

> **Nota de escala:** el estado de las salas vive en memoria (una sola instancia).
> Para playtests es suficiente. Para escalar a varias réplicas habría que mover el
> estado a Redis con `@socket.io/redis-adapter`.
