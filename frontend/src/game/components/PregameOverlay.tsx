import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Song } from '../../types/game';
import type { RoomPlayer } from '../../types/socket';
import { decadeAccent } from '../../utils/songColor';
import { EASE_OUT } from '../../utils/motion';
import { cn } from '../../utils/cn';
import { Vinyl } from './Vinyl';

interface PregameOverlayProps {
  players: RoomPlayer[];
  readyIds: string[] | null;
  myPlayerId: string | null;
  isHost: boolean;
  needsUnlock: boolean;
  onReady: (songId?: string) => void;
  onSkip: () => void;
}

const OPTION_STAGGER = 0.06;

function StartingOption({ song, index, onPick }: { song: Song; index: number; onPick?: () => void }) {
  const prefersReduced = useReducedMotion() ?? false;

  return (
    <motion.button
      onClick={onPick}
      disabled={!onPick}
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.1 + index * OPTION_STAGGER }}
      className={cn(
        'relative w-full overflow-hidden text-left px-4 pt-3 pb-4 min-h-28 transition-transform duration-150 enabled:active:scale-[0.97]',
        index % 2 === 0 ? 'bg-cream text-ground' : 'bg-tono-2 text-cream',
      )}
    >
      <p className="font-year" style={{ fontSize: 28, lineHeight: 1 }}>{song.year}</p>
      <p className="font-display mt-2 pr-24" style={{ fontSize: 20, lineHeight: 1.05 }}>{song.title}</p>
      <p className="font-label pr-24">{song.artist}</p>
      <Vinyl accent={decadeAccent(song.year)} className="absolute -right-6 -bottom-10 w-32" />
    </motion.button>
  );
}

function TableStatus({ players, readyIds }: { players: RoomPlayer[]; readyIds: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {players.map((p) => {
        if (!p.connected) return null;
        const isReady = readyIds.includes(p.id);
        return (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-2 px-3 py-2 font-label transition-colors duration-200',
              isReady ? 'bg-cream text-ground' : 'bg-tono-2 text-cream/60',
            )}
          >
            {p.name}
            {isReady && <span className="font-display">listo.</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function PregameOverlay({
  players,
  readyIds,
  myPlayerId,
  isHost,
  needsUnlock,
  onReady,
  onSkip,
}: PregameOverlayProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const isPregame = readyIds !== null;
  const me = players.find((p) => p.id === myPlayerId) ?? null;
  const options = me?.startingOptions ?? [];
  const isChoosing = isPregame && options.length > 0;
  const iAmReady = isPregame && !needsUnlock && !!myPlayerId && readyIds.includes(myPlayerId);
  const myFirstSong = iAmReady ? me?.timeline[0] : undefined;
  const pending = players.filter((p) => p.connected && !readyIds?.includes(p.id));

  const subtitle = !isPregame
    ? 'la partida sigue. atento a la próxima canción.'
    : isChoosing
    ? 'elige el disco que abre tu caja.'
    : myFirstSong
    ? 'tu caja empieza con este disco.'
    : 'oídos atentos: la primera canción ya viene.';

  return (
    <AnimatePresence>
      {(isPregame || needsUnlock) && (
        <motion.div
          key="pregame"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.2, ease: EASE_OUT }}
          className="fixed inset-0 z-200 flex flex-col overflow-y-auto overscroll-contain bg-ground text-cream px-5 pt-12 pb-safe"
        >
          <h1 className="font-display" style={{ fontSize: 'clamp(56px, 18vw, 96px)', lineHeight: 0.92 }}>
            {isPregame ? '¿listos?' : 'de vuelta.'}
          </h1>
          <p className="font-display mt-3" style={{ fontSize: 22, lineHeight: 1.15, fontWeight: 700 }}>
            {subtitle}
          </p>

          <div className="flex-1 flex flex-col justify-center gap-1 py-6">
            {isChoosing && options.map((song, i) => (
              <StartingOption key={song.id} song={song} index={i} onPick={() => onReady(song.id)} />
            ))}
            {myFirstSong && (
              <StartingOption song={myFirstSong} index={0} />
            )}
          </div>

          <div className="flex flex-col gap-3">
            {isPregame && <TableStatus players={players} readyIds={readyIds} />}

            {iAmReady ? (
              <p className="font-label opacity-60">
                esperando a {pending.map((p) => p.name).join(', ')}…
              </p>
            ) : !isChoosing && (
              <button onClick={() => onReady()} className="btn btn-signal">
                {isPregame ? 'estoy listo.' : 'volver a jugar.'}
              </button>
            )}

            {isPregame && isHost && (
              <button onClick={onSkip} className="btn btn-tone btn-small">
                empezar sin esperar
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
