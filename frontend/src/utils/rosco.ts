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

export type RoscoOutcome = 'hit' | 'miss' | 'pass';

export interface NextLetter {
  playerIndex: number;
  cell: RoscoCell;
}

const OUTCOME_STATUS: Record<RoscoOutcome, RoscoCell['status']> = { hit: 'correct', miss: 'wrong', pass: 'passed' };

function resolveActive(board: RoscoCell[], status: RoscoCell['status']): RoscoCell[] {
  const active = firstActiveIndex(board);
  return board.map((cell, i) => (i === active ? { ...cell, status } : cell));
}

// Espejo de judge/endTurnWith/nextPlayable en backend/src/rooms/rosco.ts.
export function nextLetter(room: Room, outcome: RoscoOutcome): NextLetter | null {
  if (!room.rosco) return null;
  const { subMode, boards } = room.rosco;
  const current = room.currentPlayerIndex;
  const judged = subMode === 'paralelo' ? 0 : current;
  const after = boards.map((board, i) => (i === judged ? resolveActive(board, OUTCOME_STATUS[outcome]) : board));

  let playerIndex = current;
  if (subMode === 'turnos' && outcome !== 'hit') {
    const n = room.players.length;
    for (let step = 1; step <= n; step++) {
      const index = (current + step) % n;
      if (room.players[index]?.connected && firstActiveIndex(after[index] ?? []) !== -1) {
        playerIndex = index;
        break;
      }
    }
  }

  const board = after[subMode === 'paralelo' ? 0 : playerIndex] ?? [];
  const index = firstActiveIndex(board);
  return index === -1 ? null : { playerIndex, cell: board[index] };
}
