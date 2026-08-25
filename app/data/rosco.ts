import type { Song } from '../types/game';
import type { RoscoPack, RoscoEntry } from '../types/rosco';
import { songs } from './songs';
import { buildSamplePackEntries } from '../lib/rosco';

/**
 * Pack de MUESTRA jugable: reutiliza las canciones ya verificadas de
 * `app/data/songs.ts`, una por letra inicial de título. Sirve para probar
 * el modo rosco de inmediato con audio real (Deezer/YouTube).
 */
const samplePack: RoscoPack = {
  id: 'rosco-muestra',
  name: 'Rosco de muestra',
  description: 'Hits verificados, una canción por letra. Listo para jugar.',
  entries: buildSamplePackEntries(songs),
};

// ---------------------------------------------------------------------------
// PLANTILLA — "Canciones chilenas 2025"
//
// Rellena cada entrada con canciones reales y sus IDs de proveedor. Para
// obtener el `deezerId`: busca la canción en https://www.deezer.com, abre la
// pista y copia el número final de la URL (deezer.com/track/<ID>). Opcional:
// `providerIds.youtube` (id de vídeo) y `providerIds.spotify` (id de pista).
// Mientras `deezerId` sea 0 la reproducción fallará de forma controlada.
//
// `letter` puede ser cualquier letra (incluida Ñ). `acceptTitle`/`acceptArtist`
// controlan qué otorga punto al juzgar. Añade tantas entradas como letras
// quieras (no hace falta cubrir el abecedario completo).
// ---------------------------------------------------------------------------
function templateSong(partial: Pick<Song, 'id' | 'title' | 'artist'>): Song {
  return {
    year: 2025,
    deezerId: 0, // TODO: reemplazar por el ID real de Deezer
    providerIds: {}, // TODO: opcional { deezer, youtube, spotify }
    previewUrl: '',
    hookStart: 0,
    hookDuration: 15,
    difficulty: 1,
    decade: '20s',
    genre: [],
    explicit: false,
    packId: 'chilenas-2025',
    ...partial,
  };
}

const chilenas2025Entries: RoscoEntry[] = [
  // Ejemplos ilustrativos — sustituye título/artista/IDs por datos reales.
  { letter: 'A', song: templateSong({ id: 'cl-a', title: 'Ábreme', artist: 'Artista A' }), acceptTitle: true, acceptArtist: true },
  { letter: 'B', song: templateSong({ id: 'cl-b', title: 'Baila', artist: 'Artista B' }), acceptTitle: true, acceptArtist: true },
  { letter: 'C', song: templateSong({ id: 'cl-c', title: 'Corazón', artist: 'Artista C' }), acceptTitle: true, acceptArtist: true },
  { letter: 'D', song: templateSong({ id: 'cl-d', title: 'Despierta', artist: 'Artista D' }), acceptTitle: true, acceptArtist: true },
  { letter: 'E', song: templateSong({ id: 'cl-e', title: 'Enero', artist: 'Artista E' }), acceptTitle: true, acceptArtist: true },
];

const chilenas2025: RoscoPack = {
  id: 'chilenas-2025',
  name: 'Canciones chilenas 2025 (plantilla)',
  description: 'Plantilla de ejemplo — edita app/data/rosco.ts con canciones e IDs reales.',
  entries: chilenas2025Entries,
};

export const roscoPacks: RoscoPack[] = [samplePack, chilenas2025];
