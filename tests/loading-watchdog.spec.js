/**
 * setLoadingState watchdog — the 30s "taking longer than expected" toast must
 * fire only for operations that are actually still running. Historically the
 * timer was never disarmed on completion, so every save/import/load nagged 30
 * seconds later regardless of success.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const NAG = 'taking longer';

test('completing an operation disarms the slow-operation watchdog', async ({ page }) => {
  await gotoApp(page);
  await page.clock.install();
  await page.evaluate(() => { setLoadingState(true, 'Testing'); setLoadingState(false); });
  await page.clock.runFor(31000);
  const nags = await page.locator('#toastContainer .toast-message', { hasText: NAG }).count();
  expect(nags, 'no watchdog toast after a completed operation').toBe(0);
});

test('a genuinely hung operation still shows the watchdog toast', async ({ page }) => {
  await gotoApp(page);
  await page.clock.install();
  await page.evaluate(() => { setLoadingState(true, 'Hanging'); });
  await page.clock.runFor(30500);
  await expect(page.locator('#toastContainer .toast-message', { hasText: NAG })).toHaveCount(1);
});

// Regression: exportBundleFrom's non-streaming fallback (the only path on browsers without
// showSaveFilePicker, e.g. Firefox) used to have no try/catch/finally around zip.generateAsync.
// A failed export threw an unhandled rejection, skipped setLoadingState(false), and left the
// watchdog armed to fire a confusing false "taking longer than expected" toast 30s later — with
// the real failure never shown to the user.
test('a failed (non-streaming) export disarms the watchdog and shows an error', async ({ page }) => {
  await gotoApp(page);
  await page.clock.install();
  await page.evaluate(async () => {
    window.showSaveFilePicker = undefined; // force the fallback path
    JSZip.prototype.generateAsync = async () => { throw new Error('SIMULATED_EXPORT_FAILURE'); };
    await exportBundleFrom({ settings, state }, 'test.trv', [], null);
  });
  await expect(page.locator('#alertModalTitle')).toHaveText('Export Failed');
  await page.clock.runFor(31000);
  const nags = await page.locator('#toastContainer .toast-message', { hasText: NAG }).count();
  expect(nags, 'a failed export must not leave the watchdog armed').toBe(0);
});
