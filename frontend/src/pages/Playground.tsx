import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CardSlot } from '../game/components/CardSlot';
import { Timeline } from '../game/components/Timeline';
import { ValidationFeedback } from '../game/components/ValidationFeedback';
import { PlayerHeader } from '../game/components/PlayerHeader';
import { SettingsTrigger } from '../game/components/SettingsTrigger';
import type { Song } from '../types/game';
import type { RoomPlayer } from '../types/socket';
import type { SongSignal } from '../utils/songColor';
import { cn } from '../utils/cn';

// ── Mock data ────────────────────────────────────────────────────────
const SIGNALS: SongSignal[] = [
  { name: 'rojo',      primary: '#e8341c', surface: '#fbeee8', onPrimary: '#fff4ed' },
  { name: 'naranja',   primary: '#ff5722', surface: '#fff4ed', onPrimary: '#fff4ed' },
  { name: 'magenta',   primary: '#ff2d8f', surface: '#fbeef3', onPrimary: '#fff4ed' },
  { name: 'cobalto',   primary: '#2540d6', surface: '#ecedf3', onPrimary: '#fff4ed' },
  { name: 'menta',     primary: '#2cd9b8', surface: '#e9f1ee', onPrimary: '#0e0e0e' },
  { name: 'lavanda',   primary: '#a78bfa', surface: '#f0edf5', onPrimary: '#0e0e0e' },
  { name: 'tangerine', primary: '#ff6d00', surface: '#fff2e8', onPrimary: '#fff4ed' },
];

const BASE_SONG: Song = {
  id: 'mock', title: 'Bohemian Rhapsody', artist: 'Queen',
  year: 1975, deezerId: 0, providerIds: {}, previewUrl: '',
  hookStart: 0, hookDuration: 15, difficulty: 2,
  decade: '70s', genre: ['rock'], explicit: false, packId: 'base',
};

const TIMELINE_SONGS: Song[] = [
  { ...BASE_SONG, id: 't1', title: 'Yesterday',        artist: 'The Beatles', year: 1965 },
  { ...BASE_SONG, id: 't2', title: 'Hotel California', artist: 'Eagles',      year: 1977 },
  { ...BASE_SONG, id: 't3', title: 'Teen Spirit',      artist: 'Nirvana',     year: 1991 },
];

const MOCK_PLAYER: RoomPlayer = { id: 'p1', name: 'jugador', timeline: [], score: 3 };

// ── Helpers ──────────────────────────────────────────────────────────

/** Etiqueta de sección sobre fondo de señal */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono-cut text-song-on-primary/40 mb-2" style={{ fontSize: 9 }}>
      — {children}
    </p>
  );
}

/** Pill de toggle genérico — para uso sobre fondo de señal */
function Pill({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'font-mono-cut px-3 py-1 rounded-full border transition-colors duration-100',
        active
          ? 'bg-song-on-primary text-song-primary border-song-on-primary'
          : 'bg-transparent text-song-on-primary/60 border-song-on-primary/30',
      )}
      style={{ fontSize: 9 }}
    >
      {label}
    </button>
  );
}

/** Pill de toggle para fondo neutro (bg-bg) */
function NeutralPill({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'font-mono-cut px-3 py-1 rounded-full border transition-colors duration-100',
        active
          ? 'bg-ink text-bg border-ink'
          : 'bg-transparent text-muted border-border',
      )}
      style={{ fontSize: 9 }}
    >
      {label}
    </button>
  );
}

type Section = 'all' | 'cardslot' | 'timeline' | 'validation' | 'header' | 'ui';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'all',        label: 'todo' },
  { id: 'cardslot',  label: 'cardslot' },
  { id: 'timeline',  label: 'timeline' },
  { id: 'validation', label: 'validation' },
  { id: 'header',    label: 'header' },
  { id: 'ui',        label: 'ui' },
];

// ── Playground ───────────────────────────────────────────────────────
export default function Playground() {
  // Signal activa
  const [signal, setSignal] = useState<SongSignal>(SIGNALS[1]);
  const [section, setSection] = useState<Section>('all');

  // CardSlot state
  const [isRevealed, setIsRevealed]         = useState(false);
  const [hasPlayer, setHasPlayer]           = useState(true);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [cardProgress, setCardProgress]     = useState<0 | 60>(0);
  const [cardProvider, setCardProvider]     = useState<'deezer' | 'youtube'>('deezer');
  const [cardLoading, setCardLoading]       = useState(false);

  // Timeline state
  const [timelinePopulated, setTimelinePopulated] = useState(true);
  const [timelineInteract, setTimelineInteract]   = useState(true);
  const [selectedPos, setSelectedPos]             = useState<number | null>(null);

  // ValidationFeedback state
  const [feedbackResult, setFeedbackResult] = useState<boolean | null>(null);

  const { primary, onPrimary } = signal;

  return (
    <main className="min-h-dvh bg-bg text-ink">

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-107.5 mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="font-mono-cut text-muted underline underline-offset-4"
              style={{ fontSize: 10 }}
            >
              ← home
            </Link>
            <span className="font-display text-ink" style={{ fontSize: 22, letterSpacing: -1 }}>
              playground.
            </span>
          </div>
          <SettingsTrigger />
        </div>
      </div>

      <div className="max-w-107.5 mx-auto pb-24">

        {/* ── Selector de señal ─────────────────────────────────── */}
        <div className="px-5 py-6 border-b border-border">
          <p className="font-mono-cut text-muted mb-3" style={{ fontSize: 9 }}>señal activa</p>
          <div className="flex gap-2 flex-wrap mb-2">
            {SIGNALS.map((s) => (
              <button
                key={s.name}
                onClick={() => setSignal(s)}
                title={s.name}
                className="w-8 h-8 rounded-full transition-transform duration-100"
                style={{
                  background: s.primary,
                  transform: signal.name === s.name ? 'scale(1.15)' : 'scale(1)',
                  outline: signal.name === s.name ? `2.5px solid ${s.primary}` : 'none',
                  outlineOffset: 3,
                }}
              />
            ))}
          </div>
          <p className="font-mono-cut text-muted" style={{ fontSize: 8 }}>
            {signal.name} · primary: {signal.primary} · onPrimary: {signal.onPrimary}
          </p>
        </div>

        {/* ── Selector de sección ───────────────────────────────── */}
        <div className="px-5 py-3 border-b border-border flex gap-1.5 flex-wrap">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                'font-mono-cut px-3 py-1 rounded-full border transition-colors duration-100',
                section === s.id
                  ? 'bg-ink text-bg border-ink'
                  : 'bg-transparent text-muted border-border',
              )}
              style={{ fontSize: 9 }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Sección de señal (fondo = signal.primary) ─────────── */}
        <div
          className="relative overflow-hidden"
          style={{
            '--song-primary': primary,
            '--song-on-primary': onPrimary,
            background: primary,
          } as React.CSSProperties}
        >
          <div className="cut-diagonal" />

          <div className="relative z-1">

            {/* PlayerHeader */}
            {(section === 'all' || section === 'header') && (
              <>
                <div className="px-5 pt-4 pb-1">
                  <Label>playerheader</Label>
                </div>
                <PlayerHeader player={MOCK_PLAYER} round={[3, 10]} signal={signal} />
              </>
            )}

            {/* CardSlot */}
            {(section === 'all' || section === 'cardslot') && (
            <div className="px-5 pt-4 pb-2">
              <Label>cardslot</Label>

              <div className="flex gap-1 flex-wrap mb-2">
                <Pill label="hidden"   active={!isRevealed} onClick={() => { setIsRevealed(false); setIsPlaying(false); }} />
                <Pill label="revealed" active={isRevealed}  onClick={() => setIsRevealed(true)} />
              </div>

              {!isRevealed && (
                <>
                  <div className="flex gap-1 flex-wrap mb-2">
                    <Pill label="sin player" active={!hasPlayer} onClick={() => { setHasPlayer(false); setIsPlaying(false); }} />
                    <Pill label="con player" active={hasPlayer}  onClick={() => setHasPlayer(true)} />
                  </div>

                  {hasPlayer && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      <Pill label="deezer"  active={cardProvider === 'deezer'}  onClick={() => setCardProvider('deezer')} />
                      <Pill label="youtube" active={cardProvider === 'youtube'} onClick={() => setCardProvider('youtube')} />
                      <Pill label="progress 0%"  active={cardProgress === 0}  onClick={() => setCardProgress(0)} />
                      <Pill label="progress 60%" active={cardProgress === 60} onClick={() => setCardProgress(60)} />
                      <Pill label="loading" active={cardLoading} onClick={() => setCardLoading((v) => !v)} />
                    </div>
                  )}
                </>
              )}

              <CardSlot
                song={BASE_SONG}
                isRevealed={isRevealed}
                isPlaying={isPlaying}
                signal={signal}
                {...(hasPlayer && !isRevealed
                  ? {
                      onPlay:       () => setIsPlaying(true),
                      onStop:       () => setIsPlaying(false),
                      progress:     cardProgress,
                      provider:     cardProvider,
                      isLoading:    cardLoading,
                      hookDuration: 15,
                    }
                  : {})}
              />
            </div>
            )}

            {/* Timeline */}
            {(section === 'all' || section === 'timeline') && (
            <div className="pt-2 pb-4">
              <div className="px-5">
                <Label>timeline</Label>
                <div className="flex gap-1 flex-wrap mb-2">
                  <Pill label="vacía"          active={!timelinePopulated} onClick={() => { setTimelinePopulated(false); setSelectedPos(null); }} />
                  <Pill label="con canciones"  active={timelinePopulated}  onClick={() => setTimelinePopulated(true)} />
                  <Pill label="solo lectura"   active={!timelineInteract}  onClick={() => setTimelineInteract(false)} />
                  <Pill label="interactiva"    active={timelineInteract}   onClick={() => setTimelineInteract(true)} />
                </div>
              </div>
              <Timeline
                timeline={timelinePopulated ? TIMELINE_SONGS : []}
                selectedPosition={selectedPos}
                onSelectPosition={setSelectedPos}
                canInteract={timelineInteract}
                signal={signal}
              />
            </div>
            )}

            {/* ValidationFeedback */}
            {(section === 'all' || section === 'validation') && (
            <div className="pt-2 pb-6">
              <div className="px-5 mb-2">
                <Label>validationfeedback</Label>
                <div className="flex gap-1 flex-wrap">
                  <Pill label="—"          active={feedbackResult === null}  onClick={() => setFeedbackResult(null)} />
                  <Pill label="correcto"   active={feedbackResult === true}  onClick={() => setFeedbackResult(true)} />
                  <Pill label="incorrecto" active={feedbackResult === false} onClick={() => setFeedbackResult(false)} />
                </div>
              </div>
              <ValidationFeedback result={feedbackResult} songYear={1991} />
            </div>
            )}

          </div>
        </div>

        {/* ── Sección neutra (fondo = bg-bg) ──────────────────────── */}
        {(section === 'all' || section === 'ui') && (
        <div className="px-5 py-6">

          {/* Botones */}
          <p className="font-mono-cut text-muted mb-4" style={{ fontSize: 9 }}>— botones</p>
          <div className="flex flex-col gap-3 mb-10 max-w-sm">
            <button className="btn-primary">acción principal. <span>→</span></button>
            <button className="btn-primary" disabled>deshabilitado. <span>→</span></button>
            <button className="btn-secondary">acción secundaria →</button>
            <button className="btn-secondary" disabled>deshabilitado →</button>
            <div className="p-4 rounded-[14px] bg-ink">
              <button className="btn-secondary btn-secondary-light">sobre fondo oscuro →</button>
            </div>
          </div>

          {/* Inputs */}
          <p className="font-mono-cut text-muted mb-4" style={{ fontSize: 9 }}>— inputs</p>
          <div className="flex flex-col gap-3 mb-10 max-w-sm">
            <input className="input-cut" placeholder="texto normal" readOnly />
            <input
              className="input-cut font-mono-cut text-center"
              style={{ fontStyle: 'normal', letterSpacing: '0.3em', fontSize: 22 }}
              placeholder="ABCD"
              maxLength={4}
              readOnly
            />
          </div>

          {/* Tipografía */}
          <p className="font-mono-cut text-muted mb-4" style={{ fontSize: 9 }}>— tipografía</p>
          <div className="flex flex-col gap-6 mb-10">
            <div>
              <p className="font-mono-cut text-muted mb-1" style={{ fontSize: 8 }}>Sora 800 italic — font-display</p>
              <p className="font-display text-ink" style={{ fontSize: 48, letterSpacing: -3, lineHeight: 0.9 }}>
                remix.
              </p>
            </div>
            <div>
              <p className="font-mono-cut text-muted mb-1" style={{ fontSize: 8 }}>Space Mono 700 uppercase — font-mono-cut</p>
              <p className="font-mono-cut text-ink" style={{ fontSize: 14 }}>Escucha · Recuerda · Ordena</p>
            </div>
            <div>
              <p className="font-mono-cut text-muted mb-1" style={{ fontSize: 8 }}>Instrument Serif italic — font-serif-accent</p>
              <p className="font-serif-accent text-ink" style={{ fontSize: 22 }}>Escucha. Recuerda. Ordena.</p>
            </div>
          </div>

          {/* Tokens de color */}
          <p className="font-mono-cut text-muted mb-4" style={{ fontSize: 9 }}>— tokens de color (tema actual)</p>
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { label: 'ink',     cls: 'bg-ink' },
              { label: 'surface', cls: 'bg-surface border border-border' },
              { label: 'bg',      cls: 'bg-bg border border-border' },
              { label: 'muted',   cls: 'bg-muted' },
              { label: 'tint',    cls: 'bg-tint border border-border' },
              { label: 'success', cls: 'bg-success' },
              { label: 'error',   cls: 'bg-error' },
            ].map(({ label, cls }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={cn('w-9 h-9 rounded-lg', cls)} />
                <span className="font-mono-cut text-muted" style={{ fontSize: 7 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Señales */}
          <p className="font-mono-cut text-muted mb-4" style={{ fontSize: 9 }}>— paleta de señales</p>
          <div className="flex flex-wrap gap-3">
            {SIGNALS.map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-lg" style={{ background: s.primary }} />
                <span className="font-mono-cut text-muted" style={{ fontSize: 7 }}>{s.name}</span>
              </div>
            ))}
          </div>

        </div>
        )}
      </div>
    </main>
  );
}
