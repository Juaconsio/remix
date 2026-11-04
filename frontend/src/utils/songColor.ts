import type { CSSProperties } from 'react';

export interface Accent {
  background: string;
  ink: string;
}

const ACCENT_BY_DECADE: Record<number, Accent> = {
  1960: { background: '#ff6d00', ink: '#0e0e0e' },
  1970: { background: '#e8341c', ink: '#0e0e0e' },
  1980: { background: '#ff2d8f', ink: '#0e0e0e' },
  1990: { background: '#ff5722', ink: '#0e0e0e' },
  2000: { background: '#2540d6', ink: '#fff4ed' },
  2010: { background: '#2cd9b8', ink: '#0e0e0e' },
  2020: { background: '#a78bfa', ink: '#0e0e0e' },
};

const OLDEST_DECADE = 1960;
const NEWEST_DECADE = 2020;

export const SIGNAL_ACCENT: Accent = { background: '#e8341c', ink: '#0e0e0e' };

export function decadeAccent(year: number): Accent {
  const decade = Math.min(NEWEST_DECADE, Math.max(OLDEST_DECADE, Math.floor(year / 10) * 10));
  return ACCENT_BY_DECADE[decade];
}

export function accentStyle(accent: Accent | null): CSSProperties {
  if (!accent) return {};
  return { '--etiqueta': accent.background, '--tinta-etiqueta': accent.ink } as CSSProperties;
}
