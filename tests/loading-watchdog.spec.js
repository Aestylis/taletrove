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
