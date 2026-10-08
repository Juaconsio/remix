# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo **Vite + Express**, NOT Next.js.

```
remix/
├── frontend/          ← React + Vite + TypeScript (port 3000)
│   └── src/
│       ├── pages/     ← Home, Lobby, Game, Rosco, Results (react-router-dom)
│       ├── game/components/  ← AudioPlayer, YouTubePlayer, CardSlot, Timeline, RoscoBoard, RoscoControls, …
│       ├── hooks/     ← useAudio, useYouTubePlayer, useSocket
│       ├── providers/ ← SocketProvider (Socket.io context)
│       ├── store/     ← providerStore (Zustand, persists active music provider)
│       └── types/     ← game.ts (Song, MusicProvider), socket.ts, youtube.d.ts
├── backend/           ← Express + Socket.io + TypeScript (port 4000)
│   └── src/
│       ├── index.ts         ← Entry point: Express + Socket.io server + all event handlers
│       ├── songs.ts         ← Song catalogue (in-memory)
│       ├── types.ts         ← Song, MusicProvider (mirrored in frontend/src/types/game.ts)
│       ├── routes/          ← preview.ts, youtubeSearch.ts, youtubePlaylistMap.ts
│       └── rooms/           ← roomManager.ts (all game logic), rosco.ts (rosco rules),
│                               roscoPacks.ts, publicRoom.ts (answer redaction), types.ts
└── docker-compose.dev.yml
```

**Type mirroring:** `backend/src/types.ts` (Song) and `backend/src/rooms/types.ts` (Room, RoomPlayer, RoomConfig) are mirrored in `frontend/src/types/`. Keep them in sync manually — there is no shared package.

Frontend proxies `/api` → `http://backend:4000` (configured in `vite.config.ts`).

## Commands

```bash
# Recommended: Docker (starts both services)
pnpm dev            # docker compose up
pnpm dev:build      # first run or after Dockerfile changes
pnpm down           # stop

# Without Docker
cd backend && pnpm dev     # terminal 1 → port 4000 (tsx watch, loads backend/.env)
cd frontend && pnpm dev    # terminal 2 → port 3000 (Vite HMR, proxies to localhost:4000)

# Type check
cd frontend && pnpm build  # tsc -b + vite build
cd backend && pnpm build   # tsc
```

Copy `.env.example` → `backend/.env` before first run. Docker injects it via `env_file`;
outside Docker the `dev` script loads it with `--env-file-if-exists`. Without a
`YOUTUBE_API_KEY` the `/api/youtube/*` routes answer 500 and the YouTube provider has no
video ids to play.

The Vite dev proxy targets `BACKEND_ORIGIN` (default `http://localhost:4000`);
`docker-compose.dev.yml` overrides it with the `backend` service name.

## Game modes

`config.mode` picks the game: `classic` (timeline) or `rosco` (Pasapalabra-style letters).
The lobby is shared; `game:start` branches and the client routes to `/game/:code` or `/rosco/:code`.

## Game flow — classic

Turn order: `lobby` → `setup` → `round_active` → `validating` → (next turn or) `finished`.

Each turn: active player calls `game:flip` (draws card) → `game:select` (pick timeline position) → `game:place` (confirm). Server auto-advances to next turn after 2.5s. Players can also call `game:skip` to discard the current card.

`game:audio:started` (active player) triggers `game:audio:play` to spectators when `syncAudio` is enabled in room config.

## Game flow — rosco

`game:start` builds `room.rosco.boards` from `roscoPacks.ts`: one shared board in `paralelo`,
one per player in `turnos`. The room sits in `round_active` until every board is done.

The host both plays and judges: only they emit `rosco:*`, and only they receive the answers.
`publicRoom.ts` redacts `song` to `null` on every unresolved cell for the other players, so
rosco rooms **cannot use broadcast** — `broadcastRoom()` in `index.ts` emits per socket.

In `turnos`, a hit keeps the turn and a miss or *pasapalabra* passes it; passed letters come
back on the next lap. Disconnected players are skipped and their board no longer blocks the end
of the game.

## Socket.io events

| Direction | Event | Notes |
|---|---|---|
| C → S | `room:create` | Creates room, emits `room:joined` back |
| C → S | `room:join` | Join by code |
| C → S | `room:rejoin` | Reconnect (matches by name) |
| C → S | `room:config` | Host-only: change provider/pack/syncAudio |
| C → S | `game:start` | Host-only |
| C → S | `game:flip` | Active player draws card |
| C → S | `game:select` | Active player picks position |
| C → S | `game:place` | Active player confirms |
| C → S | `game:skip` | Active player discards card |
| C → S | `game:audio:started` | Triggers sync to spectators |
| C → S | `rosco:award` | Host-only: `{ playerId, award }` — grants a letter in `paralelo` |
| C → S | `rosco:skip` | Host-only: nobody got it (`paralelo`) |
| C → S | `rosco:correct` | Host-only: `{ award }` — hit in `turnos` |
| C → S | `rosco:wrong` | Host-only: miss in `turnos`, passes the turn |
| C → S | `rosco:pass` | Host-only: *pasapalabra* in `turnos` |
| S → C | `room:joined` | `{ room, yourPlayerId }` |
| S → C | `room:updated` | Lobby state changes |
| S → C | `game:state` | Full room state after any game event |
| S → C | `game:audio:play` | `{ trackId, provider, hookStart, hookDuration }` |
| S → C | `room:error` | Error message string |

## REST endpoints

| Route | Description |
|---|---|
| `GET /health` | Health check |
| `GET /api/preview/deezer/:id` | Proxy to Deezer API |
| `GET /api/preview/spotify/:id` | Proxy to Spotify API (requires OAuth token) |
| `GET /api/youtube/search?q=` | YouTube Data API v3 search |
| `GET /api/youtube/playlist-map` | YouTube playlist → song map |

## Audio providers

| Provider | Hook | Notes |
|---|---|---|
| `deezer` | `useAudio` | 30s preview via `/api/preview/deezer/:id` (Howler.js) |
| `spotify` | `useAudio` | 30s preview via `/api/preview/spotify/:id` (Howler.js) |
| `youtube` | `useYouTubePlayer` | IFrame API, hidden div in `Game.tsx` |

Active provider stored in Zustand (`useProviderStore`), persisted to localStorage.

YouTube is the MVP default until there are licenses. Its known limits — Data API quota,
iOS autoplay, Terms of Service — live in [`docs/youtube.md`](docs/youtube.md); read it
before touching the YouTube provider or opening the game to more users.

**YouTube IFrame gotcha:** never use `display:none` on the player container — it breaks the IFrame API. Use `visibility:hidden` instead.

## Backend env vars (`backend/.env`)

```
PORT=4000
CLIENT_URL=http://localhost:3000
YOUTUBE_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

Spotify token is cached in memory (`spotifyTokenCache` in `routes/preview.ts`).

In dev, room state persists to `dev-rooms.json` (survives backend hot-reload).

## Rules

- Do not install new libraries without a clear need
- Do not touch `roomManager.ts` or `rosco.ts` unless explicitly asked — they contain all game logic
- Never emit a rosco room with `io.to(code)` — go through `broadcastRoom()` or you leak the answers
- Do not modify the `Song` type or `Room` interface unless explicitly asked
- Do not modify `useAudio.ts` or `useSocket.ts` unless explicitly asked
- Do not modify WebSocket room logic
