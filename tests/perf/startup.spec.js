/**
 * WS0 — Performance baseline harness.
 *
 * Seeds synthetic worlds of increasing size into IndexedDB, reloads (a realistic cold boot from
 * persisted data), and records: navigation timing (DCL/load — WS1 target), JS heap (WS2 target),
 * and full panel re-render time (WS3/WS4 target).
 *
 * Run:  npm run perf:fixtures   (once, to generate fixtures)
 *       npm run test:perf
 *
 * These are BASELINE measurements: thresholds are soft (we only hard-assert that the seeded world
 * actually loaded). Record the printed numbers in tests/perf/README.md as the "before" snapshot,
 * then re-run after each workstream to prove the win.
 */
import { test, expect } from '@playwright/test';
import {
  loadFixture, seedWorld, clearWorld,
  captureBootMetrics, measurePanelRender, logRow,
} from './perf-helpers.js';

const SIZES = [0, 50, 1000, 5000];

test.describe('Perf baseline — cold boot + panel render', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const size of SIZES) {
    test(`boot with ${size} articles`, async ({ page }) => {
      // 1. Boot once so the app + DB exist, then reset to a known state and seed.
      await page.goto('/forge/');
      await page.waitForSelector('.header-controls', { state: 'visible' });
      await clearWorld(page);
      if (size > 0) await seedWorld(page, loadFixture(size));

      // Suppress first-run tutorial so the overlay never interferes with measurement.
      await page.addInitScript(() => {
        try { localStorage.setItem('hasCompletedTutorial', 'true'); } catch (_) {}
      });

      // 2. Cold boot from the seeded data — this navigation is what we measure.
      const reloadStart = Date.now();
      await page.reload();
      const headerOk = await page.locator('.header-controls')
        .waitFor({ state: 'visible', timeout: 30_000 }).then(() => true).catch(() => false);
      console.log(`  [diag ${size}] header visible=${headerOk} after ${Date.now() - reloadStart}ms`);

      // Dismiss any lingering first-run overlay (defensive).
      const tutorialClose = page.locator('#tutorialCloseBtn');
      if (await tutorialClose.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tutorialClose.click().catch(() => {});
      }

      // 3. Wait until the seeded articles are actually in state, then measure.
      // `state` is a top-level `let` (global lexical binding), not a window property — reference it bare.
      const loaded = await page.waitForFunction(
        (n) => typeof state !== 'undefined' && state && Array.isArray(state.articles) && state.articles.length >= n,
        size, { timeout: 45_000 },
      ).then(() => true).catch(() => false);

      if (!loaded) {
        const got = await page.evaluate(
          () => (typeof state !== 'undefined' && state && state.articles) ? state.articles.length : -1
        ).catch(() => 'evaluate-failed');
        console.log(`  [diag ${size}] articles loaded so far: ${got} (expected ${size})`);
      }

      const metrics = await captureBootMetrics(page);
      const panelMs = await measurePanelRender(page);
      logRow(`${size} articles`, metrics, panelMs);

      // Hard assertion: the world loaded. Everything else is an observational baseline.
      expect(metrics.articlesLoaded).toBe(size);
    });
  }
});
