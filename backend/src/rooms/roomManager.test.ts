import { describe, expect, it, vi } from 'vitest';
import type { Room } from './types.js';
import { songs } from '../songs.js';
import * as rm from './roomManager.js';

vi.mock('fs', () => ({
  readFileSync: () => { throw new Error('sin persistencia en tests'); },
  writeFileSync: () => {},
}));

let nextHost = 0;

function startedRoom(playerCount: number): Room {
  const hostId = `host-${nextHost++}`;
  const room = rm.createRoom(hostId, 'ana');
  for (let i = 1; i < playerCount; i++) rm.joinRoom(room.code, `${hostId}-p${i}`, `jugador ${i}`);
  return rm.startGame(room.code);
}

function classicRoom(playerCount = 2): Room {
  return rm.skipPregame(startedRoom(playerCount).code);
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

function passEveryone(room: Room): Room {
  room.players.forEach((p, i) => {
    if (i !== room.currentPlayerIndex && room.status === 'stealing') rm.passSteal(room.code, p.id);
  });
  return room;
}

function playCorrectTurn(code: string): Room {
  const flipped = rm.flipCard(code);
  rm.selectPosition(code, correctPosition(flipped));
  return passEveryone(rm.placeCard(code));
}

function wrongPlacement(playerCount: number) {
  const room = classicRoom(playerCount);
  const byYear = [...room.deck].sort((a, b) => a.year - b.year);
  const [oldest, middle, newest] = [byYear[0], byYear[Math.floor(byYear.length / 2)], byYear[byYear.length - 1]];
  room.players[0].timeline = [oldest, newest];
  room.deck = [middle];
  rm.flipCard(room.code);
  rm.selectPosition(room.code, 0);
  return { room: rm.placeCard(room.code), card: middle, correctSlot: 1, wrongSlot: 2 };
}

describe('createRoom', () => {
  it('arranca en lobby con el pack base, YouTube y el audio en todos los dispositivos', () => {
    const room = rm.createRoom('solo-host', 'ana');
    expect(room.status).toBe('lobby');
    expect(room.config).toMatchObject({ packId: 'base', provider: 'youtube', mode: 'classic', syncAudio: true });
    expect(room.players).toEqual([
      { id: 'solo-host', name: 'ana', timeline: [], score: 0, tokens: 0, connected: true, startingOptions: [] },
    ]);
  });
});

describe('startGame en clásico', () => {
  it('reparte el pack elegido entre las cartas iniciales y el mazo', () => {
    const room = classicRoom();
    const baseIds = songs.filter((s) => s.packId === 'base').map((s) => s.id).sort();
    const dealt = room.players.flatMap((p) => p.timeline);
    expect(room.status).toBe('setup');
    expect(room.rosco).toBeNull();
    expect(room.currentPlayerIndex).toBe(0);
    expect([...dealt, ...room.deck].map((s) => s.id).sort()).toEqual(baseIds);
  });

  it('da a cada jugador una carta inicial que no suma puntos', () => {
    const room = classicRoom(3);
    expect(room.players.map((p) => p.timeline.length)).toEqual([1, 1, 1]);
    expect(room.players.map((p) => p.score)).toEqual([0, 0, 0]);
  });

  it('la primera carta ya exige decidir antes o después', () => {
    const room = classicRoom();
    const baseByYear = songs.filter((s) => s.packId === 'base').sort((a, b) => a.year - b.year);
    const earliest = baseByYear[0];
    const latest = baseByYear[baseByYear.length - 1];
    room.players[0].timeline = [earliest];
    room.deck = [latest];

    rm.flipCard(room.code);
    rm.selectPosition(room.code, 0);
    expect(passEveryone(rm.placeCard(room.code)).validationResult).toBe(false);
  });
});

describe('placeCard', () => {
  it('en la posición correcta inserta la carta y suma un punto', () => {
    const room = classicRoom();
    const card = rm.flipCard(room.code).currentCard!;
    const before = activePlayer(room).timeline.length;
    rm.selectPosition(room.code, correctPosition(room));
    const placed = passEveryone(rm.placeCard(room.code));

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
    const placed = passEveryone(rm.placeCard(room.code));

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
    expect(activePlayer(skipped).tokens).toBe(2);
  });

  it('saltar por decisión propia cuesta una ficha', () => {
    const room = classicRoom();
    rm.flipCard(room.code);
    expect(activePlayer(rm.skipCard(room.code, true)).tokens).toBe(1);
  });

  it('sin fichas no se puede saltar por decisión propia', () => {
    const room = classicRoom();
    activePlayer(room).tokens = 0;
    rm.flipCard(room.code);
    expect(() => rm.skipCard(room.code, true)).toThrow('fichas');
    expect(room.status).toBe('round_active');
  });
});

describe('robo', () => {
  it('cada jugador empieza la partida con 2 fichas', () => {
    expect(classicRoom(3).players.map((p) => p.tokens)).toEqual([2, 2, 2]);
  });

  it('al confirmar abre la ventana de robo sin revelar el resultado', () => {
    const { room } = wrongPlacement(2);
    expect(room.status).toBe('stealing');
    expect(room.validationResult).toBeNull();
    expect(room.stealDeadline).not.toBeNull();
  });

  it('si nadie más tiene fichas revela de inmediato', () => {
    const room = classicRoom(2);
    room.players[1].tokens = 0;
    rm.flipCard(room.code);
    rm.selectPosition(room.code, 0);
    expect(rm.placeCard(room.code).status).toBe('validating');
  });

  it('quien roba bien se lleva la carta ordenada en su línea y un punto', () => {
    const { room, card, correctSlot } = wrongPlacement(2);
    const thief = room.players[1];
    rm.stealCard(room.code, thief.id, correctSlot);

    expect(room.status).toBe('validating');
    expect(room.validationResult).toBe(false);
    expect(room.stealWinnerId).toBe(thief.id);
    expect(thief.score).toBe(1);
    expect(thief.tokens).toBe(1);
    expect(thief.timeline).toContainEqual(card);
    expect(thief.timeline.map((s) => s.year)).toEqual([...thief.timeline.map((s) => s.year)].sort((a, b) => a - b));
    expect(room.players[0].timeline).not.toContainEqual(card);
  });

  it('si el jugador del turno acierta, quien robó pierde la ficha y no se lleva nada', () => {
    const room = classicRoom(2);
    const thief = room.players[1];
    const flipped = rm.flipCard(room.code);
    const right = correctPosition(flipped);
    rm.selectPosition(room.code, right);
    rm.placeCard(room.code);
    rm.stealCard(room.code, thief.id, right === 0 ? 1 : 0);

    expect(room.validationResult).toBe(true);
    expect(room.stealWinnerId).toBeNull();
    expect(thief.tokens).toBe(1);
    expect(thief.score).toBe(0);
  });

  it('con varios robos acertados gana el primero que robó', () => {
    const { room, correctSlot, wrongSlot } = wrongPlacement(3);
    const [, first, second] = room.players;
    rm.stealCard(room.code, second.id, wrongSlot);
    rm.stealCard(room.code, first.id, correctSlot);
    expect(room.stealWinnerId).toBe(first.id);
  });

  it('no deja robar el hueco del jugador del turno ni uno ya tomado', () => {
    const { room, correctSlot } = wrongPlacement(3);
    const [, first, second] = room.players;
    expect(() => rm.stealCard(room.code, first.id, 0)).toThrow('no está libre');
    rm.stealCard(room.code, first.id, correctSlot);
    expect(() => rm.stealCard(room.code, second.id, correctSlot)).toThrow('no está libre');
    expect(second.tokens).toBe(2);
  });

  it('el jugador del turno no puede robarse a sí mismo', () => {
    const { room } = wrongPlacement(2);
    expect(() => rm.stealCard(room.code, room.players[0].id, 1)).toThrow('No puedes robar');
  });

  it('al vencer el plazo revela aunque falten jugadores por decidir', () => {
    const { room } = wrongPlacement(3);
    expect(rm.closeSteal(room.code, room.stealDeadline! - 1)).toBeUndefined();
    expect(room.status).toBe('stealing');
    expect(rm.closeSteal(room.code, room.stealDeadline!)?.status).toBe('validating');
  });

  it('si se desconecta el último por decidir, revela', () => {
    const { room } = wrongPlacement(3);
    rm.passSteal(room.code, room.players[1].id);
    rm.removePlayer(room.players[2].id);
    expect(room.status).toBe('validating');
  });
});

describe('awardToken', () => {
  it('da una ficha al jugador del turno una sola vez por turno', () => {
    const room = playCorrectTurn(classicRoom(2).code);
    rm.awardToken(room.code);
    expect(activePlayer(room).tokens).toBe(3);
    expect(() => rm.awardToken(room.code)).toThrow();
  });

  it('no pasa de 5 fichas', () => {
    const room = playCorrectTurn(classicRoom(2).code);
    activePlayer(room).tokens = 5;
    expect(activePlayer(rm.awardToken(room.code)).tokens).toBe(5);
  });

  it('solo se da después de revelar', () => {
    const { room } = wrongPlacement(2);
    expect(() => rm.awardToken(room.code)).toThrow();
  });
});

describe('pregame', () => {
  function choose(room: Room, playerIndex: number, optionIndex = 0) {
    const player = room.players[playerIndex];
    return rm.confirmPregame(room.code, player.id, player.startingOptions[optionIndex]?.id);
  }

  it('en rosco sin audio en todos los dispositivos la partida no espera a nadie', () => {
    const room = rm.createRoom(`host-${nextHost++}`, 'ana');
    rm.updateConfig(room.code, { syncAudio: false, mode: 'rosco' });
    expect(rm.startGame(room.code).pregameReadyIds).toBeNull();
  });

  it('en clásico siempre hay pregame, aun sin audio en todos los dispositivos', () => {
    const room = rm.createRoom(`host-${nextHost++}`, 'ana');
    rm.updateConfig(room.code, { syncAudio: false });
    expect(rm.startGame(room.code).pregameReadyIds).toEqual([]);
  });

  it('ofrece 3 canciones a cada jugador y nada en la línea de tiempo', () => {
    const room = startedRoom(3);
    expect(room.players.map((p) => p.startingOptions.length)).toEqual([3, 3, 3]);
    expect(room.players.map((p) => p.timeline)).toEqual([[], [], []]);
  });

  it('la canción elegida abre la línea de tiempo y las otras vuelven al mazo', () => {
    const room = startedRoom(2);
    const [first] = room.players;
    const [, chosen, ...rest] = first.startingOptions;
    const deckBefore = room.deck.length;

    rm.confirmPregame(room.code, first.id, chosen.id);

    expect(first.timeline).toEqual([chosen]);
    expect(first.startingOptions).toEqual([]);
    expect(first.score).toBe(0);
    expect(room.deck).toHaveLength(deckBefore + 2);
    expect(room.deck).toEqual(expect.arrayContaining(rest));
  });

  it('rechaza una canción que no está entre las opciones del jugador', () => {
    const room = startedRoom(2);
    const [first, second] = room.players;
    expect(() => rm.confirmPregame(room.code, first.id, second.startingOptions[0].id)).toThrow('opciones');
  });

  it('no deja sacar carta hasta que todos eligen', () => {
    const room = startedRoom(2);
    expect(() => rm.flipCard(room.code)).toThrow('todavía no empieza');

    choose(room, 0);
    choose(room, 0);
    expect(room.pregameReadyIds).toEqual([room.players[0].id]);

    choose(room, 1);
    expect(room.pregameReadyIds).toBeNull();
    expect(rm.flipCard(room.code).status).toBe('round_active');
  });

  it('no espera a quien se desconecta y le asigna una de sus opciones', () => {
    const room = startedRoom(3);
    const gone = room.players[2];
    const options = [...gone.startingOptions];
    choose(room, 0);
    choose(room, 1);
    rm.removePlayer(gone.id);

    expect(room.pregameReadyIds).toBeNull();
    expect(gone.timeline).toHaveLength(1);
    expect(options).toContainEqual(gone.timeline[0]);
  });

  it('conserva la elección de quien reconecta', () => {
    const room = startedRoom(3);
    const second = room.players[1];
    choose(room, 1);
    rm.reconnectPlayer(room.code, second.name, 'socket-nuevo');
    expect(room.pregameReadyIds).toEqual(['socket-nuevo']);
  });

  it('el host puede empezar sin esperar y quien no eligió recibe una de sus opciones', () => {
    const room = startedRoom(2);
    const skipped = rm.skipPregame(room.code);
    expect(skipped.pregameReadyIds).toBeNull();
    expect(skipped.players.map((p) => p.timeline.length)).toEqual([1, 1]);
    expect(skipped.players.every((p) => p.startingOptions.length === 0)).toBe(true);
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
