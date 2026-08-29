import type { Room, RoscoCell } from '../types/socket';

export function firstActiveIndex(board: RoscoCell[]): number {
  const pending = board.findIndex((c) => c.status === 'pending');
  if (pending !== -1) return pending;
  return board.findIndex((c) => c.status === 'passed');
}

export function boardFor(room: Room): RoscoCell[] | null {
  if (!room.rosco) return null;
  return room.rosco.subMode === 'paralelo'
    ? room.rosco.boards[0] ?? null
    : room.rosco.boards[room.currentPlayerIndex] ?? null;
}
