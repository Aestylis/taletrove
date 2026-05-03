import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // IndexedDB — tests must not share state
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:8000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // Give the app time to fully boot (IDB init + ES module loads)
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Auto-start a static file server if one isn't already running.
  // reuseExistingServer: true means "npx serve" is skipped if port 8000 is taken —
  // so running `python -m http.server` manually before `npm test` works fine too.
  webServer: {
    command: 'npx serve . -l 8000 --no-clipboard',
    url: 'http://localhost:8000',
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
