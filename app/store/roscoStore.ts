'use client';

import { create } from 'zustand';
import type { Player } from '../types/game';
import type {
  RoscoState,
  RoscoCell,
  RoscoEntry,
  RoscoSubMode,
  Award,
} from '../types/rosco';
import { roscoRepository } from '../repositories/rosco.repository';

/** Índice de la primera letra jugable: pendiente y, si no hay, pasada. */
export function firstActiveIndex(board: RoscoCell[]): number {
  const pending = board.findIndex((c) => c.status === 'pending');
  if (pending !== -1) return pending;
  return board.findIndex((c) => c.status === 'passed');
}

/** Un tablero está completo cuando no quedan letras pendientes ni pasadas. */
export function boardDone(board: RoscoCell[]): boolean {
  return firstActiveIndex(board) === -1;
}

function buildCells(entries: RoscoEntry[]): RoscoCell[] {
  return entries.map((e) => ({
    letter: e.letter,
    song: e.song,
    acceptTitle: e.acceptTitle,
    acceptArtist: e.acceptArtist,
    status: 'pending',
    guessedTitle: false,
    guessedArtist: false,
    wonBy: null,
  }));
}

function cellPoints(cell: RoscoCell): number {
  return (cell.guessedTitle ? 1 : 0) + (cell.guessedArtist ? 1 : 0);
}

/** Recalcula el marcador de cada jugador según el submodo. */
function withScores(
  players: Player[],
  boards: RoscoCell[][],
  subMode: RoscoSubMode
): Player[] {
  return players.map((p, i) => {
    let score = 0;
    if (subMode === 'paralelo') {
      for (const c of boards[0]) if (c.wonBy === p.id) score += cellPoints(c);
    } else {
      for (const c of boards[i] ?? []) score += cellPoints(c);
    }
    return { ...p, score };
  });
}

/** Siguiente jugador (cíclico) cuyo tablero aún tiene letras; -1 si ninguno. */
function nextUnfinished(currentIndex: number, boards: RoscoCell[][]): number {
  for (let step = 1; step <= boards.length; step++) {
    const idx = (currentIndex + step) % boards.length;
    if (!boardDone(boards[idx])) return idx;
  }
  return -1;
}

export const useRoscoStore = create<RoscoState>((set, get) => ({
  status: 'idle',
  subMode: 'paralelo',
  players: [],
  boards: [],
  currentPlayerIndex: 0,

  setupRosco(playerNames, packId, subMode) {
    const pack = roscoRepository.getPack(packId);
    const entries = pack?.entries ?? [];

    const players: Player[] = playerNames.map((name, i) => ({
      id: `player-${i}`,
      name,
      timeline: [],
      score: 0,
    }));

    const boards: RoscoCell[][] =
      subMode === 'paralelo'
        ? [buildCells(entries)]
        : players.map(() => buildCells(entries));

    set({
      status: 'playing',
      subMode,
      players,
      boards,
      currentPlayerIndex: 0,
    });
  },

  // ---------------- Paralelo ----------------
  awardLetter(playerId, award: Award) {
    const { boards, players, subMode } = get();
    if (subMode !== 'paralelo') return;
    const board = boards[0];
    const idx = firstActiveIndex(board);
    if (idx === -1) return;

    const cell = board[idx];
    const guessedTitle = award.title && cell.acceptTitle;
    const guessedArtist = award.artist && cell.acceptArtist;
    if (!guessedTitle && !guessedArtist) return;

    const newBoard = board.map((c, i) =>
      i === idx
        ? { ...c, status: 'correct' as const, guessedTitle, guessedArtist, wonBy: playerId }
        : c
    );
    const newBoards = [newBoard];
    const newPlayers = withScores(players, newBoards, subMode);
    set({
      boards: newBoards,
      players: newPlayers,
      status: boardDone(newBoard) ? 'finished' : 'playing',
    });
  },

  skipLetter() {
    const { boards, players, subMode } = get();
    if (subMode !== 'paralelo') return;
    const board = boards[0];
    const idx = firstActiveIndex(board);
    if (idx === -1) return;

    const newBoard = board.map((c, i) =>
      i === idx ? { ...c, status: 'wrong' as const } : c
    );
    const newBoards = [newBoard];
    set({
      boards: newBoards,
      players: withScores(players, newBoards, subMode),
      status: boardDone(newBoard) ? 'finished' : 'playing',
    });
  },

  // ---------------- Turnos ----------------
  answerCorrect(award: Award) {
    const { boards, players, subMode, currentPlayerIndex } = get();
    if (subMode !== 'turnos') return;
    const board = boards[currentPlayerIndex];
    const idx = firstActiveIndex(board);
    if (idx === -1) return;

    const cell = board[idx];
    const guessedTitle = award.title && cell.acceptTitle;
    const guessedArtist = award.artist && cell.acceptArtist;
    if (!guessedTitle && !guessedArtist) return;

    const newBoard = board.map((c, i) =>
      i === idx
        ? {
            ...c,
            status: 'correct' as const,
            guessedTitle,
            guessedArtist,
            wonBy: players[currentPlayerIndex].id,
          }
        : c
    );
    const newBoards = boards.map((b, i) => (i === currentPlayerIndex ? newBoard : b));
    const newPlayers = withScores(players, newBoards, subMode);

    // El jugador sigue mientras le queden letras; si acabó, pasa al siguiente.
    if (boardDone(newBoard)) {
      const next = nextUnfinished(currentPlayerIndex, newBoards);
      set({
        boards: newBoards,
        players: newPlayers,
        currentPlayerIndex: next === -1 ? currentPlayerIndex : next,
        status: next === -1 ? 'finished' : 'playing',
      });
    } else {
      set({ boards: newBoards, players: newPlayers });
    }
  },

  answerWrong() {
    const { boards, players, subMode, currentPlayerIndex } = get();
    if (subMode !== 'turnos') return;
    endTurn(set, boards, players, subMode, currentPlayerIndex, 'wrong');
  },

  pasapalabra() {
    const { boards, players, subMode, currentPlayerIndex } = get();
    if (subMode !== 'turnos') return;
    endTurn(set, boards, players, subMode, currentPlayerIndex, 'passed');
  },

  resetRosco() {
    set({
      status: 'idle',
      subMode: 'paralelo',
      players: [],
      boards: [],
      currentPlayerIndex: 0,
    });
  },
}));

/** Marca la letra activa como fallada/pasada y cede el turno. */
function endTurn(
  set: (partial: Partial<RoscoState>) => void,
  boards: RoscoCell[][],
  players: Player[],
  subMode: RoscoSubMode,
  currentPlayerIndex: number,
  mark: 'wrong' | 'passed'
) {
  const board = boards[currentPlayerIndex];
  const idx = firstActiveIndex(board);
  if (idx === -1) return;

  const newBoard = board.map((c, i) =>
    i === idx ? { ...c, status: mark } : c
  );
  const newBoards = boards.map((b, i) => (i === currentPlayerIndex ? newBoard : b));
  const next = nextUnfinished(currentPlayerIndex, newBoards);
  set({
    boards: newBoards,
    players: withScores(players, newBoards, subMode),
    currentPlayerIndex: next === -1 ? currentPlayerIndex : next,
    status: next === -1 ? 'finished' : 'playing',
  });
}
