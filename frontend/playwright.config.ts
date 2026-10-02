import {defineConfig} from '@playwright/test';
import process from 'node:process';
export default defineConfig({
  testDir: './e2e', timeout: 240_000, fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {actionTimeout: 20_000, navigationTimeout: 20_000, baseURL: process.env.E2E_APP_URL || 'http://127.0.0.1:8080', viewport: {width: 1440, height: 1000}, trace: 'retain-on-failure', screenshot: 'only-on-failure'},
});
