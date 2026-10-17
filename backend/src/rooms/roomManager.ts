import type { Room, RoomConfig, RoomPlayer } from './types.js';
import type { Song } from '../types.js';
import { allSongs as songs } from '../songs.js';
import { getRoscoPack, buildCells, SAMPLE_PACK_ID } from './roscoPacks.js';
import * as rosco from './rosco.js';
import type { Award } from './rosco.js';
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
for (const room of rooms.values()) {
  room.steals ??= [];
  room.stealDeadline ??= null;
  room.stealWinnerId ??= null;
  room.tokenAwarded ??= false;
  room.players.forEach((p) => { p.tokens ??= 0; });
  if (room.status === 'stealing') resolveRound(room);
}

// Puntaje necesario para ganar. El mazo base tiene ~20 cartas, así que 10 casi
// nunca se alcanza y las partidas terminaban por agotamiento; 7 es alcanzable.
const WIN_SCORE = 7;

const STARTING_TOKENS = 2;
const MAX_TOKENS = 5;
export const STEAL_WINDOW_MS = 10_000;

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
    players: [newPlayer(hostId, hostName)],
    config: {
      packId: 'base',
      provider: 'youtube',
      syncAudio: true,
      mode: 'classic',
      roscoSubMode: 'paralelo',
      roscoPackId: SAMPLE_PACK_ID,
    },
    status: 'lobby',
    deck: [],
    currentPlayerIndex: 0,
    currentCard: null,
    selectedPosition: null,
    validationResult: null,
    steals: [],
    stealDeadline: null,
    stealWinnerId: null,
    tokenAwarded: false,
    rosco: null,
    pregameReadyIds: null,
  };
  rooms.set(code, room);
  saveRooms();
  return room;
}

function newPlayer(id: string, name: string): RoomPlayer {
  return { id, name, timeline: [], score: 0, tokens: 0, connected: true, startingOptions: [] };
}

export function joinRoom(code: string, playerId: string, playerName: string): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  if (room.status !== 'lobby') throw new Error('La partida ya ha comenzado');
  if (room.players.length >= 8) throw new Error('La sala está llena');
  if (room.players.find((p) => p.id === playerId)) return room; // reconexión
  room.players.push(newPlayer(playerId, playerName));
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
  if (room.pregameReadyIds) {
    room.pregameReadyIds = room.pregameReadyIds.map((id) => (id === oldId ? newSocketId : id));
  }
  room.steals.forEach((s) => { if (s.playerId === oldId) s.playerId = newSocketId; });
  if (room.stealWinnerId === oldId) room.stealWinnerId = newSocketId;
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

    endPregameIfEveryoneReady(room);
    if (room.status === 'stealing') closeStealIfEveryoneDecided(room);

    // Si el que cae es el jugador activo y está reteniendo el turno, avanzamos.
    // En 'validating' el turno lo avanza el host con game:next (index.ts), que
    // sigue disponible aunque el activo se haya ido.
    const activeId = room.players[room.currentPlayerIndex]?.id;
    if (activeId === playerId && (room.status === 'setup' || room.status === 'round_active')) {
      if (room.rosco) rosco.releaseTurn(room);
      else advanceTurn(room);
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
  resetRound(room);
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

const STARTING_OPTIONS = 3;

function takeStartingCard(room: Room, player: RoomPlayer, chosen: Song) {
  const rest = player.startingOptions.filter((s) => s.id !== chosen.id);
  player.timeline = [chosen];
  player.startingOptions = [];
  room.deck = shuffle([...room.deck, ...rest]);
}

function endPregame(room: Room) {
  room.players.forEach((p) => {
    if (p.startingOptions.length > 0) {
      takeStartingCard(room, p, p.startingOptions[Math.floor(Math.random() * p.startingOptions.length)]);
    }
  });
  room.pregameReadyIds = null;
}

function endPregameIfEveryoneReady(room: Room) {
  const readyIds = room.pregameReadyIds;
  if (!readyIds) return;
  if (room.players.every((p) => !p.connected || readyIds.includes(p.id))) endPregame(room);
}

function assertPregameOver(room: Room) {
  if (room.pregameReadyIds) throw new Error('La partida todavía no empieza');
}

export function confirmPregame(code: string, playerId: string, songId?: string): Room {
  const room = rooms.get(code);
  if (!room?.pregameReadyIds) throw new Error('No hay pregame en curso');
  const player = room.players.find((p) => p.id === playerId);
  if (!player || room.pregameReadyIds.includes(playerId)) return room;

  if (player.startingOptions.length > 0) {
    const chosen = player.startingOptions.find((s) => s.id === songId);
    if (!chosen) throw new Error('Esa canción no está entre tus opciones');
    takeStartingCard(room, player, chosen);
  }
  room.pregameReadyIds.push(playerId);
  endPregameIfEveryoneReady(room);
  saveRooms();
  return room;
}

export function skipPregame(code: string): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  endPregame(room);
  saveRooms();
  return room;
}

export function startGame(code: string): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  const isClassic = room.config.mode === 'classic';
  room.pregameReadyIds = isClassic || room.config.syncAudio ? [] : null;
  room.players.forEach((p) => { p.timeline = []; p.score = 0; p.tokens = STARTING_TOKENS; p.startingOptions = []; });
  room.currentPlayerIndex = 0;
  room.currentCard = null;
  resetRound(room);

  if (room.config.mode === 'rosco') {
    const pack = getRoscoPack(room.config.roscoPackId);
    if (!pack || pack.entries.length === 0) throw new Error('Pack de rosco no encontrado');
    const subMode = room.config.roscoSubMode;
    room.rosco = {
      subMode,
      boards: subMode === 'paralelo'
        ? [buildCells(pack.entries)]
        : room.players.map(() => buildCells(pack.entries)),
    };
    room.deck = [];
    room.status = 'round_active';
    saveRooms();
    return room;
  }

  const deck = shuffle(songs.filter((s) => s.packId === room.config.packId));
  room.players.forEach((p) => { p.startingOptions = deck.splice(0, STARTING_OPTIONS); });
  room.deck = deck;
  room.rosco = null;
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
  assertPregameOver(room);
  const [card, ...rest] = room.deck;
  room.currentCard = card;
  room.deck = rest;
  resetRound(room);
  room.status = 'round_active';
  saveRooms();
  return room;
}

function resetRound(room: Room) {
  room.selectedPosition = null;
  room.validationResult = null;
  room.steals = [];
  room.stealDeadline = null;
  room.stealWinnerId = null;
  room.tokenAwarded = false;
}

export function selectPosition(code: string, position: number): Room {
  const room = rooms.get(code);
  if (!room) throw new Error('Sala no encontrada');
  room.selectedPosition = position;
  saveRooms();
  return room;
}

export function placeCard(code: string, now = Date.now()): Room {
  const room = rooms.get(code);
  if (!room || !room.currentCard || room.selectedPosition === null) throw new Error('Estado inválido');

  if (stealCandidates(room).length > 0) {
    room.status = 'stealing';
    room.stealDeadline = now + STEAL_WINDOW_MS;
  } else {
    resolveRound(room);
  }
  saveRooms();
  return room;
}

function stealCandidates(room: Room): RoomPlayer[] {
  return room.players.filter((p, i) => i !== room.currentPlayerIndex && p.connected && p.tokens > 0);
}

function resolveRound(room: Room) {
  const active = room.players[room.currentPlayerIndex];
  const card = room.currentCard;
  if (!card || room.selectedPosition === null) return;

  const correct = isChronologicallyCorrect(active.timeline, card, room.selectedPosition);
  const winningSteal = correct
    ? undefined
    : room.steals.find((s) => s.position !== null && isChronologicallyCorrect(active.timeline, card, s.position));
  const winner = winningSteal && room.players.find((p) => p.id === winningSteal.playerId);

  if (correct) {
    active.timeline.splice(room.selectedPosition, 0, card);
    active.score += 1;
  } else if (winner) {
    const after = winner.timeline.findIndex((s) => s.year > card.year);
    winner.timeline.splice(after === -1 ? winner.timeline.length : after, 0, card);
    winner.score += 1;
  }

  room.validationResult = correct;
  room.stealWinnerId = winner?.id ?? null;
  room.stealDeadline = null;
  room.status = 'validating';
}

function closeStealIfEveryoneDecided(room: Room) {
  const decided = new Set(room.steals.map((s) => s.playerId));
  if (stealCandidates(room).every((p) => decided.has(p.id))) resolveRound(room);
}

export function stealCard(code: string, playerId: string, position: number): Room {
  const room = rooms.get(code);
  if (!room || room.status !== 'stealing' || room.selectedPosition === null) throw new Error('No hay robo en curso');
  const player = stealCandidates(room).find((p) => p.id === playerId);
  if (!player || room.steals.some((s) => s.playerId === playerId)) throw new Error('No puedes robar esta carta');

  const slots = room.players[room.currentPlayerIndex].timeline.length + 1;
  const taken = position === room.selectedPosition || room.steals.some((s) => s.position === position);
  if (!Number.isInteger(position) || position < 0 || position >= slots || taken) throw new Error('Esa posición no está libre');

  player.tokens -= 1;
  room.steals.push({ playerId, position });
  closeStealIfEveryoneDecided(room);
  saveRooms();
  return room;
}

export function passSteal(code: string, playerId: string): Room {
  const room = rooms.get(code);
  if (!room || room.status !== 'stealing') throw new Error('No hay robo en curso');
  if (!room.steals.some((s) => s.playerId === playerId)) room.steals.push({ playerId, position: null });
  closeStealIfEveryoneDecided(room);
  saveRooms();
  return room;
}

export function closeSteal(code: string, deadline: number): Room | undefined {
  const room = rooms.get(code);
  if (!room || room.status !== 'stealing' || room.stealDeadline !== deadline) return;
  resolveRound(room);
  saveRooms();
  return room;
}

export function awardToken(code: string): Room {
  const room = rooms.get(code);
  if (!room || room.status !== 'validating' || room.tokenAwarded) throw new Error('No se puede dar ficha ahora');
  const active = room.players[room.currentPlayerIndex];
  active.tokens = Math.min(MAX_TOKENS, active.tokens + 1);
  room.tokenAwarded = true;
  saveRooms();
  return room;
}

export function skipCard(code: string, paid = false): Room {
  const room = rooms.get(code);
  if (!room || !room.currentCard) throw new Error('Estado inválido');
  const active = room.players[room.currentPlayerIndex];
  if (paid) {
    if (active.tokens <= 0) throw new Error('No te quedan fichas');
    active.tokens -= 1;
  }
  room.currentCard = null;
  resetRound(room);
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

function applyRosco(code: string, action: (room: Room) => boolean): Room {
  const room = rooms.get(code);
  if (!room || !room.rosco) throw new Error('Sala sin partida de rosco');
  assertPregameOver(room);
  if (!action(room)) throw new Error('Jugada de rosco inválida');
  saveRooms();
  return room;
}

export function roscoAward(code: string, playerId: string, award: Award): Room {
  return applyRosco(code, (room) => rosco.awardLetter(room, playerId, award));
}

export function roscoSkip(code: string): Room {
  return applyRosco(code, rosco.skipLetter);
}

export function roscoCorrect(code: string, award: Award): Room {
  return applyRosco(code, (room) => rosco.answerCorrect(room, award));
}

export function roscoWrong(code: string): Room {
  return applyRosco(code, rosco.answerWrong);
}

export function roscoPass(code: string): Room {
  return applyRosco(code, rosco.pasapalabra);
}

export function roscoActiveCell(code: string) {
  const room = rooms.get(code);
  return room ? rosco.activeCell(room) : null;
}
