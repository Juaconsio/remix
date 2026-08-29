import { describe, expect, it } from 'vitest';
import type { Room, RoomPlayer } from './types.js';
import type { Song } from '../types.js';
import { deriveLetter, buildCells, buildSamplePackEntries, type RoscoEntry } from './roscoPacks.js';
import {
  answerCorrect,
  answerWrong,
  awardLetter,
  boardFor,
  firstActiveIndex,
  pasapalabra,
  releaseTurn,
  skipLetter,
} from './rosco.js';

function song(id: string, title: string, artist: string): Song {
  return {
    id,
    title,
    artist,
    year: 2000,
    deezerId: 1,
    providerIds: {},
    previewUrl: '',
    hookStart: 0,
    hookDuration: 15,
    difficulty: 1,
    decade: '00s',
    genre: [],
    explicit: false,
    packId: 'base',
  };
}

function entries(...titles: string[]): RoscoEntry[] {
  return titles.map((title, i) => ({
    letter: deriveLetter(title),
    song: song(`s${i}`, title, `Artista ${i}`),
    acceptTitle: true,
    acceptArtist: true,
  }));
}

function player(id: string, name: string): RoomPlayer {
  return { id, name, timeline: [], score: 0, connected: true };
}

function room(subMode: 'paralelo' | 'turnos', packEntries: RoscoEntry[], names = ['ana', 'beto']): Room {
  const players = names.map((n, i) => player(`p${i}`, n));
  return {
    code: 'TEST',
    hostId: 'p0',
    players,
    config: {
      packId: 'base',
      provider: 'deezer',
      syncAudio: false,
      mode: 'rosco',
      roscoSubMode: subMode,
      roscoPackId: 'rosco-muestra',
    },
    status: 'round_active',
    deck: [],
    currentPlayerIndex: 0,
    currentCard: null,
    selectedPosition: null,
    validationResult: null,
    rosco: {
      subMode,
      boards: subMode === 'paralelo' ? [buildCells(packEntries)] : players.map(() => buildCells(packEntries)),
    },
  };
}

describe('deriveLetter', () => {
  it('ignora el artículo inicial', () => {
    expect(deriveLetter('La Bamba')).toBe('B');
    expect(deriveLetter('The Wall')).toBe('W');
  });

  it('quita acentos pero conserva la Ñ', () => {
    expect(deriveLetter('Ángel')).toBe('A');
    expect(deriveLetter('Ñañita')).toBe('Ñ');
  });

  it('salta caracteres no alfabéticos iniciales', () => {
    expect(deriveLetter('¿Dónde estás?')).toBe('D');
  });
});

describe('buildSamplePackEntries', () => {
  it('deja una sola canción por letra y las ordena', () => {
    const pack = buildSamplePackEntries([
      song('a', 'Zorro', 'x'),
      song('b', 'Bamba', 'y'),
      song('c', 'Zapato', 'z'),
    ]);
    expect(pack.map((e) => e.letter)).toEqual(['B', 'Z']);
    expect(pack[1].song.id).toBe('a');
  });
});

describe('modo paralelo', () => {
  it('suma 2 puntos por título y artista, y 1 por sólo título', () => {
    const r = room('paralelo', entries('Alfa', 'Beta'));

    expect(awardLetter(r, 'p1', { title: true, artist: true })).toBe(true);
    expect(r.players[1].score).toBe(2);

    expect(awardLetter(r, 'p0', { title: true, artist: false })).toBe(true);
    expect(r.players[0].score).toBe(1);
  });

  it('rechaza una adjudicación sin ninguna parte acertada', () => {
    const r = room('paralelo', entries('Alfa'));
    expect(awardLetter(r, 'p1', { title: false, artist: false })).toBe(false);
    expect(firstActiveIndex(boardFor(r, 0)!)).toBe(0);
  });

  it('termina la partida cuando se agota el tablero compartido', () => {
    const r = room('paralelo', entries('Alfa', 'Beta'));
    skipLetter(r);
    skipLetter(r);
    expect(r.status).toBe('finished');
  });
});

describe('modo por turnos', () => {
  it('mantiene el turno al acertar y lo cede al fallar', () => {
    const r = room('turnos', entries('Alfa', 'Beta', 'Ceta'));

    answerCorrect(r, { title: true, artist: false });
    expect(r.currentPlayerIndex).toBe(0);

    answerWrong(r);
    expect(r.currentPlayerIndex).toBe(1);
  });

  it('reabre la letra pasada en la vuelta siguiente', () => {
    const r = room('turnos', entries('Alfa', 'Beta'), ['ana']);

    pasapalabra(r);
    expect(firstActiveIndex(boardFor(r, 0)!)).toBe(1);

    answerCorrect(r, { title: true, artist: true });
    expect(firstActiveIndex(boardFor(r, 0)!)).toBe(0);
    expect(boardFor(r, 0)![0].status).toBe('passed');
  });

  it('puntúa cada tablero por separado', () => {
    const r = room('turnos', entries('Alfa', 'Beta'));

    answerCorrect(r, { title: true, artist: true });
    expect(r.players[0].score).toBe(2);
    expect(r.players[1].score).toBe(0);
  });

  it('salta a un jugador conectado cuando el activo se cae', () => {
    const r = room('turnos', entries('Alfa', 'Beta'), ['ana', 'beto', 'caro']);
    r.players[1].connected = false;

    releaseTurn(r);
    expect(r.currentPlayerIndex).toBe(2);
  });
});
