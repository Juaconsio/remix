import type { Song, MusicProvider } from './game';

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
  // null cuando el servidor redacta la respuesta para quien aún no debe verla.
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

export interface Award {
  title: boolean;
  artist: boolean;
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

// Eventos cliente → servidor
export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string }) => void;
  'room:join': (payload: { code: string; playerName: string }) => void;
  'room:rejoin': (payload: { code: string; playerName: string }) => void;
  'room:config': (payload: Partial<RoomConfig>) => void;
  'game:start': () => void;
  'game:flip': () => void;
  'game:select': (payload: { position: number }) => void;
  'game:place': () => void;
  'game:audio:started': () => void;
  'game:skip': () => void;
  'rosco:award': (payload: { playerId: string; award: Award }) => void;
  'rosco:skip': () => void;
  'rosco:correct': (payload: { award: Award }) => void;
  'rosco:wrong': () => void;
  'rosco:pass': () => void;
}

// Eventos servidor → cliente
export interface ServerToClientEvents {
  'room:joined': (payload: { room: Room; yourPlayerId: string }) => void;
  'room:error': (payload: { message: string }) => void;
  'room:updated': (payload: { room: Room }) => void;
  'game:state': (payload: { room: Room }) => void;
  'game:audio:play': (payload: {
    trackId: string;
    provider: MusicProvider;
    hookStart: number;
    hookDuration: number;
  }) => void;
}
