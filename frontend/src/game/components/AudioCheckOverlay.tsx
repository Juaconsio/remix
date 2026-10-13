import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { RoomPlayer } from '../../types/socket';
import { avatarColors } from '../../utils/songColor';
import { EASE_OUT } from '../../utils/motion';

interface AudioCheckOverlayProps {
  players: RoomPlayer[];
  readyIds: string[] | null;
  myPlayerId: string | null;
  isHost: boolean;
  needsUnlock: boolean;
  onReady: () => void;
  onSkip: () => void;
}

export function AudioCheckOverlay({
  players,
  readyIds,
  myPlayerId,
  isHost,
  needsUnlock,
  onReady,
  onSkip,
}: AudioCheckOverlayProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const isWaitingForTable = readyIds !== null;
  const isVisible = isWaitingForTable || needsUnlock;
  const pending = players.filter((p) => p.connected && !readyIds?.includes(p.id));
  const iAmReady = !needsUnlock && !!myPlayerId && !!readyIds?.includes(myPlayerId);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="audio-check"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.2, ease: EASE_OUT }}
          className="fixed inset-0 z-200 flex flex-col justify-center bg-ground text-cream px-7"
        >
          <h1 className="font-display" style={{ fontSize: 'clamp(56px, 18vw, 96px)', lineHeight: 0.9, letterSpacing: '-0.03em' }}>
            {isWaitingForTable ? '¿listos?' : 'de vuelta.'}
          </h1>
          <p className="font-serif-accent mt-3" style={{ fontSize: 22, lineHeight: 1.15, opacity: 0.8 }}>
            {isWaitingForTable
              ? 'oídos atentos: la primera canción ya viene.'
              : 'la partida sigue. atento a la próxima canción.'}
          </p>

          {isWaitingForTable && (
            <ul className="flex flex-wrap gap-2 mt-8">
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
          )}

          <div className="absolute left-5 right-5 bottom-8 flex flex-col gap-3">
            {iAmReady ? (
              <p className="font-mono-cut text-center" style={{ fontSize: 11, opacity: 0.6 }}>
                esperando a {pending.map((p) => p.name).join(', ')}…
              </p>
            ) : (
              <button onClick={onReady} className="btn-game">
                <span>{isWaitingForTable ? 'estoy listo.' : 'volver a jugar.'}</span>
                <span>→</span>
              </button>
            )}
            {isWaitingForTable && isHost && (
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
