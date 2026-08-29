import { useState } from 'react';
import type { Award, RoomPlayer, RoscoCell, RoscoSubMode } from '../../types/socket';
import { cn } from '../../utils/cn';

interface RoscoControlsProps {
  subMode: RoscoSubMode;
  cell: RoscoCell;
  players: RoomPlayer[];
  currentPlayerIndex: number;
  onAward: (playerId: string, award: Award) => void;
  onSkip: () => void;
  onCorrect: (award: Award) => void;
  onWrong: () => void;
  onPass: () => void;
}

function AwardButtons({
  cell,
  disabled,
  onPick,
}: {
  cell: RoscoCell;
  disabled?: boolean;
  onPick: (award: Award) => void;
}) {
  const className =
    'flex-1 py-3 rounded-[14px] font-display text-ink disabled:opacity-30 active:opacity-70 transition-opacity';
  const style = { background: 'var(--color-success)', color: '#0e0e0e', fontSize: 14, fontStyle: 'italic' as const, fontWeight: 700 };

  if (cell.acceptTitle && cell.acceptArtist) {
    return (
      <div className="flex gap-2">
        <button className={className} style={style} disabled={disabled} onClick={() => onPick({ title: true, artist: false })}>
          título
        </button>
        <button className={className} style={style} disabled={disabled} onClick={() => onPick({ title: false, artist: true })}>
          artista
        </button>
        <button className={className} style={style} disabled={disabled} onClick={() => onPick({ title: true, artist: true })}>
          ambos
        </button>
      </div>
    );
  }

  return (
    <button
      className={className}
      style={style}
      disabled={disabled}
      onClick={() => onPick({ title: cell.acceptTitle, artist: cell.acceptArtist })}
    >
      acierto
    </button>
  );
}

export function RoscoControls({
  subMode,
  cell,
  players,
  currentPlayerIndex,
  onAward,
  onSkip,
  onCorrect,
  onWrong,
  onPass,
}: RoscoControlsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  return (
    <div className="px-5 mt-4 flex flex-col gap-3">
      <div className="rounded-[14px] px-4 py-3 text-center bg-tint" style={{ border: '1.5px solid var(--cut-border)' }}>
        <p className="font-mono-cut text-muted mb-1" style={{ fontSize: 9, opacity: 0.5 }}>
          respuesta
        </p>
        <p className="font-display text-ink" style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>
          {cell.song?.title ?? '—'}
        </p>
        <p className="font-mono-cut text-muted" style={{ fontSize: 10 }}>
          {cell.song?.artist ?? ''}
        </p>
      </div>

      {subMode === 'turnos' ? (
        <>
          <p className="font-mono-cut text-muted text-center" style={{ fontSize: 10 }}>
            turno de {players[currentPlayerIndex]?.name}
          </p>
          <AwardButtons cell={cell} onPick={onCorrect} />
          <div className="flex gap-2">
            <button
              onClick={onWrong}
              className="flex-1 py-3 rounded-[14px] font-display active:opacity-70"
              style={{ background: 'var(--color-error)', color: '#fff4ed', fontSize: 14, fontStyle: 'italic', fontWeight: 700 }}
            >
              fallo
            </button>
            <button
              onClick={onPass}
              className="flex-1 py-3 rounded-[14px] font-display text-ink active:opacity-70"
              style={{ border: '1.5px solid var(--cut-border)', fontSize: 14, fontStyle: 'italic', fontWeight: 700 }}
            >
              pasapalabra
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-mono-cut text-muted text-center" style={{ fontSize: 10 }}>
            ¿quién la acertó?
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className={cn(
                  'px-3 py-2 rounded-full font-display text-ink transition-opacity',
                  selectedPlayerId === p.id ? 'bg-tint' : 'opacity-60',
                )}
                style={{
                  border: selectedPlayerId === p.id ? '2.5px solid var(--cut-ink)' : '1.5px solid var(--cut-border)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  fontWeight: 700,
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <AwardButtons
            cell={cell}
            disabled={!selectedPlayerId}
            onPick={(award) => {
              if (!selectedPlayerId) return;
              onAward(selectedPlayerId, award);
              setSelectedPlayerId(null);
            }}
          />
          <button
            onClick={() => {
              onSkip();
              setSelectedPlayerId(null);
            }}
            className="w-full py-3 rounded-[14px] font-display text-muted active:opacity-70"
            style={{ border: '1.5px solid var(--cut-border)', fontSize: 14, fontStyle: 'italic', fontWeight: 700 }}
          >
            nadie / saltar letra
          </button>
        </>
      )}
    </div>
  );
}
