import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

const sharedAlias = {
  '@shared': resolve('src/shared'),
  '@components': resolve('src/client/components'),
  '@client': resolve('src/client'),
  '@imgs': resolve('src/client/imgs'),
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: sharedAlias,
    },
    define: {
      VERSION: JSON.stringify(pkg.version),
    },
  },
  renderer: {
    root: resolve('src'),
    resolve: {
      alias: {
        ...sharedAlias,
        electron: resolve('src/shared-electron/electron-runtime.ts'),
      },
    },
    plugins: [react()],
    define: {
      VERSION: JSON.stringify(pkg.version),
    },
    optimizeDeps: {
      exclude: ['electron'],
    },
    build: {
      rollupOptions: {
        input: resolve('src/index.html'),
      },
    },
    css: {
      modules: {
        generateScopedName: '[name]__[local]__[hash:base64:5]',
      },
    },
  },
});
