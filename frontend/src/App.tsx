import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Results from './pages/Results';
import YtTest from './pages/YtTest';

const Playground = lazy(() => import('./pages/Playground'));
import { useThemeStore } from './store/themeStore';
import { useYtPlayingStore } from './store/ytPlayingStore';
import { SettingsPanel } from './game/components/SettingsPanel';

const MEDIA_ACTIONS: MediaSessionAction[] = [
  'play', 'pause', 'stop', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack',
];

function MediaSessionSuppressor({ isPlaying }: { isPlaying: boolean }) {
  // One-time: register no-op handlers for all transport controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    MEDIA_ACTIONS.forEach((action) => {
      try { navigator.mediaSession.setActionHandler(action, () => {}); } catch {}
    });
  }, []);

  // Sync metadata and playbackState whenever isPlaying changes
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (isPlaying) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: '', artist: '', album: '', artwork: [],
      });
      navigator.mediaSession.playbackState = 'playing';
    } else {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }, [isPlaying]);

  return null;
}

function ThemeApplier() {
  const { override } = useThemeStore();
  useEffect(() => {
    function apply() {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const effectiveDark = override === 'dark' || (override === null && systemDark);
      document.documentElement.setAttribute('data-theme', effectiveDark ? 'dark' : 'light');
    }
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [override]);
  return null;
}

export default function App() {
  return (
    <>
      <ThemeApplier />
      <MediaSessionSuppressor isPlaying={useYtPlayingStore((s) => s.isPlaying)} />
      <SettingsPanel />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/game/:code" element={<Game />} />
        <Route path="/results/:code" element={<Results />} />
        <Route path="/yt-test" element={<YtTest />} />
        {import.meta.env.DEV && (
          <Route path="/playground" element={
            <Suspense fallback={null}>
              <Playground />
            </Suspense>
          } />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
