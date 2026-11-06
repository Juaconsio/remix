import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CrateDisc, VinylCrate, type DiscState } from '../game/components/VinylCrate';
import { Vinyl } from '../game/components/Vinyl';
import { SettingsTrigger } from '../game/components/SettingsTrigger';
import { SIGNAL_ACCENT, decadeAccent } from '../utils/songColor';
import { cn } from '../utils/cn';
import type { Song } from '../types/game';

const BASE_SONG: Song = {
  id: 'mock', title: 'Bohemian Rhapsody', artist: 'Queen',
  year: 1975, deezerId: 0, providerIds: {}, previewUrl: '',
  hookStart: 0, hookDuration: 15, difficulty: 2,
  decade: '70s', genre: ['rock'], explicit: false, packId: 'base',
};

const CRATE_SONGS: Song[] = [
  { ...BASE_SONG, id: 't1', title: 'Hey Jude',             artist: 'The Beatles',     year: 1968 },
  { ...BASE_SONG, id: 't2', title: 'Hotel California',     artist: 'Eagles',          year: 1977 },
  { ...BASE_SONG, id: 't3', title: 'El baile de los que sobran', artist: 'Los Prisioneros', year: 1986 },
  { ...BASE_SONG, id: 't4', title: 'Smells Like Teen Spirit', artist: 'Nirvana',      year: 1991 },
  { ...BASE_SONG, id: 't5', title: 'Gasolina',             artist: 'Daddy Yankee',    year: 2004 },
  { ...BASE_SONG, id: 't6', title: 'Yonaguni',             artist: 'Bad Bunny',       year: 2021 },
];

const DECADE_YEARS = [1965, 1975, 1985, 1995, 2005, 2015, 2025];
const DISC_STATES: DiscState[] = ['asomado', 'mano', 'puesto', 'fuera'];

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn('font-label px-3 min-h-11', active ? 'bg-ink text-bg' : 'bg-tint text-ink')}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-8 border-b border-border">
      <p className="font-display mb-4" style={{ fontSize: 24 }}>{title}</p>
      {children}
    </section>
  );
}

export default function Playground() {
  const [place, setPlace] = useState(3);
  const [browsable, setBrowsable] = useState(true);
  const [disc, setDisc] = useState<DiscState>('mano');
  const [withMarkers, setWithMarkers] = useState(false);

  return (
    <main className="min-h-dvh bg-bg text-ink max-w-107.5 mx-auto pb-24">
      <div className="sticky top-0 z-10 bg-bg flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-label text-muted underline underline-offset-4">← inicio</Link>
          <span className="font-display" style={{ fontSize: 22 }}>playground.</span>
        </div>
        <SettingsTrigger />
      </div>

      <Section title="caja de vinilos.">
        <div className="flex flex-wrap gap-1 mb-2">
          <Pill label="hojeable" active={browsable} onClick={() => setBrowsable((v) => !v)} />
          <Pill label="separadores" active={withMarkers} onClick={() => setWithMarkers((v) => !v)} />
        </div>
        <div className="flex flex-wrap gap-1 mb-4">
          {DISC_STATES.map((state) => (
            <Pill key={state} label={state} active={disc === state} onClick={() => setDisc(state)} />
          ))}
        </div>
      </Section>
      <div className="bg-ground text-cream">
        <VinylCrate
          className="h-110"
          songs={CRATE_SONGS}
          position={place}
          onPositionChange={setPlace}
          browsable={browsable}
          title="tu caja"
          hint="desliza para hojear"
          markers={withMarkers ? [{ position: 1, label: 'A' }, { position: 4, label: 'B' }] : []}
          accessibleName="lugar en tu caja"
          describePosition={(p) => `lugar ${p}`}
        >
          {disc === 'fuera' ? (
            <CrateDisc state="fuera" accent={decadeAccent(1999)}>
              <span className="etiqueta-anio">1999</span>
            </CrateDisc>
          ) : (
            <CrateDisc state={disc} spinning={disc === 'mano'}>¿?</CrateDisc>
          )}
        </VinylCrate>
        <p className="font-display px-5 py-3" style={{ fontSize: 20 }}>lugar {place} de {CRATE_SONGS.length}.</p>
      </div>

      <Section title="vinilos por década.">
        <div className="grid grid-cols-4 gap-3">
          {DECADE_YEARS.map((year) => (
            <Vinyl key={year} accent={decadeAccent(year)}>
              <span className="etiqueta-anio">{year}</span>
            </Vinyl>
          ))}
          <Vinyl accent={SIGNAL_ACCENT} spinning>remix.</Vinyl>
        </div>
      </Section>

      <Section title="bloques.">
        <div className="flex flex-col gap-2">
          <button className="btn btn-signal">acción principal.</button>
          <button className="btn btn-signal" disabled>deshabilitada.</button>
          <button className="btn btn-ink">acción secundaria.</button>
          <div className="grid grid-cols-2 gap-2 p-3 bg-ground">
            <button className="btn btn-tone btn-small">‹ antes</button>
            <button className="btn btn-tone btn-small">después ›</button>
            <button className="btn btn-cream btn-small col-span-2">sobre fondo oscuro.</button>
          </div>
        </div>
      </Section>

      <Section title="campos.">
        <div className="flex flex-col gap-2">
          <input className="input-cut" placeholder="tu nombre" readOnly />
          <input className="input-cut font-year text-center" style={{ letterSpacing: '0.3em', fontSize: 26 }} placeholder="CÓDIGO" readOnly />
        </div>
      </Section>
    </main>
  );
}
