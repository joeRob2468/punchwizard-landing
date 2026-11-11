import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { bakeSpecimen } from './vite-plugins/bake.ts';

export default defineConfig({
  plugins: [react(), bakeSpecimen()],
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
});
