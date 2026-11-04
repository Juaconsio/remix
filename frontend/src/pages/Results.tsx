import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { SIGNAL_ACCENT } from '../utils/songColor';
import { EASE_OUT } from '../utils/motion';
import { cn } from '../utils/cn';
import { Vinyl } from '../game/components/Vinyl';

const LONG_NAME = 9;

function listNames(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

export default function Results() {
  const navigate = useNavigate();
  const { room, myPlayerId, leaveRoom, returnToLobby } = useSocket();
  const prefersReduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (!room) navigate('/');
    else if (room.status === 'lobby') navigate(`/lobby/${room.code}`);
  }, [room, navigate]);

  if (!room) return null;

  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  if (!winner) return null;

  const tiedForFirst = ranked.filter((p) => p.score === winner.score);
  const isTie = tiedForFirst.length > 1;
  const points = `${winner.score} ${winner.score === 1 ? 'punto' : 'puntos'}`;
  const leave = () => { leaveRoom(); navigate('/'); };

  return (
    <main className="relative min-h-dvh max-w-107.5 mx-auto flex flex-col overflow-hidden bg-ground text-cream px-5 pt-10 pb-safe">
      <div className="absolute -right-20 top-4 w-56" aria-hidden="true">
        <Vinyl accent={SIGNAL_ACCENT} spinning>
          <span className="etiqueta-anio">{winner.score}</span>
        </Vinyl>
      </div>

      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="relative mb-8 pr-16"
      >
        <p className="font-label opacity-70 mb-2">resultado final</p>
        <h1 className="font-display" style={{ fontSize: isTie || winner.name.length <= LONG_NAME ? 56 : 40, lineHeight: 0.95 }}>
          {isTie ? 'empate.' : `${winner.name}.`}
        </h1>
        <p className="font-display mt-3" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.15 }}>
          {isTie ? `${listNames(tiedForFirst.map((p) => p.name))} con ${points}.` : `gana con ${points}.`}
        </p>
      </motion.div>

      <ol className="relative flex flex-col gap-1 flex-1">
        {ranked.map((player, i) => {
          const isWinner = player.score === winner.score;
          return (
            <motion.li
              key={player.id}
              initial={prefersReduced ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.4, ease: EASE_OUT }}
              className={cn('flex items-center gap-3 px-4 min-h-15', isWinner ? 'bg-cream text-ground' : 'bg-tono-1 text-cream')}
            >
              <span className="font-year w-6 opacity-60" style={{ fontSize: 18 }}>{i + 1}</span>
              <span className="flex-1 font-display truncate" style={{ fontSize: 21 }}>{player.name}</span>
              <span className="font-year" style={{ fontSize: 28 }}>{player.score}</span>
            </motion.li>
          );
        })}
      </ol>

      <div className="relative flex flex-col gap-2 mt-8">
        {room.hostId === myPlayerId ? (
          <button onClick={returnToLobby} className="btn btn-signal">otra con esta mesa.</button>
        ) : (
          <p className="font-label opacity-70">si el host arma otra, entras directo.</p>
        )}
        <button onClick={leave} className="btn btn-tone btn-small">salir</button>
      </div>
    </main>
  );
}
