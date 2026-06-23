import { CutWaveform } from './CutWaveform';
import type { SongSignal } from '../../utils/songColor';

interface AudioPlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0–100
  error: string | null;
  signal?: SongSignal;
  onPlay: () => void;
  onStop: () => void;
}

const monoStyle = {
  fontFamily: "'Space Mono', monospace",
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
};

export function AudioPlayer({
  isPlaying,
  isLoading,
  progress,
  error,
  signal,
  onPlay,
  onStop,
}: AudioPlayerProps) {
  const primary   = signal?.primary   ?? '#ff5722';
  const onPrimary = signal?.onPrimary ?? '#fff4ed';

  const elapsed = Math.round((progress / 100) * 30);
  const total   = 30;

  return (
    <div style={{ padding: '12px 20px' }}>
      {error && (
        <p style={{ ...monoStyle, fontSize: 10, color: '#e8341c', textAlign: 'center', marginBottom: 10 }}>
          {error}
        </p>
      )}

      <div
        style={{
          background: primary,
          borderRadius: 20,
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {/* Play disc */}
        <button
          onClick={isPlaying ? onStop : onPlay}
          disabled={isLoading}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: onPrimary,
            color: primary,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            cursor: isLoading ? 'default' : 'pointer',
            flexShrink: 0,
            opacity: isLoading ? 0.6 : 1,
            transition: 'transform 100ms',
          }}
          onPointerDown={(e) => { (e.currentTarget.style.transform = 'scale(0.93)'); }}
          onPointerUp={(e)   => { (e.currentTarget.style.transform = 'scale(1)'); }}
          onPointerLeave={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
        >
          {isLoading ? (
            <span
              style={{
                width: 18,
                height: 18,
                border: `2px solid ${primary}`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'block',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          ) : isPlaying ? (
            '⏸'
          ) : (
            '▶'
          )}
        </button>

        {/* Waveform + time */}
        <div style={{ flex: 1, minWidth: 0, color: onPrimary }}>
          <CutWaveform progress={progress} height={28} color={onPrimary} />
          <div
            style={{
              ...monoStyle,
              fontSize: 9,
              color: onPrimary,
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
            }}
          >
            <span>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</span>
            <span style={{ opacity: 0.55 }}>
              {String(Math.floor(total / 60)).padStart(2, '0')}:{String(total % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
