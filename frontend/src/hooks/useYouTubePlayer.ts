import { useCallback, useEffect, useRef, useState } from 'react';
import { useYtPlayingStore } from '../store/ytPlayingStore';

interface YouTubePlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  error: string | null;
  errorCode: number | null;
}

export interface UseYouTubePlayerReturn extends YouTubePlayerState {
  containerRef: React.RefObject<HTMLDivElement | null>;
  play: (videoId: string, hookStart: number, hookDuration: number) => void;
  stop: () => void;
}

const YT_ERRORS: Record<number, string> = {
  2: 'Parámetro inválido en la URL',
  5: 'Error en el reproductor HTML5',
  100: 'Video no encontrado (eliminado o privado)',
  101: 'Embedding no permitido por el propietario',
  150: 'Embedding no permitido por el propietario',
};

// Singleton promise — la API se carga una sola vez por página
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

export function useYouTubePlayer(): UseYouTubePlayerReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setYtPlaying = useYtPlayingStore((s) => s.setPlaying);
  const playerRef = useRef<YT.Player | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Guardamos los parámetros del hook activo para iniciar timers cuando PLAYING dispare
  const pendingTimerRef = useRef<{ hookStart: number; hookDuration: number } | null>(null);
  // Play solicitado antes de que la API estuviera lista
  const pendingPlayRef = useRef<{ videoId: string; hookStart: number; hookDuration: number } | null>(null);
  // El browser bloqueó el autoplay — el player tiene el video listo, solo necesita playVideo() con gesto de usuario
  const autoplayBlockedRef = useRef(false);

  const [state, setState] = useState<YouTubePlayerState>({
    isPlaying: false,
    isLoading: false,
    progress: 0,
    error: null,
    errorCode: null,
  });

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
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

  const stop = useCallback(() => {
    clearTimers();
    autoplayBlockedRef.current = false;
    playerRef.current?.pauseVideo();
    setState({ isPlaying: false, isLoading: false, progress: 0, error: null, errorCode: null });
    setYtPlaying(false);
  }, [clearTimers, setYtPlaying]);

  // Crea el player YT apuntando al containerRef (iframe se inserta dentro del div)
  const createPlayer = useCallback((videoId: string, hookStart: number, hookDuration: number) => {
    if (!containerRef.current) {
      console.warn('[YouTube] contenedor no disponible');
      return;
    }

    // Destruir player anterior si existe
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // YT reemplaza el elemento que recibe; usamos un inner div para que React
    // siga controlando el outer containerRef sin conflictos de reconciliación.
    containerRef.current.innerHTML = '';
    const innerDiv = document.createElement('div');
    containerRef.current.appendChild(innerDiv);

    pendingTimerRef.current = { hookStart, hookDuration };
    console.log('[YouTube] Creando player →', { videoId, hookStart, hookDuration });

    playerRef.current = new window.YT.Player(innerDiv, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: {
        autoplay: 1,
        // mute=1 arranca muteado: el muted-autoplay siempre está permitido por el browser.
        // Desmutamos en onStateChange cuando el estado pasa a PLAYING.
        mute: 1,
        controls: 0,
        disablekb: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        start: hookStart,
        vq: 'tiny',
        origin: window.location.origin,
      },
      events: {
        onReady: (e) => {
          console.log('[YouTube] onReady — seekTo', hookStart);
          e.target.seekTo(hookStart, true);
          e.target.playVideo();
        },
        onStateChange: (e) => {
          const labels: Partial<Record<number, string>> = {
            [-1]: 'sin iniciar', 0: 'finalizado', 1: 'reproduciendo',
            2: 'pausado', 3: 'cargando (buffering)', 5: 'en cola',
          };
          console.log(`[YouTube] Estado: ${labels[e.data] ?? e.data} (${e.data})`);

          if (e.data === 1 /* PLAYING */) {
            // Desmuteamos aquí: el player ya está "activado" y el browser permite unmute sin gesto
            e.target.unMute();
            e.target.setVolume(100);
            setState((s) => ({ ...s, isLoading: false, isPlaying: true }));
            setYtPlaying(true);
            if (pendingTimerRef.current) {
              const { hookStart: hs, hookDuration: hd } = pendingTimerRef.current;
              pendingTimerRef.current = null;
              startTimers(hs, hd);
            }
          }
          if (e.data === 0 /* ENDED */) {
            clearTimers();
            setState((s) => ({ ...s, isPlaying: false, isLoading: false, progress: 100 }));
            setYtPlaying(false);
          }
        },
        onError: (e) => {
          const msg = YT_ERRORS[e.data] ?? `Error desconocido (código ${e.data})`;
          console.warn(`[YouTube] Error ${e.data}: ${msg}`);
          clearTimers();
          setState((s) => ({ ...s, isPlaying: false, isLoading: false, error: msg, errorCode: e.data }));
        },
        onAutoplayBlocked: () => {
          // El video está cargado pero el browser bloqueó el autoplay.
          // Marcamos el flag — en el siguiente click del usuario llamamos playVideo() síncronamente
          // dentro del gesto, lo que sí está permitido.
          console.warn('[YouTube] Autoplay bloqueado — esperando gesto de usuario para reanudar');
          clearTimers();
          autoplayBlockedRef.current = true;
          setState((s) => ({ ...s, isPlaying: false, isLoading: false }));
          setYtPlaying(false);
        },
      },
    });

    setState({ isPlaying: false, isLoading: true, progress: 0, error: null, errorCode: null });
  }, [clearTimers, startTimers]);

  const play = useCallback((videoId: string, hookStart: number, hookDuration: number) => {
    // Evitar llamadas múltiples mientras ya está cargando o reproduciendo
    if (state.isLoading || state.isPlaying) return;

    clearTimers();
    console.log('[YouTube] play →', { videoId, hookStart, hookDuration });

    if (!window.YT?.Player) {
      pendingPlayRef.current = { videoId, hookStart, hookDuration };
      loadYTApi();
      return;
    }

    if (!playerRef.current) {
      createPlayer(videoId, hookStart, hookDuration);
      return;
    }

    // El autoplay fue bloqueado — el video ya está cargado, playVideo() dentro del gesto lo desbloquea
    if (autoplayBlockedRef.current) {
      autoplayBlockedRef.current = false;
      pendingTimerRef.current = { hookStart, hookDuration };
      console.log('[YouTube] retry tras autoplay bloqueado → playVideo()');
      playerRef.current.seekTo(hookStart, true);
      playerRef.current.playVideo();
      setState({ isPlaying: false, isLoading: true, progress: 0, error: null, errorCode: null });
      return;
    }

    // Player ya existe — cargar nuevo video directamente
    pendingTimerRef.current = { hookStart, hookDuration };
    console.log('[YouTube] loadVideoById →', { videoId, hookStart });
    playerRef.current.loadVideoById({ videoId, startSeconds: hookStart });
    setState({ isPlaying: false, isLoading: true, progress: 0, error: null, errorCode: null });
  }, [state.isLoading, state.isPlaying, clearTimers, createPlayer]);

  // Cargar API al montar; manejar plays pendientes; destruir al desmontar
  useEffect(() => {
    loadYTApi().then(() => {
      console.log('[YouTube] IFrame API lista');
      if (pendingPlayRef.current) {
        const p = pendingPlayRef.current;
        pendingPlayRef.current = null;
        createPlayer(p.videoId, p.hookStart, p.hookDuration);
      }
    });

    return () => {
      clearTimers();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [clearTimers, createPlayer]);

  return { containerRef, ...state, play, stop };
}
