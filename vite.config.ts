import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', outDir: 'dist' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never);
