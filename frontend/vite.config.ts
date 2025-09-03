/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
import path from 'node:path';
// import { fileURLToPath } from 'node:url';
// Storybook test plugin (commented out for now)
// import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineConfig(({ command: _command }) => ({
  plugins: [react()],
  base: '/class_planner/',
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/stories/',
        '.storybook/',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
      ],
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}',
        '!src/**/__tests__/**',
        '!src/**/__mocks__/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    exclude: ['src/stories/**/*', '.storybook/**/*'],
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously',
      },
    },
  },
}));
