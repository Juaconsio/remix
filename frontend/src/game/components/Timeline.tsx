import { useRef } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import type { Song } from '../../types/game';
import type { SongSignal } from '../../utils/songColor';
import { cn } from '../../utils/cn';

interface TimelineProps {
  timeline: Song[];
  selectedPosition: number | null;
  onSelectPosition: (pos: number) => void;
  canInteract: boolean;
  signal?: SongSignal;
}

export function Timeline({
  timeline,
  selectedPosition,
  onSelectPosition,
  canInteract,
  signal,
}: TimelineProps) {
  const slots      = timeline.length + 1;
  const primary    = signal?.primary    ?? '#ff5722';
  const onPrimary  = signal?.onPrimary  ?? '#fff4ed';
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [chipsRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <div
      className="px-5 pb-3"
      style={{ '--song-primary': primary, '--song-on-primary': onPrimary } as React.CSSProperties}
    >
      <p
        className="font-mono-cut mb-2.5 text-song-on-primary/50 dark:text-ink/50"
        style={{ fontSize: 10 }}
      >
        línea de tiempo
      </p>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-visible pb-2"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div ref={chipsRef} className="flex items-center gap-1.5 min-w-max">
          {Array.from({ length: slots }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {/* Drop slot */}
              <button
                onClick={() => canInteract && onSelectPosition(i)}
                disabled={!canInteract}
                className={cn(
                  'px-3 py-2 rounded-[14px] shrink-0 min-w-11 flex items-center justify-center gap-1 transition-[border-color,background] duration-150',
                  selectedPosition === i
                    ? 'bg-song-primary text-song-on-primary border-2 border-song-primary'
                    : 'bg-transparent text-song-on-primary/50 dark:text-ink/50 border-[1.5px] border-dashed border-song-on-primary/40 dark:border-ink/40',
                )}
                style={{ cursor: canInteract ? 'pointer' : 'default' }}
              >
                <span className="font-mono-cut" style={{ fontSize: 10 }}>
                  {selectedPosition === i ? '✓' : '+'}
                </span>
              </button>

              {/* Song chip */}
              {i < timeline.length && (
                <div
                  className="px-3 py-2 rounded-[14px] shrink-0 min-w-17.5 text-center border-[1.5px] border-song-on-primary/40 dark:border-ink/40"
                >
                  <div
                    className="font-display text-song-on-primary dark:text-ink"
                    style={{ fontSize: 16, letterSpacing: -0.5 }}
                  >
                    '{String(timeline[i].year).slice(-2)}
                  </div>
                  <div
                    className="font-mono-cut text-song-on-primary/60 dark:text-ink/60 mt-0.5 max-w-20 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ fontSize: 8 }}
                  >
                    {timeline[i].title.slice(0, 10)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
