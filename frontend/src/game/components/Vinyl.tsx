import type { ReactNode } from 'react';
import { accentStyle, type Accent } from '../../utils/songColor';
import { cn } from '../../utils/cn';

const GROOVE_RADII = [94, 89, 84, 79, 74, 69, 64, 59, 54, 49, 44, 39];

function Grooves() {
  return (
    <svg className="surcos" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="100" fill="#262626" />
      <g fill="none" stroke="#0e0e0e" strokeWidth="1.4">
        {GROOVE_RADII.map((r) => <circle key={r} cx="100" cy="100" r={r} />)}
      </g>
      <path d="M100 100 L168 27 A100 100 0 0 1 188 53 Z" fill="#fff4ed" opacity="0.13" />
      <path d="M100 100 L32 173 A100 100 0 0 1 12 147 Z" fill="#fff4ed" opacity="0.13" />
    </svg>
  );
}

interface VinylProps {
  children?: ReactNode;
  accent?: Accent | null;
  spinning?: boolean;
  className?: string;
}

export function Vinyl({ children, accent = null, spinning = false, className }: VinylProps) {
  return (
    <span className={cn('vinilo-marco', className)}>
      <span className="vinilo" data-gira={spinning || undefined} style={accentStyle(accent)}>
        <Grooves />
        <span className="etiqueta">{children}</span>
      </span>
    </span>
  );
}
