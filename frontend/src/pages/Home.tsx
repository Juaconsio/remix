import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function Home() {
  const navigate = useNavigate();
  const { room, error, createRoom, joinRoom, updateConfig, startGame } = useSocket();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [devMode, setDevMode] = useState(false);

  // Flujo normal: ir al lobby
  useEffect(() => {
    if (!room || devMode) return;
    navigate(`/lobby/${room.code}`);
  }, [room, navigate, devMode]);

  // Dev mode: configurar provider youtube + arrancar partida sin lobby
  useEffect(() => {
    if (!room || !devMode) return;
    if (room.status === 'lobby') {
      updateConfig({ provider: 'youtube' });
      startGame();
    }
    if (room.status === 'setup') {
      navigate(`/game/${room.code}`);
    }
  }, [room, navigate, devMode, updateConfig, startGame]);

  function handleDevStart() {
    setDevMode(true);
    createRoom('Dev');
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) return;
    createRoom(playerName.trim());
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim() || joinCode.length < 4) return;
    joinRoom(joinCode, playerName.trim());
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="flex flex-col items-center gap-10 w-full max-w-sm">

        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-6xl">⏪</span>
          <h1 className="text-5xl font-black tracking-tight text-white">Rewind</h1>
          <p className="text-muted text-base">Escucha. Recuerda. Ordena.</p>
        </div>

        {mode === 'idle' && (
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => setMode('create')}
              className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg active:opacity-80"
            >
              Crear sala
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-4 rounded-2xl bg-surface border border-border text-foreground font-bold text-lg active:opacity-80"
            >
              Unirse a sala
            </button>
            {import.meta.env.DEV && (
              <button
                onClick={handleDevStart}
                className="w-full py-2 rounded-xl bg-surface border border-border text-muted text-sm active:opacity-80"
              >
                ⚡ Dev: solo YouTube
              </button>
            )}
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 w-full">
            <input
              autoFocus
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={20}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted outline-none focus:border-accent"
            />
            {error && <p className="text-error text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={!playerName.trim()}
              className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg disabled:opacity-40 active:opacity-80"
            >
              Crear sala
            </button>
            <button type="button" onClick={() => setMode('idle')} className="text-muted text-sm text-center">
              Volver
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="flex flex-col gap-3 w-full">
            <input
              autoFocus
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={20}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted outline-none focus:border-accent"
            />
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Código de sala (ej: XKCD)"
              maxLength={4}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted outline-none focus:border-accent tracking-widest uppercase font-mono text-center text-lg"
            />
            {error && <p className="text-error text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={!playerName.trim() || joinCode.length < 4}
              className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg disabled:opacity-40 active:opacity-80"
            >
              Unirse
            </button>
            <button type="button" onClick={() => setMode('idle')} className="text-muted text-sm text-center">
              Volver
            </button>
          </form>
        )}

      </div>
    </main>
  );
}
