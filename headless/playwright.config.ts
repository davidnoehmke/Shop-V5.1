import {defineConfig, devices} from '@playwright/test';

if (!process.env.PILOT_BASE_URL) throw new Error('PILOT_BASE_URL must point to the deployed Oxygen preview.');
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {baseURL: process.env.PILOT_BASE_URL, screenshot: 'only-on-failure', trace: 'off'},
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome']}},
    {name: 'mobile', use: {...devices['iPhone 13'], defaultBrowserType: 'chromium'}},
  ],
});
