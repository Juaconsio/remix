import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { SIGNAL_ACCENT } from '../utils/songColor';
import { EASE_OUT } from '../utils/motion';
import { SettingsTrigger } from '../game/components/SettingsTrigger';
import { Vinyl } from '../game/components/Vinyl';
import type { GameMode } from '../types/socket';

const DEV_LINK = 'font-label text-muted underline underline-offset-4 min-h-11';

export default function Home() {
  const navigate = useNavigate();
  const { room, error, createRoom, joinRoom, updateConfig, startGame } = useSocket();
  const prefersReduced = useReducedMotion() ?? false;

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

  const hidden = (offsetPx: number) =>
    prefersReduced ? { opacity: 0 } : { opacity: 0, transform: `translateY(${offsetPx}px)` };
  const settled = prefersReduced ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' };
  const panelMotion = (delay: number) => ({
    initial: hidden(8),
    animate: settled,
    exit: { ...hidden(-6), transition: { duration: prefersReduced ? 0.15 : 0.12, ease: EASE_OUT } },
    transition: { duration: prefersReduced ? 0.15 : 0.22, ease: EASE_OUT, delay },
  });

  const errorText = error && <p className="font-label text-error">{error}</p>;
  const backButton = (
    <button type="button" onClick={() => setMode('idle')} className="font-label text-muted min-h-11 text-left">
      ← volver
    </button>
  );

  return (
    <main className="relative grid grid-cols-1 grid-rows-[auto_minmax(10rem,1fr)_auto_auto] min-h-dvh max-w-107.5 mx-auto overflow-hidden bg-bg text-ink px-5 pb-safe">
      <div className="flex items-center justify-between pt-4">
        <p className="font-display" style={{ fontSize: 28 }}>remix.</p>
        <SettingsTrigger />
      </div>

      <div className="relative my-6" aria-hidden="true">
        <motion.div
          className="absolute inset-y-0 -left-[22%] aspect-square max-w-[82vw]"
          initial={prefersReduced ? false : { opacity: 0, x: '-30%' }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.2 }}
        >
          <Vinyl accent={SIGNAL_ACCENT} spinning>remix.</Vinyl>
        </motion.div>
      </div>

      <motion.div
        className="relative mb-6"
        initial={hidden(24)}
        animate={settled}
        transition={{ duration: prefersReduced ? 0.15 : 0.8, ease: EASE_OUT, delay: 0.1 }}
      >
        <h1 className="font-display" style={{ fontSize: 'clamp(40px, 12.6vw, 56px)', lineHeight: 0.96 }}>
          ¿cuánto sabes<br />de la canción?
        </h1>
        <p className="font-display mt-3" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.15 }}>
          suena una canción, la ubicas por año y cada acierto suma.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'idle' && (
          <motion.div key="idle" className="relative flex flex-col gap-2" {...panelMotion(0.06)}>
            <button className="btn btn-signal" onClick={() => setMode('create')}>armar una sala.</button>
            <button className="btn btn-ink" onClick={() => setMode('join')}>unirme con código.</button>
            {import.meta.env.DEV && (
              <div className="flex flex-wrap gap-x-4">
                <button onClick={() => { setDevMode('classic'); createRoom('Dev'); }} className={DEV_LINK}>
                  dev: youtube solo
                </button>
                <button onClick={() => { setDevMode('rosco'); createRoom('Dev'); }} className={DEV_LINK}>
                  dev: rosco solo
                </button>
                <a href="/playground" className={`${DEV_LINK} inline-flex items-center`}>playground</a>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.form key="create" onSubmit={handleCreate} className="relative flex flex-col gap-2" {...panelMotion(0)}>
            <input
              autoFocus
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="tu nombre"
              maxLength={20}
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint="go"
              className="input-cut"
            />
            {errorText}
            <button type="submit" disabled={!playerName.trim()} className="btn btn-signal">armar una sala.</button>
            {backButton}
          </motion.form>
        )}

        {mode === 'join' && (
          <motion.form key="join" onSubmit={handleJoin} className="relative flex flex-col gap-2" {...panelMotion(0)}>
            <input
              autoFocus
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="tu nombre"
              maxLength={20}
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint="next"
              className="input-cut"
            />
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              maxLength={4}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className="input-cut font-year text-center"
              style={{ letterSpacing: '0.3em', fontSize: 26 }}
            />
            {errorText}
            <button type="submit" disabled={!playerName.trim() || joinCode.length < 4} className="btn btn-signal">
              unirme.
            </button>
            {backButton}
          </motion.form>
        )}
      </AnimatePresence>
    </main>
  );
}
