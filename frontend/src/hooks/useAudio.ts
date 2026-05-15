

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MusicProvider } from '../types/game';

interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

interface UseAudioReturn extends AudioState {
  play: (trackId: string, provider: Exclude<MusicProvider, 'youtube'>, hookStart: number, hookDuration: number) => Promise<void>;
  stop: () => void;
}

export function useAudio(): UseAudioReturn {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    progress: 0,
    error: null,
  });

  const howlRef = useRef<import('howler').Howl | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hookStartRef = useRef(0);
  const hookDurationRef = useRef(15);

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }
    setState((s) => ({ ...s, isPlaying: false, progress: 0 }));
  }, [clearTimers]);

  const play = useCallback(
    async (
      trackId: string,
      provider: Exclude<MusicProvider, 'youtube'>,
      hookStart: number,
      hookDuration: number
    ) => {
      stop();
      setState({ isPlaying: false, isLoading: true, progress: 0, error: null });

      const endpoint =
        provider === 'spotify'
          ? `/api/preview/spotify/${trackId}`
          : `/api/preview/deezer/${trackId}`;

      let previewUrl: string;
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('preview not found');
        const data = await res.json();
        if (!data.previewUrl) throw new Error('preview no disponible para esta canción');
        previewUrl = data.previewUrl;
      } catch (e) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: e instanceof Error ? e.message : 'No se pudo cargar el audio',
        }));
        return;
      }

      hookStartRef.current = hookStart;
      hookDurationRef.current = hookDuration;

      const { Howl } = await import('howler');
      const howl = new Howl({
        src: [previewUrl],
        html5: true,
        onload() {
          howl.seek(hookStart);
          howl.play();
          setState({ isPlaying: true, isLoading: false, progress: 0, error: null });

          stopTimerRef.current = setTimeout(() => {
            stop();
            setState((s) => ({ ...s, progress: 100 }));
          }, hookDuration * 1000);

          progressTimerRef.current = setInterval(() => {
            const elapsed = (howl.seek() as number) - hookStart;
            const pct = Math.min(100, (elapsed / hookDuration) * 100);
            setState((s) => ({ ...s, progress: pct }));
          }, 100);
        },
        onloaderror() {
          setState({ isPlaying: false, isLoading: false, progress: 0, error: 'Error cargando audio' });
        },
      });

      howlRef.current = howl;
    },
    [stop]
  );

  useEffect(() => () => { stop(); }, [stop]);

  return { ...state, play, stop };
}
