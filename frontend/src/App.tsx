import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Results from './pages/Results';
import YtTest from './pages/YtTest';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lobby/:code" element={<Lobby />} />
      <Route path="/game/:code" element={<Game />} />
      <Route path="/results/:code" element={<Results />} />
      <Route path="/yt-test" element={<YtTest />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
