

import type { Song } from '../../types/game';

interface TimelineProps {
  timeline: Song[];
  selectedPosition: number | null;
  onSelectPosition: (pos: number) => void;
  canInteract: boolean;
}

export function Timeline({ timeline, selectedPosition, onSelectPosition, canInteract }: TimelineProps) {
  const slots = timeline.length + 1;

  return (
    <div className="px-5 pb-4">
      <p className="text-xs text-muted uppercase tracking-widest mb-3">Tu línea de tiempo</p>

      <div className="flex flex-col gap-1">
        {Array.from({ length: slots }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            {/* Drop slot */}
            <button
              onClick={() => canInteract && onSelectPosition(i)}
              disabled={!canInteract}
              className={`w-full py-2 rounded-lg border-2 border-dashed text-xs font-medium transition-colors ${
                selectedPosition === i
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-border hover:border-muted disabled:hover:border-border'
              }`}
            >
              {selectedPosition === i ? '✓ Aquí' : '+ colocar aquí'}
            </button>

            {/* Song card (if exists at this position) */}
            {i < timeline.length && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-border">
                <span className="text-accent font-black text-lg w-12 text-center shrink-0">
                  {timeline[i].year}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{timeline[i].title}</p>
                  <p className="text-muted text-xs truncate">{timeline[i].artist}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
