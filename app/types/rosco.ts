import type { Song, Player, MusicProvider } from './game';

/** Submodo del rosco. */
export type RoscoSubMode = 'paralelo' | 'turnos';

/** Estado de una casilla (letra) del rosco. */
export type LetterStatus =
  | 'pending' // aún sin jugar
  | 'active' // letra actual en juego
  | 'correct' // acertada (título y/o artista)
  | 'wrong' // fallada
  | 'passed'; // pasapalabra (se reintenta más tarde)

/** Entrada de un pack: una letra con su canción y qué se acepta como acierto. */
export interface RoscoEntry {
  /** Letra del rosco (A–Z, Ñ). */
  letter: string;
  /** Canción asociada (se reproduce vía providerIds, igual que el modo clásico). */
  song: Song;
  /** Si acertar el título otorga punto. */
  acceptTitle: boolean;
  /** Si acertar el artista otorga punto. */
  acceptArtist: boolean;
}

/** Un pack/categoría de rosco. */
export interface RoscoPack {
  id: string;
  name: string;
  description: string;
  entries: RoscoEntry[];
}

/** Casilla en runtime dentro de un tablero. */
export interface RoscoCell {
  letter: string;
  song: Song;
  acceptTitle: boolean;
  acceptArtist: boolean;
  status: LetterStatus;
  guessedTitle: boolean;
  guessedArtist: boolean;
  /** Jugador que ganó la letra (solo modo paralelo). */
  wonBy: string | null;
}

export type RoscoStatus = 'idle' | 'playing' | 'finished';

/** Qué partes acertó el jugador al juzgar una letra. */
export interface Award {
  title: boolean;
  artist: boolean;
}

export interface RoscoState {
  status: RoscoStatus;
  subMode: RoscoSubMode;
  players: Player[];
  /** Un tablero por jugador. En paralelo todos comparten `boards[0]`. */
  boards: RoscoCell[][];
  /** Jugador cuyo turno es (modo turnos). */
  currentPlayerIndex: number;

  setupRosco: (
    playerNames: string[],
    packId: string,
    subMode: RoscoSubMode
  ) => void;

  // --- Paralelo ---
  awardLetter: (playerId: string, award: Award) => void;
  skipLetter: () => void;

  // --- Turnos ---
  answerCorrect: (award: Award) => void;
  answerWrong: () => void;
  pasapalabra: () => void;

  resetRosco: () => void;
}

export type { MusicProvider };
