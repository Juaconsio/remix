// Static waveform with 42 bars — played portion fully opaque, unplayed at 30%.
// When isPlaying=true, bars animate with staggered loop (equalizer effect).
import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface CutWaveformProps {
  progress: number; // 0–100 (percentage played)
  height?: number;
  color?: string;
  isPlaying?: boolean;
}

export function CutWaveform({ progress, height = 32, color = 'currentColor', isPlaying = false }: CutWaveformProps) {
  const bars = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) =>
        0.3 + 0.4 * Math.abs(Math.sin(i * 0.62)) + 0.3 * Math.abs(Math.sin(i * 1.31 + 1)),
      ),
    [],
  );

  const cursorIdx = Math.floor((progress / 100) * bars.length);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {bars.map((h, i) => {
        const barH = Math.max(3, h * height);
        return (
          <motion.div
            key={i}
            style={{
              flex: 1,
              background: color,
              opacity: i < cursorIdx ? 1 : 0.28,
              borderRadius: 2,
            }}
            animate={
              isPlaying
                ? { height: [barH * 0.35, barH, barH * 0.55, barH * 0.85, barH * 0.35] }
                : { height: barH }
            }
            transition={
              isPlaying
                ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.035 }
                : { duration: 0.25, ease: 'easeOut' }
            }
          />
        );
      })}
    </div>
  );
}

// Formats seconds → "mm:ss"
export function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
