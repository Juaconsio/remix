# Remix — Guía para agentes

## Arquitectura del proyecto

Monorepo **Vite + Express**, NO Next.js.

```
remix/
├── frontend/          ← React + Vite + TypeScript (puerto 3000)
├── backend/           ← Express + Socket.io + TypeScript (puerto 4000)
└── docker-compose.dev.yml
```

Lee también `frontend/CLAUDE.md` y `backend/CLAUDE.md`.

## Cómo levantarlo

```bash
# Con Docker (recomendado — levanta ambos servicios)
pnpm dev            # docker compose up
pnpm dev:build      # primer arranque o tras cambiar Dockerfile

# Sin Docker
cd backend && pnpm dev     # terminal 1 → puerto 4000
cd frontend && pnpm dev    # terminal 2 → puerto 3000
```

Variables de entorno: copia `.env.example` → `backend/.env`.

## Reglas globales

- No instalar librerías nuevas sin necesidad
- No modificar la lógica de rooms ni WebSockets
- El tipo `Song` y la interfaz `Room` no se tocan salvo necesidad explícita
