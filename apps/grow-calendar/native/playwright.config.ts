import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  testDir: '.', testMatch: '**/*.spec.ts', fullyParallel: true, workers: 3,
  timeout: 30000, retries: process.env.CI ? 1 : 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3502', browserName: 'chromium', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }, screenshot: 'only-on-failure', trace: 'off' },
  webServer: { command: 'node native/fixture-server.mjs', cwd: fileURLToPath(new URL('..', import.meta.url)), url: 'http://127.0.0.1:3502/health', reuseExistingServer: !process.env.CI },
})
