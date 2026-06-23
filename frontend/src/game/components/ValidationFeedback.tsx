import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ValidationFeedbackProps {
  result: boolean | null;
  songYear?: number;
}

export function ValidationFeedback({ result, songYear }: ValidationFeedbackProps) {
  const prefersReduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {result !== null && (
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefersReduced ? 0 : -8 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.45, ease: [0.34, 1.56, 0.64, 1] }}
          className="px-5 pb-3"
        >
          <div
            className={cn(
              'px-5 py-3.5 rounded-full flex items-center justify-between',
              result
                ? 'bg-success text-[#0e0e0e] border-none'
                : 'bg-transparent text-song-on-primary',
            )}
            style={result ? undefined : { border: '2.5px solid color-mix(in srgb, var(--song-on-primary) 50%, transparent)' }}
          >
            <span className="font-display" style={{ fontSize: 18, letterSpacing: -0.3 }}>
              {result ? 'correcto.' : 'incorrecto.'}
            </span>

            {!result && songYear && (
              <span
                className="font-mono-cut text-song-on-primary/65"
                style={{ fontSize: 11 }}
              >
                era {songYear}
              </span>
            )}

            {result && (
              <span className="font-mono-cut" style={{ fontSize: 11, opacity: 0.65 }}>
                +1 pt
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
