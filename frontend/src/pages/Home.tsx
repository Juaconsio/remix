import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { SIGNAL_STRIPE } from '../utils/songColor';
import { SettingsTrigger } from '../game/components/SettingsTrigger';
import type { GameMode } from '../types/socket';

export default function Home() {
  const navigate = useNavigate();
  const { room, error, createRoom, joinRoom, updateConfig, startGame } = useSocket();
  const prefersReduced = useReducedMotion();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode]     = useState('');
  const [mode, setMode]             = useState<'idle' | 'create' | 'join'>('idle');
  const [devMode, setDevMode]       = useState<GameMode | null>(null);
  const devStarted                  = useRef(false);

  useEffect(() => {
    if (!room || devMode) return;
    navigate(`/lobby/${room.code}`);
  }, [room, navigate, devMode]);

  useEffect(() => {
    if (!room || !devMode) return;
    // room:config rebota con la sala aún en lobby: sin la guarda saldría un
    // segundo game:start que rehace el reparto.
    if (room.status === 'lobby' && !devStarted.current) {
      devStarted.current = true;
      updateConfig({ provider: 'youtube', mode: devMode, roscoSubMode: 'turnos' });
      startGame();
    }
    if (room.status === 'setup') navigate(`/game/${room.code}`);
    if (room.status === 'round_active' && devMode === 'rosco') navigate(`/rosco/${room.code}`);
  }, [room, navigate, devMode, updateConfig, startGame]);

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

  const ease = 'backOut' as const;

  return (
    <main className="relative flex flex-col items-center justify-center px-6 bg-bg min-h-dvh">
      <div className="absolute top-[14px] right-[14px]">
        <SettingsTrigger />
      </div>

      <div className="flex flex-col items-center gap-10 w-full max-w-sm">

        {/* Wordmark */}
        <motion.div
          className="flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.7, ease }}
        >
          <div className="flex w-48 h-2 rounded-full overflow-hidden">
            {SIGNAL_STRIPE.map((c) => (
              <div key={c} style={{ flex: 1, background: c }} />
            ))}
          </div>

          <h1
            className="font-display text-ink"
            style={{ fontSize: 72, lineHeight: 0.9, letterSpacing: -4 }}
          >
            remix.
          </h1>

          <p
            className="font-serif-accent text-ink"
            style={{ fontSize: 18, opacity: 0.65 }}
          >
            Escucha. Recuerda. Ordena.
          </p>
        </motion.div>

        {/* Buttons / forms */}
        {mode === 'idle' && (
          <motion.div
            className="flex flex-col gap-3 w-full"
            initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0.01 : 0.6, delay: 0.08, ease }}
          >
            <button className="btn-primary" onClick={() => setMode('create')}>
              crear sala. <span>→</span>
            </button>
            <button className="btn-secondary" onClick={() => setMode('join')}>
              unirme con código →
            </button>
            {import.meta.env.DEV && (
              <>
                <button
                  onClick={() => { setDevMode('classic'); createRoom('Dev'); }}
                  className="font-mono-cut text-ink bg-transparent border-none cursor-pointer p-2 underline underline-offset-4"
                  style={{ fontSize: 10, letterSpacing: '0.15em', opacity: 0.4 }}
                >
                  ⚡ dev: youtube solo →
                </button>
                <button
                  onClick={() => { setDevMode('rosco'); createRoom('Dev'); }}
                  className="font-mono-cut text-ink bg-transparent border-none cursor-pointer p-2 underline underline-offset-4"
                  style={{ fontSize: 10, letterSpacing: '0.15em', opacity: 0.4 }}
                >
                  ⚡ dev: rosco solo →
                </button>
                <a
                  href="/playground"
                  className="font-mono-cut text-ink bg-transparent border-none cursor-pointer p-2 underline underline-offset-4 text-center"
                  style={{ fontSize: 10, letterSpacing: '0.15em', opacity: 0.4 }}
                >
                  🎨 playground →
                </a>
              </>
            )}
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.form
            onSubmit={handleCreate}
            className="flex flex-col gap-3 w-full"
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0.01 : 0.55, ease }}
          >
            <input
              autoFocus
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="tu nombre"
              maxLength={20}
              className="input-cut"
            />
            {error && (
              <p
                className="font-mono-cut text-error text-center"
                style={{ fontSize: 11, letterSpacing: '0.12em' }}
              >
                {error}
              </p>
            )}
            <button type="submit" disabled={!playerName.trim()} className="btn-primary">
              crear sala. <span>→</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="font-mono-cut text-ink bg-transparent border-none cursor-pointer p-2 underline underline-offset-4"
              style={{ fontSize: 11, letterSpacing: '0.15em', opacity: 0.5 }}
            >
              ← volver
            </button>
          </motion.form>
        )}

        {mode === 'join' && (
          <motion.form
            onSubmit={handleJoin}
            className="flex flex-col gap-3 w-full"
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0.01 : 0.55, ease }}
          >
            <input
              autoFocus
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="tu nombre"
              maxLength={20}
              className="input-cut"
            />
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              maxLength={4}
              className="input-cut font-mono-cut text-center"
              style={{ fontStyle: 'normal', letterSpacing: '0.3em', fontSize: 22 }}
            />
            {error && (
              <p
                className="font-mono-cut text-error text-center"
                style={{ fontSize: 11, letterSpacing: '0.12em' }}
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!playerName.trim() || joinCode.length < 4}
              className="btn-primary"
            >
              unirme. <span>→</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="font-mono-cut text-ink bg-transparent border-none cursor-pointer p-2 underline underline-offset-4"
              style={{ fontSize: 11, letterSpacing: '0.15em', opacity: 0.5 }}
            >
              ← volver
            </button>
          </motion.form>
        )}

      </div>
    </main>
  );
}
