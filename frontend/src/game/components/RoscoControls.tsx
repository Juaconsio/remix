import { useState } from 'react';
import type { Award, RoomPlayer, RoscoCell, RoscoSubMode } from '../../types/socket';
import { cn } from '../../utils/cn';

interface RoscoControlsProps {
  subMode: RoscoSubMode;
  cell: RoscoCell;
  players: RoomPlayer[];
  onAward: (playerId: string, award: Award) => void;
  onSkip: () => void;
  onCorrect: (award: Award) => void;
  onWrong: () => void;
  onPass: () => void;
}

const TRIO = 'btn btn-success px-1 text-[17px]';

function AwardButtons({ cell, disabled, onPick }: { cell: RoscoCell; disabled?: boolean; onPick: (award: Award) => void }) {
  if (cell.acceptTitle && cell.acceptArtist) {
    return (
      <div className="grid grid-cols-3 gap-2">
        <button className={TRIO} disabled={disabled} onClick={() => onPick({ title: true, artist: false })}>título +1</button>
        <button className={TRIO} disabled={disabled} onClick={() => onPick({ title: false, artist: true })}>artista +1</button>
        <button className={TRIO} disabled={disabled} onClick={() => onPick({ title: true, artist: true })}>ambos +2</button>
      </div>
    );
  }
  return (
    <button className="btn btn-success" disabled={disabled} onClick={() => onPick({ title: cell.acceptTitle, artist: cell.acceptArtist })}>
      acierto +1
    </button>
  );
}

export function RoscoControls({ subMode, cell, players, onAward, onSkip, onCorrect, onWrong, onPass }: RoscoControlsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [answerShown, setAnswerShown] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => setAnswerShown((shown) => !shown)} className="btn btn-tone btn-small" aria-pressed={answerShown}>
        {answerShown && cell.song ? `${cell.song.title} · ${cell.song.artist}` : 'ver respuesta'}
      </button>

      {subMode === 'turnos' ? (
        <>
          <AwardButtons cell={cell} onPick={onCorrect} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onWrong} className="btn btn-signal">fallo.</button>
            <button onClick={onPass} className="btn btn-tone">pasapalabra.</button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="¿quién la acertó?">
            {players.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={selectedPlayerId === p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className={cn('btn btn-small grow px-4', selectedPlayerId === p.id ? 'btn-cream' : 'btn-tone')}
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
            className="btn btn-tone btn-small"
          >
            nadie · siguiente letra
          </button>
        </>
      )}
    </div>
  );
}
