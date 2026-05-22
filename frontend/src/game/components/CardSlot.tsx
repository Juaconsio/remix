

import { motion } from 'framer-motion';
import type { Song } from '../../types/game';

interface CardSlotProps {
  song: Song | null;
  isRevealed: boolean;
  isPlaying: boolean;
  thumbnailUrl?: string;
}

export function CardSlot({ song, isRevealed, isPlaying, thumbnailUrl }: CardSlotProps) {
  return (
    <div className="flex justify-center px-5 py-6">
      <div
        className="relative w-full max-w-65 aspect-3/4"
        style={{ perspective: '1000px' }}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: isRevealed ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Cara oculta — boca abajo mientras escuchan */}
          <div
            className="absolute inset-0 rounded-3xl bg-surface border-2 border-border flex flex-col items-center justify-center gap-4"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {isPlaying ? (
              <div className="flex gap-1.5 items-end h-14">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2.5 rounded-full bg-accent"
                    animate={{ height: ['12px', '44px', '12px'] }}
                    transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.11 }}
                  />
                ))}
              </div>
            ) : (
              <span className="text-8xl font-black text-border select-none">?</span>
            )}
          </div>

          {/* Cara revelada — muestra info de la canción */}
          <div
            className="absolute inset-0 rounded-3xl bg-surface border-2 border-accent flex flex-col items-center justify-center gap-3 p-6 overflow-hidden"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {thumbnailUrl && (
              <div className="w-full rounded-xl overflow-hidden aspect-video mb-1">
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {song && (
              <>
                <p className="text-accent font-black text-6xl">{song.year}</p>
                <div className="h-px w-12 bg-border" />
                <p className="text-2xl font-black text-center leading-tight">{song.title}</p>
                <p className="text-muted text-base text-center">{song.artist}</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
