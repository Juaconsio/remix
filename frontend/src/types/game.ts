export type MusicProvider = 'deezer' | 'spotify' | 'youtube';

export interface ProviderIds {
  deezer?: number;
  spotify?: string;
  youtube?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  deezerId: number;
  providerIds: ProviderIds;
  previewUrl: string;
  hookStart: number;
  hookDuration: 15;
  difficulty: 1 | 2 | 3;
  decade: string;
  genre: string[];
  explicit: boolean;
  packId: string;
}

export interface Player {
  id: string;
  name: string;
  timeline: Song[];
  score: number;
}

export type GameStatus =
  | 'idle'
  | 'setup'
  | 'round_active'
  | 'validating'
  | 'finished';

export interface ActivePlayerState {
  isLoading: boolean;
  isPlaying: boolean;
  progress: number;
  error: string | null;
  play: () => void;
  stop: () => void;
}

export interface GameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  currentCard: Song | null;
  deck: Song[];
  selectedPosition: number | null;
  validationResult: boolean | null;

  setupGame: (playerNames: string[], packId: string) => void;
  flipCard: () => void;
  selectPosition: (position: number) => void;
  placeCard: (position: number) => void;
  validatePlacement: () => void;
  nextTurn: () => void;
  resetGame: () => void;
}
