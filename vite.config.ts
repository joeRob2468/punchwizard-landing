import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { bakeSpecimen } from './vite-plugins/bake.ts';

export default defineConfig({
  plugins: [react(), bakeSpecimen()],
  build: {
    // One page, one entry: three.js makes the main chunk ~1.6 MB (~470 KB gzipped).
    // Splitting it would not reduce what a visitor downloads, so don't warn about it.
    chunkSizeWarningLimit: 1800,
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
});
