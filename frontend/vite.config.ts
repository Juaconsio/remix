import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
    proxy: {
      // Dentro de Docker el backend es otro servicio; suelto, es localhost.
      '/api': BACKEND_ORIGIN,
      '/socket.io': {
        target: BACKEND_ORIGIN,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
