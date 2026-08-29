// Tipos equivalentes en frontend: frontend/src/types/socket.ts (RoomPlayer, RoomConfig, RoomStatus, Room)
import type { Song, MusicProvider } from '../types.js';

export interface RoomPlayer {
  id: string;
  name: string;
  timeline: Song[];
  score: number;
  connected: boolean;
}

export type GameMode = 'classic' | 'rosco';

export type RoscoSubMode = 'paralelo' | 'turnos';

export type LetterStatus = 'pending' | 'active' | 'correct' | 'wrong' | 'passed';

export interface RoscoCell {
  letter: string;
  // null cuando publicRoom.ts redacta la respuesta para quien aún no debe verla.
  song: Song | null;
  acceptTitle: boolean;
  acceptArtist: boolean;
  status: LetterStatus;
  guessedTitle: boolean;
  guessedArtist: boolean;
  wonBy: string | null;
}

export interface RoscoState {
  subMode: RoscoSubMode;
  boards: RoscoCell[][];
}

export interface RoomConfig {
  packId: string;
  provider: MusicProvider;
  syncAudio: boolean;
  mode: GameMode;
  roscoSubMode: RoscoSubMode;
  roscoPackId: string;
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
  rosco: RoscoState | null;
}
