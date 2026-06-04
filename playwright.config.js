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
    // Taller-than-default viewport (Desktop Chrome defaults to 720px high) so the full vertical
    // nav rail — calendar/timeline/help/graph/family-tree buttons sit low in it — stays on-screen
    // and clickable. The rail does not scroll buttons into view, so a short viewport leaves them
    // "outside of the viewport" for Playwright clicks.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 1000 } } },
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
