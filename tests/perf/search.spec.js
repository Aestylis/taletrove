/**
 * WS5 baseline — how slow is the command-palette search at scale?
 *
 * `performGlobalSearch` (data.js) linearly scans every map + article + all their content blocks,
 * normalizing strings on each call. The command palette runs it per keystroke, undebounced. This
 * measures its cost on the 5k-article fixture to decide whether a search index (WS5) is justified.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from '../helpers.js';
import { loadFixture, seedWorld, clearWorld } from './perf-helpers.js';

test.describe('WS5 baseline — global search', () => {
  test.describe.configure({ timeout: 120_000 });

  test('performGlobalSearch timing on 5k articles', async ({ page }) => {
    await gotoApp(page);
    await clearWorld(page);
    await seedWorld(page, loadFixture(5000));
    await page.reload();
    await page.waitForSelector('.header-controls', { state: 'visible' });
    await page.waitForFunction(() =>
      typeof state !== 'undefined' && state.articles && state.articles.length >= 5000, null, { timeout: 30_000 });

    const m = await page.evaluate(() => {
      const queries = ['a', 'ke', 'keep', 'lorem', 'xyzzy-no-match'];
      const median = (fn) => {
        const s = [];
        for (let i = 0; i < 7; i++) { const t = performance.now(); fn(); s.push(performance.now() - t); }
        s.sort((a, b) => a - b);
        return +s[3].toFixed(2);
      };
      const out = {};
      for (const q of queries) out[q] = median(() => performGlobalSearch(q));
      out.articleCount = state.articles.length;
      return out;
    });

    console.log('  WS5 search baseline (5k):', JSON.stringify(m));
    // No hard assertion — this is a measurement. Just prove it ran on the full world.
    expect(m.articleCount).toBeGreaterThanOrEqual(5000);
  });
});
