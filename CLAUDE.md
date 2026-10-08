# CLAUDE.md

Remix is a multiplayer music party game: players join a room from their phones and play
`classic` (place songs on a timeline by year) or `rosco` (Pasapalabra-style letters).

## Architecture

pnpm workspace, **Vite + Express**, NOT Next.js.

- `frontend/` — React + Vite + TypeScript, Socket.io client, Zustand stores. Dev on :3000.
- `backend/` — Express + Socket.io + TypeScript. Dev on :4000. Socket handlers live in
  `src/index.ts`; game logic in `src/rooms/`.
- Production is a single service: the backend serves the built frontend and Socket.io on
  the same origin. Deploy (Dockerfile, Railway, env vars) is documented in `README.md`.

Sources of truth — read them instead of keeping a copy here:

- Socket events: `ClientToServerEvents` / `ServerToClientEvents` in `frontend/src/types/socket.ts`.
- REST routes: `backend/src/index.ts`.
- Backend env vars: `backend/.env.example` (copy it to `backend/.env` before the first run).

## Commands

```bash
pnpm check        # typecheck + lint + test; CI runs these plus `pnpm build` on every push
pnpm build
pnpm dev          # Docker: backend, frontend and a cloudflared tunnel
pnpm dev:build    # first run or after Dockerfile changes
pnpm down
```

Without Docker: `pnpm -C backend dev` (loads `backend/.env`) and `pnpm -C frontend dev`.

- The `cloudflared` service publishes the frontend on a temporary `trycloudflare.com` URL
  printed in its logs — the way to try the game on phones without deploying.
- Vite has no `strictPort`: if :3000 is taken it silently moves to the next free port.
- Vite proxies `/api` and `/socket.io` to `BACKEND_ORIGIN` (default `http://localhost:4000`;
  Docker sets `http://backend:4000`). The Socket.io client connects to `VITE_BACKEND_URL`,
  or to the page origin when it is unset.
- Without `YOUTUBE_API_KEY` the `/api/youtube/*` routes answer 500.
- Tests are Vitest, `*.test.ts` next to the code. Only `rosco.test.ts` exists so far.
- In dev, rooms persist to `backend/dev-rooms.json` (survives hot reload). With
  `NODE_ENV=production` they live only in memory.

## Game modes

`config.mode` picks the game. The lobby is shared; `game:start` branches and the client
routes to `/game/:code` or `/rosco/:code`.

### Classic

Status: `lobby` → `setup` → `round_active` → `validating` → (next turn or) `finished`.

Each turn the active player emits `game:flip` (draws a card) → `game:select` (picks a
timeline position) → `game:place` (confirms); the server moves to the next turn 2.5 s later.
`game:skip` discards the current card. A correct placement scores 1; the game ends when a
player reaches 7 or the deck runs out.

With `syncAudio` on, `game:audio:started` from the active player makes the server emit
`game:audio:play` to everyone else.

### Rosco

`game:start` builds `room.rosco.boards` from `roscoPacks.ts`: one shared board in `paralelo`,
one per player in `turnos`. The room stays in `round_active` until every board is done.

The host both plays and judges: only they emit `rosco:*`, and only they receive the answers.
`publicRoom.ts` sets `song` to `null` on every unresolved cell for everyone else.

In `turnos`, a hit keeps the turn and a miss or *pasapalabra* passes it; passed letters come
back on the next lap. Disconnected players are skipped and their board no longer blocks the
end of the game.

## Audio providers

`deezer` and `spotify` play 30 s previews through `useAudio` (Howler.js) and
`/api/preview/*`; `youtube` uses the IFrame API through `useYouTubePlayer`. The provider is
part of the room config; `useProviderStore` persists the active one in localStorage.

YouTube is the MVP provider until there are licenses. Its known limits — Data API quota,
iOS autoplay, Terms of Service — live in [`docs/youtube.md`](docs/youtube.md); read it
before touching the YouTube provider or opening the game to more users.

**YouTube IFrame gotcha:** the player container must stay rendered — `display:none` breaks
the IFrame API. `Game.tsx` and `Rosco.tsx` keep it at 200×200 with `opacity-0`, moved
off-screen.

## Rules

- Do not install new libraries without a clear need.
- Do not touch `roomManager.ts` or the socket handlers in `backend/src/index.ts` unless
  explicitly asked: classic mode has no tests yet to catch a regression.
- Never emit a rosco room with `io.to(code)`: go through `broadcastRoom()`, which redacts per
  socket, or the answers leak.
- Types are mirrored by hand, there is no shared package: `backend/src/types.ts` ↔
  `frontend/src/types/game.ts` (`Song`) and `backend/src/rooms/types.ts` ↔
  `frontend/src/types/socket.ts` (`Room`, `RoomPlayer`, `RoomConfig`). Change both sides
  together.
