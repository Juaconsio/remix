'use client';

import { useState } from 'react';
import type { Player } from '../../types/game';
import type { RoscoCell, RoscoSubMode, Award } from '../../types/rosco';

interface HostControlsProps {
  subMode: RoscoSubMode;
  cell: RoscoCell;
  players: Player[];
  currentPlayerIndex: number;
  onAward: (playerId: string, award: Award) => void;
  onSkip: () => void;
  onCorrect: (award: Award) => void;
  onWrong: () => void;
  onPasapalabra: () => void;
}

/** Botones de acierto según qué acepta la letra (título y/o artista). */
function AwardButtons({
  cell,
  disabled,
  onPick,
}: {
  cell: RoscoCell;
  disabled?: boolean;
  onPick: (award: Award) => void;
}) {
  const both = cell.acceptTitle && cell.acceptArtist;
  const base =
    'flex-1 py-3 rounded-xl font-bold text-sm bg-success text-black disabled:opacity-30 active:opacity-80 transition-opacity';
  if (both) {
    return (
      <div className="flex gap-2">
        <button className={base} disabled={disabled} onClick={() => onPick({ title: true, artist: false })}>
          Título ✓
        </button>
        <button className={base} disabled={disabled} onClick={() => onPick({ title: false, artist: true })}>
          Artista ✓
        </button>
        <button className={base} disabled={disabled} onClick={() => onPick({ title: true, artist: true })}>
          Ambos ✓
        </button>
      </div>
    );
  }
  return (
    <button
      className={base}
      disabled={disabled}
      onClick={() => onPick({ title: cell.acceptTitle, artist: cell.acceptArtist })}
    >
      Acierto ✓
    </button>
  );
}

export function HostControls({
  subMode,
  cell,
  players,
  currentPlayerIndex,
  onAward,
  onSkip,
  onCorrect,
  onWrong,
  onPasapalabra,
}: HostControlsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  return (
    <div className="px-5 mt-4 flex flex-col gap-3">
      {/* Respuesta visible para el anfitrión */}
      <div className="rounded-xl bg-surface border border-border px-4 py-3 text-center">
        <p className="text-xs uppercase tracking-widest text-muted mb-1">Respuesta</p>
        <p className="font-bold text-foreground leading-tight">{cell.song.title}</p>
        <p className="text-sm text-muted">{cell.song.artist}</p>
      </div>

      {subMode === 'turnos' ? (
        <>
          <p className="text-center text-sm text-muted">
            Turno de{' '}
            <span className="text-foreground font-semibold">
              {players[currentPlayerIndex]?.name}
            </span>
          </p>
          <AwardButtons cell={cell} onPick={onCorrect} />
          <div className="flex gap-2">
            <button
              onClick={onWrong}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-error/20 text-error border border-error active:opacity-80"
            >
              Fallo ✗
            </button>
            <button
              onClick={onPasapalabra}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-surface border border-border text-foreground active:opacity-80"
            >
              Pasapalabra ↻
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-center text-xs text-muted">¿Quién lo acertó?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className={`px-3 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  selectedPlayerId === p.id
                    ? 'border-accent bg-accent/10 text-foreground'
                    : 'border-border text-muted'
                }`}
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
            className="w-full py-3 rounded-xl font-bold text-sm bg-surface border border-border text-muted active:opacity-80"
          >
            Nadie / Saltar letra
          </button>
        </>
      )}
    </div>
  );
}
