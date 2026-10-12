import { describe, expect, it, vi } from 'vitest';
import type { Room } from './types.js';
import { songs } from '../songs.js';
import * as rm from './roomManager.js';

vi.mock('fs', () => ({
  readFileSync: () => { throw new Error('sin persistencia en tests'); },
  writeFileSync: () => {},
}));

let nextHost = 0;

function classicRoom(playerCount = 2): Room {
  const hostId = `host-${nextHost++}`;
  const room = rm.createRoom(hostId, 'ana');
  for (let i = 1; i < playerCount; i++) rm.joinRoom(room.code, `${hostId}-p${i}`, `jugador ${i}`);
  return rm.startGame(room.code);
}

function activePlayer(room: Room) {
  return room.players[room.currentPlayerIndex];
}

function correctPosition(room: Room): number {
  const { timeline } = activePlayer(room);
  const year = room.currentCard!.year;
  const after = timeline.findIndex((s) => s.year > year);
  return after === -1 ? timeline.length : after;
}

function playCorrectTurn(code: string): Room {
  const flipped = rm.flipCard(code);
  rm.selectPosition(code, correctPosition(flipped));
  return rm.placeCard(code);
}

describe('createRoom', () => {
  it('arranca en lobby con el pack base y YouTube', () => {
    const room = rm.createRoom('solo-host', 'ana');
    expect(room.status).toBe('lobby');
    expect(room.config).toMatchObject({ packId: 'base', provider: 'youtube', mode: 'classic' });
    expect(room.players).toEqual([{ id: 'solo-host', name: 'ana', timeline: [], score: 0, connected: true }]);
  });
});

describe('startGame en clásico', () => {
  it('baraja el pack elegido y deja la partida en setup', () => {
    const room = classicRoom();
    const baseIds = songs.filter((s) => s.packId === 'base').map((s) => s.id).sort();
    expect(room.status).toBe('setup');
    expect(room.rosco).toBeNull();
    expect(room.currentPlayerIndex).toBe(0);
    expect(room.deck.map((s) => s.id).sort()).toEqual(baseIds);
  });

  it('arranca con todos los puntajes en cero', () => {
    const room = classicRoom(3);
    expect(room.players.map((p) => p.score)).toEqual([0, 0, 0]);
  });
});

describe('placeCard', () => {
  it('en la posición correcta inserta la carta y suma un punto', () => {
    const room = classicRoom();
    const card = rm.flipCard(room.code).currentCard!;
    const before = activePlayer(room).timeline.length;
    rm.selectPosition(room.code, correctPosition(room));
    const placed = rm.placeCard(room.code);

    expect(placed.status).toBe('validating');
    expect(placed.validationResult).toBe(true);
    expect(activePlayer(placed).score).toBe(1);
    expect(activePlayer(placed).timeline).toHaveLength(before + 1);
    expect(activePlayer(placed).timeline).toContainEqual(card);
  });

  it('en una posición incorrecta no inserta ni suma', () => {
    const room = classicRoom();
    const byYear = [...room.deck].sort((a, b) => a.year - b.year);
    const [oldest, middle, newest] = [byYear[0], byYear[Math.floor(byYear.length / 2)], byYear[byYear.length - 1]];
    room.players[0].timeline = [oldest, newest];
    room.deck = [middle];

    rm.flipCard(room.code);
    rm.selectPosition(room.code, 0);
    const placed = rm.placeCard(room.code);

    expect(placed.validationResult).toBe(false);
    expect(placed.players[0].score).toBe(0);
    expect(placed.players[0].timeline).toEqual([oldest, newest]);
  });

  it('falla si no hay carta o posición elegida', () => {
    const room = classicRoom();
    expect(() => rm.placeCard(room.code)).toThrow('Estado inválido');
  });
});

describe('skipCard', () => {
  it('descarta la carta y vuelve a setup con el mismo jugador', () => {
    const room = classicRoom();
    const deckBefore = room.deck.length;
    rm.flipCard(room.code);
    const skipped = rm.skipCard(room.code);

    expect(skipped.status).toBe('setup');
    expect(skipped.currentCard).toBeNull();
    expect(skipped.currentPlayerIndex).toBe(0);
    expect(skipped.deck).toHaveLength(deckBefore - 1);
  });
});

describe('nextTurn', () => {
  it('pasa al siguiente jugador conectado', () => {
    const room = classicRoom(3);
    playCorrectTurn(room.code);
    expect(rm.nextTurn(room.code).currentPlayerIndex).toBe(1);
    playCorrectTurn(room.code);
    expect(rm.nextTurn(room.code).currentPlayerIndex).toBe(2);
    playCorrectTurn(room.code);
    expect(rm.nextTurn(room.code).currentPlayerIndex).toBe(0);
  });

  it('termina la partida cuando alguien llega a 7 puntos', () => {
    const room = classicRoom();
    room.players[0].score = 6;
    playCorrectTurn(room.code);
    expect(rm.nextTurn(room.code).status).toBe('finished');
  });

  it('termina la partida cuando se acaba el mazo', () => {
    const room = classicRoom();
    room.deck = room.deck.slice(0, 1);
    playCorrectTurn(room.code);
    expect(rm.nextTurn(room.code).status).toBe('finished');
  });
});
