// E2E de protocolo: levanta el backend real en un proceso aparte y juega partidas
// completas con varios clientes de socket.io. No toca el frontend ni APIs externas
// (proveedor deezer, sin YOUTUBE_API_KEY, y el servidor nunca pide el audio).
import { spawn, type ChildProcess } from 'child_process';
import { createServer } from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { Room } from './rooms/types.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let server: ChildProcess;
let url: string;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

beforeAll(async () => {
  const port = await freePort();
  url = `http://localhost:${port}`;
  server = spawn(path.join(backendDir, 'node_modules/.bin/tsx'), ['src/index.ts'], {
    cwd: backendDir,
    // production: las salas viven en memoria y nunca se escribe dev-rooms.json.
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production', CLIENT_DIST: '/nonexistent', YOUTUBE_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El backend no arrancó en 15 s')), 15_000);
    server.stdout!.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('Backend listo')) { clearTimeout(timer); resolve(); }
    });
    server.once('exit', (code) => { clearTimeout(timer); reject(new Error(`El backend terminó con código ${code}`)); });
  });
}, 20_000);

afterAll(() => { server?.kill(); });

// Un jugador: guarda el último estado de la sala y deja esperar el siguiente que
// cumpla una condición. Se registra la espera antes de emitir para no perder eventos.
class Player {
  readonly socket: Socket;
  room: Room | null = null;
  readonly states: Room[] = [];
  readonly audioPlays: unknown[] = [];
  private waiters: { match: (room: Room) => boolean; resolve: (room: Room) => void }[] = [];

  constructor(readonly name: string) {
    this.socket = io(url, { transports: ['websocket'], forceNew: true });
    const onRoom = ({ room }: { room: Room }) => {
      this.room = room;
      this.states.push(room);
      this.waiters = this.waiters.filter((w) => (w.match(room) ? (w.resolve(room), false) : true));
    };
    for (const event of ['room:joined', 'room:updated', 'game:state']) this.socket.on(event, onRoom);
    this.socket.on('game:audio:play', (payload: unknown) => this.audioPlays.push(payload));
  }

  get id(): string { return this.socket.id!; }

  next(match: (room: Room) => boolean = () => true): Promise<Room> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.name}: no llegó el estado esperado`)), 3_000);
      this.waiters.push({ match, resolve: (room) => { clearTimeout(timer); resolve(room); } });
    });
  }

  // Emite y espera a que este jugador vea el resultado.
  async act(event: string, payload?: unknown, match?: (room: Room) => boolean): Promise<Room> {
    const done = this.next(match);
    if (payload === undefined) this.socket.emit(event);
    else this.socket.emit(event, payload);
    return done;
  }

  close() { this.socket.close(); }
}

async function openTable(names: string[], config: Partial<Room['config']>): Promise<Player[]> {
  const players = names.map((name) => new Player(name));
  await Promise.all(players.map((p) => new Promise<void>((r) => p.socket.once('connect', () => r()))));
  const [host, ...guests] = players;

  const { code } = await host.act('room:create', { playerName: host.name });
  for (const guest of guests) {
    const hostSees = host.next((room) => room.players.some((p) => p.name === guest.name));
    await guest.act('room:join', { code, playerName: guest.name });
    await hostSees;
  }
  await host.act('room:config', config, (room) => room.config.mode === config.mode);
  return players;
}

function correctPosition(room: Room): number {
  const { timeline } = room.players[room.currentPlayerIndex];
  const year = room.currentCard!.year;
  const after = timeline.findIndex((s) => s.year > year);
  return after === -1 ? timeline.length : after;
}

// Una posición donde la carta del turno queda fuera de orden, o null si no hay.
function wrongPosition(room: Room): number | null {
  const { timeline } = room.players[room.currentPlayerIndex];
  const year = room.currentCard!.year;
  for (let position = 0; position <= timeline.length; position++) {
    const before = timeline[position - 1];
    const after = timeline[position];
    if ((before && before.year > year) || (after && after.year < year)) return position;
  }
  return null;
}

describe('partida clásica completa con 3 jugadores', () => {
  it('pregame, turnos, aciertos, errores, descarte y resultados iguales para todos', async () => {
    const players = await openTable(['ana', 'bea', 'caro'], { mode: 'classic', provider: 'deezer', syncAudio: true });
    const [host] = players;
    const byId = new Map(players.map((p) => [p.id, p]));

    const started = await host.act('game:start', undefined, (r) => r.status === 'setup');
    expect(started.pregameReadyIds).toEqual([]);

    // Cada uno elige su primera canción; el pregame termina con el último.
    let room = started;
    for (const [i, player] of players.entries()) {
      const options = room.players.find((p) => p.id === player.id)!.startingOptions;
      expect(options).toHaveLength(3);
      const last = i === players.length - 1;
      room = await player.act('game:pregame:ready', { songId: options[0].id }, (r) =>
        last ? r.pregameReadyIds === null : !!r.pregameReadyIds?.includes(player.id));
    }
    expect(room.players.map((p) => p.timeline.length)).toEqual([1, 1, 1]);

    const expectedScores = new Map(room.players.map((p) => [p.id, 0]));
    for (let turn = 0; room.status !== 'finished'; turn++) {
      expect(turn).toBeLessThan(40);
      const active = byId.get(room.players[room.currentPlayerIndex].id)!;

      let flipped = await active.act('game:flip', undefined, (r) => r.status === 'round_active');
      if (turn === 1) {
        // Un descarte: la carta se pierde y el mismo jugador vuelve a sacar.
        const skipped = await active.act('game:skip', undefined, (r) => r.status === 'setup');
        expect(skipped.currentPlayerIndex).toBe(flipped.currentPlayerIndex);
        flipped = await active.act('game:flip', undefined, (r) => r.status === 'round_active');
      }

      // Un turno de cada tres se coloca mal a propósito, si hay dónde equivocarse.
      const miss = turn % 3 === 2 ? wrongPosition(flipped) : null;
      const position = miss ?? correctPosition(flipped);
      await active.act('game:select', { position }, (r) => r.selectedPosition === position);
      const placed = await active.act('game:place', undefined, (r) => r.status === 'validating');
      expect(placed.validationResult).toBe(miss === null);
      if (miss === null) expectedScores.set(active.id, expectedScores.get(active.id)! + 1);

      // El resultado espera a game:next; el host puede avanzar aunque no sea su turno.
      const advancer = turn % 2 === 0 ? active : host;
      room = await advancer.act('game:next', undefined, (r) => r.status !== 'validating');
    }

    expect(new Map(room.players.map((p) => [p.id, p.score]))).toEqual(expectedScores);
    expect(Math.max(...expectedScores.values()) === 7 || room.deck.length === 0).toBe(true);

    // Todos ven el mismo final.
    await Promise.all(players.map((p) => (p.room!.status === 'finished' ? null : p.next((r) => r.status === 'finished'))));
    for (const player of players) {
      expect(player.room!.players.map((p) => p.score)).toEqual(room.players.map((p) => p.score));
    }
    players.forEach((p) => p.close());
  }, 30_000);
});

describe('rosco paralelo completo', () => {
  it('el host juzga hasta el final y los demás nunca reciben la respuesta', async () => {
    const players = await openTable(['ana', 'bea'], { mode: 'rosco', roscoSubMode: 'paralelo', provider: 'deezer', syncAudio: true });
    const [host, guest] = players;

    let room = await host.act('game:start', undefined, (r) => r.status === 'round_active');
    expect(room.pregameReadyIds).toBeNull();
    const letters = room.rosco!.boards[0].length;
    expect(letters).toBeGreaterThan(0);

    for (let i = 0; room.status !== 'finished'; i++) {
      // El host avisa que reprodujo: en el rosco no se reenvía a nadie (RMX-35).
      host.socket.emit('game:audio:started');
      room = i % 3 === 2
        ? await host.act('rosco:skip', undefined, () => true)
        : await host.act('rosco:award', { playerId: i % 2 ? guest.id : host.id, award: { title: true, artist: i % 2 === 0 } }, () => true);
      expect(i).toBeLessThan(letters);
    }
    if (guest.room!.status !== 'finished') await guest.next((r) => r.status === 'finished');

    const finalBoard = room.rosco!.boards[0];
    expect(finalBoard.every((c) => c.status === 'correct' || c.status === 'wrong')).toBe(true);
    const points = (id: string) => finalBoard
      .filter((c) => c.wonBy === id)
      .reduce((sum, c) => sum + Number(c.guessedTitle) + Number(c.guessedArtist), 0);
    expect(room.players.map((p) => p.score)).toEqual([points(host.id), points(guest.id)]);

    // El invitado nunca vio la canción de una letra sin resolver ni recibió audio.
    expect(guest.audioPlays).toEqual([]);
    for (const state of guest.states) {
      for (const cell of state.rosco?.boards.flat() ?? []) {
        if (cell.status === 'pending' || cell.status === 'passed') expect(cell.song).toBeNull();
      }
    }
    players.forEach((p) => p.close());
  }, 30_000);
});
