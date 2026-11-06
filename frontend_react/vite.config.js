import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3001,
    proxy: {
      '/v1': {
        target: 'https://agentengine.duckdns.org',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../frontend_dist',
    emptyOutDir: true,
  },
});

