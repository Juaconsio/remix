import type { RoomPlayer } from '../../types/socket';
import type { SongSignal } from '../../utils/songColor';
import { SettingsTrigger } from './SettingsTrigger';

interface PlayerHeaderProps {
  player: RoomPlayer;
  round?: [number, number];
  signal?: SongSignal;
}

export function PlayerHeader({ player, round, signal }: PlayerHeaderProps) {
  const onPrimary = signal?.onPrimary ?? '#fff4ed';

  return (
    <div
      className="relative z-10 flex items-center justify-between px-5 py-3 text-song-on-primary dark:text-ink"
      style={{ '--song-on-primary': onPrimary } as React.CSSProperties}
    >
      {round && (
        <span className="font-mono-cut tracking-[0.12em]" style={{ fontSize: 11, opacity: 0.75 }}>
          R{String(round[0]).padStart(2, '0')}/{String(round[1]).padStart(2, '0')}
        </span>
      )}

      <span
        className="font-mono-cut tracking-[0.12em] overflow-hidden text-ellipsis whitespace-nowrap max-w-30"
        style={{ fontSize: 11, opacity: 0.75, flex: round ? undefined : 1 }}
      >
        {player.name}
      </span>

      <div className="flex items-center gap-2.5">
        <span className="font-mono-cut tracking-[0.12em]" style={{ fontSize: 11, opacity: 0.75 }}>
          {player.score} pts
        </span>
        <SettingsTrigger color="var(--cut-ink)" />
      </div>
    </div>
  );
}
