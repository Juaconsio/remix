import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from '../types/socket';
import type { MusicProvider } from '../types/game';
import { useSocket } from './useSocket';
import { useAudio } from './useAudio';
import { useYouTubePlayer } from './useYouTubePlayer';

export interface UseGameAudioReturn {
  provider: MusicProvider;
  activeIsPlaying: boolean;
  activeProgress: number;
  hasListened: boolean;
  displayError: string | null;
  currentCardVideoId: string | undefined;
  missingYouTubeVideo: boolean;
  thumbnailUrl: string | undefined;
  ytContainerRef: React.RefObject<HTMLDivElement | null>;
  handlePlay: () => void;
  handleStop: () => void;
  ytPlayer: {
    isPlaying: boolean;
    isLoading: boolean;
    progress: number;
    error: string | null;
    stop: () => void;
  };
  audio: {
    isPlaying: boolean;
    isLoading: boolean;
    progress: number;
    error: string | null;
  };
}

export function useGameAudio(room: Room | null, myPlayerId: string | null): UseGameAudioReturn {
  const { skipCard, notifyAudioStarted, onAudioPlay } = useSocket();
  const { isPlaying, isLoading, progress, error, play, stop } = useAudio();
  const ytPlayer = useYouTubePlayer();

  const provider = room?.config.provider ?? 'deezer';
  const [providerError, setProviderError] = useState<string | null>(null);
  const ytMapRef = useRef<Record<string, string>>({});

  const currentPlayer = room ? room.players[room.currentPlayerIndex] : null;
  const isActivePlayer = currentPlayer?.id === myPlayerId;

  // Limpiar error al cambiar carta
  useEffect(() => { setProviderError(null); }, [room?.currentCard]);

  // Stop de audio al pasar a validating
  useEffect(() => {
    if (room?.status !== 'validating') return;
    const timer = setTimeout(() => {
      stop();
      ytPlayer.stop();
    }, 2500);
    return () => clearTimeout(timer);
  }, [room?.status, stop, ytPlayer]);

  // Fetch mapa YouTube cuando el provider es youtube
  useEffect(() => {
    if (provider !== 'youtube' || !room?.config.packId) return;
    const packId = room.config.packId;
    fetch(`/api/youtube/playlist-map?packId=${encodeURIComponent(packId)}`)
      .then((r) => r.json())
      .then((data: { map?: Record<string, string> }) => {
        if (data.map) ytMapRef.current = data.map;
      })
      .catch((err) => console.warn('[YT playlist-map] error:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, room?.config.packId]);

  // Audio sincronizado para jugadores no activos
  useEffect(() => {
    if (!room?.config.syncAudio) return;
    return onAudioPlay(({ trackId, provider: p, hookStart, hookDuration }) => {
      if (isActivePlayer) return;
      if (p === 'youtube') {
        ytPlayer.play(trackId, hookStart, hookDuration);
      } else {
        play(trackId, p, hookStart, hookDuration);
      }
    });
  }, [room?.config.syncAudio, onAudioPlay, play, ytPlayer, isActivePlayer]);

  // Auto-skip cuando el video no permite embedding en mobile (150/101)
  useEffect(() => {
    if (
      provider === 'youtube' &&
      (ytPlayer.errorCode === 150 || ytPlayer.errorCode === 101) &&
      isActivePlayer &&
      room?.status === 'round_active'
    ) {
      console.warn('[YouTube] Auto-skip por error de embedding:', ytPlayer.errorCode);
      skipCard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytPlayer.errorCode]);

  const handlePlay = useCallback(() => {
    if (!room?.currentCard || !isActivePlayer) return;
    setProviderError(null);
    const card = room.currentCard;

    if (provider === 'youtube') {
      const videoId = ytMapRef.current[card.id] ?? card.providerIds?.youtube;
      if (!videoId) {
        setProviderError('Esta canción no tiene vídeo de YouTube configurado');
        return;
      }
      ytPlayer.play(videoId, card.hookStart, card.hookDuration);
    } else {
      const trackId = provider === 'spotify'
        ? (card.providerIds?.spotify ?? String(card.deezerId))
        : String(card.deezerId);
      play(trackId, provider, card.hookStart, card.hookDuration);
    }

    if (room.config.syncAudio) notifyAudioStarted();
  }, [room, isActivePlayer, provider, ytPlayer, play, notifyAudioStarted]);

  const handleStop = useCallback(() => {
    stop();
    ytPlayer.stop();
  }, [stop, ytPlayer]);

  const currentCardVideoId = room?.currentCard
    ? (ytMapRef.current[room.currentCard.id] ?? room.currentCard.providerIds?.youtube)
    : undefined;

  const activeProgress = provider === 'youtube' ? ytPlayer.progress : progress;
  const activeIsPlaying = provider === 'youtube' ? (ytPlayer.isPlaying || ytPlayer.isLoading) : isPlaying;
  const displayError = providerError ?? (provider === 'youtube' ? ytPlayer.error : error);
  const missingYouTubeVideo = provider === 'youtube' && room?.status === 'round_active' && !currentCardVideoId;
  const thumbnailUrl = provider === 'youtube' && currentCardVideoId
    ? `https://img.youtube.com/vi/${currentCardVideoId}/mqdefault.jpg`
    : undefined;

  return {
    provider,
    activeIsPlaying,
    activeProgress,
    hasListened: activeProgress > 0,
    displayError,
    currentCardVideoId,
    missingYouTubeVideo,
    thumbnailUrl,
    ytContainerRef: ytPlayer.containerRef,
    handlePlay,
    handleStop,
    ytPlayer: {
      isPlaying: ytPlayer.isPlaying,
      isLoading: ytPlayer.isLoading,
      progress: ytPlayer.progress,
      error: ytPlayer.error,
      stop: ytPlayer.stop,
    },
    audio: { isPlaying, isLoading, progress, error },
  };
}
