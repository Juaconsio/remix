import { useSettingsStore } from '../../store/settingsStore';

interface SettingsTriggerProps {
  color?: string;
}

export function SettingsTrigger({ color = 'var(--cut-muted)' }: SettingsTriggerProps) {
  const { open } = useSettingsStore();

  return (
    <button
      onClick={open}
      aria-label="ajustes"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        opacity: 0.6,
        transition: 'opacity 120ms',
      }}
      onPointerDown={(e) => { (e.currentTarget.style.opacity = '1'); }}
      onPointerUp={(e)   => { (e.currentTarget.style.opacity = '0.6'); }}
      onPointerLeave={(e) => { (e.currentTarget.style.opacity = '0.6'); }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: color,
          }}
        />
      ))}
    </button>
  );
}
