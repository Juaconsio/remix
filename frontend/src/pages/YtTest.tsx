import { useEffect, useRef, useState } from 'react';

const VIDEO_ID = 'ICNtZKmQGMw'; // Peach Pit – Alrighty Aphrodite
const HOOK_START = 30;
const HOOK_DURATION = 15;

// Singleton: la API se carga una sola vez aunque haya múltiples stages en la página
let ytApiPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// ─── Stage 1: iframe crudo ──────────────────────────────────────────────────

function Stage1Raw() {
  const src = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&playsinline=1&controls=1&start=${HOOK_START}`;
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-foreground mb-1">Etapa 1 — iframe crudo</h2>
      <p className="text-xs text-muted mb-3">
        Sin JS API. Si no reproduce acá, el problema es el browser o el video.
      </p>
      <iframe
        src={src}
        width="320"
        height="180"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ border: 'none', borderRadius: 8 }}
      />
    </section>
  );
}

// ─── Stage 2: IFrame Player API visible ────────────────────────────────────

function Stage2Visible() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [log, setLog] = useState<string[]>(['esperando...']);
  const [canUnmute, setCanUnmute] = useState(false);

  function addLog(msg: string) {
    setLog((prev) => [...prev.slice(-6), msg]);
  }

  useEffect(() => {
    loadYTApi().then(() => {
      if (!containerRef.current || playerRef.current) return;

      const inner = document.createElement('div');
      containerRef.current.appendChild(inner);

      playerRef.current = new window.YT.Player(inner, {
        width: 320,
        height: 200,
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 1,
          playsinline: 1,
          rel: 0,
          start: HOOK_START,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            addLog('onReady');
            e.target.seekTo(HOOK_START, true);
            e.target.playVideo();
          },
          onStateChange: (e) => {
            const labels: Record<number, string> = {
              [-1]: 'sin iniciar', 0: 'finalizado', 1: 'reproduciendo',
              2: 'pausado', 3: 'buffering', 5: 'en cola',
            };
            addLog(`estado: ${labels[e.data] ?? e.data}`);
            if (e.data === 1) setCanUnmute(true);
          },
          onError: (e) => addLog(`ERROR código ${e.data}`),
          onAutoplayBlocked: () => addLog('AUTOPLAY BLOQUEADO'),
        },
      });
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  function handleUnmute() {
    playerRef.current?.unMute();
    playerRef.current?.setVolume(100);
    addLog('unMute() llamado con gesto');
  }

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-foreground mb-1">Etapa 2 — IFrame API visible</h2>
      <p className="text-xs text-muted mb-3">
        Player visible. Si reproduce pero sin audio, el problema es el unmute.
      </p>
      <div ref={containerRef} className="mb-3" />
      <button
        onClick={handleUnmute}
        disabled={!canUnmute}
        className="px-4 py-2 rounded-xl bg-accent text-black font-bold text-sm disabled:opacity-40 mb-3"
      >
        Unmute (gesto manual)
      </button>
      <div className="bg-surface border border-border rounded-xl p-3">
        <p className="text-xs text-muted mb-1 font-mono uppercase tracking-wide">Log</p>
        {log.map((l, i) => (
          <p key={i} className="text-xs font-mono text-foreground">{l}</p>
        ))}
      </div>
    </section>
  );
}

// ─── Stage 3: IFrame API oculto + controles custom ─────────────────────────

function Stage3Hidden() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [log, setLog] = useState<string[]>(['esperando play...']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'stopped'>('idle');
  const [progress, setProgress] = useState(0);

  function addLog(msg: string) {
    setLog((prev) => [...prev.slice(-8), msg]);
  }

  useEffect(() => {
    loadYTApi().then(() => addLog('API lista'));
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  function handlePlay() {
    if (status === 'loading' || status === 'playing') return;

    addLog('play() llamado');
    setStatus('loading');
    setProgress(0);

    if (!window.YT?.Player) {
      addLog('API no lista aún');
      return;
    }

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const inner = document.createElement('div');
    containerRef.current.appendChild(inner);

    playerRef.current = new window.YT.Player(inner, {
      width: '100%',
      height: '100%',
      videoId: VIDEO_ID,
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        disablekb: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        start: HOOK_START,
        vq: 'tiny',
        origin: window.location.origin,
      },
      events: {
        onReady: (e) => {
          addLog('onReady → seekTo + playVideo');
          e.target.seekTo(HOOK_START, true);
          e.target.playVideo();
        },
        onStateChange: (e) => {
          const labels: Record<number, string> = {
            [-1]: 'sin iniciar', 0: 'finalizado', 1: 'reproduciendo',
            2: 'pausado', 3: 'buffering', 5: 'en cola',
          };
          addLog(`estado: ${labels[e.data] ?? e.data}`);

          if (e.data === 1) {
            e.target.unMute();
            e.target.setVolume(100);
            addLog('unMute() + setVolume(100)');
            setStatus('playing');

            const start = Date.now();
            const tick = setInterval(() => {
              const elapsed = (Date.now() - start) / 1000;
              setProgress(Math.min(100, (elapsed / HOOK_DURATION) * 100));
            }, 100);

            stopTimerRef.current = setTimeout(() => {
              clearInterval(tick);
              playerRef.current?.pauseVideo();
              setStatus('stopped');
              setProgress(100);
              addLog('hookDuration terminado → stop');
            }, HOOK_DURATION * 1000);
          }
        },
        onError: (e) => {
          addLog(`ERROR código ${e.data}`);
          setStatus('idle');
        },
        onAutoplayBlocked: () => {
          addLog('AUTOPLAY BLOQUEADO');
          setStatus('idle');
        },
      },
    });
  }

  function handleStop() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    playerRef.current?.pauseVideo();
    setStatus('idle');
    setProgress(0);
    addLog('stop()');
  }

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-foreground mb-1">Etapa 3 — API oculta + controles custom</h2>
      <p className="text-xs text-muted mb-3">
        Idéntico a producción: iframe 200×200 fuera de pantalla, controles propios.
      </p>

      {/* Contenedor oculto — igual a Game.tsx */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          width: '200px',
          height: '200px',
          transform: 'translate(-9999px, -9999px)',
          pointerEvents: 'none',
          opacity: 0,
        }}
      />

      {/* Controles */}
      <div className="flex gap-3 mb-3">
        <button
          onClick={handlePlay}
          disabled={status === 'loading' || status === 'playing'}
          className="flex-1 py-3 rounded-xl bg-accent text-black font-bold disabled:opacity-40"
        >
          {status === 'loading' ? 'Cargando...' : status === 'playing' ? 'Reproduciendo' : 'Play'}
        </button>
        <button
          onClick={handleStop}
          disabled={status === 'idle' || status === 'stopped'}
          className="px-5 py-3 rounded-xl border border-border text-foreground font-bold disabled:opacity-40"
        >
          Stop
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="w-full h-1.5 bg-surface rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Log */}
      <div className="bg-surface border border-border rounded-xl p-3">
        <p className="text-xs text-muted mb-1 font-mono uppercase tracking-wide">Log</p>
        {log.map((l, i) => (
          <p key={i} className="text-xs font-mono text-foreground">{l}</p>
        ))}
      </div>
    </section>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function YtTest() {
  return (
    <main className="min-h-screen px-5 pt-10 pb-16 bg-background max-w-sm mx-auto">
      <h1 className="text-2xl font-black text-foreground mb-1">YouTube Mobile Test</h1>
      <p className="text-xs text-muted mb-8">
        Video: <span className="font-mono text-accent">{VIDEO_ID}</span> · start {HOOK_START}s · {HOOK_DURATION}s
      </p>
      <Stage1Raw />
      <Stage2Visible />
      <Stage3Hidden />
    </main>
  );
}
