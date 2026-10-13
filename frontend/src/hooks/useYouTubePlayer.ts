import { useCallback, useEffect, useRef, useState } from 'react';
import { useYtPlayingStore } from '../store/ytPlayingStore';

interface YouTubePlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isBlocked: boolean;
  progress: number;
  error: string | null;
  errorCode: number | null;
}

export interface UseYouTubePlayerReturn extends YouTubePlayerState {
  containerRef: React.RefObject<HTMLDivElement | null>;
  play: (videoId: string, hookStart: number, hookDuration: number) => void;
  stop: () => void;
  unlock: (videoId: string) => void;
}

const YT_ERRORS: Record<number, string> = {
  2: 'Parámetro inválido en la URL',
  5: 'Error en el reproductor HTML5',
  100: 'Video no encontrado (eliminado o privado)',
  101: 'Embedding no permitido por el propietario',
  150: 'Embedding no permitido por el propietario',
};

const YT_ENDED = 0;
const YT_PLAYING = 1;

const PLAY_TIMEOUT_MS = 10_000;
const PLAY_TIMEOUT_ERROR = 'El audio no arrancó';

const IDLE: YouTubePlayerState = {
  isPlaying: false,
  isLoading: false,
  isBlocked: false,
  progress: 0,
  error: null,
  errorCode: null,
};

const LOADING: YouTubePlayerState = { ...IDLE, isLoading: true };

let ytApiPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

interface Hook {
  videoId: string;
  hookStart: number;
  hookDuration: number;
}

export function useYouTubePlayer(): UseYouTubePlayerReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setYtPlaying = useYtPlayingStore((s) => s.setPlaying);
  const playerRef = useRef<YT.Player | null>(null);
  const isReadyRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);

  const pendingTimerRef = useRef<{ hookStart: number; hookDuration: number } | null>(null);
  const queuedHookRef = useRef<Hook | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const isPrimingRef = useRef(false);

  const [state, setState] = useState<YouTubePlayerState>(IDLE);

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
  }, []);

  const startTimers = useCallback((hookStart: number, hookDuration: number) => {
    clearTimers();
    startTimeRef.current = Date.now();

    stopTimerRef.current = setTimeout(() => {
      clearTimers();
      playerRef.current?.pauseVideo();
      setState((s) => ({ ...s, isPlaying: false, progress: 100 }));
    }, hookDuration * 1000);

    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setState((s) => ({ ...s, progress: Math.min(100, (elapsed / hookDuration) * 100) }));
    }, 100);
  }, [clearTimers]);

  const failIfStillLoading = useCallback(() => {
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    playTimeoutRef.current = setTimeout(() => {
      console.warn('[YouTube] el video no empezó a sonar a tiempo');
      pendingTimerRef.current = null;
      setState((s) => (s.isLoading ? { ...s, isLoading: false, error: PLAY_TIMEOUT_ERROR } : s));
    }, PLAY_TIMEOUT_MS);
  }, []);

  const loadAndPlay = useCallback(({ videoId, hookStart, hookDuration }: Hook) => {
    const player = playerRef.current;
    if (!player || !isReadyRef.current) {
      queuedHookRef.current = { videoId, hookStart, hookDuration };
      return;
    }
    pendingTimerRef.current = { hookStart, hookDuration };
    player.unMute();
    if (loadedVideoIdRef.current === videoId) {
      player.seekTo(hookStart, true);
      player.playVideo();
    } else {
      loadedVideoIdRef.current = videoId;
      player.loadVideoById({ videoId, startSeconds: hookStart });
    }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    pendingTimerRef.current = null;
    queuedHookRef.current = null;
    playerRef.current?.pauseVideo();
    setState(IDLE);
    setYtPlaying(false);
  }, [clearTimers, setYtPlaying]);

  const play = useCallback((videoId: string, hookStart: number, hookDuration: number) => {
    if (state.isLoading || state.isPlaying) return;
    clearTimers();
    setState(LOADING);
    loadAndPlay({ videoId, hookStart, hookDuration });
    failIfStillLoading();
  }, [state.isLoading, state.isPlaying, clearTimers, loadAndPlay, failIfStillLoading]);

  const unlock = useCallback((videoId: string) => {
    const player = playerRef.current;
    if (!player || !isReadyRef.current) return;
    isPrimingRef.current = true;
    player.unMute();
    player.setVolume(100);
    loadedVideoIdRef.current = videoId;
    player.loadVideoById({ videoId, startSeconds: 0 });
  }, []);

  const createPlayer = useCallback(() => {
    if (!containerRef.current || playerRef.current) return;

    // YT reemplaza el elemento que recibe; usamos un inner div para que React
    // siga controlando el outer containerRef sin conflictos de reconciliación.
    containerRef.current.innerHTML = '';
    const innerDiv = document.createElement('div');
    containerRef.current.appendChild(innerDiv);

    playerRef.current = new window.YT.Player(innerDiv, {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        vq: 'tiny',
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          isReadyRef.current = true;
          const queued = queuedHookRef.current;
          queuedHookRef.current = null;
          if (queued) loadAndPlay(queued);
        },
        onStateChange: (e) => {
          if (e.data === YT_PLAYING && isPrimingRef.current) {
            isPrimingRef.current = false;
            e.target.pauseVideo();
            return;
          }
          if (e.data === YT_PLAYING) {
            e.target.unMute();
            e.target.setVolume(100);
            if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
            setState((s) => ({ ...s, isLoading: false, isBlocked: false, isPlaying: true }));
            setYtPlaying(true);
            if (pendingTimerRef.current) {
              const { hookStart, hookDuration } = pendingTimerRef.current;
              pendingTimerRef.current = null;
              startTimers(hookStart, hookDuration);
            }
          }
          if (e.data === YT_ENDED) {
            clearTimers();
            setState((s) => ({ ...s, isPlaying: false, isLoading: false, progress: 100 }));
            setYtPlaying(false);
          }
        },
        onError: (e) => {
          const msg = YT_ERRORS[e.data] ?? `Error desconocido (código ${e.data})`;
          console.warn(`[YouTube] Error ${e.data}: ${msg}`);
          isPrimingRef.current = false;
          clearTimers();
          setState((s) => ({ ...s, isPlaying: false, isLoading: false, error: msg, errorCode: e.data }));
        },
        onAutoplayBlocked: () => {
          console.warn('[YouTube] autoplay bloqueado: hace falta un toque para reproducir');
          isPrimingRef.current = false;
          clearTimers();
          setState((s) => ({ ...s, isPlaying: false, isLoading: false, isBlocked: true }));
          setYtPlaying(false);
        },
      },
    });
  }, [clearTimers, startTimers, setYtPlaying, loadAndPlay]);

  useEffect(() => {
    let cancelled = false;
    loadYTApi().then(() => { if (!cancelled) createPlayer(); });

    return () => {
      cancelled = true;
      clearTimers();
      playerRef.current?.destroy();
      playerRef.current = null;
      isReadyRef.current = false;
      loadedVideoIdRef.current = null;
    };
  }, [clearTimers, createPlayer]);

  return { containerRef, ...state, play, stop, unlock };
}
