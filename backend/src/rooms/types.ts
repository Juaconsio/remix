// Tipos equivalentes en frontend: frontend/src/types/socket.ts (RoomPlayer, RoomConfig, RoomStatus, Room)
import type { Song, MusicProvider } from '../types';

export interface RoomPlayer {
  id: string;
  name: string;
  timeline: Song[];
  score: number;
  connected: boolean;
}

export interface RoomConfig {
  packId: string;
  provider: MusicProvider;
  syncAudio: boolean;
}

export type RoomStatus = 'lobby' | 'setup' | 'round_active' | 'validating' | 'finished';

export interface Room {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  config: RoomConfig;
  status: RoomStatus;
  deck: Song[];
  currentPlayerIndex: number;
  currentCard: Song | null;
  selectedPosition: number | null;
  validationResult: boolean | null;
}
