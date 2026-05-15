import type { Song } from '../types/game';
import { songs } from '../data/songs';

export interface SongsRepository {
  getByPack(packId: string): Song[];
  getRandom(packId: string, excludeIds: string[]): Song | null;
}

export class LocalSongsRepository implements SongsRepository {
  getByPack(packId: string): Song[] {
    return songs.filter((s) => s.packId === packId);
  }

  getRandom(packId: string, excludeIds: string[]): Song | null {
    const pool = this.getByPack(packId).filter((s) => !excludeIds.includes(s.id));
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

export const songsRepository = new LocalSongsRepository();
