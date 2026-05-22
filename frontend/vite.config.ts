import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': 'http://backend:4000',
      '/socket.io': {
        target: 'http://backend:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
