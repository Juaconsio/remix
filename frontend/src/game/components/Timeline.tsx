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
  label?: string;
  takenPositions?: Record<number, string>;
}

export function Timeline({
  timeline,
  selectedPosition,
  onSelectPosition,
  canInteract,
  signal,
  label = 'línea de tiempo',
  takenPositions = {},
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
        style={{ fontSize: 11 }}
      >
        {label}
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
          {Array.from({ length: slots }).map((_, i) => {
            const takenBy = takenPositions[i];
            const isSelectable = canInteract && takenBy === undefined;
            return (
            <div key={i} className="flex items-center gap-1.5">
              <button
                onClick={() => isSelectable && onSelectPosition(i)}
                disabled={!isSelectable}
                className={cn(
                  'px-3 py-2 rounded-[14px] shrink-0 min-w-11 flex items-center justify-center gap-1 transition-[border-color,background,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] enabled:active:scale-95 motion-reduce:enabled:active:scale-100',
                  selectedPosition === i
                    ? 'bg-song-primary text-song-on-primary border-2 border-song-primary'
                    : takenBy !== undefined
                    ? 'bg-song-on-primary/15 dark:bg-ink/15 text-song-on-primary dark:text-ink border-[1.5px] border-song-on-primary/60 dark:border-ink/60'
                    : 'bg-transparent text-song-on-primary/50 dark:text-ink/50 border-[1.5px] border-dashed border-song-on-primary/40 dark:border-ink/40',
                )}
                style={{ cursor: isSelectable ? 'pointer' : 'default' }}
              >
                <span className="font-mono-cut" style={{ fontSize: 12 }}>
                  {selectedPosition === i ? '✓' : takenBy ?? '+'}
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
                    className="font-mono-cut text-song-on-primary/75 dark:text-ink/75 mt-0.5 max-w-24 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ fontSize: 10, letterSpacing: '0.04em' }}
                  >
                    {timeline[i].title}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
