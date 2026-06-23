import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { SIGNAL_STRIPE, DEFAULT_SIGNAL } from '../utils/songColor';

const AVATAR_SIGNALS = [
  '#e8341c', '#ff5722', '#ff2d8f', '#2540d6', '#2cd9b8', '#a78bfa', '#ff6d00',
];

function luminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function Results() {
  const navigate = useNavigate();
  const { room, leaveRoom } = useSocket();
  const prefersReduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (!room) navigate('/');
  }, [room, navigate]);

  if (!room) return null;

  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  if (!winner) return null;

  const winnerSignal = DEFAULT_SIGNAL;
  const { primary, onPrimary } = winnerSignal;

  return (
    <main
      className="relative min-h-dvh max-w-107.5 mx-auto bg-song-primary overflow-hidden flex flex-col"
      style={{ '--song-primary': primary, '--song-on-primary': onPrimary } as React.CSSProperties}
    >
      {/* Diagonal ink */}
      <div className="cut-diagonal" />

      <div className="relative z-2 flex-1 flex flex-col px-5 pt-12 pb-8">

        {/* Winner announcement */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-8 text-left"
        >
          <p className="font-mono-cut text-song-on-primary mb-1.5" style={{ fontSize: 10, opacity: 0.6 }}>
            resultado final
          </p>
          <h1
            className="font-display text-song-on-primary mb-2"
            style={{ fontSize: 52, letterSpacing: -3, lineHeight: 0.9 }}
          >
            {winner.name}.
          </h1>
          <p
            className="font-serif-accent text-song-on-primary"
            style={{ fontSize: 20, opacity: 0.75 }}
          >
            gana con {winner.score} {winner.score === 1 ? 'punto' : 'puntos'}.
          </p>
        </motion.div>

        {/* Signal stripe */}
        <div className="flex h-1.5 rounded-full overflow-hidden mb-6">
          {SIGNAL_STRIPE.map((c) => (
            <div key={c} style={{ flex: 1, background: c }} />
          ))}
        </div>

        {/* Ranking */}
        <div className="flex flex-col gap-2 flex-1">
          {ranked.map((player, i) => {
            const avatarBg = AVATAR_SIGNALS[i % AVATAR_SIGNALS.length];
            const avatarFgColor = luminance(avatarBg) > 135 ? '#0e0e0e' : '#fff4ed';
            const isWinner = i === 0;

            return (
              <motion.div
                key={player.id}
                initial={prefersReduced ? false : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: 'easeOut' }}
                className="flex items-center gap-3 px-4 py-3 rounded-full"
                style={{
                  background: isWinner ? '#fff4ed' : 'transparent',
                  border: isWinner ? 'none' : '1.5px solid rgba(255,244,237,0.35)',
                  color: isWinner ? '#0e0e0e' : '#fff4ed',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-display"
                  style={{ background: avatarBg, color: avatarFgColor, fontSize: 18 }}
                >
                  {player.name[0].toLowerCase()}
                </div>

                {/* Rank */}
                <span className="font-mono-cut w-5" style={{ fontSize: 11, opacity: 0.5 }}>
                  {i + 1}
                </span>

                {/* Name */}
                <span
                  className="flex-1 font-display overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}
                >
                  {player.name}
                </span>

                {/* Score */}
                <span
                  className="font-display"
                  style={{
                    fontSize: 22,
                    letterSpacing: -1,
                    color: isWinner ? primary : '#fff4ed',
                  }}
                >
                  {player.score}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => { leaveRoom(); navigate('/'); }}
          className="btn-primary mt-8"
        >
          <span>nueva partida.</span>
          <span>→</span>
        </button>
      </div>
    </main>
  );
}
