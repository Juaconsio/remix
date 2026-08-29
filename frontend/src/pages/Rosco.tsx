import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameAudio } from '../hooks/useGameAudio';
import { AudioPlayer } from '../game/components/AudioPlayer';
import { YouTubePlayer } from '../game/components/YouTubePlayer';
import { RoscoBoard } from '../game/components/RoscoBoard';
import { RoscoControls } from '../game/components/RoscoControls';
import { SettingsTrigger } from '../game/components/SettingsTrigger';
import { boardFor, firstActiveIndex } from '../utils/rosco';
import { cn } from '../utils/cn';

export default function Rosco() {
  const navigate = useNavigate();
  const {
    room,
    myPlayerId,
    roscoAward,
    roscoSkip,
    roscoCorrect,
    roscoWrong,
    roscoPass,
  } = useSocket();

  const isHost = !!room && room.hostId === myPlayerId;
  const board = room ? boardFor(room) : null;
  const activeIndex = board ? firstActiveIndex(board) : -1;
  const activeCell = board && activeIndex >= 0 ? board[activeIndex] : null;
  const letterKey = `${room?.currentPlayerIndex}-${activeCell?.letter}`;

  const { provider, activePlayer, displayError, ytContainerRef } = useGameAudio(room, {
    card: activeCell?.song ?? null,
    canPlay: isHost,
  });

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'lobby') navigate(`/lobby/${room.code}`);
    if (room.status === 'finished') navigate(`/results/${room.code}`);
  }, [room, navigate]);

  const { stop } = activePlayer;
  // El rosco no pasa por 'validating', así que nada corta el audio entre letras.
  useEffect(() => { stop(); }, [letterKey, stop]);

  if (!room?.rosco || !board) return null;

  const { subMode } = room.rosco;
  const hookDuration = activeCell?.song?.hookDuration ?? 15;

  return (
    <main className="flex flex-col px-0 pt-10 pb-8 max-w-sm mx-auto bg-bg text-ink min-h-dvh">
      <div className="flex justify-end px-5 mb-4 -mt-4">
        <SettingsTrigger />
      </div>

      <div className="flex flex-wrap gap-2 justify-center px-5 mb-2">
        {room.players.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full',
              subMode === 'turnos' && i === room.currentPlayerIndex ? 'bg-tint' : '',
            )}
            style={{
              border:
                subMode === 'turnos' && i === room.currentPlayerIndex
                  ? '2.5px solid var(--cut-ink)'
                  : '1.5px solid var(--cut-border)',
              opacity: p.connected ? 1 : 0.4,
            }}
          >
            <span className="font-display text-ink" style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 13 }}>
              {p.name}
            </span>
            <span className="font-display" style={{ fontSize: 15, color: 'var(--color-accent)' }}>
              {p.score}
            </span>
          </div>
        ))}
      </div>

      <div className="px-5 pt-4">
        <RoscoBoard board={board} activeIndex={activeIndex} />
      </div>

      {isHost && activeCell && (
        provider === 'youtube' ? (
          <YouTubePlayer
            isPlaying={activePlayer.isPlaying}
            isLoading={activePlayer.isLoading}
            progress={activePlayer.progress}
            hookDuration={hookDuration}
            error={displayError}
            onPlay={activePlayer.play}
            onStop={activePlayer.stop}
          />
        ) : (
          <AudioPlayer
            isPlaying={activePlayer.isPlaying}
            isLoading={activePlayer.isLoading}
            progress={activePlayer.progress}
            error={displayError}
            onPlay={activePlayer.play}
            onStop={activePlayer.stop}
          />
        )
      )}

      {isHost && activeCell ? (
        <RoscoControls
          subMode={subMode}
          cell={activeCell}
          players={room.players}
          currentPlayerIndex={room.currentPlayerIndex}
          onAward={roscoAward}
          onSkip={roscoSkip}
          onCorrect={roscoCorrect}
          onWrong={roscoWrong}
          onPass={roscoPass}
        />
      ) : (
        <p className="font-mono-cut text-muted text-center px-5 mt-6" style={{ fontSize: 11, opacity: 0.5 }}>
          {subMode === 'turnos' && room.players[room.currentPlayerIndex]?.id === myPlayerId
            ? 'es tu turno: responde en voz alta.'
            : 'escucha y responde en voz alta.'}
        </p>
      )}

      {/* YouTube iframe — always off-screen, never display:none */}
      <div
        ref={ytContainerRef}
        className="fixed pointer-events-none opacity-0"
        style={{
          width: '200px',
          height: '200px',
          transform: 'translate(-9999px, -9999px)',
        }}
      />
    </main>
  );
}
