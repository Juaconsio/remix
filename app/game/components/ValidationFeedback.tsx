'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ValidationFeedbackProps {
  result: boolean | null;
  songYear?: number;
}

export function ValidationFeedback({ result, songYear }: ValidationFeedbackProps) {
  return (
    <AnimatePresence>
      {result !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mx-5 mb-4 px-5 py-4 rounded-2xl text-center ${
            result ? 'bg-success/20 border border-success' : 'bg-error/20 border border-error'
          }`}
        >
          {result ? (
            <p className="text-success font-bold text-lg">¡Correcto! +1 punto</p>
          ) : (
            <div>
              <p className="text-error font-bold text-lg">Incorrecto</p>
              {songYear && (
                <p className="text-muted text-sm mt-1">Era de {songYear}</p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
