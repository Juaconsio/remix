import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Song } from '../../types/game';
import type { SongSignal } from '../../utils/songColor';

interface RevealOverlayProps {
  song: Song | null;
  isVisible: boolean;
  result: boolean | null;
  signal?: SongSignal;
}

const SLIDE = { type: 'spring', damping: 28, stiffness: 220 } as const;

export function RevealOverlay({ song, isVisible, result, signal }: RevealOverlayProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const primary = signal?.primary ?? '#ff5722';

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
                fontFamily: "'Sora', sans-serif",
                fontWeight: 800,
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
                initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReduced ? { duration: 0 } : { duration: 0.4, delay: 0.85, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ marginTop: 28 }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 22px',
                    borderRadius: 999,
                    ...(result
                      ? { background: '#2cd9b8', color: '#0e0e0e' }
                      : { background: 'transparent', border: '2.5px solid rgba(255,244,237,0.3)', color: '#fff4ed' }),
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontWeight: 800,
                      fontStyle: 'italic',
                      fontSize: 20,
                      letterSpacing: -0.3,
                    }}
                  >
                    {result ? 'correcto.' : 'incorrecto.'}
                  </span>
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
                    {result ? '+1 pt' : `era ${song.year}`}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
