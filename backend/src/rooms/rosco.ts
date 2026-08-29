import type { Room, RoscoCell, RoscoSubMode, RoomPlayer } from './types.js';

export interface Award {
  title: boolean;
  artist: boolean;
}

export function firstActiveIndex(board: RoscoCell[]): number {
  const pending = board.findIndex((c) => c.status === 'pending');
  if (pending !== -1) return pending;
  return board.findIndex((c) => c.status === 'passed');
}

export function boardDone(board: RoscoCell[]): boolean {
  return firstActiveIndex(board) === -1;
}

export function boardFor(room: Room, playerIndex: number): RoscoCell[] | null {
  if (!room.rosco) return null;
  return room.rosco.subMode === 'paralelo'
    ? room.rosco.boards[0] ?? null
    : room.rosco.boards[playerIndex] ?? null;
}

export function activeCell(room: Room): RoscoCell | null {
  const board = boardFor(room, room.currentPlayerIndex);
  if (!board) return null;
  const index = firstActiveIndex(board);
  return index === -1 ? null : board[index];
}

function cellPoints(cell: RoscoCell): number {
  return (cell.guessedTitle ? 1 : 0) + (cell.guessedArtist ? 1 : 0);
}

function recalcScores(players: RoomPlayer[], boards: RoscoCell[][], subMode: RoscoSubMode): void {
  players.forEach((player, i) => {
    let score = 0;
    if (subMode === 'paralelo') {
      for (const cell of boards[0]) if (cell.wonBy === player.id) score += cellPoints(cell);
    } else {
      for (const cell of boards[i] ?? []) score += cellPoints(cell);
    }
    player.score = score;
  });
}

function nextPlayable(room: Room, from: number): number {
  const n = room.players.length;
  for (let step = 1; step <= n; step++) {
    const index = (from + step) % n;
    if (!room.players[index].connected) continue;
    const board = boardFor(room, index);
    if (board && !boardDone(board)) return index;
  }
  return -1;
}

function settle(room: Room): void {
  if (!room.rosco) return;
  recalcScores(room.players, room.rosco.boards, room.rosco.subMode);
  if (room.rosco.boards.every(boardDone)) room.status = 'finished';
}

function judge(room: Room, resolve: (cell: RoscoCell) => boolean): boolean {
  const board = boardFor(room, room.currentPlayerIndex);
  if (!board || room.status !== 'round_active') return false;
  const index = firstActiveIndex(board);
  if (index === -1) return false;
  if (!resolve(board[index])) return false;
  settle(room);
  return true;
}

export function awardLetter(room: Room, playerId: string, award: Award): boolean {
  if (room.rosco?.subMode !== 'paralelo') return false;
  if (!room.players.some((p) => p.id === playerId)) return false;

  return judge(room, (cell) => {
    const guessedTitle = award.title && cell.acceptTitle;
    const guessedArtist = award.artist && cell.acceptArtist;
    if (!guessedTitle && !guessedArtist) return false;
    cell.status = 'correct';
    cell.guessedTitle = guessedTitle;
    cell.guessedArtist = guessedArtist;
    cell.wonBy = playerId;
    return true;
  });
}

export function skipLetter(room: Room): boolean {
  if (room.rosco?.subMode !== 'paralelo') return false;
  return judge(room, (cell) => { cell.status = 'wrong'; return true; });
}

export function answerCorrect(room: Room, award: Award): boolean {
  if (room.rosco?.subMode !== 'turnos') return false;

  return judge(room, (cell) => {
    const guessedTitle = award.title && cell.acceptTitle;
    const guessedArtist = award.artist && cell.acceptArtist;
    if (!guessedTitle && !guessedArtist) return false;
    cell.status = 'correct';
    cell.guessedTitle = guessedTitle;
    cell.guessedArtist = guessedArtist;
    cell.wonBy = room.players[room.currentPlayerIndex]?.id ?? null;
    return true;
  });
}

export function answerWrong(room: Room): boolean {
  return endTurnWith(room, 'wrong');
}

export function pasapalabra(room: Room): boolean {
  return endTurnWith(room, 'passed');
}

function endTurnWith(room: Room, status: 'wrong' | 'passed'): boolean {
  if (room.rosco?.subMode !== 'turnos') return false;

  const resolved = judge(room, (cell) => { cell.status = status; return true; });
  if (!resolved || room.status === 'finished') return resolved;

  const next = nextPlayable(room, room.currentPlayerIndex);
  if (next !== -1) room.currentPlayerIndex = next;
  return true;
}

export function releaseTurn(room: Room): void {
  if (room.rosco?.subMode !== 'turnos') return;
  const next = nextPlayable(room, room.currentPlayerIndex);
  if (next !== -1) room.currentPlayerIndex = next;
}
