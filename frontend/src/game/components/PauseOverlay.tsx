import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '../../utils/motion';

interface PauseOverlayProps {
  isPaused: boolean;
  hostName: string;
  isHost: boolean;
  onResume: () => void;
}

export function PauseOverlay({ isPaused, hostName, isHost, onResume }: PauseOverlayProps) {
  const prefersReduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          key="pause"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.2, ease: EASE_OUT }}
          className="fixed inset-0 z-500 flex flex-col bg-ground text-cream px-5 pt-12 pb-8"
        >
          <h1 className="font-display" style={{ fontSize: 'clamp(56px, 18vw, 96px)', lineHeight: 0.9, letterSpacing: '-0.03em' }}>
            pausa.
          </h1>
          <p className="font-serif-accent mt-3" style={{ fontSize: 22, lineHeight: 1.15, opacity: 0.8 }}>
            {isHost ? 'la mesa espera. sigan cuando quieran.' : `${hostName} detuvo la partida. ya vuelve la música.`}
          </p>

          <div className="flex-1" />

          {isHost && (
            <button onClick={onResume} className="btn-game">
              <span>seguir.</span>
              <span>→</span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
