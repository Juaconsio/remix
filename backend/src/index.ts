import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import previewRouter from './routes/preview.js';
import youtubeSearchRouter from './routes/youtubeSearch.js';
import youtubePlaylistMapRouter from './routes/youtubePlaylistMap.js';
import * as rm from './rooms/roomManager.js';
import { redactRoom } from './rooms/publicRoom.js';
import type { Room } from './rooms/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// En producción servimos el front desde el mismo origen, así que reflejamos
// cualquier origin (no hay cross-origin real). En dev mantenemos localhost:3000.
const CLIENT_URL = process.env.CLIENT_URL ?? (process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:3000');
const corsOrigin = CLIENT_URL === '*' ? true : CLIENT_URL;

const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use('/api/preview', previewRouter);
app.use('/api/youtube/search', youtubeSearchRouter);
app.use('/api/youtube/playlist-map', youtubePlaylistMapRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Servir el frontend compilado (modelo de un solo servicio en producción).
// En dev el directorio no existe, así que se omite y Vite sirve el front en :3000.
const clientDist = process.env.CLIENT_DIST ?? path.resolve(__dirname, '../public');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Fallback SPA: toda ruta que no sea API/socket/health devuelve index.html
  // para que React Router maneje el enrutado en el cliente.
  app.get(/^(?!\/api|\/socket\.io|\/health).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`  Sirviendo frontend desde ${clientDist}`);
}

type RoomEvent = 'room:updated' | 'game:state';

// Se recorre el adapter en vez de fetchSockets() porque es síncrono: con await,
// dos emisiones seguidas pueden resolverse fuera de orden y dejar estado viejo.
function broadcastRoom(room: Room, event: RoomEvent, exceptId?: string) {
  if (!room.rosco) {
    const target = exceptId ? io.to(room.code).except(exceptId) : io.to(room.code);
    target.emit(event, { room });
    return;
  }
  const ids = io.sockets.adapter.rooms.get(room.code) ?? new Set<string>();
  for (const id of ids) {
    if (id === exceptId) continue;
    io.to(id).emit(event, { room: redactRoom(room, id) });
  }
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ playerName }) => {
    try {
      const room = rm.createRoom(socket.id, playerName);
      socket.join(room.code);
      socket.emit('room:joined', { room: redactRoom(room, socket.id), yourPlayerId: socket.id });
    } catch (e) {
      socket.emit('room:error', { message: e instanceof Error ? e.message : 'Error al crear sala' });
    }
  });

  socket.on('room:rejoin', ({ code, playerName }: { code: string; playerName: string }) => {
    try {
      let room;
      try {
        room = rm.reconnectPlayer(code, playerName, socket.id);
      } catch {
        // El jugador ya no está en la sala (p. ej. salió del lobby): reintentar
        // como join normal. Si la partida ya empezó, joinRoom lanzará el error.
        room = rm.joinRoom(code, socket.id, playerName);
      }
      socket.join(room.code);
      socket.emit('room:joined', { room: redactRoom(room, socket.id), yourPlayerId: socket.id });
      broadcastRoom(room, 'room:updated', socket.id);
    } catch (e) {
      socket.emit('room:error', { message: e instanceof Error ? e.message : 'Error al reconectar' });
    }
  });

  socket.on('room:join', ({ code, playerName }) => {
    try {
      const room = rm.joinRoom(code, socket.id, playerName);
      socket.join(room.code);
      socket.emit('room:joined', { room: redactRoom(room, socket.id), yourPlayerId: socket.id });
      broadcastRoom(room, 'room:updated', socket.id);
    } catch (e) {
      socket.emit('room:error', { message: e instanceof Error ? e.message : 'Error al unirse' });
    }
  });

  socket.on('room:config', (config) => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room || room.hostId !== socket.id) return;
    try {
      const updated = rm.updateConfig(room.code, config);
      broadcastRoom(updated, 'room:updated');
    } catch {}
  });

  socket.on('game:start', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room || room.hostId !== socket.id) return;
    try {
      const updated = rm.startGame(room.code);
      broadcastRoom(updated, 'game:state');
    } catch {}
  });

  socket.on('game:flip', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room) return;
    const activePlayer = room.players[room.currentPlayerIndex];
    if (activePlayer?.id !== socket.id) return;
    try {
      const updated = rm.flipCard(room.code);
      broadcastRoom(updated, 'game:state');
    } catch {}
  });

  socket.on('game:select', ({ position }) => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room) return;
    const activePlayer = room.players[room.currentPlayerIndex];
    if (activePlayer?.id !== socket.id) return;
    try {
      const updated = rm.selectPosition(room.code, position);
      broadcastRoom(updated, 'game:state');
    } catch {}
  });

  socket.on('game:place', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room) return;
    const activePlayer = room.players[room.currentPlayerIndex];
    if (activePlayer?.id !== socket.id) return;
    try {
      const updated = rm.placeCard(room.code);
      broadcastRoom(updated, 'game:state');

      // Auto-avance a siguiente turno tras 2.5s
      setTimeout(() => {
        const next = rm.nextTurn(room.code);
        broadcastRoom(next, 'game:state');
      }, 2500);
    } catch {}
  });

  socket.on('game:skip', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room) return;
    const activePlayer = room.players[room.currentPlayerIndex];
    if (activePlayer?.id !== socket.id) return;
    if (room.status !== 'round_active') return;
    try {
      const updated = rm.skipCard(room.code);
      broadcastRoom(updated, 'game:state');
    } catch {}
  });

  socket.on('game:audio:started', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room?.config.syncAudio) return;

    const presenterId = room.rosco
      ? room.hostId
      : room.players[room.currentPlayerIndex]?.id;
    if (presenterId !== socket.id) return;

    const card = room.rosco ? rm.roscoActiveCell(room.code)?.song : room.currentCard;
    if (!card) return;

    const provider = room.config.provider;
    const trackId = provider === 'spotify'
      ? (card.providerIds?.spotify ?? String(card.deezerId))
      : provider === 'youtube'
      ? (card.providerIds?.youtube ?? '')
      : String(card.deezerId);

    // Emitir a todos menos al jugador activo (él ya está reproduciendo)
    socket.to(room.code).emit('game:audio:play', {
      trackId,
      provider,
      hookStart: card.hookStart,
      hookDuration: card.hookDuration,
    });
  });

  function onRoscoAction(action: (code: string) => ReturnType<typeof rm.roscoSkip>) {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room || room.hostId !== socket.id || !room.rosco) return;
    try {
      broadcastRoom(action(room.code), 'game:state');
    } catch {}
  }

  socket.on('rosco:award', ({ playerId, award }) => {
    onRoscoAction((code) => rm.roscoAward(code, playerId, award));
  });

  socket.on('rosco:skip', () => onRoscoAction(rm.roscoSkip));

  socket.on('rosco:correct', ({ award }) => {
    onRoscoAction((code) => rm.roscoCorrect(code, award));
  });

  socket.on('rosco:wrong', () => onRoscoAction(rm.roscoWrong));

  socket.on('rosco:pass', () => onRoscoAction(rm.roscoPass));

  socket.on('disconnect', () => {
    const room = rm.removePlayer(socket.id);
    if (room) broadcastRoom(room, 'room:updated');
  });
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`\n  Backend listo en http://localhost:${PORT}\n`);
});
