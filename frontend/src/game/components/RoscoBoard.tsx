import type { RoscoCell } from '../../types/socket';

interface RoscoBoardProps {
  board: RoscoCell[];
  activeIndex: number;
}

function tileStyle(cell: RoscoCell, isActive: boolean): React.CSSProperties {
  if (isActive) {
    return {
      background: 'var(--color-accent)',
      color: '#fff4ed',
      boxShadow: '0 0 0 3px var(--cut-bg), 0 0 0 5px var(--color-accent)',
    };
  }
  switch (cell.status) {
    case 'correct':
      return { background: 'var(--color-success)', color: '#0e0e0e' };
    case 'wrong':
      return { background: 'var(--color-error)', color: '#fff4ed' };
    case 'passed':
      return { border: '1.5px dashed var(--cut-border)', color: 'var(--cut-muted)' };
    default:
      return { border: '1.5px solid var(--cut-border)', color: 'var(--cut-muted)' };
  }
}

export function RoscoBoard({ board, activeIndex }: RoscoBoardProps) {
  const radiusPercent = 43;
  const active = activeIndex >= 0 ? board[activeIndex] : null;
  const correct = board.filter((c) => c.status === 'correct').length;

  return (
    <div className="relative mx-auto w-full max-w-[19rem] aspect-square">
      {board.map((cell, i) => {
        const angle = (i / board.length) * 2 * Math.PI - Math.PI / 2;
        const isActive = i === activeIndex;
        return (
          <div
            key={cell.letter}
            className="absolute flex items-center justify-center w-9 h-9 rounded-full font-display transition-all duration-200"
            style={{
              left: `${50 + radiusPercent * Math.cos(angle)}%`,
              top: `${50 + radiusPercent * Math.sin(angle)}%`,
              transform: `translate(-50%, -50%) scale(${isActive ? 1.15 : 1})`,
              fontSize: 15,
              zIndex: isActive ? 10 : 1,
              ...tileStyle(cell, isActive),
            }}
          >
            {cell.letter}
          </div>
        );
      })}

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        {active ? (
          <>
            <span className="font-mono-cut text-muted" style={{ fontSize: 9, opacity: 0.5 }}>
              letra
            </span>
            <span className="font-display" style={{ fontSize: 72, lineHeight: 1, letterSpacing: -4, color: 'var(--color-accent)' }}>
              {active.letter}
            </span>
          </>
        ) : (
          <span className="font-display text-ink" style={{ fontSize: 32, letterSpacing: -1.5 }}>
            fin.
          </span>
        )}
        <span className="font-mono-cut text-muted mt-2" style={{ fontSize: 9, opacity: 0.5 }}>
          {correct}/{board.length} acertadas
        </span>
      </div>
    </div>
  );
}
