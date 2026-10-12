import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useSocket } from '../hooks/useSocket';
import { DEFAULT_SIGNAL, avatarColors } from '../utils/songColor';
import type { MusicProvider } from '../types/game';
import type { GameMode, RoomConfig, RoscoSubMode } from '../types/socket';
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

const PROVIDERS: { id: MusicProvider; name: string; description: string }[] = [
  { id: 'youtube', name: 'YouTube', description: 'Audio · sin cuenta' },
  { id: 'deezer',  name: 'Deezer',  description: 'Preview 30s · sin cuenta' },
  { id: 'spotify', name: 'Spotify', description: 'Preview 30s · requiere API key' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono-cut text-muted mb-[10px]" style={{ fontSize: 11 }}>
      {children}
    </p>
  );
}

function OptionButton({
  name,
  description,
  isSelected,
  onClick,
}: {
  name: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-[14px] cursor-pointer transition-[border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:active:scale-100',
        isSelected ? 'bg-tint' : 'bg-transparent',
      )}
      style={{ border: isSelected ? '2.5px solid var(--cut-ink)' : '1.5px solid var(--cut-border)' }}
    >
      <p className="font-display text-ink" style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>
        {name}
      </p>
      <p className="font-mono-cut text-muted mt-1" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
        {description}
      </p>
    </button>
  );
}

function OptionGroup<T extends string>({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: { id: T; name: string; description: string }[];
  selectedId: T;
  onSelect: (id: T) => void;
}) {
  return (
    <section className="mb-6">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <OptionButton
            key={option.id}
            name={option.name}
            description={option.description}
            isSelected={selectedId === option.id}
            onClick={() => onSelect(option.id)}
          />
        ))}
      </div>
    </section>
  );
}

function HostSettings({
  config,
  updateConfig,
}: {
  config: RoomConfig;
  updateConfig: (config: Partial<RoomConfig>) => void;
}) {
  return (
    <>
      <OptionGroup
        label="modo de juego"
        options={MODES}
        selectedId={config.mode}
        onSelect={(mode) => updateConfig({ mode })}
      />

      {config.mode === 'rosco' ? (
        <OptionGroup
          label="reparto del rosco"
          options={SUB_MODES}
          selectedId={config.roscoSubMode}
          onSelect={(roscoSubMode) => updateConfig({ roscoSubMode })}
        />
      ) : (
        <OptionGroup
          label="pack de canciones"
          options={PACKS}
          selectedId={config.packId}
          onSelect={(packId) => updateConfig({ packId })}
        />
      )}

      <OptionGroup
        label="proveedor de música"
        options={PROVIDERS}
        selectedId={config.provider}
        onSelect={(provider) => updateConfig({ provider })}
      />

      <section className="mb-8">
        <SectionLabel>audio</SectionLabel>
        <OptionButton
          name="escuchar en todos los dispositivos"
          description={config.syncAudio
            ? 'todos escuchan cuando el jugador activo da play'
            : 'solo el jugador activo escucha'}
          isSelected={config.syncAudio}
          onClick={() => updateConfig({ syncAudio: !config.syncAudio })}
        />
      </section>
    </>
  );
}

export default function Lobby() {
  const navigate   = useNavigate();
  const { room, myPlayerId, updateConfig, startGame } = useSocket();

  const isHost = room?.hostId === myPlayerId;

  const [playerListRef] = useAutoAnimate<HTMLUListElement>();

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'round_active' || room.status === 'setup') {
      navigate(room.config.mode === 'rosco' ? `/rosco/${room.code}` : `/game/${room.code}`);
    }
    if (room.status === 'finished') navigate(`/results/${room.code}`);
  }, [room, navigate]);

  if (!room) return null;

  const signal = DEFAULT_SIGNAL;

  return (
    <main className="flex flex-col px-5 pt-10 pb-8 max-w-sm mx-auto bg-bg text-ink min-h-dvh">

      <div className="flex justify-end mb-6 -mt-4">
        <SettingsTrigger />
      </div>

      <div className="flex flex-col items-center gap-1 mb-10 text-center">
        <p className="font-mono-cut text-muted" style={{ fontSize: 11 }}>código de sala</p>
        <div
          className="font-display"
          style={{ fontSize: 64, letterSpacing: -3, lineHeight: 1, color: signal.primary }}
        >
          {room.code}
        </div>
        <p className="font-mono-cut text-muted" style={{ fontSize: 11 }}>
          comparte con tus amigos
        </p>
      </div>

      <section className="mb-8">
        <SectionLabel>jugadores ({room.players.length})</SectionLabel>
        <ul ref={playerListRef} className="flex flex-col gap-2">
          {room.players.map((p, i) => {
            const avatar = avatarColors(i);
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
                  style={{ background: avatar.bg, color: avatar.fg, fontSize: 16 }}
                >
                  {p.name[0].toLowerCase()}
                </div>

                <span
                  className="flex-1 font-display text-ink overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}
                >
                  {p.name}
                </span>

                {!p.connected && (
                  <span
                    className="font-mono-cut rounded-full"
                    style={{ fontSize: 10, padding: '3px 10px', border: '1px solid var(--cut-border)' }}
                  >
                    offline
                  </span>
                )}

                {p.id === room.hostId && (
                  <span
                    className="font-mono-cut bg-ink text-bg rounded-full"
                    style={{ fontSize: 10, padding: '3px 10px' }}
                  >
                    host
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {isHost ? (
        <>
          <HostSettings config={room.config} updateConfig={updateConfig} />
          <button
            onClick={startGame}
            disabled={room.players.length < 2}
            className="btn-primary"
          >
            {room.players.length < 2 ? 'espera más jugadores.' : 'empezar partida.'}{' '}
            <span>→</span>
          </button>
        </>
      ) : (
        <p className="font-mono-cut text-muted text-center" style={{ fontSize: 11 }}>
          esperando al host…
        </p>
      )}
    </main>
  );
}
