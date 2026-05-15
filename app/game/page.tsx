'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../store/gameStore';
import { useProviderStore } from '../store/providerStore';
import { useAudio } from '../hooks/useAudio';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { PlayerHeader } from './components/PlayerHeader';
import { CardSlot } from './components/CardSlot';
import { AudioPlayer } from './components/AudioPlayer';
import { YouTubePlayer } from './components/YouTubePlayer';
import { Timeline } from './components/Timeline';
import { ValidationFeedback } from './components/ValidationFeedback';

export default function GameScreen() {
  const router = useRouter();
  const {
    status,
    players,
    currentPlayerIndex,
    currentCard,
    selectedPosition,
    validationResult,
    flipCard,
    selectPosition,
    placeCard,
    nextTurn,
  } = useGameStore();

  const provider = useProviderStore((s) => s.provider);
  const { isPlaying, isLoading, progress, error, play, stop } = useAudio();
  const ytPlayer = useYouTubePlayer();
  const [providerError, setProviderError] = useState<string | null>(null);
  const nextTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPlayer = players[currentPlayerIndex] ?? null;

  useEffect(() => {
    if (status === 'idle') router.replace('/');
    if (status === 'finished') router.replace('/results');
  }, [status, router]);

  // Auto-avance tras validación
  useEffect(() => {
    if (status === 'validating') {
      nextTurnTimerRef.current = setTimeout(() => {
        stop();
        ytPlayer.stop();
        nextTurn();
      }, 2500);
    }
    return () => {
      if (nextTurnTimerRef.current) clearTimeout(nextTurnTimerRef.current);
    };
  }, [status, nextTurn, stop, ytPlayer]);

  // Limpiar error de proveedor al cambiar de carta
  useEffect(() => {
    setProviderError(null);
  }, [currentCard]);

  function handlePlay() {
    if (!currentCard) return;
    setProviderError(null);

    if (provider === 'youtube') {
      const videoId = currentCard.providerIds?.youtube;
      if (!videoId) {
        setProviderError('Esta canción no tiene vídeo de YouTube configurado');
        return;
      }
      ytPlayer.play(videoId, currentCard.hookStart, currentCard.hookDuration);
    } else {
      const trackId =
        provider === 'spotify'
          ? currentCard.providerIds?.spotify ?? String(currentCard.deezerId)
          : String(currentCard.deezerId);
      play(trackId, provider, currentCard.hookStart, currentCard.hookDuration);
    }
  }

  function handleConfirm() {
    if (selectedPosition === null || !currentCard) return;
    stop();
    ytPlayer.stop();
    placeCard(selectedPosition);
  }

  if (!currentPlayer) return null;

  const isRevealed = status === 'validating';
  const activeProgress = provider === 'youtube' ? ytPlayer.progress : progress;
  const activeIsPlaying = provider === 'youtube' ? ytPlayer.isPlaying : isPlaying;
  const hasListened = activeProgress > 0;
  const canConfirm = status === 'round_active' && selectedPosition !== null && hasListened;
  const displayError = providerError ?? (provider === 'youtube' ? ytPlayer.error : error);

  return (
    <main className="min-h-screen flex flex-col bg-background max-w-sm mx-auto">
      <PlayerHeader player={currentPlayer} />

      <div className="flex-1 overflow-y-auto pb-6">

        {/* Carta central */}
        {(status === 'round_active' || status === 'validating') && (
          <CardSlot
            song={currentCard}
            isRevealed={isRevealed}
            isPlaying={activeIsPlaying}
          />
        )}

        {/* Controles de audio */}
        {status === 'round_active' && (
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

        {/* Feedback de validación */}
        <ValidationFeedback result={validationResult} songYear={currentCard?.year} />

        {/* Timeline */}
        {status === 'round_active' && (
          <Timeline
            timeline={currentPlayer.timeline}
            selectedPosition={selectedPosition}
            onSelectPosition={selectPosition}
            canInteract
          />
        )}

        {/* Confirmar posición */}
        {status === 'round_active' && (
          <div className="px-5 mt-2">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg disabled:opacity-30 transition-opacity active:opacity-80"
            >
              {!hasListened
                ? 'Escucha la canción primero'
                : selectedPosition === null
                ? 'Elige una posición'
                : 'Confirmar posición'}
            </button>
          </div>
        )}

        {/* Sacar carta */}
        {status === 'setup' && (
          <div className="px-5 pt-12 flex flex-col items-center gap-4">
            <p className="text-muted text-center text-sm">
              Pasa el teléfono a <span className="text-foreground font-semibold">{currentPlayer.name}</span>
            </p>
            <button
              onClick={flipCard}
              className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg active:opacity-80"
            >
              Sacar carta
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
