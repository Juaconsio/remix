interface YouTubePlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  hookDuration: number;
  error: string | null;
  onPlay: () => void;
  onStop: () => void;
}

export function YouTubePlayer({ isPlaying, isLoading, progress, hookDuration, error, onPlay, onStop }: YouTubePlayerProps) {
  const finished = !isPlaying && !isLoading && progress >= 100;
  const pristine = !isPlaying && !isLoading && progress === 0;

  const secondsLeft = isPlaying
    ? Math.ceil(hookDuration * (1 - progress / 100))
    : null;

  function getButtonIcon() {
    if (isLoading) return '⏳';
    if (finished) return '↺';
    if (isPlaying) return '⏸';
    return '▶';
  }

  function getStatusText() {
    if (isLoading) return 'Cargando…';
    if (isPlaying && secondsLeft !== null) return `${secondsLeft}s`;
    if (finished) return 'Escuchar de nuevo';
    if (pristine) return `Clip: ${hookDuration}s`;
    return null;
  }

  const statusText = getStatusText();

  return (
    <div className="px-5 py-3 flex flex-col gap-3">
      {error && <p className="text-error text-sm text-center">{error}</p>}

      <div className="flex items-center gap-3">
        {/* Botón play/pause/replay con pulso durante reproducción */}
        <div className="relative shrink-0">
          {isPlaying && (
            <span className="absolute inset-0 rounded-full bg-accent opacity-40 animate-ping" />
          )}
          <button
            onClick={isPlaying ? onStop : onPlay}
            disabled={isLoading}
            className="relative w-12 h-12 rounded-full bg-accent flex items-center justify-center text-black font-bold text-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {getButtonIcon()}
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          {/* Barra de progreso */}
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${isPlaying || isLoading ? 'bg-accent' : finished ? 'bg-accent/40' : 'bg-border'}`}
              style={{ width: `${isLoading ? 0 : progress}%` }}
            />
          </div>

          {/* Texto de estado */}
          {statusText && (
            <p className={`text-xs ${isPlaying ? 'text-accent font-semibold' : 'text-muted'}`}>
              {statusText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
