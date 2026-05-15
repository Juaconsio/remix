import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import previewRouter from './routes/preview.js';
import * as rm from './rooms/roomManager.js';

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use('/api/preview', previewRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  socket.on('room:create', ({ playerName }) => {
    try {
      const room = rm.createRoom(socket.id, playerName);
      socket.join(room.code);
      socket.emit('room:joined', { room, yourPlayerId: socket.id });
    } catch (e) {
      socket.emit('room:error', { message: e instanceof Error ? e.message : 'Error al crear sala' });
    }
  });

  socket.on('room:join', ({ code, playerName }) => {
    try {
      const room = rm.joinRoom(code, socket.id, playerName);
      socket.join(room.code);
      socket.emit('room:joined', { room, yourPlayerId: socket.id });
      socket.to(room.code).emit('room:updated', { room });
    } catch (e) {
      socket.emit('room:error', { message: e instanceof Error ? e.message : 'Error al unirse' });
    }
  });

  socket.on('room:config', (config) => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room || room.hostId !== socket.id) return;
    try {
      const updated = rm.updateConfig(room.code, config);
      io.to(room.code).emit('room:updated', { room: updated });
    } catch {}
  });

  socket.on('game:start', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room || room.hostId !== socket.id) return;
    try {
      const updated = rm.startGame(room.code);
      io.to(room.code).emit('game:state', { room: updated });
    } catch {}
  });

  socket.on('game:flip', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room) return;
    const activePlayer = room.players[room.currentPlayerIndex];
    if (activePlayer?.id !== socket.id) return;
    try {
      const updated = rm.flipCard(room.code);
      io.to(room.code).emit('game:state', { room: updated });
    } catch {}
  });

  socket.on('game:select', ({ position }) => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room) return;
    const activePlayer = room.players[room.currentPlayerIndex];
    if (activePlayer?.id !== socket.id) return;
    try {
      const updated = rm.selectPosition(room.code, position);
      io.to(room.code).emit('game:state', { room: updated });
    } catch {}
  });

  socket.on('game:place', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room) return;
    const activePlayer = room.players[room.currentPlayerIndex];
    if (activePlayer?.id !== socket.id) return;
    try {
      const updated = rm.placeCard(room.code);
      io.to(room.code).emit('game:state', { room: updated });

      // Auto-avance a siguiente turno tras 2.5s
      setTimeout(() => {
        const next = rm.nextTurn(room.code);
        io.to(room.code).emit('game:state', { room: next });
      }, 2500);
    } catch {}
  });

  socket.on('game:audio:started', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room?.config.syncAudio || !room.currentCard) return;
    const activePlayer = room.players[room.currentPlayerIndex];
    if (activePlayer?.id !== socket.id) return;

    const card = room.currentCard;
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

  socket.on('disconnect', () => {
    const room = rm.removePlayer(socket.id);
    if (room) io.to(room.code).emit('room:updated', { room });
  });
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
