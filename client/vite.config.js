import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist',   // билд идёт в корень проекта → сервер раздаёт из ./dist
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',  // локально проксируем на Node.js
    },
  },
});
