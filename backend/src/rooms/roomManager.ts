import type { Room, RoomPlayer, RoomConfig } from './types.js';
import { allSongs as songs } from '../songs.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DEV = process.env.NODE_ENV !== 'production';
const PERSIST_FILE = join(process.cwd(), 'dev-rooms.json');

function loadRooms(): Map<string, Room> {
  if (!DEV) return new Map();
  try {
    const raw = readFileSync(PERSIST_FILE, 'utf8');
    const entries: [string, Room][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveRooms() {
  if (!DEV) return;
  try {
    writeFileSync(PERSIST_FILE, JSON.stringify([...rooms.entries()]));
  } catch {}
}

const rooms = loadRooms();

// Puntaje necesario para ganar. El mazo base tiene ~20 cartas, así que 10 casi
// nunca se alcanza y las partidas terminaban por agotamiento; 7 es alcanzable.
const WIN_SCORE = 7;

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I/O para evitar confusión
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostId: string, hostName: string): Room {
  const code = generateCode();
  const room: Room = {
    code,
    hostId,
    players: [{ id: hostId, name: hostName, timeline: [], score: 0, connected: true }],
    config: { packId: 'base', provider: 'deezer', syncAudio: false },
    status: 'lobby',
    deck: [],
    currentPlayerIndex: 0,
    currentCard: null,
    selectedPosition: null,
    validationResult: null,
  };
  rooms.set(code, room);
  saveRooms();
  return room;
}

export function joinRoom(code: string, playerId: string, playerName: string): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  if (room.status !== 'lobby') throw new Error('La partida ya ha comenzado');
  if (room.players.length >= 8) throw new Error('La sala está llena');
  if (room.players.find((p) => p.id === playerId)) return room; // reconexión
  room.players.push({ id: playerId, name: playerName, timeline: [], score: 0, connected: true });
  saveRooms();
  return room;
}

// Reconecta un jugador existente con un nuevo socketId (por nombre). Reattacha
// el id, lo marca conectado y conserva su timeline/puntaje.
export function reconnectPlayer(code: string, playerName: string, newSocketId: string): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  const player = room.players.find((p) => p.name === playerName);
  if (!player) throw new Error('Jugador no encontrado en la sala');
  const oldId = player.id;
  player.id = newSocketId;
  player.connected = true;
  if (room.hostId === oldId) room.hostId = newSocketId;
  saveRooms();
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function getRoomByPlayer(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.find((p) => p.id === playerId)) return room;
  }
}

export function updateConfig(code: string, config: Partial<RoomConfig>): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  Object.assign(room.config, config);
  saveRooms();
  return room;
}

export function removePlayer(playerId: string): Room | undefined {
  const room = getRoomByPlayer(playerId);
  if (!room) return;

  const inGame = room.status !== 'lobby' && room.status !== 'finished';

  // En partida no borramos al jugador: lo marcamos desconectado para conservar
  // su timeline/puntaje y no descuadrar el orden de turnos. Puede reconectar.
  if (inGame) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return room;
    player.connected = false;

    // Si todos quedan desconectados, la sala se limpia.
    if (room.players.every((p) => !p.connected)) {
      rooms.delete(room.code);
      saveRooms();
      return undefined;
    }

    // Si el host cae, el host pasa al primer jugador conectado.
    if (room.hostId === playerId) {
      const nextHost = room.players.find((p) => p.connected);
      if (nextHost) room.hostId = nextHost.id;
    }

    // Si el que cae es el jugador activo y está reteniendo el turno, avanzamos.
    // En 'validating' ya hay un auto-avance pendiente (setTimeout en index.ts),
    // así que no tocamos el turno para no avanzar dos veces.
    const activeId = room.players[room.currentPlayerIndex]?.id;
    if (activeId === playerId && (room.status === 'setup' || room.status === 'round_active')) {
      advanceTurn(room);
    }

    saveRooms();
    return room;
  }

  // En lobby/finished sí borramos al jugador de la lista.
  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }
  if (room.players.length === 0) {
    rooms.delete(room.code);
    saveRooms();
    return undefined;
  }
  saveRooms();
  return room;
}

// Índice del siguiente jugador conectado a partir de `from` (exclusivo).
// Devuelve -1 si no queda ningún jugador conectado.
function nextConnectedIndex(room: Room, from: number): number {
  const n = room.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    if (room.players[idx].connected) return idx;
  }
  return -1;
}

// Avanza al siguiente jugador conectado y reinicia el estado de la ronda.
// Devuelve false si no queda nadie conectado (la sala espera reconexión).
function advanceTurn(room: Room): boolean {
  room.currentCard = null;
  room.selectedPosition = null;
  room.validationResult = null;
  const next = nextConnectedIndex(room, room.currentPlayerIndex);
  if (next === -1) return false;
  room.currentPlayerIndex = next;
  room.status = 'setup';
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function startGame(code: string): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  const packSongs = songs.filter((s) => s.packId === room.config.packId);
  room.deck = shuffle(packSongs);
  room.players.forEach((p) => { p.timeline = []; p.score = 0; });
  room.currentPlayerIndex = 0;
  room.status = 'setup';
  saveRooms();
  return room;
}

function isChronologicallyCorrect(timeline: Room['players'][0]['timeline'], card: Room['deck'][0], position: number): boolean {
  const before = timeline[position - 1];
  const after = timeline[position];
  if (before && before.year > card.year) return false;
  if (after && after.year < card.year) return false;
  return true;
}

export function flipCard(code: string): Room {
  const room = rooms.get(code);
  if (!room || room.deck.length === 0) throw new Error('No hay cartas');
  const [card, ...rest] = room.deck;
  room.currentCard = card;
  room.deck = rest;
  room.selectedPosition = null;
  room.validationResult = null;
  room.status = 'round_active';
  saveRooms();
  return room;
}

export function selectPosition(code: string, position: number): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  room.selectedPosition = position;
  saveRooms();
  return room;
}

export function placeCard(code: string): Room {
  const room = rooms.get(code);
  if (!room || !room.currentCard || room.selectedPosition === null) throw new Error('Estado inválido');

  const player = room.players[room.currentPlayerIndex];
  const correct = isChronologicallyCorrect(player.timeline, room.currentCard, room.selectedPosition);

  if (correct) {
    player.timeline.splice(room.selectedPosition, 0, room.currentCard);
    player.score += 1;
  }

  room.validationResult = correct;
  room.status = 'validating';
  saveRooms();
  return room;
}

export function skipCard(code: string): Room {
  const room = rooms.get(code);
  if (!room || !room.currentCard) throw new Error('Estado inválido');
  // Descartar la carta actual y volver a setup con el mismo jugador
  room.currentCard = null;
  room.selectedPosition = null;
  room.validationResult = null;
  room.status = 'setup';
  saveRooms();
  return room;
}

export function nextTurn(code: string): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');

  // Comprobar victoria
  const winner = room.players.find((p) => p.score >= WIN_SCORE);
  if (winner || room.deck.length === 0) {
    room.status = 'finished';
    saveRooms();
    return room;
  }

  advanceTurn(room);
  saveRooms();
  return room;
}
