import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'Rewind — El juego de música',
  description: '¿Puedes ordenar las canciones en su línea de tiempo?',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geist.variable}>
      <body className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
