import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useGameAudio } from '../hooks/useGameAudio';
import { GameHeader } from '../game/components/GameHeader';
import { CrateDisc, PlayIcon, VinylCrate, type CrateMarker } from '../game/components/VinylCrate';
import { PregameOverlay } from '../game/components/PregameOverlay';
import { PauseOverlay } from '../game/components/PauseOverlay';
import { RevealCloseUp, type RevealVerdict } from '../game/components/RevealCloseUp';
import { useControlsStore } from '../store/controlsStore';
import { decadeAccent } from '../utils/songColor';
import type { Song } from '../types/game';

const WIN_SCORE = 7; // espejo de WIN_SCORE en backend/src/rooms/roomManager.ts
const STEAL_WINDOW_S = 10; // espejo de STEAL_WINDOW_MS en backend/src/rooms/roomManager.ts

function useStealCountdown(isStealing: boolean): number {
  const [secondsLeft, setSecondsLeft] = useState(STEAL_WINDOW_S);
  useEffect(() => {
    if (!isStealing) return;
    setSecondsLeft(STEAL_WINDOW_S);
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [isStealing]);
  return secondsLeft;
}

function describePlace(timeline: Song[], place: number): string {
  const before = timeline[place - 1];
  const after = timeline[place];
  if (!before && !after) return 'tu caja está vacía.';
  if (!before) return `antes de ${after.year}.`;
  if (!after) return `después de ${before.year}.`;
  return `entre ${before.year} y ${after.year}.`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const BROWSE_ROW = 'grid grid-cols-[4rem_1fr_4rem] gap-2';
const ARROW = 'btn btn-tone text-[28px]';

interface Browse {
  cardId: string;
  place: number;
}

export default function Game() {
  const navigate = useNavigate();
  const {
    room, myPlayerId, flipCard, selectPosition, placeCard, skipCard, nextTurn, confirmPregame, skipPregame,
    stealCard, passSteal, awardToken, resumeGame,
  } = useSocket();
  const isActivePlayer = room?.players[room.currentPlayerIndex]?.id === myPlayerId;
  const {
    activePlayer,
    hasListened,
    displayError,
    missingYouTubeVideo,
    ytContainerRef,
    needsAudioUnlock,
    unlockAudio,
    playSong,
    syncFailed,
    retrySync,
  } = useGameAudio(room, { card: room?.currentCard ?? null, canPlay: isActivePlayer });

  const isStealing = room?.status === 'stealing';
  const secondsLeft = useStealCountdown(isStealing);
  const [browse, setBrowse] = useState<Browse | null>(null);
  const [stealBrowse, setStealBrowse] = useState<Browse | null>(null);
  const crateButtons = useControlsStore((s) => s.crateButtons);
  const [closedRevealId, setClosedRevealId] = useState<string | null>(null);
  const [dropArmed, setDropArmed] = useState(false);

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'lobby') navigate(`/lobby/${room.code}`);
    if (room.status === 'finished') navigate(`/results/${room.code}`);
  }, [room, navigate]);

  if (!room) return null;

  const currentPlayer = room.players[room.currentPlayerIndex] ?? null;
  const myPlayer      = room.players.find((p) => p.id === myPlayerId) ?? null;

  if (!currentPlayer) return null;

  const card = room.currentCard;
  const cardId = card?.id ?? '';
  const timeline = currentPlayer.timeline;
  const restingPlace = room.selectedPosition ?? Math.floor(timeline.length / 2);
  const lastPlace = timeline.length;
  const clampPlace = (place: number) => Math.min(lastPlace, Math.max(0, place));

  const isChoosing = room.status === 'round_active' && isActivePlayer;
  const isRevealed = room.status === 'validating';
  const canListen  = hasListened || !!displayError || missingYouTubeVideo;

  const myDecision = room.steals.find((s) => s.playerId === myPlayerId);
  const canSteal   = isStealing && !isActivePlayer && !!myPlayer && myPlayer.tokens > 0 && !myDecision;
  const canPaySkip = isActivePlayer && !!myPlayer && myPlayer.tokens > 0;

  const myPlace    = browse?.cardId === cardId ? browse.place : restingPlace;
  const stealPlace = stealBrowse?.cardId === cardId ? stealBrowse.place : restingPlace;

  const nameOf = (playerId: string | null) => room.players.find((p) => p.id === playerId)?.name ?? null;
  const initialOf = (playerId: string) => (nameOf(playerId) ?? '?').slice(0, 1).toUpperCase();

  const markers: CrateMarker[] = [];
  if (isStealing && room.selectedPosition !== null) {
    markers.push({ position: room.selectedPosition, label: initialOf(currentPlayer.id) });
    room.steals.forEach((s) => { if (s.position !== null) markers.push({ position: s.position, label: initialOf(s.playerId) }); });
  }
  const stealSpotTaken = markers.some((m) => m.position === stealPlace);

  const revealedPlace = !card
    ? restingPlace
    : room.validationResult
    ? room.selectedPosition ?? restingPlace
    : timeline.filter((song) => song.year < card.year).length;

  const discInCrate = room.selectedPosition !== null && (room.status === 'round_active' || (isStealing && !canSteal));
  const isBrowsingMine = isChoosing && room.selectedPosition === null;

  const cratePosition = isRevealed ? revealedPlace : canSteal ? stealPlace : isBrowsingMine ? myPlace : restingPlace;

  const browseMine = (place: number) => setBrowse({ cardId, place: clampPlace(place) });
  const browseSteal = (place: number) => setStealBrowse({ cardId, place: clampPlace(place) });
  const browseTo = canSteal ? browseSteal : isBrowsingMine ? browseMine : undefined;

  const isHost     = room.hostId === myPlayerId;
  const isLastTurn = room.deck.length === 0 || room.players.some((p) => p.score >= WIN_SCORE);

  const canDraw = room.status === 'setup' && isActivePlayer && !room.paused && !room.pregameReadyIds;
  const drawAndPlay = () => {
    const nextCard = room.deck[0];
    flipCard();
    if (nextCard) playSong(nextCard);
  };

  const canControlDisc = isBrowsingMine && !missingYouTubeVideo && !displayError;
  const canDrop = isBrowsingMine && canListen;
  const dropHere = () => {
    activePlayer.stop();
    selectPosition(myPlace);
    placeCard();
  };
  const handleCrateEnter = canDrop ? dropHere : undefined;

  const togglePlay = canControlDisc ? (activePlayer.isPlaying ? activePlayer.stop : activePlayer.play) : undefined;
  const playLabel = activePlayer.isPlaying ? 'parar la canción' : 'escuchar la canción';
  const discLabel = isBrowsingMine ? <PlayIcon playing={activePlayer.isPlaying} /> : '¿?';

  const stealWinnerName = nameOf(room.stealWinnerId);

  const title = isRevealed && card
    ? card.title
    : isActivePlayer ? 'tu turno.' : `turno de ${currentPlayer.name}.`;

  const subtitle = isRevealed && card
    ? card.artist
    : isStealing
    ? `${isActivePlayer ? '¿te la roban?' : canSteal ? '¿la robas?' : 'robando…'} ${secondsLeft}s`
    : room.status === 'round_active'
    ? isActivePlayer ? '¿de qué año es?' : 'escucha y piensa.'
    : isActivePlayer ? 'escucha y ubícalo por año.' : 'se viene un disco.';

  const placeText = isRevealed && card
    ? room.validationResult
      ? 'correcto. se queda en la caja.'
      : stealWinnerName
      ? `${stealWinnerName} la robó.`
      : `era de ${card.year}. se va.`
    : isStealing
    ? canSteal
      ? describePlace(timeline, stealPlace)
      : isActivePlayer
      ? 'los demás deciden si roban…'
      : myDecision?.position != null
      ? 'robaste. a ver quién tenía razón…'
      : myPlayer && myPlayer.tokens === 0 && !myDecision
      ? 'sin fichas para robar.'
      : 'esperando al resto…'
    : isChoosing
    ? displayError ?? describePlace(timeline, isBrowsingMine ? myPlace : restingPlace)
    : room.status === 'round_active'
    ? room.selectedPosition === null
      ? 'hojeando…'
      : `${currentPlayer.name} lo puso ${describePlace(timeline, room.selectedPosition)}`
    : isActivePlayer
    ? crateButtons ? 'cuando suene, hojea tu caja.' : 'toca el disco para sacarlo.'
    : `esperando a ${currentPlayer.name}…`;

  const verdict: RevealVerdict | null = !isRevealed || !card
    ? null
    : room.validationResult
    ? { title: 'correcto.', detail: isActivePlayer ? 'se queda en tu caja.' : `se queda en la caja de ${currentPlayer.name}.`, scored: true }
    : stealWinnerName
    ? { title: `${stealWinnerName} la robó.`, detail: `era de ${card.year}. se va a su caja.`, scored: true }
    : { title: 'no era ahí.', detail: `era de ${card.year}. se va.`, scored: false };

  const revealActions = isRevealed && (
    <>
      {isHost && (
        room.tokenAwarded ? (
          <p className="font-label opacity-60">ficha para {currentPlayer.name} ✓</p>
        ) : (
          <button onClick={awardToken} className="btn btn-cream btn-small">
            {currentPlayer.name} la nombró · +1 ficha
          </button>
        )
      )}
      {isActivePlayer || isHost ? (
        <button onClick={nextTurn} className="btn btn-signal">
          {isLastTurn ? 'ver resultados.' : 'siguiente.'}
        </button>
      ) : (
        <p className="font-label opacity-60">esperando a {currentPlayer.name}…</p>
      )}
    </>
  );

  const gestureCue = !canControlDisc
    ? null
    : !canListen
    ? 'escúchala antes de dejarla.'
    : crateButtons
    ? null
    : 'arrastra el disco a la caja para dejarlo ahí.';

  const hint = window.matchMedia('(pointer: coarse)').matches ? 'desliza para hojear' : 'arrastra o usa las flechas';

  return (
    <main className="relative min-h-dvh max-w-107.5 mx-auto grid grid-cols-1 grid-rows-[auto_minmax(17.5rem,1fr)_auto] bg-ground text-cream">
      <GameHeader
        title={title}
        subtitle={subtitle}
        stats={[plural(room.deck.length, 'disco', 'discos')]}
      />

      <VinylCrate
        songs={timeline}
        position={cratePosition}
        onPositionChange={browseTo}
        onConfirm={handleCrateEnter}
        browsable={!!browseTo}
        opened={discInCrate || (dropArmed && isBrowsingMine)}
        callout={dropArmed && isBrowsingMine ? describePlace(timeline, myPlace) : null}
        title={isActivePlayer ? 'tu caja' : `caja de ${currentPlayer.name}`}
        note={`${plural(currentPlayer.score, 'pt', 'pts')} · ${plural(currentPlayer.tokens, 'ficha', 'fichas')}`}
        hint={hint}
        markers={markers}
        accessibleName={isActivePlayer ? 'lugar en tu caja' : `lugar en la caja de ${currentPlayer.name}`}
        describePosition={(place) => describePlace(timeline, place)}
      >
        {isRevealed && card ? (
          <CrateDisc state="fuera" accent={decadeAccent(card.year)}>
            <span className="etiqueta-anio">{card.year}</span>
          </CrateDisc>
        ) : discInCrate ? (
          <CrateDisc state="puesto" spinning={activePlayer.isPlaying}>¿?</CrateDisc>
        ) : room.status === 'setup' ? (
          <CrateDisc
            state={canDraw ? 'asomado' : 'esperando'}
            onTap={canDraw ? drawAndPlay : undefined}
            tapLabel="sacar disco"
          >
            ¿?
          </CrateDisc>
        ) : (
          <CrateDisc
            state="mano"
            spinning={activePlayer.isPlaying}
            onTap={togglePlay}
            tapLabel={playLabel}
            onDrop={canDrop && canControlDisc ? dropHere : undefined}
            onArmedChange={setDropArmed}
          >
            {discLabel}
          </CrateDisc>
        )}
      </VinylCrate>

      <footer className="flex flex-col gap-2 px-5 pt-3 pb-safe">
        <p className="font-display min-h-6" style={{ fontSize: 20, lineHeight: 1.1 }} aria-live="polite">
          {placeText}
        </p>
        {gestureCue && <p className="font-label opacity-60">{gestureCue}</p>}

        {canDraw && crateButtons && (
          <button onClick={drawAndPlay} className="btn btn-signal">sacar disco.</button>
        )}

        {isChoosing && (missingYouTubeVideo || !!displayError) && (
          <button onClick={() => skipCard(false)} className="btn btn-cream">saltar canción.</button>
        )}

        {canControlDisc && (
          <>
            {crateButtons && (
              <div className={BROWSE_ROW}>
                <button onClick={() => browseMine(myPlace - 1)} disabled={myPlace === 0} aria-label="antes" className={ARROW}>‹</button>
                <button onClick={dropHere} disabled={!canDrop} className="btn btn-signal">va aquí.</button>
                <button onClick={() => browseMine(myPlace + 1)} disabled={myPlace === lastPlace} aria-label="después" className={ARROW}>›</button>
              </div>
            )}
            {canPaySkip && (
              <button onClick={() => { activePlayer.stop(); skipCard(true); }} className="btn btn-tone btn-small">
                saltar · 1 ficha
              </button>
            )}
          </>
        )}

        {room.status === 'round_active' && !isActivePlayer && syncFailed && (
          <button onClick={retrySync} className="btn btn-cream btn-small">¿no la escuchas? toca aquí</button>
        )}

        {canSteal && (
          <>
            <div className={crateButtons ? BROWSE_ROW : 'grid'}>
              {crateButtons && (
                <button onClick={() => browseSteal(stealPlace - 1)} disabled={stealPlace === 0} aria-label="antes" className={ARROW}>‹</button>
              )}
              <button onClick={() => stealCard(stealPlace)} disabled={stealSpotTaken} className="btn btn-signal">
                {stealSpotTaken ? 'lugar tomado.' : 'robar · 1 ficha'}
              </button>
              {crateButtons && (
                <button onClick={() => browseSteal(stealPlace + 1)} disabled={stealPlace === lastPlace} aria-label="después" className={ARROW}>›</button>
              )}
            </div>
            <button onClick={passSteal} className="btn btn-tone btn-small">paso</button>
          </>
        )}

        {revealActions}
      </footer>

      <AnimatePresence>
        {card && verdict && closedRevealId !== card.id && (
          <RevealCloseUp key={card.id} song={card} verdict={verdict} onClose={() => setClosedRevealId(card.id)}>
            {revealActions}
          </RevealCloseUp>
        )}
      </AnimatePresence>

      <PregameOverlay
        players={room.players}
        readyIds={room.pregameReadyIds ?? null}
        myPlayerId={myPlayerId}
        isHost={isHost}
        needsUnlock={needsAudioUnlock}
        onReady={(songId) => { unlockAudio(); confirmPregame(songId); }}
        onSkip={skipPregame}
      />

      <PauseOverlay
        isPaused={room.paused}
        hostName={nameOf(room.hostId) ?? 'el host'}
        isHost={isHost}
        onResume={resumeGame}
      />

      {/* El IFrame API de YouTube deja de responder con display:none: el contenedor queda montado fuera de la pantalla. */}
      <div
        ref={ytContainerRef}
        className="fixed pointer-events-none opacity-0"
        style={{
          width: '200px',
          height: '200px',
          transform: 'translate(-9999px, -9999px)',
        }}
      />
    </main>
  );
}
