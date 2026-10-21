import {defineConfig} from '@playwright/test';
import process from 'node:process';
// Product-tour screenshots and video for the README, taken from the seeded demo account.
export default defineConfig({
  testDir: '.', timeout: 180_000, workers: 1, retries: 0, reporter: [['list']],
  use: {baseURL: process.env.E2E_APP_URL || 'http://127.0.0.1:8080', actionTimeout: 20_000, navigationTimeout: 20_000, viewport: {width: 1440, height: 900}, trace: 'retain-on-failure'},
});
