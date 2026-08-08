import { defineConfig } from 'vite';

export default defineConfig({
  base: '/MindGames/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});

