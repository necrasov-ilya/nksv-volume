import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/editor/',
  build: {
    outDir: '../public/editor',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/js': 'http://127.0.0.1:3000',
      '/vendor': 'http://127.0.0.1:3000',
      '/style.css': 'http://127.0.0.1:3000',
      '/r': 'http://127.0.0.1:3000',
    },
  },
});