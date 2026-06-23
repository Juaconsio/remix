import { CutWaveform } from './CutWaveform';
import type { SongSignal } from '../../utils/songColor';

interface YouTubePlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0–100
  hookDuration: number;
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

export function YouTubePlayer({
  isPlaying,
  isLoading,
  progress,
  hookDuration,
  error,
  signal,
  onPlay,
  onStop,
}: YouTubePlayerProps) {
  const primary   = signal?.primary   ?? '#ff5722';
  const onPrimary = signal?.onPrimary ?? '#fff4ed';

  const finished  = !isPlaying && !isLoading && progress >= 100;
  const elapsed   = Math.round((progress / 100) * hookDuration);
  const remaining = Math.max(0, hookDuration - elapsed);

  // SVG countdown ring
  const R     = 22;
  const circ  = 2 * Math.PI * R;
  const dash  = circ * (1 - (isPlaying ? progress / 100 : 0));

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
        {/* Play disc with countdown ring */}
        <div style={{ position: 'relative', flexShrink: 0, width: 56, height: 56 }}>
          {/* SVG ring */}
          <svg
            width={56}
            height={56}
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
          >
            <circle
              cx={28} cy={28} r={R}
              fill="none"
              stroke={onPrimary}
              strokeWidth={2.5}
              strokeOpacity={0.25}
            />
            {isPlaying && (
              <circle
                cx={28} cy={28} r={R}
                fill="none"
                stroke={onPrimary}
                strokeWidth={2.5}
                strokeDasharray={circ}
                strokeDashoffset={dash}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 300ms linear' }}
              />
            )}
          </svg>

          <button
            onClick={isPlaying ? onStop : onPlay}
            disabled={isLoading}
            style={{
              position: 'absolute',
              inset: 5,
              borderRadius: '50%',
              background: onPrimary,
              color: primary,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'transform 100ms',
            }}
            onPointerDown={(e) => { (e.currentTarget.style.transform = 'scale(0.9)'); }}
            onPointerUp={(e)   => { (e.currentTarget.style.transform = 'scale(1)'); }}
            onPointerLeave={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
          >
            {isLoading ? (
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: `2px solid ${primary}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  display: 'block',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            ) : finished ? (
              <span style={{ fontSize: 18, lineHeight: 1 }}>↺</span>
            ) : isPlaying ? (
              <span style={{ fontSize: 16, lineHeight: 1 }}>⏸</span>
            ) : (
              <span style={{ fontSize: 18, lineHeight: 1 }}>▶</span>
            )}
          </button>
        </div>

        {/* Waveform + countdown */}
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
            <span>
              {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
            </span>
            {isPlaying ? (
              <span style={{ color: onPrimary }}>−{remaining}s</span>
            ) : (
              <span style={{ opacity: 0.55 }}>clip · {hookDuration}s</span>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
