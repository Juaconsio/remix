import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameAudio } from '../hooks/useGameAudio';
import { PlayerHeader } from '../game/components/PlayerHeader';
import { CardSlot } from '../game/components/CardSlot';
import { Timeline } from '../game/components/Timeline';
import { RevealOverlay } from '../game/components/RevealOverlay';
import { getSongSignal, DEFAULT_SIGNAL } from '../utils/songColor';

export default function Game() {
  const navigate = useNavigate();
  const { room, myPlayerId, flipCard, selectPosition, placeCard, skipCard } = useSocket();
  const isActivePlayer = room?.players[room.currentPlayerIndex]?.id === myPlayerId;
  const {
    provider,
    activePlayer,
    hasListened,
    displayError,
    missingYouTubeVideo,
    thumbnailUrl,
    ytContainerRef,
  } = useGameAudio(room, { card: room?.currentCard ?? null, canPlay: isActivePlayer });

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'lobby') navigate(`/lobby/${room.code}`);
    if (room.status === 'finished') navigate(`/results/${room.code}`);
  }, [room, navigate]);

  if (!room) return null;

  const currentPlayer = room.players[room.currentPlayerIndex] ?? null;
  const myPlayer      = room.players.find((p) => p.id === myPlayerId) ?? null;

  if (!currentPlayer) return null;

  const isRevealed = room.status === 'validating';
  const canListen  = hasListened || !!displayError || missingYouTubeVideo;
  const canConfirm =
    room.status === 'round_active' &&
    room.selectedPosition !== null &&
    canListen &&
    isActivePlayer;

  const signal = room.currentCard
    ? getSongSignal(room.currentCard.year)
    : DEFAULT_SIGNAL;

  const { primary, onPrimary } = signal;

  const totalCards = 10;
  const roundNum   = room.players.reduce((max, p) => Math.max(max, p.timeline.length), 0) + 1;

  const playerProps = {
    isLoading:    activePlayer.isLoading,
    progress:     activePlayer.progress,
    hookDuration: room.currentCard?.hookDuration ?? 15,
    provider,
    playerError:  displayError,
    onPlay:       activePlayer.play,
    onStop:       activePlayer.stop,
  };

  return (
    <main
      className="relative min-h-dvh max-w-107.5 mx-auto overflow-hidden flex flex-col bg-song-primary dark:bg-bg"
      style={{
        '--song-primary': primary,
        '--song-on-primary': onPrimary,
      } as React.CSSProperties}
    >
      {/* Diagonal: transparent in light (bg is already vibrant), song-primary slash in dark */}
      <div
        className="absolute inset-0 pointer-events-none z-1 bg-transparent dark:bg-song-primary"
        style={{ clipPath: 'polygon(0 56%, 100% 42%, 100% 100%, 0 100%)' }}
      />

      {/* All content above the diagonal */}
      <div className="relative z-2 flex-1 flex flex-col">

        {/* Header */}
        <PlayerHeader
          player={currentPlayer}
          round={[roundNum, totalCards]}
          signal={signal}
        />

        {/* Turn label */}
        {room.status === 'round_active' && (
          <div className="px-5 pt-0.5 pb-2">
            {isActivePlayer ? (
              <p className="font-serif-accent text-song-on-primary dark:text-ink" style={{ fontSize: 22, lineHeight: 1.1 }}>
                ahora suena…
              </p>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full opacity-75 border-[1.5px] border-song-on-primary dark:border-ink">
                <span className="font-mono-cut text-song-on-primary dark:text-ink" style={{ fontSize: 10 }}>
                  turno de {currentPlayer.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Card */}
        {(room.status === 'round_active' || room.status === 'validating') && (
          <CardSlot
            song={room.currentCard}
            isRevealed={isRevealed}
            isPlaying={activePlayer.isPlaying}
            signal={signal}
            thumbnailUrl={isRevealed ? thumbnailUrl : undefined}
            {...(room.status === 'round_active' && isActivePlayer && !missingYouTubeVideo
              ? playerProps
              : {})}
          />
        )}

        <div className="flex-1" />

        {/* Timeline */}
        {room.status === 'round_active' && myPlayer && (
          <Timeline
            timeline={myPlayer.timeline}
            selectedPosition={room.selectedPosition}
            onSelectPosition={selectPosition}
            canInteract={isActivePlayer}
            signal={signal}
          />
        )}

        {/* CTAs — round active */}
        {room.status === 'round_active' && isActivePlayer && (
          <div className="flex flex-col gap-[10px] px-5 pb-8 pt-2">
            {missingYouTubeVideo || !!displayError ? (
              <button
                onClick={skipCard}
                className="btn-secondary btn-secondary-light dark:border-ink dark:text-ink"
              >
                saltar canción →
              </button>
            ) : (
              <button
                onClick={() => { activePlayer.stop(); placeCard(); }}
                disabled={!canConfirm}
                className="btn-game"
              >
                <span>
                  {!canListen
                    ? 'escucha la canción.'
                    : room.selectedPosition === null
                    ? 'elige posición.'
                    : 'confirmar.'}
                </span>
                <span>→</span>
              </button>
            )}
          </div>
        )}

        {/* CTA — setup */}
        {room.status === 'setup' && isActivePlayer && (
          <div className="px-5 pb-8 text-center">
            <button onClick={flipCard} className="btn-game">
              <span>sacar carta.</span>
              <span>→</span>
            </button>
          </div>
        )}

        {room.status === 'setup' && !isActivePlayer && (
          <div className="px-5 pb-8 pt-6 text-center">
            <p className="font-mono-cut text-song-on-primary dark:text-ink" style={{ fontSize: 11, opacity: 0.6 }}>
              esperando a {currentPlayer.name}…
            </p>
          </div>
        )}
      </div>

      {/* Full-screen reveal overlay */}
      <RevealOverlay
        song={room.currentCard}
        isVisible={isRevealed}
        result={room.validationResult}
        signal={signal}
      />

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
