import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';

export function SettingsPanel() {
  const { isOpen, close } = useSettingsStore();
  const { override, setOverride } = useThemeStore();

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveDark = override === 'dark' || (override === null && systemDark);

  function toggleTheme() {
    setOverride(effectiveDark ? 'light' : 'dark');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[600] bg-black/45"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className="fixed bottom-0 left-0 right-0 z-[601] bg-surface rounded-t-3xl px-6 pt-5 pb-12 max-w-107.5 mx-auto"
            style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-6" />

            <p className="font-mono-cut text-muted mb-5" style={{ fontSize: 10 }}>
              ajustes
            </p>

            {/* Dark/Light toggle row */}
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="font-display text-ink"
                  style={{ fontSize: 18, letterSpacing: -0.3 }}
                >
                  {effectiveDark ? 'modo oscuro.' : 'modo claro.'}
                </p>
                {override === null && (
                  <p className="font-mono-cut text-muted mt-1" style={{ fontSize: 9 }}>
                    según el sistema
                  </p>
                )}
              </div>

              {/* Toggle button — colors are intentionally hardcoded (always light/dark regardless of theme) */}
              <button
                onClick={toggleTheme}
                className="relative shrink-0 w-[52px] h-7 rounded-full border-none cursor-pointer transition-colors duration-200"
                style={{ background: effectiveDark ? '#fff4ed' : '#0e0e0e' }}
              >
                <motion.div
                  animate={{ x: effectiveDark ? 26 : 2 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                  className="absolute top-[3px] left-0 w-[22px] h-[22px] rounded-full"
                  style={{ background: effectiveDark ? '#0e0e0e' : '#fff4ed' }}
                />
              </button>
            </div>

            {override !== null && (
              <button
                onClick={() => setOverride(null)}
                className="font-mono-cut text-muted bg-transparent border-none cursor-pointer underline underline-offset-[3px] mt-4 p-0"
                style={{ fontSize: 9 }}
              >
                usar preferencia del sistema
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
