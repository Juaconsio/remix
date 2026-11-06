import type { ReactNode } from 'react';
import type { RoscoCell } from '../../types/socket';
import { cn } from '../../utils/cn';

interface RoscoBoardProps {
  board: RoscoCell[];
  activeIndex: number;
  children?: ReactNode;
}

const TILE_BY_STATUS: Record<RoscoCell['status'], string> = {
  pending: 'border-2 border-cream/30 text-cream/70',
  active: 'border-2 border-cream/30 text-cream/70',
  passed: 'border-2 border-dashed border-cream/50 text-cream',
  correct: 'bg-success text-ground',
  wrong: 'bg-signal text-ground',
};

export function RoscoBoard({ board, activeIndex, children }: RoscoBoardProps) {
  const radiusPercent = 44;

  return (
    <div className="relative aspect-square w-[min(100cqw,100cqh,22rem)] [container-type:inline-size]">
      {board.map((cell, i) => {
        const angle = (i / board.length) * 2 * Math.PI - Math.PI / 2;
        const isActive = i === activeIndex;
        return (
          <div
            key={cell.letter}
            className={cn(
              'absolute flex items-center justify-center size-[10.5cqw] rounded-full font-display transition-all duration-200',
              isActive ? 'bg-cream text-ground outline-3 outline-offset-2 outline-cream' : TILE_BY_STATUS[cell.status],
            )}
            style={{
              left: `${50 + radiusPercent * Math.cos(angle)}%`,
              top: `${50 + radiusPercent * Math.sin(angle)}%`,
              transform: `translate(-50%, -50%) scale(${isActive ? 1.2 : 1})`,
              fontSize: 'max(12px, 5cqw)',
              fontWeight: 900,
              zIndex: isActive ? 10 : 1,
            }}
          >
            {cell.letter}
          </div>
        );
      })}

      <div className="absolute inset-[17%] grid place-items-center">{children}</div>
    </div>
  );
}
