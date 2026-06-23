import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { Song } from '../../types/game';
import type { SongSignal } from '../../utils/songColor';
import { CutWaveform } from './CutWaveform';

interface CardSlotProps {
  song: Song | null;
  isRevealed: boolean;
  isPlaying: boolean;
  signal?: SongSignal;
  thumbnailUrl?: string;
  // Embedded player props
  isLoading?: boolean;
  progress?: number;       // 0–100
  hookDuration?: number;   // seconds (YouTube)
  provider?: 'deezer' | 'spotify' | 'youtube';
  playerError?: string | null;
  onPlay?: () => void;
  onStop?: () => void;
}

// Animated play/pause disc with countdown ring for YouTube
function PlayDisc({
  isPlaying,
  isLoading,
  progress,
  hookDuration: _hookDuration,
  provider,
  primary,
  onPrimary,
  onPlay,
  onStop,
  reduced,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  hookDuration: number;
  provider: string;
  primary: string;
  onPrimary: string;
  onPlay: () => void;
  onStop: () => void;
  reduced: boolean;
}) {
  const SIZE  = 80;
  const R     = SIZE / 2 - 6;
  const circ  = 2 * Math.PI * R;
  const dash  = circ * (1 - progress / 100);

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      {/* Outer pulse ring — only when playing and not reduced */}
      {isPlaying && !reduced && (
        <motion.div
          animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-2 rounded-full border-2 border-song-primary pointer-events-none"
        />
      )}

      {/* SVG countdown ring — YouTube only */}
      {provider === 'youtube' && (
        <svg
          width={SIZE}
          height={SIZE}
          className="absolute inset-0 pointer-events-none"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={onPrimary} strokeWidth={2.5} strokeOpacity={0.2} />
          {isPlaying && (
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
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
      )}

      {/* Disc button */}
      <motion.button
        onClick={isPlaying ? onStop : onPlay}
        disabled={isLoading}
        whileTap={reduced ? undefined : { scale: 0.9 }}
        whileHover={reduced ? undefined : { scale: 1.06 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="absolute rounded-full bg-song-on-primary text-song-primary border-none flex items-center justify-center"
        style={{
          inset: provider === 'youtube' ? 7 : 0,
          cursor: isLoading ? 'default' : 'pointer',
          opacity: isLoading ? 0.55 : 1,
          boxShadow: isPlaying ? `0 0 0 3px ${primary}44` : '0 4px 16px rgba(0,0,0,0.25)',
          transition: 'box-shadow 300ms, opacity 150ms',
        }}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
            >
              <motion.span
                animate={reduced ? {} : { rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'block', lineHeight: 0 }}
              >
                <Icon icon="ph:circle-notch-bold" width={20} height={20} />
              </motion.span>
            </motion.span>
          ) : isPlaying ? (
            <motion.span
              key="pause"
              initial={reduced ? {} : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? {} : { scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ lineHeight: 0 }}
            >
              <Icon
                icon="ph:pause-fill"
                width={provider === 'youtube' ? 20 : 26}
                height={provider === 'youtube' ? 20 : 26}
              />
            </motion.span>
          ) : (
            <motion.span
              key="play"
              initial={reduced ? {} : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? {} : { scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ lineHeight: 0, paddingLeft: 2 }}
            >
              <Icon
                icon="ph:play-fill"
                width={provider === 'youtube' ? 20 : 26}
                height={provider === 'youtube' ? 20 : 26}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

export function CardSlot({
  song,
  isRevealed,
  isPlaying,
  signal,
  thumbnailUrl,
  isLoading = false,
  progress = 0,
  hookDuration = 15,
  provider = 'deezer',
  playerError,
  onPlay,
  onStop,
}: CardSlotProps) {
  const prefersReduced = useReducedMotion() ?? false;

  const primary   = signal?.primary   ?? '#ff5722';
  const onPrimary = signal?.onPrimary ?? '#fff4ed';

  const hasPlayer = !!(onPlay && onStop);

  return (
    <div
      className="flex justify-center px-5 pt-5 pb-3"
      style={{ '--song-primary': primary, '--song-on-primary': onPrimary } as React.CSSProperties}
    >
      <div className="relative w-full max-w-70" style={{ aspectRatio: '3/4' }}>
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            /* Hidden face — always dark card back */
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, x: -40 }}
              transition={{ duration: prefersReduced ? 0.01 : 0.25 }}
              className="absolute inset-0 rounded-[20px] bg-surface flex flex-col items-center justify-center gap-4 overflow-hidden border-2 border-border"
            >
              {playerError && (
                <p className="font-mono-cut text-error text-center px-5" style={{ fontSize: 9 }}>
                  {playerError}
                </p>
              )}

              {hasPlayer ? (
                <>
                  <PlayDisc
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    progress={progress}
                    hookDuration={hookDuration}
                    provider={provider}
                    primary={primary}
                    onPrimary={onPrimary}
                    onPlay={onPlay!}
                    onStop={onStop!}
                    reduced={prefersReduced}
                  />

                  {/* Waveform — static when idle, animated when playing */}
                  <motion.div
                    className="w-full px-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <CutWaveform
                      progress={progress}
                      height={28}
                      color={primary}
                      isPlaying={isPlaying && !isLoading}
                    />
                  </motion.div>

                  {/* Hint text — fades out when playing */}
                  <AnimatePresence>
                    {!isPlaying && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-mono-cut absolute bottom-4"
                        style={{ fontSize: 9, color: 'color-mix(in srgb, var(--cut-ink) 30%, transparent)' }}
                      >
                        escucha · ubica el año
                      </motion.p>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <span
                  className="font-display leading-none"
                  style={{ fontSize: 80, color: 'color-mix(in srgb, var(--cut-ink) 10%, transparent)' }}
                >
                  ?
                </span>
              )}
            </motion.div>
          ) : (
            /* Revealed face — signal color */
            <motion.div
              key="revealed"
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: prefersReduced ? 0.01 : 0.3, ease: 'easeOut' }}
              className="absolute inset-0 rounded-[20px] bg-song-primary border-2 border-song-primary flex flex-col justify-end overflow-hidden"
            >
              {thumbnailUrl && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `url(${thumbnailUrl}) center/cover no-repeat`,
                    opacity: 0.18,
                  }}
                />
              )}
              <div className="relative px-5.5 py-6 flex flex-col gap-3">
                {song && (
                  <>
                    <div>
                      <p className="font-mono-cut text-song-on-primary mb-0.75" style={{ fontSize: 9, opacity: 0.5 }}>año</p>
                      <p
                        className="font-display text-song-on-primary"
                        style={{ fontSize: 52, letterSpacing: -3, lineHeight: 0.9 }}
                      >
                        {song.year}.
                      </p>
                    </div>
                    <div>
                      <p className="font-mono-cut text-song-on-primary mb-0.75" style={{ fontSize: 9, opacity: 0.5 }}>artista</p>
                      <p
                        className="font-serif-accent text-song-on-primary"
                        style={{ fontSize: 20, lineHeight: 1.1 }}
                      >
                        {song.artist}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono-cut text-song-on-primary mb-0.75" style={{ fontSize: 9, opacity: 0.5 }}>canción</p>
                      <p
                        className="font-display text-song-on-primary overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{ fontSize: 20, letterSpacing: -0.5 }}
                      >
                        {song.title}.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
