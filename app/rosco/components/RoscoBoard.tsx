'use client';

import type { RoscoCell } from '../../types/rosco';

interface RoscoBoardProps {
  board: RoscoCell[];
  activeIndex: number;
}

function tileClasses(cell: RoscoCell, isActive: boolean): string {
  if (isActive) {
    return 'bg-accent/15 text-foreground ring-2 ring-accent scale-110 z-10';
  }
  switch (cell.status) {
    case 'correct':
      return 'bg-success text-black';
    case 'wrong':
      return 'bg-error/20 text-error border border-error';
    case 'passed':
      return 'bg-surface text-muted border border-dashed border-muted';
    default:
      return 'bg-surface text-muted border border-border';
  }
}

export function RoscoBoard({ board, activeIndex }: RoscoBoardProps) {
  const n = board.length;
  const radius = 43; // % del contenedor
  const active = activeIndex >= 0 ? board[activeIndex] : null;

  const correct = board.filter((c) => c.status === 'correct').length;

  return (
    <div className="relative mx-auto w-full max-w-[19rem] aspect-square">
      {board.map((cell, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        const isActive = i === activeIndex;
        return (
          <div
            key={`${cell.letter}-${i}`}
            className={`absolute flex items-center justify-center w-9 h-9 rounded-full text-sm font-black transition-all duration-200 ${tileClasses(
              cell,
              isActive
            )}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {cell.letter}
          </div>
        );
      })}

      {/* Centro: letra activa + progreso */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {active ? (
          <>
            <span className="text-xs uppercase tracking-widest text-muted">Letra</span>
            <span className="text-6xl font-black text-accent leading-none">
              {active.letter}
            </span>
          </>
        ) : (
          <span className="text-2xl font-black text-foreground">¡Fin!</span>
        )}
        <span className="mt-2 text-xs text-muted">
          {correct}/{n} acertadas
        </span>
      </div>
    </div>
  );
}
