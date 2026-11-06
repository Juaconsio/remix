import { SettingsTrigger } from './SettingsTrigger';

interface GameHeaderProps {
  title: string;
  subtitle?: string;
  stats: string[];
}

export function GameHeader({ title, subtitle, stats }: GameHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <p className="font-display truncate" style={{ fontSize: 26, lineHeight: 1.05 }}>
          {title}
        </p>
        {subtitle && <p className="font-label mt-1 truncate opacity-80">{subtitle}</p>}
      </div>
      <div className="flex items-start gap-4 shrink-0">
        <div className="font-label text-right whitespace-nowrap">
          {stats.map((stat) => <p key={stat}>{stat}</p>)}
        </div>
        <SettingsTrigger color="var(--color-cream)" />
      </div>
    </header>
  );
}
