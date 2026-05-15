'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../store/gameStore';
import { useProviderStore } from '../store/providerStore';
import { packs } from '../data/songs';
import type { MusicProvider } from '../types/game';

export default function SetupScreen() {
  const router = useRouter();
  const setupGame = useGameStore((s) => s.setupGame);

  const { provider, setProvider } = useProviderStore();
  const [playerInput, setPlayerInput] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPack, setSelectedPack] = useState(packs[0].id);

  const providers: { id: MusicProvider; label: string; note: string }[] = [
    { id: 'deezer',  label: 'Deezer',   note: 'Preview 30s · sin cuenta' },
    { id: 'spotify', label: 'Spotify',  note: 'Preview 30s · requiere API key' },
    { id: 'youtube', label: 'YouTube',  note: 'Vídeo completo · sin cuenta' },
  ];

  function addPlayer() {
    const name = playerInput.trim();
    if (!name || players.length >= 8) return;
    setPlayers((prev) => [...prev, name]);
    setPlayerInput('');
  }

  function removePlayer(index: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  function handleStart() {
    if (players.length < 2) return;
    setupGame(players, selectedPack);
    router.push('/game');
  }

  return (
    <main className="min-h-screen flex flex-col px-5 pt-12 pb-8 bg-background max-w-sm mx-auto">
      <h1 className="text-3xl font-black mb-8">Nueva partida</h1>

      {/* Proveedor de música */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3">Proveedor de música</h2>
        <div className="flex flex-col gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                provider === p.id
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border text-muted'
              }`}
            >
              <p className="font-semibold">{p.label}</p>
              <p className="text-xs mt-0.5">{p.note}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Pack */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3">Pack de canciones</h2>
        <div className="flex flex-col gap-2">
          {packs.map((pack) => (
            <button
              key={pack.id}
              onClick={() => setSelectedPack(pack.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                selectedPack === pack.id
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border text-muted'
              }`}
            >
              <p className="font-semibold">{pack.name}</p>
              <p className="text-xs mt-0.5">{pack.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Players */}
      <section className="mb-8 flex-1">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3">
          Jugadores ({players.length}/8)
        </h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={playerInput}
            onChange={(e) => setPlayerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            placeholder="Nombre del jugador"
            maxLength={20}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted outline-none focus:border-accent"
          />
          <button
            onClick={addPlayer}
            disabled={!playerInput.trim() || players.length >= 8}
            className="px-4 py-3 rounded-xl bg-surface border border-border text-foreground font-bold disabled:opacity-40 active:opacity-70"
          >
            +
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {players.map((name, i) => (
            <li
              key={i}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface border border-border"
            >
              <span className="font-medium">{name}</span>
              <button
                onClick={() => removePlayer(i)}
                className="text-muted text-lg leading-none active:text-error"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button
        onClick={handleStart}
        disabled={players.length < 2}
        className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg disabled:opacity-40 transition-opacity active:opacity-80"
      >
        {players.length < 2 ? `Mínimo 2 jugadores` : 'Jugar'}
      </button>
    </main>
  );
}
