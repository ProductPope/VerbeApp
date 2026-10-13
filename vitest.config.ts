import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'data',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/app/**'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          include: ['tests/app/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['tests/app/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/app/main.tsx'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
