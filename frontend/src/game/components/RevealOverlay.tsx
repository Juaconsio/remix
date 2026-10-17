import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Song } from '../../types/game';
import type { SongSignal } from '../../utils/songColor';
import { EASE_OUT } from '../../utils/motion';

interface RevealOverlayProps {
  song: Song | null;
  isVisible: boolean;
  result: boolean | null;
  signal?: SongSignal;
  canAdvance: boolean;
  isLastTurn: boolean;
  waitingFor: string;
  onNext: () => void;
  stealWinnerName: string | null;
  tokenAward: { playerName: string; awarded: boolean; onAward: () => void } | null;
}

const SLIDE = { type: 'spring', damping: 28, stiffness: 220 } as const;
const BADGE_DELAY = 0.6;

function badgeEntrance(isCorrect: boolean, prefersReduced: boolean) {
  if (prefersReduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.15, delay: BADGE_DELAY },
    };
  }
  if (isCorrect) {
    return {
      initial: { opacity: 0, scale: 0.85 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: 'spring', duration: 0.45, bounce: 0.35, delay: BADGE_DELAY },
    } as const;
  }
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: EASE_OUT, delay: BADGE_DELAY },
  };
}

export function RevealOverlay({
  song,
  isVisible,
  result,
  signal,
  canAdvance,
  isLastTurn,
  waitingFor,
  onNext,
  stealWinnerName,
  tokenAward,
}: RevealOverlayProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const primary = signal?.primary ?? '#ff5722';
  const somebodyScored = result === true || stealWinnerName !== null;
  const resultLabel = result ? 'correcto.' : stealWinnerName ? `${stealWinnerName} la robó.` : 'incorrecto.';

  return (
    <AnimatePresence>
      {isVisible && song && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: '#0e0e0e',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 28px',
            overflow: 'hidden',
          }}
        >
          {/* Year — huge */}
          <motion.div
            initial={prefersReduced ? false : { x: '110vw' }}
            animate={{ x: 0 }}
            transition={prefersReduced ? { duration: 0 } : { ...SLIDE, delay: 0.05 }}
            style={{ marginBottom: 8 }}
          >
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: 'clamp(88px, 28vw, 160px)',
                lineHeight: 0.85,
                color: primary,
                letterSpacing: '-0.04em',
              }}
            >
              {song.year}.
            </p>
          </motion.div>

          {/* Artist */}
          <motion.div
            initial={prefersReduced ? false : { x: '110vw' }}
            animate={{ x: 0 }}
            transition={prefersReduced ? { duration: 0 } : { ...SLIDE, delay: 0.28 }}
            style={{ marginBottom: 6 }}
          >
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'rgba(255,244,237,0.45)',
                marginBottom: 6,
              }}
            >
              artista
            </p>
            <p
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 'clamp(32px, 10vw, 52px)',
                color: '#fff4ed',
                lineHeight: 1,
              }}
            >
              {song.artist}
            </p>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={prefersReduced ? false : { scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.4, delay: 0.52, ease: 'easeOut' }}
            style={{
              height: 1.5,
              background: 'rgba(255,244,237,0.14)',
              margin: '16px 0',
            }}
          />

          {/* Song title */}
          <motion.div
            initial={prefersReduced ? false : { x: '110vw' }}
            animate={{ x: 0 }}
            transition={prefersReduced ? { duration: 0 } : { ...SLIDE, delay: 0.56 }}
          >
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'rgba(255,244,237,0.45)',
                marginBottom: 6,
              }}
            >
              canción
            </p>
            <p
              style={{
                fontFamily: 'var(--cut-font-display)',
                fontWeight: 'var(--cut-font-display-weight)',
                fontStyle: 'italic',
                fontSize: 'clamp(22px, 7vw, 36px)',
                color: '#fff4ed',
                letterSpacing: -0.5,
                lineHeight: 1.1,
              }}
            >
              {song.title}.
            </p>
          </motion.div>

          {/* Result badge */}
          <AnimatePresence>
            {result !== null && (
              <motion.div
                {...badgeEntrance(somebodyScored, prefersReduced)}
                style={{ marginTop: 28, transformOrigin: 'left center' }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 22px',
                    borderRadius: 999,
                    ...(somebodyScored
                      ? { background: result ? '#2cd9b8' : primary, color: '#0e0e0e' }
                      : { background: 'transparent', border: '2.5px solid rgba(255,244,237,0.3)', color: '#fff4ed' }),
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--cut-font-display)',
                      fontWeight: 'var(--cut-font-display-weight)',
                      fontStyle: 'italic',
                      fontSize: 20,
                      letterSpacing: -0.3,
                    }}
                  >
                    {resultLabel}
                  </span>
                  {somebodyScored && (
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        opacity: 0.65,
                      }}
                    >
                      +1 pt
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.3, delay: 1.1 }}
            style={{ position: 'absolute', left: 20, right: 20, bottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {tokenAward && (
              tokenAward.awarded ? (
                <p className="font-mono-cut text-center" style={{ fontSize: 11, color: 'rgba(255,244,237,0.6)' }}>
                  ficha para {tokenAward.playerName} ✓
                </p>
              ) : (
                <button onClick={tokenAward.onAward} className="btn-secondary btn-secondary-light">
                  {tokenAward.playerName} la nombró · +1 ficha
                </button>
              )
            )}
            {canAdvance ? (
              <button onClick={onNext} className="btn-game">
                <span>{isLastTurn ? 'ver resultados.' : 'siguiente.'}</span>
                <span>→</span>
              </button>
            ) : (
              <p
                className="font-mono-cut text-center"
                style={{ fontSize: 11, color: 'rgba(255,244,237,0.6)' }}
              >
                esperando a {waitingFor}…
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
