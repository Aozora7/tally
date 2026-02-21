import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react(), visualizer()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('ag-grid-community')) {
            return 'ag-grid';
          }
          if (id.includes('react-dom-client')) {
            return 'react-dom';
          }
          if (id.includes('recharts')) {
            return 'recharts';
          }
          if (id.includes('mantine')) {
            return 'mantine';
          }
        },
      },
    },
  },
});
