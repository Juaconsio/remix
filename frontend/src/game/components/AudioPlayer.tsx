

interface AudioPlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  error: string | null;
  onPlay: () => void;
  onStop: () => void;
}

export function AudioPlayer({
  isPlaying,
  isLoading,
  progress,
  error,
  onPlay,
  onStop,
}: AudioPlayerProps) {
  return (
    <div className="px-5 py-3 flex flex-col gap-3">
      {error && <p className="text-error text-sm text-center">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? onStop : onPlay}
          disabled={isLoading}
          className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-black font-bold text-xl disabled:opacity-50 shrink-0 active:scale-95 transition-transform"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
          ) : isPlaying ? (
            '⏸'
          ) : (
            '▶'
          )}
        </button>

        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
