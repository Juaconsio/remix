'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoscoStore, firstActiveIndex } from '../store/roscoStore';
import { useProviderStore } from '../store/providerStore';
import { useAudio } from '../hooks/useAudio';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { AudioPlayer } from '../game/components/AudioPlayer';
import { YouTubePlayer } from '../game/components/YouTubePlayer';
import { RoscoBoard } from './components/RoscoBoard';
import { HostControls } from './components/HostControls';

export default function RoscoScreen() {
  const router = useRouter();
  const {
    status,
    subMode,
    players,
    boards,
    currentPlayerIndex,
    awardLetter,
    skipLetter,
    answerCorrect,
    answerWrong,
    pasapalabra,
  } = useRoscoStore();

  const provider = useProviderStore((s) => s.provider);
  const { isPlaying, isLoading, progress, error, play, stop } = useAudio();
  const ytPlayer = useYouTubePlayer();
  // El error de proveedor se guarda junto a la letra en la que ocurrió, para
  // que deje de mostrarse automáticamente al cambiar de letra o turno.
  const [providerError, setProviderError] = useState<{ key: string; msg: string } | null>(null);

  const board = subMode === 'paralelo' ? boards[0] : boards[currentPlayerIndex];
  const activeIndex = board ? firstActiveIndex(board) : -1;
  const activeCell = board && activeIndex >= 0 ? board[activeIndex] : null;
  const activeKey = `${currentPlayerIndex}-${activeIndex}`;

  useEffect(() => {
    if (status === 'idle') router.replace('/');
    if (status === 'finished') router.replace('/rosco/results');
  }, [status, router]);

  // Detener el audio al cambiar de letra o de turno (sincronización externa).
  useEffect(() => {
    stop();
    ytPlayer.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  function handlePlay() {
    if (!activeCell) return;
    const song = activeCell.song;
    setProviderError(null);

    if (provider === 'youtube') {
      const videoId = song.providerIds?.youtube;
      if (!videoId) {
        setProviderError({ key: activeKey, msg: 'Esta canción no tiene vídeo de YouTube configurado' });
        return;
      }
      ytPlayer.play(videoId, song.hookStart, song.hookDuration);
    } else {
      const trackId =
        provider === 'spotify'
          ? song.providerIds?.spotify ?? String(song.deezerId)
          : String(song.deezerId);
      play(trackId, provider, song.hookStart, song.hookDuration);
    }
  }

  if (status !== 'playing' || !board || !activeCell) return null;

  const activeProviderError = providerError?.key === activeKey ? providerError.msg : null;
  const displayError = activeProviderError ?? (provider === 'youtube' ? ytPlayer.error : error);

  return (
    <main className="min-h-screen flex flex-col bg-background max-w-sm mx-auto">
      {/* Marcador */}
      <header className="px-5 pt-6 pb-2">
        <div className="flex flex-wrap gap-2 justify-center">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                subMode === 'turnos' && i === currentPlayerIndex
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border text-muted'
              }`}
            >
              <span className="font-semibold">{p.name}</span>
              <span className="ml-2 font-black text-accent">{p.score}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Rosco */}
        <div className="px-5 pt-4">
          <RoscoBoard board={board} activeIndex={activeIndex} />
        </div>

        {/* Audio de la letra activa */}
        {provider === 'youtube' ? (
          <YouTubePlayer
            isPlaying={ytPlayer.isPlaying}
            progress={ytPlayer.progress}
            error={displayError}
            embedUrl={ytPlayer.embedUrl}
            onPlay={handlePlay}
            onStop={ytPlayer.stop}
          />
        ) : (
          <AudioPlayer
            isPlaying={isPlaying}
            isLoading={isLoading}
            progress={progress}
            error={displayError}
            onPlay={handlePlay}
            onStop={stop}
          />
        )}

        {/* Controles del anfitrión */}
        <HostControls
          subMode={subMode}
          cell={activeCell}
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          onAward={awardLetter}
          onSkip={skipLetter}
          onCorrect={answerCorrect}
          onWrong={answerWrong}
          onPasapalabra={pasapalabra}
        />
      </div>
    </main>
  );
}
