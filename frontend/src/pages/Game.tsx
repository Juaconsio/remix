import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameAudio } from '../hooks/useGameAudio';
import { PlayerHeader } from '../game/components/PlayerHeader';
import { CardSlot } from '../game/components/CardSlot';
import { AudioPlayer } from '../game/components/AudioPlayer';
import { YouTubePlayer } from '../game/components/YouTubePlayer';
import { Timeline } from '../game/components/Timeline';
import { ValidationFeedback } from '../game/components/ValidationFeedback';

export default function Game() {
  const navigate = useNavigate();
  const { room, myPlayerId, flipCard, selectPosition, placeCard, skipCard } = useSocket();
  const {
    provider,
    activeIsPlaying,
    hasListened,
    displayError,
    missingYouTubeVideo,
    thumbnailUrl,
    ytContainerRef,
    handlePlay,
    handleStop,
    ytPlayer,
    audio: audioState,
  } = useGameAudio(room, myPlayerId);

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'lobby') navigate(`/lobby/${room.code}`);
    if (room.status === 'finished') navigate(`/results/${room.code}`);
  }, [room, navigate]);

  if (!room) return null;

  const currentPlayer = room.players[room.currentPlayerIndex] ?? null;
  const myPlayer = room.players.find((p) => p.id === myPlayerId) ?? null;
  const isActivePlayer = currentPlayer?.id === myPlayerId;

  if (!currentPlayer) return null;

  const isRevealed = room.status === 'validating';
  const canConfirm =
    room.status === 'round_active' &&
    room.selectedPosition !== null &&
    hasListened &&
    isActivePlayer;

  return (
    <main className="relative min-h-screen flex flex-col bg-background max-w-sm mx-auto">
      <PlayerHeader player={currentPlayer} />

      {!isActivePlayer && room.status === 'round_active' && (
        <div className="px-5 py-2 bg-surface border-b border-border text-center text-sm text-muted">
          Turno de <span className="text-foreground font-semibold">{currentPlayer.name}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-6">

        {(room.status === 'round_active' || room.status === 'validating') && (
          <CardSlot
            song={room.currentCard}
            isRevealed={isRevealed}
            isPlaying={activeIsPlaying}
            thumbnailUrl={isRevealed ? thumbnailUrl : undefined}
          />
        )}

        {/* IFrame de YouTube siempre oculto: mostrar el vídeo revelaría la canción */}
        <div
          ref={ytContainerRef}
          style={{ position: 'fixed', width: '200px', height: '200px', transform: 'translate(-9999px, -9999px)', pointerEvents: 'none', opacity: 0 }}
        />

        {room.status === 'round_active' && (
          provider === 'youtube' ? (
            <YouTubePlayer
              isPlaying={ytPlayer.isPlaying}
              isLoading={ytPlayer.isLoading}
              progress={ytPlayer.progress}
              hookDuration={room.currentCard?.hookDuration ?? 15}
              error={displayError}
              onPlay={handlePlay}
              onStop={ytPlayer.stop}
            />
          ) : (
            <AudioPlayer
              isPlaying={audioState.isPlaying}
              isLoading={audioState.isLoading}
              progress={audioState.progress}
              error={displayError}
              onPlay={handlePlay}
              onStop={handleStop}
            />
          )
        )}

        <ValidationFeedback result={room.validationResult} songYear={room.currentCard?.year} />

        {room.status === 'round_active' && myPlayer && (
          <Timeline
            timeline={myPlayer.timeline}
            selectedPosition={room.selectedPosition}
            onSelectPosition={selectPosition}
            canInteract={isActivePlayer}
          />
        )}

        {room.status === 'round_active' && isActivePlayer && (
          <div className="px-5 mt-2 flex flex-col gap-2">
            {missingYouTubeVideo || (provider === 'youtube' && !!ytPlayer.error) ? (
              <button
                onClick={skipCard}
                className="w-full py-4 rounded-2xl bg-surface border border-border text-foreground font-bold text-lg active:opacity-80"
              >
                Saltar canción
              </button>
            ) : (
              <button
                onClick={() => { handleStop(); placeCard(); }}
                disabled={!canConfirm}
                className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg disabled:opacity-30 transition-opacity active:opacity-80"
              >
                {!hasListened
                  ? 'Escucha la canción primero'
                  : room.selectedPosition === null
                  ? 'Elige una posición'
                  : 'Confirmar posición'}
              </button>
            )}
          </div>
        )}

        {room.status === 'setup' && isActivePlayer && (
          <div className="px-5 pt-12 flex flex-col items-center gap-4">
            <button
              onClick={flipCard}
              className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg active:opacity-80"
            >
              Sacar carta
            </button>
          </div>
        )}

        {room.status === 'setup' && !isActivePlayer && (
          <div className="px-5 pt-12 text-center text-muted text-sm">
            Esperando a que <span className="text-foreground font-semibold">{currentPlayer.name}</span> saque carta…
          </div>
        )}
      </div>
    </main>
  );
}
