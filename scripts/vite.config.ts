import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Minimal Vite configuration for the renderer process.
 *
 * Using a colocated config keeps the main tsconfig.json clean and allows
 * tweaking the renderer build without polluting the project root.
 */
export default defineConfig({
  root: resolve(__dirname, '../src/renderer'),
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, '../src/renderer'),
      '@api': resolve(__dirname, '../src/api'),
      '@shared': resolve(__dirname, '../src/shared'),
      '@utils': resolve(__dirname, '../src/utils'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../dist/renderer'),
    emptyOutDir: true,
  },
});
