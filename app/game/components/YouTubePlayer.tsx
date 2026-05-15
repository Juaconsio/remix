'use client';

interface YouTubePlayerProps {
  isPlaying: boolean;
  progress: number;
  error: string | null;
  embedUrl: string | null;
  onPlay: () => void;
  onStop: () => void;
}

export function YouTubePlayer({
  isPlaying,
  progress,
  error,
  embedUrl,
  onPlay,
  onStop,
}: YouTubePlayerProps) {
  return (
    <div className="px-5 py-3 flex flex-col gap-3">
      {error && <p className="text-error text-sm text-center">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? onStop : onPlay}
          className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-black font-bold text-xl shrink-0 active:scale-95 transition-transform"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* iframe fuera de pantalla — necesario para que el audio reproduzca */}
      {embedUrl && (
        <iframe
          key={embedUrl}
          src={embedUrl}
          allow="autoplay; encrypted-media"
          style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1 }}
        />
      )}
    </div>
  );
}
