import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { Song } from '../../types/game';
import { accentStyle, decadeAccent, type Accent } from '../../utils/songColor';
import { cn } from '../../utils/cn';
import { Vinyl } from './Vinyl';

const DEPTH_BETWEEN_SLEEVES = 30;
const RISE_BETWEEN_SLEEVES = 15;
const SPACING_BETWEEN_FALLEN = 9;
const RESTING_TILT = 7;
const FLIPPED_TILT = -32;
const EXTRA_TILT_PER_FALLEN = 16;
const SLEEVES_VISIBLE_BEHIND = 3;
const SLEEVES_VISIBLE_IN_FRONT = 3;
const OPEN_GAP = 18;
const PIXELS_PER_SLEEVE = 44;
const TAP_TOLERANCE = 6;
const DISC_DROP_DISTANCE = 48;
const DISC_SETTLE_MS = 900;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function sleevePose(distance: number, opened: boolean): { transform: string; opacity: number } {
  const flipped = smoothstep(clamp(0.5 - distance, 0, 1));
  const behind = Math.max(0, distance - 0.5);
  const inFront = Math.max(0, -distance - 0.5);
  const gap = opened && distance < 0 ? OPEN_GAP : 0;
  const z = -behind * DEPTH_BETWEEN_SLEEVES + inFront * SPACING_BETWEEN_FALLEN + flipped * 2 + gap;
  const y = -behind * RISE_BETWEEN_SLEEVES;
  const tilt = RESTING_TILT + (FLIPPED_TILT - RESTING_TILT) * flipped - inFront * EXTRA_TILT_PER_FALLEN;
  const hidden = behind > SLEEVES_VISIBLE_BEHIND || inFront > SLEEVES_VISIBLE_IN_FRONT;
  return { transform: `translate3d(-50%, ${y}px, ${z}px) rotateX(${tilt}deg)`, opacity: hidden ? 0 : 1 };
}

function Sleeve({ song, pose, inView, inFront }: { song: Song; pose: ReturnType<typeof sleevePose>; inView: boolean; inFront: boolean }) {
  return (
    <div
      className={cn('cv-funda', inView && 'cv-a-la-vista', inFront && 'cv-delante')}
      style={{ ...pose, ...accentStyle(decadeAccent(song.year)) }}
      aria-hidden="true"
    >
      <div className="cv-cara cv-frente">
        <b className="cv-anio">{song.year}</b>
        <span className="cv-titulo">{song.title}</span>
        <span className="cv-artista">{song.artist}</span>
        <i className="cv-sello" />
      </div>
      <div className="cv-cara cv-dorso">
        <b className="cv-anio">{song.year}</b>
        <span className="cv-artista">{song.title}</span>
      </div>
      <i className="cv-canto" />
    </div>
  );
}

export interface CrateMarker {
  position: number;
  label: string;
}

interface VinylCrateProps {
  songs: Song[];
  position: number;
  onPositionChange?: (position: number) => void;
  onConfirm?: () => void;
  browsable: boolean;
  opened?: boolean;
  callout?: string | null;
  title: string;
  note?: string;
  hint?: string;
  markers?: CrateMarker[];
  accessibleName: string;
  describePosition: (position: number) => string;
  className?: string;
  children?: ReactNode;
}

interface Drag {
  pointerId: number;
  x: number;
  y: number;
  start: number;
  moved: boolean;
}

export function VinylCrate({
  songs,
  position,
  onPositionChange,
  onConfirm,
  browsable,
  opened = false,
  callout = null,
  title,
  note,
  hint,
  markers = [],
  accessibleName,
  describePosition,
  className,
  children,
}: VinylCrateProps) {
  const [dragCursor, setDragCursor] = useState<number | null>(null);
  const [hasBrowsed, setHasBrowsed] = useState(false);
  const drag = useRef<Drag | null>(null);

  const lastPosition = songs.length;
  const cursor = dragCursor ?? position;
  const place = Math.round(cursor);

  const moveTo = (target: number) => {
    const next = clamp(Math.round(target), 0, lastPosition);
    if (next === position) return;
    setHasBrowsed(true);
    onPositionChange?.(next);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!browsable || (event.target as Element).closest('.cv-disco')) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: position, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const dx = current.x - event.clientX;
    const dy = event.clientY - current.y;
    const advance = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    if (!current.moved && Math.abs(advance) < TAP_TOLERANCE) return;
    current.moved = true;
    const next = clamp(current.start - advance / PIXELS_PER_SLEEVE, 0, lastPosition);
    setDragCursor(next);
    moveTo(next);
  };

  const release = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    drag.current = null;
    setDragCursor(null);
    if (cancelled) moveTo(current.start);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!browsable) return;
    const targets: Record<string, number> = {
      ArrowLeft: position - 1,
      ArrowDown: position - 1,
      ArrowRight: position + 1,
      ArrowUp: position + 1,
      Home: 0,
      End: lastPosition,
    };
    if (event.key in targets) {
      event.preventDefault();
      moveTo(targets[event.key]);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && onConfirm) {
      event.preventDefault();
      onConfirm();
    }
  };

  return (
    <div className={cn('cv-marco', className)}>
      <div
        className={cn('cv-caja', browsable && 'cv-hojeable', dragCursor !== null && 'cv-arrastrando')}
        tabIndex={browsable ? 0 : -1}
        role="slider"
        aria-label={accessibleName}
        aria-valuemin={0}
        aria-valuemax={lastPosition}
        aria-valuenow={place}
        aria-valuetext={describePosition(place)}
        aria-disabled={!browsable}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => release(event, false)}
        onPointerCancel={(event) => release(event, true)}
        onKeyDown={handleKeyDown}
      >
        <div className="cv-escena">
          {songs.map((song, i) => (
            <Sleeve
              key={song.id}
              song={song}
              pose={sleevePose(cursor - i - 0.5, opened)}
              inView={i === place - 1}
              inFront={i === place}
            />
          ))}
          {markers.map((marker, i) => {
            const { transform, opacity } = sleevePose(cursor - marker.position + 0.5, opened);
            return (
              <div key={marker.position} className="cv-separador" style={{ transform }} aria-hidden="true">
                <span className={cn('cv-pestana', i % 2 === 1 && 'cv-pestana-derecha')} style={{ opacity }}>
                  {marker.label}
                </span>
              </div>
            );
          })}
          {children}
        </div>
        {hint && (
          <p className={cn('cv-pista', browsable && !hasBrowsed && 'cv-visible')} aria-hidden="true">
            {hint}
          </p>
        )}
        <p className={cn('cv-aviso', callout && 'cv-visible')} aria-hidden="true">{callout}</p>
        <div className="cv-labio" aria-hidden="true">
          <span>{title}</span>
          {note && <span className="cv-nota">{note}</span>}
        </div>
      </div>
    </div>
  );
}

export type DiscState = 'esperando' | 'asomado' | 'mano' | 'puesto' | 'fuera';

interface CrateDiscProps {
  state: DiscState;
  accent?: Accent | null;
  spinning?: boolean;
  onTap?: () => void;
  tapLabel?: string;
  onDrop?: () => void;
  onArmedChange?: (armed: boolean) => void;
  children: ReactNode;
}

interface DiscDrag {
  pointerId: number;
  x: number;
  y: number;
  moved: boolean;
  armed: boolean;
}

interface DiscOffset {
  x: number;
  y: number;
  approach: number;
  armed: boolean;
  state: DiscState;
}

const DISC_GROWTH = 0.7;
const DISC_APPROACH_PX = 90;

export function CrateDisc({ state, accent = null, spinning = false, onTap, tapLabel, onDrop, onArmedChange, children }: CrateDiscProps) {
  const drag = useRef<DiscDrag | null>(null);
  const draggedAway = useRef(false);
  const [offset, setOffset] = useState<DiscOffset | null>(null);
  const draggable = !!onDrop;
  const visibleOffset = offset?.state === state ? offset : null;

  const setArmed = (current: DiscDrag, armed: boolean) => {
    if (current.armed === armed) return;
    current.armed = armed;
    onArmedChange?.(armed);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    draggedAway.current = false;
    if (!draggable) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, armed: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const x = event.clientX - current.x;
    const y = event.clientY - current.y;
    if (!current.moved && Math.hypot(x, y) < TAP_TOLERANCE) return;
    current.moved = true;
    const armed = y > DISC_DROP_DISTANCE;
    setArmed(current, armed);
    setOffset({ x, y, approach: clamp(y / (DISC_DROP_DISTANCE * 1.6), 0, 1), armed, state });
  };

  const release = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    draggedAway.current = true;
    const dropped = !cancelled && current.armed;
    setArmed(current, false);
    if (!dropped) {
      setOffset(null);
      return;
    }
    onDrop?.();
    window.setTimeout(() => setOffset(null), DISC_SETTLE_MS);
  };

  const dragStyle = visibleOffset
    ? {
        translate: `${visibleOffset.x}px ${visibleOffset.y}px`,
        '--crece': 1 + DISC_GROWTH * visibleOffset.approach,
        '--acerca': `${DISC_APPROACH_PX * visibleOffset.approach}px`,
      } as CSSProperties
    : undefined;

  const handleClick = () => {
    if (draggedAway.current) {
      draggedAway.current = false;
      return;
    }
    onTap?.();
  };

  return (
    <button
      type="button"
      className={cn('cv-disco', draggable && 'cv-disco-arrastrable')}
      data-estado={state}
      data-arrastrando={visibleOffset ? '' : undefined}
      data-armado={visibleOffset?.armed || undefined}
      style={dragStyle}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => release(event, false)}
      onPointerCancel={(event) => release(event, true)}
      disabled={!onTap && !draggable}
      aria-label={tapLabel}
      aria-hidden={state === 'esperando' || undefined}
    >
      <Vinyl accent={accent} spinning={spinning}>{children}</Vinyl>
    </button>
  );
}

export function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg className="etiqueta-icono" viewBox="0 0 24 24" aria-hidden="true">
      {playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4.5v15l12.5-7.5z" />}
    </svg>
  );
}
