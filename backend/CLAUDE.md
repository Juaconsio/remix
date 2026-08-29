# Backend — Express + Socket.io + TypeScript

Puerto: **4000**. Compilado con `tsx watch` en dev, `tsc` + `node` en producción.

## Estructura

```
src/
├── index.ts            ← Entry point: Express app + Socket.io server
├── songs.ts            ← Catálogo de canciones (datos en memoria)
├── routes/
│   ├── preview.ts      ← GET /api/preview/deezer/:id y /spotify/:id
│   └── youtubeSearch.ts← GET /api/youtube/search?q=
└── rooms/
    ├── roomManager.ts  ← CRUD de salas, lógica del modo clásico
    ├── rosco.ts        ← Reglas del rosco (funciones puras sobre Room, con tests)
    ├── roscoPacks.ts   ← Packs de rosco derivados del catálogo
    ├── publicRoom.ts   ← Redacción de la respuesta por espectador
    └── types.ts        ← Tipos Room, RoomPlayer, RoomConfig, RoscoCell
```

## Socket.io — eventos principales

| Dirección | Evento | Descripción |
|---|---|---|
| Cliente → Servidor | `room:create` | Crear sala nueva |
| Cliente → Servidor | `room:join` | Unirse con código |
| Cliente → Servidor | `room:rejoin` | Reconexión |
| Cliente → Servidor | `room:config` | Cambiar config (provider, pack) |
| Cliente → Servidor | `game:start` | Iniciar partida |
| Cliente → Servidor | `game:flip` | Sacar carta |
| Cliente → Servidor | `game:select` | Elegir posición en timeline |
| Cliente → Servidor | `game:place` | Confirmar posición |
| Servidor → Cliente | `room:joined` | Confirmación de unión |
| Servidor → Cliente | `room:updated` | Estado actualizado de la sala |
| Cliente → Servidor | `rosco:award` / `rosco:skip` | Adjudicar letra en `paralelo` (solo host) |
| Cliente → Servidor | `rosco:correct` / `rosco:wrong` / `rosco:pass` | Juzgar en `turnos` (solo host) |

## REST endpoints

| Ruta | Descripción |
|---|---|
| `GET /health` | Health check |
| `GET /api/preview/deezer/:id` | Proxy a Deezer API |
| `GET /api/preview/spotify/:id` | Proxy a Spotify API (requiere token OAuth) |
| `GET /api/youtube/search?q=` | Proxy a YouTube Data API v3 |

## Variables de entorno (`backend/.env`)

```
PORT=4000
CLIENT_URL=http://localhost:3000
YOUTUBE_API_KEY=       # Google Cloud Console → YouTube Data API v3
SPOTIFY_CLIENT_ID=     # developer.spotify.com/dashboard
SPOTIFY_CLIENT_SECRET=
```

## Reglas

- No modificar `roomManager.ts` ni `rosco.ts` salvo instrucción explícita — contienen la lógica de juego
- Las salas de rosco no se emiten con `io.to(code)`: usar `broadcastRoom()` o se filtran las respuestas
- El token de Spotify se cachea en memoria (`spotifyTokenCache`) — no duplicar esa lógica
- En dev, el estado de las salas se persiste en `dev-rooms.json` (útil para hot-reload)
