import type { RoomPlayer } from '../../types/socket';
import type { SongSignal } from '../../utils/songColor';
import { SettingsTrigger } from './SettingsTrigger';

interface PlayerHeaderProps {
  player: RoomPlayer;
  cardsLeft?: number;
  signal?: SongSignal;
}

export function PlayerHeader({ player, cardsLeft, signal }: PlayerHeaderProps) {
  const onPrimary = signal?.onPrimary ?? '#fff4ed';
  const cards = cardsLeft === undefined ? null : `${cardsLeft} ${cardsLeft === 1 ? 'carta' : 'cartas'}`;
  const tokens = `${player.tokens} ${player.tokens === 1 ? 'ficha' : 'fichas'}`;

  return (
    <div
      className="relative z-10 px-5 py-3 font-mono-cut tracking-[0.12em] text-song-on-primary dark:text-ink"
      style={{ '--song-on-primary': onPrimary, fontSize: 11 } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0 truncate" style={{ opacity: 0.75 }}>
          {player.name}
        </span>
        <SettingsTrigger color="var(--cut-ink)" />
      </div>
      <p className="mt-1 whitespace-nowrap" style={{ opacity: 0.75 }}>
        {[cards, `${player.score} pts`, tokens].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}
