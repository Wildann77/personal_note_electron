import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['better-sqlite3'], // Native binary wajib dieksternalisasi dari bundle Vite
      output: {
        entryFileNames: 'main.js',
      },
    },
  },
});
