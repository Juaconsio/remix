# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo **Vite + Express**, NOT Next.js.

```
remix/
├── frontend/          ← React + Vite + TypeScript (port 3000)
│   └── src/
│       ├── pages/     ← Home, Lobby, Game, Results (react-router-dom)
│       ├── game/components/  ← AudioPlayer, YouTubePlayer, CardSlot, Timeline, …
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
│       └── rooms/           ← roomManager.ts (all game logic), types.ts (Room, RoomPlayer, RoomConfig)
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
cd backend && pnpm dev     # terminal 1 → port 4000 (tsx watch)
cd frontend && pnpm dev    # terminal 2 → port 3000 (Vite HMR)

# Type check
cd frontend && pnpm build  # tsc -b + vite build
cd backend && pnpm build   # tsc
```

Copy `.env.example` → `backend/.env` before first run.

## Game flow

Turn order: `lobby` → `setup` → `round_active` → `validating` → (next turn or) `finished`.

Each turn: active player calls `game:flip` (draws card) → `game:select` (pick timeline position) → `game:place` (confirm). Server auto-advances to next turn after 2.5s. Players can also call `game:skip` to discard the current card.

`game:audio:started` (active player) triggers `game:audio:play` to spectators when `syncAudio` is enabled in room config.

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
- Do not touch `roomManager.ts` unless explicitly asked — it contains all game logic
- Do not modify the `Song` type or `Room` interface unless explicitly asked
- Do not modify `useAudio.ts` or `useSocket.ts` unless explicitly asked
- Do not modify WebSocket room logic
