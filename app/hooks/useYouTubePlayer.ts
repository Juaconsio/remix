'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface YouTubePlayerState {
  isPlaying: boolean;
  progress: number;
  error: string | null;
  embedUrl: string | null;
}

interface UseYouTubePlayerReturn extends YouTubePlayerState {
  play: (videoId: string, hookStart: number, hookDuration: number) => void;
  stop: () => void;
}

export function useYouTubePlayer(): UseYouTubePlayerReturn {
  const [state, setState] = useState<YouTubePlayerState>({
    isPlaying: false,
    progress: 0,
    error: null,
    embedUrl: null,
  });

  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const durationRef = useRef(15);

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setState({ isPlaying: false, progress: 0, error: null, embedUrl: null });
  }, [clearTimers]);

  const play = useCallback(
    (videoId: string, hookStart: number, hookDuration: number) => {
      clearTimers();
      startTimeRef.current = Date.now();
      durationRef.current = hookDuration;

      const url =
        `https://www.youtube.com/embed/${videoId}` +
        `?autoplay=1&start=${hookStart}&end=${hookStart + hookDuration}` +
        `&rel=0&modestbranding=1`;

      setState({ isPlaying: true, progress: 0, error: null, embedUrl: url });

      stopTimerRef.current = setTimeout(() => {
        clearTimers();
        setState((s) => ({ ...s, isPlaying: false, progress: 100, embedUrl: null }));
      }, hookDuration * 1000);

      progressTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const pct = Math.min(100, (elapsed / hookDuration) * 100);
        setState((s) => ({ ...s, progress: pct }));
      }, 100);
    },
    [clearTimers]
  );

  useEffect(() => () => { clearTimers(); }, [clearTimers]);

  return { ...state, play, stop };
}
