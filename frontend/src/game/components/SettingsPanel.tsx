import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSocket } from '../../hooks/useSocket';
import { isInGame } from '../../utils/pause';
import { HostGameSettings } from './HostGameSettings';

export function SettingsPanel() {
  const { isOpen, close } = useSettingsStore();
  const { override, setOverride } = useThemeStore();
  const { room, myPlayerId } = useSocket();
  const isHostInGame = isInGame(room) && room.hostId === myPlayerId;

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveDark = override === 'dark' || (override === null && systemDark);

  function toggleTheme() {
    setOverride(effectiveDark ? 'light' : 'dark');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[600] bg-black/55"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className="fixed bottom-0 left-0 right-0 z-[601] bg-surface text-ink px-5 pt-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] max-w-107.5 mx-auto max-h-[90dvh] overflow-y-auto overscroll-contain"
          >
            <div className="w-12 h-1.5 bg-border mx-auto mb-5" />

            <p className="font-display mb-4" style={{ fontSize: 26 }}>ajustes.</p>

            <div className="flex items-center justify-between gap-4 min-h-15 px-4 bg-tint">
              <div>
                <p className="font-display" style={{ fontSize: 20 }}>
                  {effectiveDark ? 'modo oscuro.' : 'modo claro.'}
                </p>
                {override === null && <p className="font-label text-muted">según el sistema</p>}
              </div>

              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={effectiveDark}
                aria-label="modo oscuro"
                className="shrink-0 flex w-19 h-11 p-1 cursor-pointer bg-tono-2"
              >
                <motion.span
                  animate={{ x: effectiveDark ? 32 : 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                  className="block w-9 h-9 bg-cream"
                />
              </button>
            </div>

            {override !== null && (
              <button
                onClick={() => setOverride(null)}
                className="font-label text-muted underline underline-offset-[3px] min-h-11"
              >
                usar preferencia del sistema
              </button>
            )}

            {isHostInGame && <HostGameSettings room={room} onDone={close} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
