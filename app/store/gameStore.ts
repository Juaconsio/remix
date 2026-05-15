'use client';

import { create } from 'zustand';
import type { GameState, Player, Song } from '../types/game';
import { songsRepository } from '../repositories/songs.repository';

const WIN_SCORE = 10;

function isChronologicallyCorrect(timeline: Song[], inserted: Song, position: number): boolean {
  const before = timeline[position - 1];
  const after = timeline[position];
  if (before && before.year > inserted.year) return false;
  if (after && after.year < inserted.year) return false;
  return true;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'idle',
  players: [],
  currentPlayerIndex: 0,
  currentCard: null,
  deck: [],
  selectedPosition: null,
  validationResult: null,

  setupGame(playerNames, packId) {
    const allSongs = songsRepository.getByPack(packId);
    const shuffled = [...allSongs].sort(() => Math.random() - 0.5);

    const players: Player[] = playerNames.map((name, i) => ({
      id: `player-${i}`,
      name,
      timeline: [],
      score: 0,
    }));

    set({
      status: 'setup',
      players,
      currentPlayerIndex: 0,
      currentCard: null,
      deck: shuffled,
      selectedPosition: null,
      validationResult: null,
    });
  },

  flipCard() {
    const { deck } = get();
    if (deck.length === 0) return;
    const [card, ...rest] = deck;
    set({ currentCard: card, deck: rest, status: 'round_active', selectedPosition: null, validationResult: null });
  },

  selectPosition(position) {
    set({ selectedPosition: position });
  },

  placeCard(position) {
    const { currentCard, players, currentPlayerIndex } = get();
    if (!currentCard) return;

    const player = players[currentPlayerIndex];
    const newTimeline = [
      ...player.timeline.slice(0, position),
      currentCard,
      ...player.timeline.slice(position),
    ];

    const correct = isChronologicallyCorrect(player.timeline, currentCard, position);
    const updatedPlayers = players.map((p, i) =>
      i === currentPlayerIndex
        ? {
            ...p,
            timeline: correct ? newTimeline : p.timeline,
            score: correct ? p.score + 1 : p.score,
          }
        : p
    );

    set({ players: updatedPlayers, validationResult: correct, status: 'validating' });
  },

  validatePlacement() {},

  nextTurn() {
    const { players, currentPlayerIndex } = get();
    const winner = players.find((p) => p.score >= WIN_SCORE);
    if (winner) {
      set({ status: 'finished' });
      return;
    }

    const nextIndex = (currentPlayerIndex + 1) % players.length;
    set({
      currentPlayerIndex: nextIndex,
      currentCard: null,
      selectedPosition: null,
      validationResult: null,
      status: 'setup',
    });
  },

  resetGame() {
    set({
      status: 'idle',
      players: [],
      currentPlayerIndex: 0,
      currentCard: null,
      deck: [],
      selectedPosition: null,
      validationResult: null,
    });
  },
}));
