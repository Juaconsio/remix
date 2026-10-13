import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Song } from '../../types/game';
import type { RoomPlayer } from '../../types/socket';
import { avatarColors, getSongSignal } from '../../utils/songColor';
import { EASE_OUT } from '../../utils/motion';

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
  const { primary, onPrimary } = getSongSignal(song.year);

  return (
    <motion.button
      onClick={onPick}
      disabled={!onPick}
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.1 + index * OPTION_STAGGER }}
      className="w-full text-left rounded-3xl px-5 py-4 transition-transform duration-150 enabled:active:scale-[0.97]"
      style={{ background: primary, color: onPrimary }}
    >
      <p className="font-mono-cut" style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {song.year}
      </p>
      <p className="font-display mt-2" style={{ fontSize: 20, lineHeight: 1.1 }}>
        {song.title}.
      </p>
      <p className="font-serif-accent" style={{ fontSize: 17, opacity: 0.85 }}>
        {song.artist}
      </p>
    </motion.button>
  );
}

function TableStatus({ players, readyIds }: { players: RoomPlayer[]; readyIds: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {players.map((p, i) => {
        if (!p.connected) return null;
        const isReady = readyIds.includes(p.id);
        const { bg, fg } = avatarColors(i);
        return (
          <li
            key={p.id}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-opacity duration-200"
            style={{
              background: isReady ? bg : 'transparent',
              color: isReady ? fg : 'var(--color-cream)',
              border: isReady ? 'none' : '1.5px solid rgba(255,244,237,0.3)',
              opacity: isReady ? 1 : 0.6,
            }}
          >
            <span className="font-display" style={{ fontSize: 15 }}>{p.name}</span>
            {isReady && <span className="font-mono-cut" style={{ fontSize: 10 }}>listo</span>}
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
    ? 'elige la canción que abre tu línea de tiempo.'
    : myFirstSong
    ? 'tu línea de tiempo empieza aquí.'
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
          className="fixed inset-0 z-200 flex flex-col overflow-y-auto bg-ground text-cream px-5 pt-12 pb-8"
        >
          <h1 className="font-display" style={{ fontSize: 'clamp(56px, 18vw, 96px)', lineHeight: 0.9, letterSpacing: '-0.03em' }}>
            {isPregame ? '¿listos?' : 'de vuelta.'}
          </h1>
          <p className="font-serif-accent mt-3" style={{ fontSize: 22, lineHeight: 1.15, opacity: 0.8 }}>
            {subtitle}
          </p>

          <div className="flex-1 flex flex-col justify-center gap-3 py-6">
            {isChoosing && options.map((song, i) => (
              <StartingOption key={song.id} song={song} index={i} onPick={() => onReady(song.id)} />
            ))}
            {myFirstSong && (
              <StartingOption song={myFirstSong} index={0} />
            )}
          </div>

          <div className="flex flex-col gap-4">
            {isPregame && <TableStatus players={players} readyIds={readyIds} />}

            {iAmReady ? (
              <p className="font-mono-cut text-center" style={{ fontSize: 11, opacity: 0.6 }}>
                esperando a {pending.map((p) => p.name).join(', ')}…
              </p>
            ) : !isChoosing && (
              <button onClick={() => onReady()} className="btn-game">
                <span>{isPregame ? 'estoy listo.' : 'volver a jugar.'}</span>
                <span>→</span>
              </button>
            )}

            {isPregame && isHost && (
              <button onClick={onSkip} className="btn-secondary btn-secondary-light">
                empezar sin esperar
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
