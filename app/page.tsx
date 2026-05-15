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

        <Link
          href="/setup"
          className="w-full py-4 rounded-2xl bg-accent text-black font-bold text-lg text-center transition-opacity active:opacity-80"
        >
          Nueva partida
        </Link>
      </div>
    </main>
  );
}
