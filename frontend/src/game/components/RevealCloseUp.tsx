import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Song } from '../../types/game';
import { decadeAccent } from '../../utils/songColor';
import { EASE_OUT } from '../../utils/motion';
import { Vinyl } from './Vinyl';

const STAGE_AT_MS = [450, 1300, 2250, 2900];
const TITLE = 1;
const ARTIST = 2;
const YEAR = 3;
const VERDICT = 4;

export interface RevealVerdict {
  title: string;
  detail: string;
  scored: boolean;
}

interface RevealCloseUpProps {
  song: Song;
  verdict: RevealVerdict;
  onClose: () => void;
  children?: ReactNode;
}

export function RevealCloseUp({ song, verdict, onClose, children }: RevealCloseUpProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const [stage, setStage] = useState(prefersReduced ? VERDICT : 0);

  useEffect(() => {
    if (prefersReduced) return;
    const timers = STAGE_AT_MS.map((ms, i) => window.setTimeout(() => setStage((s) => Math.max(s, i + 1)), ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [prefersReduced]);

  const enter = (offset: number) => prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: offset }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: EASE_OUT } };

  const yearShown = stage >= YEAR;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`era ${song.title}, de ${song.artist}, ${song.year}`}
      className="fixed inset-0 z-300 overflow-hidden bg-ground text-cream"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setStage(VERDICT)}
    >
      <motion.div
        className="absolute left-1/2 top-[46%] w-[min(150vw,62dvh,44rem)] -translate-x-1/2 -translate-y-1/2"
        initial={prefersReduced ? false : { scale: 0.35, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        aria-hidden="true"
      >
        <Vinyl accent={yearShown ? decadeAccent(song.year) : null} spinning>
          <AnimatePresence mode="wait" initial={false}>
            {yearShown ? (
              <motion.span
                key="anio"
                className="etiqueta-anio"
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={prefersReduced ? { duration: 0.15 } : { type: 'spring', duration: 0.5, bounce: 0.4 }}
              >
                {song.year}
              </motion.span>
            ) : (
              <motion.span key="incognita" exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>¿?</motion.span>
            )}
          </AnimatePresence>
        </Vinyl>
      </motion.div>

      <div className="absolute inset-x-0 top-0 h-[42%] bg-linear-to-b from-ground via-ground/85 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-linear-to-t from-ground via-ground/90 to-transparent" aria-hidden="true" />

      <div className="relative flex h-full flex-col px-5 pt-12 pb-safe">
        <div className="min-h-40">
          {stage >= TITLE && (
            <motion.p {...enter(18)} className="font-display" style={{ fontSize: 'clamp(34px, 10.5vw, 52px)', fontWeight: 900, lineHeight: 0.98, letterSpacing: '-0.03em' }}>
              {song.title}.
            </motion.p>
          )}
          {stage >= ARTIST && (
            <motion.p {...enter(12)} className="font-display mt-2" style={{ fontSize: 22, fontWeight: 700, opacity: 0.8 }}>
              {song.artist}
            </motion.p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pb-3">
          {stage >= VERDICT && (
            <>
              <motion.div {...enter(10)} aria-live="polite">
                <p
                  className={verdict.scored ? 'inline-block bg-success text-ground px-3 py-1' : 'inline-block bg-signal text-ground px-3 py-1'}
                  style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}
                >
                  {verdict.title}
                </p>
                <p className="font-display mt-2" style={{ fontSize: 19, fontWeight: 700 }}>{verdict.detail}</p>
              </motion.div>
              <motion.div {...enter(8)} className="flex flex-col gap-2 mt-2" onClick={(event) => event.stopPropagation()}>
                {children}
                <button onClick={onClose} className="btn btn-tone btn-small">ver la caja</button>
              </motion.div>
            </>
          )}
          {stage < VERDICT && <p className="font-label opacity-50 text-center">toca para ver todo</p>}
        </div>
      </div>
    </motion.div>
  );
}
