import { AnimatePresence, motion } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';

// Aviso flotante mientras el socket está caído. Solo se muestra si ya estábamos
// en una sala (room !== null), para no parpadear en la carga inicial de Home.
export function ConnectionBanner() {
  const { connected, room } = useSocket();
  const show = !connected && room !== null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none"
        >
          <div
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full font-mono-cut"
            style={{ background: '#e8341c', color: '#fff4ed', fontSize: 11 }}
          >
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-current"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
            reconectando…
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
