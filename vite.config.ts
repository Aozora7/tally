import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

const host = process.env.TAURI_DEV_HOST;
const isTauriBuild = !!process.env.TAURI_PLATFORM;

export default defineConfig({
  plugins: [react(), visualizer()],
  base: isTauriBuild ? './' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          host,
          port: 5173,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1100,
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('ag-grid-community')) {
            return 'ag-grid';
          }
          if (id.includes('react-dom-client')) {
            return 'react-dom';
          }
          if (id.includes('mantine')) {
            return 'mantine';
          }
        },
      },
    },
  },
});
