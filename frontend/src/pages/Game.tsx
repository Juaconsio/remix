import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameAudio } from '../hooks/useGameAudio';
import { PlayerHeader } from '../game/components/PlayerHeader';
import { CardSlot } from '../game/components/CardSlot';
import { Timeline } from '../game/components/Timeline';
import { RevealOverlay } from '../game/components/RevealOverlay';
import { PregameOverlay } from '../game/components/PregameOverlay';
import { getSongSignal, DEFAULT_SIGNAL } from '../utils/songColor';

const WIN_SCORE = 7; // espejo de WIN_SCORE en backend/src/rooms/roomManager.ts
const STEAL_WINDOW_S = 10; // espejo de STEAL_WINDOW_MS en backend/src/rooms/roomManager.ts

function useStealCountdown(isStealing: boolean): number {
  const [secondsLeft, setSecondsLeft] = useState(STEAL_WINDOW_S);
  useEffect(() => {
    if (!isStealing) return;
    setSecondsLeft(STEAL_WINDOW_S);
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [isStealing]);
  return secondsLeft;
}

export default function Game() {
  const navigate = useNavigate();
  const {
    room, myPlayerId, flipCard, selectPosition, placeCard, skipCard, nextTurn, confirmPregame, skipPregame,
    stealCard, passSteal, awardToken,
  } = useSocket();
  const isActivePlayer = room?.players[room.currentPlayerIndex]?.id === myPlayerId;
  const {
    provider,
    activePlayer,
    hasListened,
    displayError,
    missingYouTubeVideo,
    thumbnailUrl,
    ytContainerRef,
    needsAudioUnlock,
    unlockAudio,
    playSong,
    syncFailed,
    retrySync,
  } = useGameAudio(room, { card: room?.currentCard ?? null, canPlay: isActivePlayer });

  const isStealing = room?.status === 'stealing';
  const secondsLeft = useStealCountdown(isStealing);
  const [stealPosition, setStealPosition] = useState<number | null>(null);
  useEffect(() => { if (!isStealing) setStealPosition(null); }, [isStealing]);

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

  const myDecision = room.steals.find((s) => s.playerId === myPlayerId);
  const canSteal   = isStealing && !isActivePlayer && !!myPlayer && myPlayer.tokens > 0 && !myDecision;
  const canPaySkip = isActivePlayer && !!myPlayer && myPlayer.tokens > 0;

  const nameOf = (playerId: string | null) => room.players.find((p) => p.id === playerId)?.name ?? null;
  const initialOf = (playerId: string) => (nameOf(playerId) ?? '?').slice(0, 1).toUpperCase();
  const takenPositions: Record<number, string> = {};
  if (isStealing && room.selectedPosition !== null) {
    takenPositions[room.selectedPosition] = initialOf(currentPlayer.id);
    room.steals.forEach((s) => { if (s.position !== null) takenPositions[s.position] = initialOf(s.playerId); });
  }

  const signal = room.currentCard
    ? getSongSignal(room.currentCard.year)
    : DEFAULT_SIGNAL;

  const { primary, onPrimary } = signal;

  const isHost      = room.hostId === myPlayerId;
  const isLastTurn  = room.deck.length === 0 || room.players.some((p) => p.score >= WIN_SCORE);

  const drawAndPlay = () => {
    const nextCard = room.deck[0];
    flipCard();
    if (nextCard) playSong(nextCard);
  };

  const playerProps = {
    isLoading:    activePlayer.isLoading,
    progress:     activePlayer.progress,
    hookDuration: room.currentCard?.hookDuration ?? 15,
    provider,
    playerError:  displayError,
    onPlay:       activePlayer.play,
    onStop:       activePlayer.stop,
  };

  const showsOwnTimeline = room.status === 'round_active' && isActivePlayer;
  const showsTurnTimeline = (room.status === 'round_active' && !isActivePlayer) || isStealing;

  return (
    <main
      className="relative min-h-dvh max-w-107.5 mx-auto overflow-hidden flex flex-col bg-song-primary dark:bg-bg"
      style={{
        '--song-primary': primary,
        '--song-on-primary': onPrimary,
      } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 pointer-events-none z-1 bg-transparent dark:bg-song-primary"
        style={{ clipPath: 'polygon(0 56%, 100% 42%, 100% 100%, 0 100%)' }}
      />

      <div className="relative z-2 flex-1 flex flex-col">

        <PlayerHeader
          player={currentPlayer}
          cardsLeft={room.deck.length}
          signal={signal}
        />

        {room.status === 'round_active' && (
          <div className="px-5 pt-0.5 pb-2">
            {isActivePlayer ? (
              <p className="font-serif-accent text-song-on-primary dark:text-ink" style={{ fontSize: 22, lineHeight: 1.1 }}>
                ahora suena…
              </p>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full opacity-75 border-[1.5px] border-song-on-primary dark:border-ink">
                <span className="font-mono-cut text-song-on-primary dark:text-ink" style={{ fontSize: 11 }}>
                  turno de {currentPlayer.name}
                </span>
              </div>
            )}
          </div>
        )}

        {isStealing && (
          <div className="px-5 pt-0.5 pb-2">
            <p className="font-serif-accent text-song-on-primary dark:text-ink" style={{ fontSize: 22, lineHeight: 1.1 }}>
              {isActivePlayer ? '¿te la roban?' : canSteal ? '¿la robas?' : 'robando…'}
            </p>
            <p className="font-mono-cut text-song-on-primary/75 dark:text-ink/75 mt-1" style={{ fontSize: 11 }}>
              {secondsLeft}s
            </p>
          </div>
        )}

        {(room.status === 'round_active' || isStealing || room.status === 'validating') && (
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

        {showsOwnTimeline && myPlayer && (
          <Timeline
            timeline={myPlayer.timeline}
            selectedPosition={room.selectedPosition}
            onSelectPosition={selectPosition}
            canInteract
            signal={signal}
          />
        )}

        {showsTurnTimeline && (
          <Timeline
            timeline={currentPlayer.timeline}
            selectedPosition={isStealing ? stealPosition : room.selectedPosition}
            onSelectPosition={setStealPosition}
            canInteract={canSteal}
            signal={signal}
            label={`línea de ${currentPlayer.name}`}
            takenPositions={takenPositions}
          />
        )}

        {room.status === 'round_active' && isActivePlayer && (
          <div className="flex flex-col gap-[10px] px-5 pb-8 pt-2">
            {missingYouTubeVideo || !!displayError ? (
              <button
                onClick={() => skipCard(false)}
                className="btn-secondary btn-secondary-light dark:border-ink dark:text-ink"
              >
                saltar canción →
              </button>
            ) : (
              <>
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
                {canPaySkip && (
                  <button
                    onClick={() => { activePlayer.stop(); skipCard(true); }}
                    className="btn-secondary btn-secondary-light dark:border-ink dark:text-ink"
                  >
                    saltar · 1 ficha
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {room.status === 'round_active' && !isActivePlayer && syncFailed && (
          <div className="px-5 pb-8 pt-2">
            <button onClick={retrySync} className="btn-secondary btn-secondary-light dark:border-ink dark:text-ink">
              ¿no la escuchas? toca aquí
            </button>
          </div>
        )}

        {canSteal && (
          <div className="flex flex-col gap-[10px] px-5 pb-8 pt-2">
            <button
              onClick={() => { if (stealPosition !== null) stealCard(stealPosition); }}
              disabled={stealPosition === null}
              className="btn-game"
            >
              <span>{stealPosition === null ? 'elige dónde va.' : 'robar · 1 ficha'}</span>
              <span>→</span>
            </button>
            <button onClick={passSteal} className="btn-secondary btn-secondary-light dark:border-ink dark:text-ink">
              paso
            </button>
          </div>
        )}

        {isStealing && !canSteal && (
          <div className="px-5 pb-8 pt-2 text-center">
            <p className="font-mono-cut text-song-on-primary dark:text-ink" style={{ fontSize: 11, opacity: 0.6 }}>
              {isActivePlayer
                ? 'los demás deciden si roban…'
                : myDecision?.position != null
                ? 'robaste. a ver quién tenía razón…'
                : myPlayer && myPlayer.tokens === 0 && !myDecision
                ? 'sin fichas para robar.'
                : 'esperando al resto…'}
            </p>
          </div>
        )}

        {room.status === 'setup' && isActivePlayer && (
          <div className="px-5 pb-8 text-center">
            <button onClick={drawAndPlay} className="btn-game">
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

      <RevealOverlay
        song={room.currentCard}
        isVisible={isRevealed}
        result={room.validationResult}
        signal={signal}
        canAdvance={isActivePlayer || isHost}
        isLastTurn={isLastTurn}
        waitingFor={currentPlayer.name}
        onNext={nextTurn}
        stealWinnerName={nameOf(room.stealWinnerId)}
        tokenAward={isHost ? { playerName: currentPlayer.name, awarded: room.tokenAwarded, onAward: awardToken } : null}
      />

      <PregameOverlay
        players={room.players}
        readyIds={room.pregameReadyIds ?? null}
        myPlayerId={myPlayerId}
        isHost={isHost}
        needsUnlock={needsAudioUnlock}
        onReady={(songId) => { unlockAudio(); confirmPregame(songId); }}
        onSkip={skipPregame}
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
