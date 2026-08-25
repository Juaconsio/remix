import type { Song } from '../types/game';
import type { RoscoEntry } from '../types/rosco';

/** Artículos iniciales a ignorar al derivar la letra del rosco. */
const LEADING_ARTICLES = ['el ', 'la ', 'los ', 'las ', 'the ', 'a ', 'an ', 'un ', 'una '];

/**
 * Deriva la letra del rosco a partir del título de una canción:
 * quita artículos iniciales y acentos, y devuelve la primera letra en mayúscula.
 * Ej: "La Bamba" -> "B", "Ángel" -> "A".
 */
export function deriveLetter(title: string): string {
  let t = title.trim().toLowerCase();
  for (const article of LEADING_ARTICLES) {
    if (t.startsWith(article)) {
      t = t.slice(article.length);
      break;
    }
  }
  // Saltar caracteres no alfabéticos iniciales (comillas, puntos, "¿", etc.)
  const stripped = t.replace(/^[^a-záéíóúüñ]+/i, '');
  const first = (stripped[0] ?? title.trim()[0] ?? '?').toUpperCase();
  // Normalizar acentos manteniendo la Ñ.
  if (first === 'Ñ') return 'Ñ';
  return first.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Construye un pack de rosco jugable a partir de canciones ya verificadas,
 * escogiendo una canción por letra inicial de título. Acepta título y artista.
 */
export function buildSamplePackEntries(pool: Song[]): RoscoEntry[] {
  const byLetter = new Map<string, Song>();
  for (const song of pool) {
    const letter = deriveLetter(song.title);
    if (!byLetter.has(letter)) byLetter.set(letter, song);
  }
  return [...byLetter.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([letter, song]) => ({
      letter,
      song,
      acceptTitle: true,
      acceptArtist: true,
    }));
}
