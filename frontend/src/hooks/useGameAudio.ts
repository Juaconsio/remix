import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Room, ServerToClientEvents } from '../types/socket';
import type { ActivePlayerState, MusicProvider, Song } from '../types/game';
import { useSocket } from './useSocket';
import { useAudio } from './useAudio';
import { useYouTubePlayer } from './useYouTubePlayer';

export interface UseGameAudioReturn {
  provider: MusicProvider;
  activePlayer: ActivePlayerState;
  hasListened: boolean;
  displayError: string | null;
  currentCardVideoId: string | undefined;
  missingYouTubeVideo: boolean;
  thumbnailUrl: string | undefined;
  ytContainerRef: React.RefObject<HTMLDivElement | null>;
  needsAudioUnlock: boolean;
  unlockAudio: () => void;
  syncFailed: boolean;
  retrySync: () => void;
}

type SyncedHook = Parameters<ServerToClientEvents['game:audio:play']>[0];

function anyYouTubeId(map: Record<string, string>, room: Room | null): string | undefined {
  return Object.values(map)[0]
    ?? room?.players.flatMap((p) => p.timeline).find((s) => s.providerIds?.youtube)?.providerIds?.youtube;
}

export interface UseGameAudioOptions {
  card: Song | null;
  canPlay: boolean;
}

export function useGameAudio(
  room: Room | null,
  { card, canPlay }: UseGameAudioOptions,
): UseGameAudioReturn {
  const { skipCard, notifyAudioStarted, onAudioPlay } = useSocket();
  const { isPlaying, isLoading, progress, error, play, stop } = useAudio();
  const ytPlayer = useYouTubePlayer();

  const provider = room?.config.provider ?? 'youtube';
  const [providerError, setProviderError] = useState<string | null>(null);
  const ytMapRef = useRef<Record<string, string>>({});
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [lastSync, setLastSync] = useState<SyncedHook | null>(null);

  useEffect(() => {
    setProviderError(null);
    setLastSync(null);
  }, [card]);

  // Stop de audio al pasar a validating
  useEffect(() => {
    if (room?.status !== 'validating') return;
    const timer = setTimeout(() => {
      stop();
      ytPlayer.stop();
    }, 2500);
    return () => clearTimeout(timer);
  }, [room?.status, stop, ytPlayer]);

  const songPackId = room?.config.mode === 'rosco' ? room.config.roscoPackId : room?.config.packId;
  useEffect(() => {
    if (provider !== 'youtube' || !songPackId) return;
    fetch(`/api/youtube/playlist-map?packId=${encodeURIComponent(songPackId)}`)
      .then((r) => r.json())
      .then((data: { map?: Record<string, string> }) => {
        if (data.map) ytMapRef.current = data.map;
      })
      .catch((err) => console.warn('[YT playlist-map] error:', err));
  }, [provider, songPackId]);

  const playSynced = useCallback(({ trackId, provider: p, hookStart, hookDuration }: SyncedHook) => {
    if (p === 'youtube') {
      const videoId = trackId || (card ? ytMapRef.current[card.id] : undefined);
      if (videoId) ytPlayer.play(videoId, hookStart, hookDuration);
    } else {
      play(trackId, p, hookStart, hookDuration);
    }
  }, [card, ytPlayer, play]);

  useEffect(() => {
    if (!room?.config.syncAudio) return;
    return onAudioPlay((hook) => {
      if (canPlay) return;
      setLastSync(hook);
      playSynced(hook);
    });
  }, [room?.config.syncAudio, onAudioPlay, canPlay, playSynced]);

  const retrySync = useCallback(() => {
    if (lastSync) playSynced(lastSync);
  }, [lastSync, playSynced]);

  const unlockAudio = useCallback(() => {
    const videoId = anyYouTubeId(ytMapRef.current, room);
    if (provider === 'youtube' && videoId) ytPlayer.unlock(videoId);
    setAudioUnlocked(true);
  }, [provider, room, ytPlayer]);

  // Auto-skip cuando el video no permite embedding en mobile (150/101)
  useEffect(() => {
    if (
      provider === 'youtube' &&
      (ytPlayer.errorCode === 150 || ytPlayer.errorCode === 101) &&
      canPlay &&
      room?.config.mode !== 'rosco' &&
      room?.status === 'round_active'
    ) {
      console.warn('[YouTube] Auto-skip por error de embedding:', ytPlayer.errorCode);
      skipCard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytPlayer.errorCode]);

  const handlePlay = useCallback(() => {
    if (!card || !canPlay) return;
    setProviderError(null);

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

    if (room?.config.syncAudio) notifyAudioStarted();
  }, [room, card, canPlay, provider, ytPlayer, play, notifyAudioStarted]);

  const currentCardVideoId = card
    ? (ytMapRef.current[card.id] ?? card.providerIds?.youtube)
    : undefined;

  const displayError = providerError ?? (provider === 'youtube' ? ytPlayer.error : error);
  const missingYouTubeVideo = provider === 'youtube' && room?.status === 'round_active' && !currentCardVideoId;
  const thumbnailUrl = provider === 'youtube' && currentCardVideoId
    ? `https://img.youtube.com/vi/${currentCardVideoId}/mqdefault.jpg`
    : undefined;

  const activePlayer = useMemo((): ActivePlayerState => {
    const isYT = provider === 'youtube';
    return {
      isLoading: isYT ? ytPlayer.isLoading : isLoading,
      isPlaying: isYT ? (ytPlayer.isPlaying || ytPlayer.isLoading) : isPlaying,
      progress:  isYT ? ytPlayer.progress : progress,
      error:     providerError ?? (isYT ? ytPlayer.error : error),
      play:      handlePlay,
      stop:      isYT ? ytPlayer.stop : stop,
    };
  }, [provider, ytPlayer, isLoading, isPlaying, progress, error, providerError, handlePlay, stop]);

  return {
    provider,
    activePlayer,
    hasListened: activePlayer.progress > 0,
    displayError,
    currentCardVideoId,
    missingYouTubeVideo,
    thumbnailUrl,
    ytContainerRef: ytPlayer.containerRef,
    needsAudioUnlock: !!room?.config.syncAudio && !audioUnlocked,
    unlockAudio,
    syncFailed: !canPlay && !!lastSync && provider === 'youtube' && (ytPlayer.isBlocked || !!ytPlayer.error),
    retrySync,
  };
}
