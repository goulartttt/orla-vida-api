import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/configurar.js'],
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 20_000,
  },
});
