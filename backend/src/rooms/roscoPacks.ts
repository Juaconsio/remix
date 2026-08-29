import type { Song } from '../types.js';
import type { RoscoCell } from './types.js';
import { allSongs } from '../songs.js';

export interface RoscoEntry {
  letter: string;
  song: Song;
  acceptTitle: boolean;
  acceptArtist: boolean;
}

export interface RoscoPack {
  id: string;
  name: string;
  description: string;
  entries: RoscoEntry[];
}

const LEADING_ARTICLES = ['el ', 'la ', 'los ', 'las ', 'the ', 'a ', 'an ', 'un ', 'una '];

export function deriveLetter(title: string): string {
  let rest = title.trim().toLowerCase();
  for (const article of LEADING_ARTICLES) {
    if (rest.startsWith(article)) {
      rest = rest.slice(article.length);
      break;
    }
  }
  const alphabetic = rest.replace(/^[^a-záéíóúüñ]+/i, '');
  const first = (alphabetic[0] ?? title.trim()[0] ?? '?').toUpperCase();
  if (first === 'Ñ') return 'Ñ';
  return first.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function buildSamplePackEntries(pool: Song[]): RoscoEntry[] {
  const byLetter = new Map<string, Song>();
  for (const song of pool) {
    const letter = deriveLetter(song.title);
    if (!byLetter.has(letter)) byLetter.set(letter, song);
  }
  return [...byLetter.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([letter, song]) => ({ letter, song, acceptTitle: true, acceptArtist: true }));
}

export const SAMPLE_PACK_ID = 'rosco-muestra';

export const roscoPacks: RoscoPack[] = [
  {
    id: SAMPLE_PACK_ID,
    name: 'Rosco de muestra',
    description: 'Una canción del catálogo por letra inicial de título',
    entries: buildSamplePackEntries(allSongs),
  },
];

export function getRoscoPack(packId: string): RoscoPack | null {
  return roscoPacks.find((p) => p.id === packId) ?? null;
}

export function buildCells(entries: RoscoEntry[]): RoscoCell[] {
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
