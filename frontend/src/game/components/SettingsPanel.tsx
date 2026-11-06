import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useControlsStore } from '../../store/controlsStore';
import { useSocket } from '../../hooks/useSocket';
import { isInGame } from '../../utils/pause';
import { HostGameSettings } from './HostGameSettings';

interface SettingRowProps {
  title: string;
  note?: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}

function SettingRow({ title, note, label, checked, onToggle }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 min-h-15 px-4 bg-tint">
      <div>
        <p className="font-display" style={{ fontSize: 20 }}>{title}</p>
        {note && <p className="font-label text-muted">{note}</p>}
      </div>

      <button
        onClick={onToggle}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="shrink-0 flex w-19 h-11 p-1 cursor-pointer bg-tono-2"
      >
        <motion.span
          animate={{ x: checked ? 32 : 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="block w-9 h-9 bg-cream"
        />
      </button>
    </div>
  );
}

export function SettingsPanel() {
  const { isOpen, close } = useSettingsStore();
  const { override, setOverride } = useThemeStore();
  const { crateButtons, setCrateButtons } = useControlsStore();
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

            <SettingRow
              title={effectiveDark ? 'modo oscuro.' : 'modo claro.'}
              note={override === null ? 'según el sistema' : undefined}
              label="modo oscuro"
              checked={effectiveDark}
              onToggle={toggleTheme}
            />

            {override !== null && (
              <button
                onClick={() => setOverride(null)}
                className="font-label text-muted underline underline-offset-[3px] min-h-11"
              >
                usar preferencia del sistema
              </button>
            )}

            <div className="mt-2">
              <SettingRow
                title="botones en la caja."
                note={crateButtons ? 'hojeas y pones con botones' : 'arrastras la caja y el disco'}
                label="botones en la caja"
                checked={crateButtons}
                onToggle={() => setCrateButtons(!crateButtons)}
              />
            </div>

            {isHostInGame && <HostGameSettings room={room} onDone={close} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
