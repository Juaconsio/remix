import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useSocket } from '../hooks/useSocket';
import { useProviderStore } from '../store/providerStore';
import { DEFAULT_SIGNAL } from '../utils/songColor';
import type { MusicProvider } from '../types/game';
import type { GameMode, RoscoSubMode } from '../types/socket';
import { SettingsTrigger } from '../game/components/SettingsTrigger';
import { cn } from '../utils/cn';

const PACKS = [
  { id: 'base',        name: 'Pack Base',    description: '20 hits de todos los tiempos (1967–2023)' },
  { id: 'indie-vibes', name: 'Indie Vibes',  description: '15 canciones indie/alternativas' },
];

const MODES: { id: GameMode; name: string; description: string }[] = [
  { id: 'classic',  name: 'Clásico',       description: 'Ordena las canciones en tu línea de tiempo' },
  { id: 'rosco',    name: 'Rosco musical', description: 'Una canción por letra · el host adjudica' },
];

const SUB_MODES: { id: RoscoSubMode; name: string; description: string }[] = [
  { id: 'paralelo', name: 'Paralelo',   description: 'Rosco compartido · el host marca quién la acertó' },
  { id: 'turnos',   name: 'Por turnos', description: 'Un rosco por jugador · con pasapalabra' },
];

const AVATAR_SIGNALS = [
  '#e8341c', '#ff5722', '#ff2d8f', '#2540d6', '#2cd9b8', '#a78bfa', '#ff6d00',
];

function luminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function avatarFg(bg: string) {
  return luminance(bg) > 135 ? '#0e0e0e' : '#fff4ed';
}

export default function Lobby() {
  const navigate   = useNavigate();
  const { room, myPlayerId, updateConfig, startGame } = useSocket();
  const { provider: _localProvider } = useProviderStore();

  const isHost = room?.hostId === myPlayerId;

  const [playerListRef] = useAutoAnimate<HTMLUListElement>();
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'round_active' || room.status === 'setup') {
      navigate(room.config.mode === 'rosco' ? `/rosco/${room.code}` : `/game/${room.code}`);
    }
    if (room.status === 'finished') navigate(`/results/${room.code}`);
  }, [room, navigate]);

  if (!room) return null;

  const config = room.config;
  const signal = DEFAULT_SIGNAL;

  const providers: { id: MusicProvider; label: string; note: string }[] = [
    { id: 'deezer',  label: 'Deezer',  note: 'Preview 30s · sin cuenta' },
    { id: 'spotify', label: 'Spotify', note: 'Preview 30s · requiere API key' },
    { id: 'youtube', label: 'YouTube', note: 'Audio · sin cuenta' },
  ];

  return (
    <main className="flex flex-col px-5 pt-10 pb-8 max-w-sm mx-auto bg-bg text-ink min-h-dvh">

      {/* Top bar */}
      <div className="flex justify-end mb-6 -mt-4">
        <SettingsTrigger />
      </div>

      {/* Room code */}
      <div className="flex flex-col items-center gap-1 mb-10 text-center">
        <p className="font-mono-cut text-muted" style={{ fontSize: 10 }}>código de sala</p>
        <div
          ref={codeRef}
          className="font-display"
          style={{ fontSize: 64, letterSpacing: -3, lineHeight: 1, color: signal.primary }}
        >
          {room.code}
        </div>
        <p className="font-mono-cut text-muted" style={{ fontSize: 9, opacity: 0.45 }}>
          comparte con tus amigos
        </p>
      </div>

      {/* Players */}
      <section className="mb-8">
        <p className="font-mono-cut text-muted mb-[10px]" style={{ fontSize: 10 }}>
          jugadores ({room.players.length})
        </p>
        <ul ref={playerListRef} className="flex flex-col gap-2">
          {room.players.map((p, i) => {
            const avatarBg = AVATAR_SIGNALS[i % AVATAR_SIGNALS.length];
            const avatarFgColor = avatarFg(avatarBg);
            const isMe = p.id === myPlayerId;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 py-[10px] px-[14px] rounded-full transition-opacity"
                style={{
                  border: isMe ? `2px solid ${signal.primary}` : '1.5px solid var(--cut-border)',
                  background: isMe ? signal.surface : 'transparent',
                  opacity: p.connected ? 1 : 0.4,
                }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-display"
                  style={{ background: avatarBg, color: avatarFgColor, fontSize: 16 }}
                >
                  {p.name[0].toLowerCase()}
                </div>

                <span
                  className="flex-1 font-display text-ink overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}
                >
                  {p.name}
                </span>

                {!p.connected && (
                  <span
                    className="font-mono-cut rounded-full"
                    style={{ fontSize: 9, padding: '3px 10px', border: '1px solid var(--cut-border)', opacity: 0.7 }}
                  >
                    offline
                  </span>
                )}

                {p.id === room.hostId && (
                  <span
                    className="font-mono-cut bg-ink text-bg rounded-full"
                    style={{ fontSize: 9, padding: '3px 10px' }}
                  >
                    host
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-6">
        <p className="font-mono-cut text-muted mb-[10px]" style={{ fontSize: 10 }}>
          modo de juego
        </p>
        <div className="flex flex-col gap-2">
          {MODES.map((mode) => {
            const isSelected = config.mode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => isHost && updateConfig({ mode: mode.id })}
                disabled={!isHost}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-[14px] transition-[border-color] duration-150',
                  isSelected ? 'bg-tint' : 'bg-transparent',
                )}
                style={{
                  border: isSelected ? '2.5px solid var(--cut-ink)' : '1.5px solid var(--cut-border)',
                  cursor: isHost ? 'pointer' : 'default',
                }}
              >
                <p className="font-display text-ink" style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>
                  {mode.name}
                </p>
                <p className="font-mono-cut text-muted mt-[3px]" style={{ fontSize: 9, opacity: 0.5 }}>
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {config.mode === 'rosco' && (
        <section className="mb-6">
          <p className="font-mono-cut text-muted mb-[10px]" style={{ fontSize: 10 }}>
            reparto del rosco
          </p>
          <div className="flex flex-col gap-2">
            {SUB_MODES.map((sub) => {
              const isSelected = config.roscoSubMode === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => isHost && updateConfig({ roscoSubMode: sub.id })}
                  disabled={!isHost}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-[14px] transition-[border-color] duration-150',
                    isSelected ? 'bg-tint' : 'bg-transparent',
                  )}
                  style={{
                    border: isSelected ? '2.5px solid var(--cut-ink)' : '1.5px solid var(--cut-border)',
                    cursor: isHost ? 'pointer' : 'default',
                  }}
                >
                  <p className="font-display text-ink" style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>
                    {sub.name}
                  </p>
                  <p className="font-mono-cut text-muted mt-[3px]" style={{ fontSize: 9, opacity: 0.5 }}>
                    {sub.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Song pack — host only */}
      <section className={cn('mb-6', config.mode === 'rosco' && 'hidden')}>
        <p className="font-mono-cut text-muted mb-[10px]" style={{ fontSize: 10 }}>
          pack de canciones
        </p>
        <div className="flex flex-col gap-2">
          {PACKS.map((pack) => {
            const isSelected = config.packId === pack.id;
            return (
              <button
                key={pack.id}
                onClick={() => isHost && updateConfig({ packId: pack.id })}
                disabled={!isHost}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-[14px] transition-[border-color] duration-150',
                  isSelected ? 'bg-tint' : 'bg-transparent',
                )}
                style={{
                  border: isSelected ? '2.5px solid var(--cut-ink)' : '1.5px solid var(--cut-border)',
                  cursor: isHost ? 'pointer' : 'default',
                }}
              >
                <p className="font-display text-ink" style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>
                  {pack.name}
                </p>
                <p className="font-mono-cut text-muted mt-[3px]" style={{ fontSize: 9, opacity: 0.5 }}>
                  {pack.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Music provider */}
      <section className="mb-6">
        <p className="font-mono-cut text-muted mb-[10px]" style={{ fontSize: 10 }}>
          proveedor de música
        </p>
        <div className="flex flex-col gap-2">
          {providers.map((p) => {
            const isSelected = config.provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => isHost && updateConfig({ provider: p.id })}
                disabled={!isHost}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-[14px] transition-[border-color] duration-150',
                  isSelected ? 'bg-tint' : 'bg-transparent',
                )}
                style={{
                  border: isSelected ? '2.5px solid var(--cut-ink)' : '1.5px solid var(--cut-border)',
                  cursor: isHost ? 'pointer' : 'default',
                }}
              >
                <p className="font-display text-ink" style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>
                  {p.label}
                </p>
                <p className="font-mono-cut text-muted mt-[3px]" style={{ fontSize: 9, opacity: 0.5 }}>
                  {p.note}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sync audio toggle */}
      <section className="mb-8">
        <p className="font-mono-cut text-muted mb-[10px]" style={{ fontSize: 10 }}>
          audio
        </p>
        <button
          onClick={() => isHost && updateConfig({ syncAudio: !config.syncAudio })}
          disabled={!isHost}
          className={cn(
            'w-full text-left px-4 py-3 rounded-[14px] transition-[border-color] duration-150',
            config.syncAudio ? 'bg-tint' : 'bg-transparent',
          )}
          style={{
            border: config.syncAudio ? '2.5px solid var(--cut-ink)' : '1.5px solid var(--cut-border)',
            cursor: isHost ? 'pointer' : 'default',
          }}
        >
          <p className="font-display text-ink" style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>
            escuchar en todos los dispositivos
          </p>
          <p className="font-mono-cut text-muted mt-[3px]" style={{ fontSize: 9, opacity: 0.5 }}>
            {config.syncAudio
              ? 'todos escuchan cuando el jugador activo da play'
              : 'solo el jugador activo escucha'}
          </p>
        </button>
      </section>

      {/* Start / waiting */}
      {isHost ? (
        <button
          onClick={startGame}
          disabled={room.players.length < 2}
          className="btn-primary"
        >
          {room.players.length < 2 ? 'espera más jugadores.' : 'empezar partida.'}{' '}
          <span>→</span>
        </button>
      ) : (
        <p className="font-mono-cut text-muted text-center" style={{ fontSize: 11, opacity: 0.5 }}>
          esperando al host…
        </p>
      )}
    </main>
  );
}
