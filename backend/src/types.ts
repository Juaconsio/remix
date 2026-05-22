// Tipos equivalentes en frontend: frontend/src/types/game.ts
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
