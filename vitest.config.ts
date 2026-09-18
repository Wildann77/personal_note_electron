import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@preload': path.resolve(__dirname, 'src/preload'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', 'out/**', '.vite/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/shared/types/**',
        'src/**/index.ts',
        'src/main/domain/repositories/INoteRepository.ts',
        'src/main/domain/services/IEventHub.ts',
        'src/renderer/main.tsx',
        'src/renderer/index.html',
      ],
      thresholds: {
        'src/main/domain/**': {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
        'src/shared/utils/**': {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
      },
    },
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
          environment: 'node',
        },
      },
    ],
  },
});
