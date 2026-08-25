'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRoscoStore } from '../../store/roscoStore';

export default function RoscoResultsScreen() {
  const router = useRouter();
  const { status, players, resetRosco } = useRoscoStore();

  useEffect(() => {
    if (status === 'idle') router.replace('/');
  }, [status, router]);

  const ranked = [...players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];

  function handlePlayAgain() {
    resetRosco();
    router.push('/');
  }

  if (!winner) return null;

  return (
    <main className="min-h-screen flex flex-col px-5 pt-12 pb-8 bg-background max-w-sm mx-auto">
      <div className="flex flex-col items-center gap-2 mb-10 text-center">
        <span className="text-5xl">🏆</span>
        <h1 className="text-3xl font-black">¡{winner.name} gana!</h1>
        <p className="text-muted text-sm">
          con {winner.score} {winner.score === 1 ? 'punto' : 'puntos'}
        </p>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {ranked.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
              i === 0 ? 'border-accent bg-accent/10' : 'border-border bg-surface'
            }`}
          >
            <span className={`text-2xl font-black w-8 text-center ${i === 0 ? 'text-accent' : 'text-muted'}`}>
              {i + 1}
            </span>
            <span className="flex-1 font-semibold truncate">{player.name}</span>
            <span className={`font-black text-xl ${i === 0 ? 'text-accent' : 'text-foreground'}`}>
              {player.score}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 mt-8">
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg active:opacity-80"
        >
          Jugar de nuevo
        </button>
        <Link
          href="/rosco/setup"
          onClick={resetRosco}
          className="w-full py-4 rounded-2xl border border-border text-foreground font-bold text-lg text-center active:opacity-80"
        >
          Nuevo rosco
        </Link>
      </div>
    </main>
  );
}
