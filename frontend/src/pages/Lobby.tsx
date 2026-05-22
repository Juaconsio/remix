import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useProviderStore } from '../store/providerStore';
import type { MusicProvider } from '../types/game';

const PACKS = [
  { id: 'base', name: 'Pack Base', description: '20 hits de todos los tiempos (1967–2023)' },
  { id: 'indie-vibes', name: 'Indie Vibes', description: '15 canciones indie/alternativas' },
];

export default function Lobby() {
  const navigate = useNavigate();
  const { room, myPlayerId, updateConfig, startGame } = useSocket();
  const { provider: localProvider } = useProviderStore();

  const isHost = room?.hostId === myPlayerId;

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'round_active' || room.status === 'setup') {
      navigate(`/game/${room.code}`);
    }
    if (room.status === 'finished') {
      navigate(`/results/${room.code}`);
    }
  }, [room, navigate]);

  if (!room) return null;

  const config = room.config;

  const providers: { id: MusicProvider; label: string; note: string }[] = [
    { id: 'deezer',  label: 'Deezer',   note: 'Preview 30s · sin cuenta' },
    { id: 'spotify', label: 'Spotify',  note: 'Preview 30s · requiere API key' },
    { id: 'youtube', label: 'YouTube',  note: 'Audio · sin cuenta' },
  ];

  return (
    <main className="min-h-screen flex flex-col px-5 pt-12 pb-8 bg-background max-w-sm mx-auto">

      {/* Código de sala */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-widest text-muted">Código de sala</p>
        <p className="text-5xl font-black tracking-widest text-accent font-mono">{room.code}</p>
        <p className="text-muted text-sm">Comparte este código con tus amigos</p>
      </div>

      {/* Jugadores */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3">
          Jugadores ({room.players.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {room.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface border border-border">
              <span className="font-medium">{p.name}</span>
              {p.id === room.hostId && (
                <span className="text-xs text-accent font-semibold uppercase tracking-wide">Host</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Config — solo el host puede cambiarla */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3">Pack de canciones</h2>
        <div className="flex flex-col gap-2">
          {PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => isHost && updateConfig({ packId: pack.id })}
              disabled={!isHost}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                config.packId === pack.id
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border text-muted'
              } disabled:cursor-default`}
            >
              <p className="font-semibold">{pack.name}</p>
              <p className="text-xs mt-0.5">{pack.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3">Proveedor de música</h2>
        <div className="flex flex-col gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => isHost && updateConfig({ provider: p.id })}
              disabled={!isHost}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                config.provider === p.id
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border text-muted'
              } disabled:cursor-default`}
            >
              <p className="font-semibold">{p.label}</p>
              <p className="text-xs mt-0.5">{p.note}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3">Audio</h2>
        <button
          onClick={() => isHost && updateConfig({ syncAudio: !config.syncAudio })}
          disabled={!isHost}
          className={`w-full text-left px-4 py-3 rounded-xl border transition-colors disabled:cursor-default ${
            config.syncAudio ? 'border-accent bg-accent/10 text-foreground' : 'border-border text-muted'
          }`}
        >
          <p className="font-semibold">Escuchar en todos los dispositivos</p>
          <p className="text-xs mt-0.5">
            {config.syncAudio
              ? 'Todos escuchan al mismo tiempo cuando el jugador activo pulsa play'
              : 'Solo el jugador activo escucha en su dispositivo'}
          </p>
        </button>
      </section>

      {isHost ? (
        <button
          onClick={startGame}
          disabled={room.players.length < 2}
          className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg disabled:opacity-40 transition-opacity active:opacity-80"
        >
          {room.players.length < 2 ? 'Espera a más jugadores' : 'Empezar partida'}
        </button>
      ) : (
        <p className="text-center text-muted text-sm">Esperando a que el host inicie la partida…</p>
      )}
    </main>
  );
}
