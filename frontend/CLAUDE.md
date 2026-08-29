# Frontend — Vite + React + TypeScript

Puerto: **3000**. Proxy `/api` → `http://backend:4000` (configurado en `vite.config.ts`).

## Estructura

```
src/
├── pages/          ← Home, Lobby, Game, Rosco, Results (react-router-dom)
├── game/
│   └── components/ ← AudioPlayer, YouTubePlayer, CardSlot, Timeline, RoscoBoard, RoscoControls, …
├── hooks/
│   ├── useAudio.ts         ← Deezer / Spotify (Howler.js, preview 30s)
│   ├── useYouTubePlayer.ts ← YouTube IFrame API (fullscreen oculto)
│   ├── useGameAudio.ts     ← Une provider + sync; recibe { card, canPlay } del llamador
│   └── useSocket.ts        ← Eventos Socket.io con el backend
├── providers/
│   └── SocketProvider.tsx  ← Contexto de la conexión Socket.io
├── store/
│   └── providerStore.ts    ← Zustand: proveedor de música activo
└── types/
    ├── game.ts             ← Song, MusicProvider, etc.
    ├── socket.ts           ← Eventos cliente ↔ servidor
    └── youtube.d.ts        ← Tipos globales window.YT.*
```

## Proveedores de audio

| Provider | Hook | Notas |
|---|---|---|
| `deezer` | `useAudio` | Preview 30s vía `/api/preview/deezer/:id` |
| `spotify` | `useAudio` | Preview 30s vía `/api/preview/spotify/:id` |
| `youtube` | `useYouTubePlayer` | IFrame API, div oculto en `Game.tsx` |

El proveedor activo se lee de `useProviderStore` (Zustand, persiste en localStorage).

## YouTube IFrame API

- `useYouTubePlayer` carga el script una sola vez (singleton promise `ytApiPromise`).
- El player se inserta en `containerRef` (div `visibility:hidden` en `Game.tsx`).
- `play(videoId, hookStart, hookDuration)` crea o reutiliza el player.
- Errores mapeados en `YT_ERRORS` dentro del hook.

## API routes relevantes

Llamadas desde el frontend, proxied al backend:

| Ruta | Uso |
|---|---|
| `GET /api/preview/deezer/:id` | Preview URL de una canción |
| `GET /api/preview/spotify/:id` | Preview URL de Spotify |
| `GET /api/youtube/search?q=` | Búsqueda de canciones en YouTube |

## Reglas

- No tocar `useAudio.ts` ni `useSocket.ts` salvo instrucción explícita
- No modificar el tipo `Song` ni la interfaz `Room`
- `display:none` en el div de YouTube rompe la IFrame API — usar `visibility:hidden`
