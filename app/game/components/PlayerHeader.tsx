import type { Player } from '../../types/game';

export function PlayerHeader({ player }: { player: Player }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <div>
        <p className="text-xs text-muted uppercase tracking-widest">Turno de</p>
        <p className="text-xl font-bold truncate max-w-[200px]">{player.name}</p>
      </div>
      <div className="flex flex-col items-end">
        <p className="text-xs text-muted uppercase tracking-widest">Puntos</p>
        <p className="text-2xl font-black text-accent">{player.score}</p>
      </div>
    </div>
  );
}
