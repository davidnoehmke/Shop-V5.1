import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'tests',testMatch:'**/*.spec.ts',fullyParallel:true,workers:3,
  timeout:30000,retries:process.env.CI?1:0,reporter:'list',
  use:{baseURL:process.env.BASE_URL||'http://127.0.0.1:3500',browserName:'chromium',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH},screenshot:'only-on-failure',trace:'off'},
  webServer:process.env.BASE_URL?undefined:[
    {command:'node tests/fixture-server.mjs',url:'http://127.0.0.1:3501/health',reuseExistingServer:!process.env.CI},
    {command:'node .output/server/index.mjs',url:'http://127.0.0.1:3500',env:{PORT:'3500',HOST:'127.0.0.1',NUXT_SUPABASE_URL:'http://127.0.0.1:3501',NUXT_SUPABASE_PUBLISHABLE_KEY:'fixture-public-read'},reuseExistingServer:!process.env.CI},
  ],
})
