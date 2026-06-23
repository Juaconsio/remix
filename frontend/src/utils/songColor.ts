// Maps a song's year to a Cut signal color + afín surface pair.
// The 7 signals follow era/decade logic from the Cut design system.

export interface SongSignal {
  name: string;
  primary: string;      // signal color
  surface: string;      // afín light surface
  onPrimary: string;    // cream or charcoal, computed by luminance
}

const SIGNALS: SongSignal[] = [
  // rojo — '70s rock/soul
  { name: 'rojo',      primary: '#e8341c', surface: '#fbeee8', onPrimary: '#fff4ed' },
  // naranja — '90s grunge/brit-pop
  { name: 'naranja',   primary: '#ff5722', surface: '#fff4ed', onPrimary: '#fff4ed' },
  // magenta — '80s pop/synth
  { name: 'magenta',   primary: '#ff2d8f', surface: '#fbeef3', onPrimary: '#fff4ed' },
  // cobalto — '00s hip-hop/r&b
  { name: 'cobalto',   primary: '#2540d6', surface: '#ecedf3', onPrimary: '#fff4ed' },
  // menta — '10s indie/edm
  { name: 'menta',     primary: '#2cd9b8', surface: '#e9f1ee', onPrimary: '#0e0e0e' },
  // lavanda — '20s+
  { name: 'lavanda',   primary: '#a78bfa', surface: '#f0edf5', onPrimary: '#0e0e0e' },
  // tangerine — '60s/pre-70s
  { name: 'tangerine', primary: '#ff6d00', surface: '#fff2e8', onPrimary: '#fff4ed' },
];

export function getSongSignal(year: number): SongSignal {
  if (year < 1970) return SIGNALS[6]; // tangerine
  if (year < 1980) return SIGNALS[0]; // rojo
  if (year < 1990) return SIGNALS[2]; // magenta
  if (year < 2000) return SIGNALS[1]; // naranja
  if (year < 2010) return SIGNALS[3]; // cobalto
  if (year < 2020) return SIGNALS[4]; // menta
  return SIGNALS[5];                  // lavanda
}

// The 7-color stripe used as decorative element on the home screen
export const SIGNAL_STRIPE = SIGNALS.map(s => s.primary);

// Default signal when no song is loaded (lobby, home)
export const DEFAULT_SIGNAL: SongSignal = SIGNALS[1]; // naranja
