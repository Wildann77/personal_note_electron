import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './tests/e2e/fixtures/globalSetup.ts',
  testDir: 'tests',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
});
