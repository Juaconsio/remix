import type { Room, RoomPlayer, RoomConfig } from './types';
import { allSongs as songs } from '../songs';
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
    players: [{ id: hostId, name: hostName, timeline: [], score: 0 }],
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
  room.players.push({ id: playerId, name: playerName, timeline: [], score: 0 });
  saveRooms();
  return room;
}

// Solo para dev: reconecta un jugador existente con un nuevo socketId (por nombre)
export function reconnectPlayer(code: string, playerName: string, newSocketId: string): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  const player = room.players.find((p) => p.name === playerName);
  if (!player) throw new Error('Jugador no encontrado en la sala');
  const oldId = player.id;
  player.id = newSocketId;
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
  room.players = room.players.filter((p) => p.id !== playerId);
  // Si el host se va, el siguiente jugador pasa a ser host
  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }
  // Si la sala queda vacía, la eliminamos
  if (room.players.length === 0) {
    rooms.delete(room.code);
    saveRooms();
    return undefined;
  }
  saveRooms();
  return room;
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

  // Comprobar victoria (10 puntos)
  const winner = room.players.find((p) => p.score >= 10);
  if (winner || room.deck.length === 0) {
    room.status = 'finished';
    return room;
  }

  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  room.currentCard = null;
  room.selectedPosition = null;
  room.validationResult = null;
  room.status = 'setup';
  saveRooms();
  return room;
}
