import Link from 'next/link';

export default function HomeScreen() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="flex flex-col items-center gap-10 w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-6xl">⏪</span>
          <h1 className="text-5xl font-black tracking-tight text-white">Rewind</h1>
          <p className="text-[#888] text-base">
            Escucha. Recuerda. Ordena.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/setup"
            className="w-full px-5 py-4 rounded-2xl bg-accent text-black text-center transition-opacity active:opacity-80"
          >
            <span className="block font-bold text-lg">Clásico</span>
            <span className="block text-sm opacity-80">Línea de tiempo · ordena por año</span>
          </Link>

          <Link
            href="/rosco/setup"
            className="w-full px-5 py-4 rounded-2xl border border-border bg-surface text-foreground text-center transition-opacity active:opacity-80"
          >
            <span className="block font-bold text-lg">Rosco musical</span>
            <span className="block text-sm text-muted">Adivina la canción de cada letra</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
