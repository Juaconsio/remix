import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useSocket } from '../hooks/useSocket';
import type { MusicProvider } from '../types/game';
import type { AudioOutput, GameMode, RoomConfig, RoscoSubMode } from '../types/socket';
import { SettingsTrigger } from '../game/components/SettingsTrigger';
import { cn } from '../utils/cn';

const PACKS = [
  { id: 'base',        name: 'pack base',   description: '20 hits de todos los tiempos (1967–2023)' },
  { id: 'indie-vibes', name: 'indie vibes', description: '15 canciones indie y alternativas' },
  { id: 'pop-latino',  name: 'pop latino',  description: 'Morat, Camilo, Greeicy, Yatra y más' },
  { id: 'chile',       name: 'chile',       description: 'de Violeta Parra a Cris MJ (1966–2022)' },
  { id: 'reggaeton',   name: 'reggaetón',   description: 'de Gasolina a DtMF (2002–2025)' },
];

const MODES: { id: GameMode; name: string; description: string }[] = [
  { id: 'classic',  name: 'clásico',       description: 'ordena los discos de tu caja por año' },
  { id: 'rosco',    name: 'rosco musical', description: 'una canción por letra · el host adjudica' },
];

const SUB_MODES: { id: RoscoSubMode; name: string; description: string }[] = [
  { id: 'paralelo', name: 'paralelo',   description: 'rosco compartido · el host marca quién la acertó' },
  { id: 'turnos',   name: 'por turnos', description: 'un rosco por jugador · con pasapalabra' },
];

const PROVIDERS: { id: MusicProvider; name: string; description: string }[] = [
  { id: 'youtube', name: 'youtube', description: 'audio · sin cuenta' },
  { id: 'deezer',  name: 'deezer',  description: 'preview de 30 s · sin cuenta' },
  { id: 'spotify', name: 'spotify', description: 'preview de 30 s · requiere API key' },
];

const AUDIO_OUTPUTS: { id: AudioOutput; name: string; description: string }[] = [
  { id: 'everyone', name: 'en todos',      description: 'todos escuchan cuando el jugador activo da play' },
  { id: 'host',     name: 'solo el host',  description: 'el teléfono del host hace de parlante' },
  { id: 'turn',     name: 'solo el turno', description: 'solo escucha el jugador activo' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display mb-2" style={{ fontSize: 22 }}>
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
      aria-pressed={isSelected}
      className={cn(
        'w-full text-left px-4 py-3 min-h-15 cursor-pointer transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100',
        isSelected ? 'bg-ink text-bg' : 'bg-tint text-ink',
      )}
    >
      <p className="font-display" style={{ fontSize: 19 }}>{name}.</p>
      <p className={cn('font-label mt-0.5', isSelected ? 'opacity-70' : 'text-muted')}>{description}</p>
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
    <section className="mb-8">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-col gap-1">
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

      {/* En el rosco solo suena el host: reenviar el track les daría la respuesta a los demás. */}
      {config.mode === 'classic' && (
        <OptionGroup
          label="dónde suena la música"
          options={AUDIO_OUTPUTS}
          selectedId={config.audioOutput}
          onSelect={(audioOutput) => updateConfig({ audioOutput })}
        />
      )}
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

  return (
    <main className="flex flex-col px-5 pt-4 max-w-107.5 mx-auto bg-bg text-ink min-h-dvh">
      <div className="flex items-center justify-between">
        <p className="font-display" style={{ fontSize: 28 }}>remix.</p>
        <SettingsTrigger />
      </div>

      <div className="mt-8 mb-10">
        <p className="font-label text-muted">código de sala</p>
        <p className="font-year" style={{ fontSize: 'clamp(64px, 24vw, 96px)', lineHeight: 0.95 }}>{room.code}</p>
        <p className="font-display mt-1" style={{ fontSize: 19, fontWeight: 700 }}>compártelo con la mesa.</p>
      </div>

      <section className="mb-8">
        <SectionLabel>jugadores ({room.players.length}).</SectionLabel>
        <ul ref={playerListRef} className="flex flex-col gap-1">
          {room.players.map((p) => {
            const isMe = p.id === myPlayerId;
            return (
              <li
                key={p.id}
                className={cn(
                  'flex items-center gap-3 px-4 min-h-14 transition-opacity',
                  isMe ? 'bg-ink text-bg' : 'bg-tint text-ink',
                  !p.connected && 'opacity-40',
                )}
              >
                <span className="flex-1 font-display truncate" style={{ fontSize: 20 }}>{p.name}</span>
                {!p.connected && <span className="font-label">sin conexión</span>}
                {p.id === room.hostId && <span className="font-label px-2 py-1 bg-signal text-ground">host</span>}
              </li>
            );
          })}
        </ul>
      </section>

      {isHost ? (
        <>
          <HostSettings config={room.config} updateConfig={updateConfig} />
          <div className="sticky bottom-0 mt-auto -mx-5 px-5 pt-3 pb-safe bg-bg">
            <button onClick={startGame} disabled={room.players.length < 2} className="btn btn-signal">
              {room.players.length < 2 ? 'espera más jugadores.' : 'empezar partida.'}
            </button>
          </div>
        </>
      ) : (
        <p className="font-display pb-safe" style={{ fontSize: 20 }}>esperando al host…</p>
      )}
    </main>
  );
}
