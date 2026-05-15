import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAudio } from '../hooks/useAudio';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { PlayerHeader } from '../game/components/PlayerHeader';
import { CardSlot } from '../game/components/CardSlot';
import { AudioPlayer } from '../game/components/AudioPlayer';
import { YouTubePlayer } from '../game/components/YouTubePlayer';
import { Timeline } from '../game/components/Timeline';
import { ValidationFeedback } from '../game/components/ValidationFeedback';

export default function Game() {
  const navigate = useNavigate();
  const { room, myPlayerId, flipCard, selectPosition, placeCard, notifyAudioStarted, onAudioPlay } = useSocket();

  const provider = room?.config.provider ?? 'deezer';
  const { isPlaying, isLoading, progress, error, play, stop } = useAudio();
  const ytPlayer = useYouTubePlayer();
  const [providerError, setProviderError] = useState<string | null>(null);
  const nextTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'lobby') navigate(`/lobby/${room.code}`);
    if (room.status === 'finished') navigate(`/results/${room.code}`);
  }, [room, navigate]);

  // Auto-avance tras validación (solo el servidor lo hace — aquí solo limpiamos audio)
  useEffect(() => {
    if (room?.status === 'validating') {
      nextTurnTimerRef.current = setTimeout(() => {
        stop();
        ytPlayer.stop();
      }, 2500);
    }
    return () => {
      if (nextTurnTimerRef.current) clearTimeout(nextTurnTimerRef.current);
    };
  }, [room?.status, stop, ytPlayer]);

  // Limpiar error al cambiar carta
  useEffect(() => { setProviderError(null); }, [room?.currentCard]);

  // Escuchar audio sincronizado (cuando syncAudio=true, el servidor ordena reproducir)
  useEffect(() => {
    if (!room?.config.syncAudio) return;
    return onAudioPlay(({ trackId, provider: p, hookStart, hookDuration }) => {
      if (isActivePlayer) return; // el activo ya lo lanzó él mismo
      if (p === 'youtube') {
        ytPlayer.play(trackId, hookStart, hookDuration);
      } else {
        play(trackId, p, hookStart, hookDuration);
      }
    });
  }, [room?.config.syncAudio, onAudioPlay, play, ytPlayer]);

  if (!room) return null;

  const currentPlayer = room.players[room.currentPlayerIndex] ?? null;
  const myPlayer = room.players.find((p) => p.id === myPlayerId) ?? null;
  const isActivePlayer = currentPlayer?.id === myPlayerId;

  function handlePlay() {
    if (!room?.currentCard || !isActivePlayer) return;
    setProviderError(null);
    const card = room.currentCard;

    if (provider === 'youtube') {
      const videoId = card.providerIds?.youtube;
      if (!videoId) { setProviderError('Esta canción no tiene vídeo de YouTube configurado'); return; }
      ytPlayer.play(videoId, card.hookStart, card.hookDuration);
    } else {
      const trackId = provider === 'spotify'
        ? (card.providerIds?.spotify ?? String(card.deezerId))
        : String(card.deezerId);
      play(trackId, provider, card.hookStart, card.hookDuration);
    }

    if (room.config.syncAudio) notifyAudioStarted();
  }

  function handleConfirm() {
    if (!isActivePlayer || room?.selectedPosition === null) return;
    stop();
    ytPlayer.stop();
    placeCard();
  }

  const activeProgress = provider === 'youtube' ? ytPlayer.progress : progress;
  const activeIsPlaying = provider === 'youtube' ? ytPlayer.isPlaying : isPlaying;
  const hasListened = activeProgress > 0;
  const canConfirm = room?.status === 'round_active' && room.selectedPosition !== null && hasListened && isActivePlayer;
  const displayError = providerError ?? (provider === 'youtube' ? ytPlayer.error : error);

  if (!currentPlayer) return null;

  const isRevealed = room.status === 'validating';

  return (
    <main className="min-h-screen flex flex-col bg-background max-w-sm mx-auto">
      <PlayerHeader player={currentPlayer} />

      {/* Banner para jugadores no activos */}
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
          />
        )}

        {room.status === 'round_active' && (
          provider === 'youtube' ? (
            <YouTubePlayer
              isPlaying={ytPlayer.isPlaying}
              progress={ytPlayer.progress}
              error={displayError}
              embedUrl={ytPlayer.embedUrl}
              onPlay={handlePlay}
              onStop={ytPlayer.stop}
            />
          ) : (
            <AudioPlayer
              isPlaying={isPlaying}
              isLoading={isLoading}
              progress={progress}
              error={displayError}
              onPlay={handlePlay}
              onStop={stop}
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
          <div className="px-5 mt-2">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg disabled:opacity-30 transition-opacity active:opacity-80"
            >
              {!hasListened
                ? 'Escucha la canción primero'
                : room.selectedPosition === null
                ? 'Elige una posición'
                : 'Confirmar posición'}
            </button>
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
