import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useGameAudio } from '../hooks/useGameAudio';
import { GameHeader } from '../game/components/GameHeader';
import { RoscoBoard } from '../game/components/RoscoBoard';
import { RoscoControls } from '../game/components/RoscoControls';
import { PauseOverlay } from '../game/components/PauseOverlay';
import { Vinyl } from '../game/components/Vinyl';
import { PlayIcon } from '../game/components/VinylCrate';
import { boardFor, firstActiveIndex, nextLetter, type RoscoOutcome } from '../utils/rosco';
import { SIGNAL_ACCENT } from '../utils/songColor';
import { cn } from '../utils/cn';
import type { RoomPlayer } from '../types/socket';

interface ShownScore {
  score: number;
  gain: number;
  times: number;
}

function ScoreChip({ player, isTurn }: { player: RoomPlayer; isTurn: boolean }) {
  const [shown, setShown] = useState<ShownScore>({ score: player.score, gain: 0, times: 0 });
  if (player.score !== shown.score) {
    setShown({ score: player.score, gain: player.score - shown.score, times: shown.times + 1 });
  }

  return (
    <div
      className={cn('relative flex items-baseline gap-2 px-3 py-2', isTurn ? 'bg-cream text-ground' : 'bg-tono-2', !player.connected && 'opacity-40')}
    >
      <span className="font-display truncate max-w-32" style={{ fontSize: 16, fontWeight: 700 }}>{player.name}</span>
      <span className="font-display" style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{player.score}</span>
      <span className="font-label opacity-70">{player.score === 1 ? 'pt' : 'pts'}</span>
      <AnimatePresence>
        {shown.gain > 0 && (
          <motion.span
            key={shown.times}
            className="absolute -top-3 right-1 bg-success text-ground px-1.5 font-display"
            style={{ fontSize: 15, fontWeight: 900 }}
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0], y: [6, -4, -6, -10], scale: [0.8, 1.1, 1, 1] }}
            transition={{ duration: 1.6, times: [0, 0.15, 0.75, 1] }}
            aria-hidden="true"
          >
            +{shown.gain}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Rosco() {
  const navigate = useNavigate();
  const {
    room,
    myPlayerId,
    roscoAward,
    roscoSkip,
    roscoCorrect,
    roscoWrong,
    roscoPass,
    resumeGame,
  } = useSocket();

  const isHost = !!room && room.hostId === myPlayerId;
  const board = room ? boardFor(room) : null;
  const activeIndex = board ? firstActiveIndex(board) : -1;
  const activeCell = board && activeIndex >= 0 ? board[activeIndex] : null;
  const letterKey = `${room?.currentPlayerIndex}-${activeCell?.letter}`;

  const { activePlayer, displayError, ytContainerRef, playSong } = useGameAudio(room, {
    card: activeCell?.song ?? null,
    canPlay: isHost,
  });
  const autoplayedLetter = useRef<string | null>(null);

  useEffect(() => {
    if (!room) { navigate('/'); return; }
    if (room.status === 'lobby') navigate(`/lobby/${room.code}`);
    if (room.status === 'finished') navigate(`/results/${room.code}`);
  }, [room, navigate]);

  const { stop } = activePlayer;
  const isPaused = !!room?.paused;
  // El rosco no pasa por 'validating', así que nada corta el audio entre letras.
  useEffect(() => {
    if (!isPaused && autoplayedLetter.current === letterKey) return;
    stop();
  }, [letterKey, isPaused, stop]);

  if (!room?.rosco || !board) return null;

  const { subMode } = room.rosco;
  const turnPlayer = room.players[room.currentPlayerIndex];
  const correct = board.filter((c) => c.status === 'correct').length;

  const judgeAndPlayNext = (outcome: RoscoOutcome, judge: () => void) => {
    const next = nextLetter(room, outcome);
    judge();
    stop();
    autoplayedLetter.current = next ? `${next.playerIndex}-${next.cell.letter}` : null;
    if (next?.cell.song) playSong(next.cell.song);
  };

  const canPlayDisc = isHost && !!activeCell && !isPaused;
  const togglePlay = activePlayer.isPlaying ? activePlayer.stop : activePlayer.play;

  const subtitle = !activeCell
    ? 'se acabaron las letras.'
    : subMode === 'turnos'
    ? turnPlayer?.id === myPlayerId ? 'es tu turno: responde en voz alta.' : `turno de ${turnPlayer?.name}.`
    : 'escucha y responde en voz alta.';

  return (
    <main className="relative h-dvh overflow-y-auto overscroll-contain max-w-107.5 mx-auto grid grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)_auto] bg-ground text-cream">
      <GameHeader
        title={activeCell ? `letra ${activeCell.letter}.` : 'fin.'}
        subtitle={subtitle}
        stats={[`${correct}/${board.length} letras`]}
      />

      <div className="flex flex-wrap gap-2 px-5">
        {room.players.map((p, i) => (
          <ScoreChip key={p.id} player={p} isTurn={subMode === 'turnos' && i === room.currentPlayerIndex} />
        ))}
      </div>

      <div className="grid min-h-48 place-items-center px-5 py-3 [container-type:size]">
        <RoscoBoard board={board} activeIndex={activeIndex}>
          <button
            type="button"
            className="rosco-disco"
            onClick={togglePlay}
            disabled={!canPlayDisc}
            aria-label={activePlayer.isPlaying ? 'parar la canción' : 'escuchar la canción'}
          >
            <Vinyl accent={activeCell ? SIGNAL_ACCENT : null} spinning={isHost && activePlayer.isPlaying}>
              <span className="rosco-letra">{activeCell?.letter ?? 'fin.'}</span>
              {canPlayDisc && <PlayIcon playing={activePlayer.isPlaying} />}
            </Vinyl>
          </button>
        </RoscoBoard>
      </div>

      <footer className="flex flex-col gap-2 px-5 pt-3 pb-safe">
        {isHost && displayError && <p className="font-label text-signal">{displayError}</p>}
        {isHost && activeCell ? (
          <RoscoControls
            key={letterKey}
            subMode={subMode}
            cell={activeCell}
            players={room.players}
            onAward={(playerId, award) => judgeAndPlayNext('hit', () => roscoAward(playerId, award))}
            onSkip={() => judgeAndPlayNext('miss', roscoSkip)}
            onCorrect={(award) => judgeAndPlayNext('hit', () => roscoCorrect(award))}
            onWrong={() => judgeAndPlayNext('miss', roscoWrong)}
            onPass={() => judgeAndPlayNext('pass', roscoPass)}
          />
        ) : (
          <p className="font-display" style={{ fontSize: 20, lineHeight: 1.1 }}>
            {activeCell ? 'la música suena en el celular del host.' : 'contando los puntos…'}
          </p>
        )}
      </footer>

      <PauseOverlay
        isPaused={room.paused}
        hostName={room.players.find((p) => p.id === room.hostId)?.name ?? 'el host'}
        isHost={isHost}
        onResume={resumeGame}
      />

      {/* YouTube iframe — always off-screen, never display:none */}
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
