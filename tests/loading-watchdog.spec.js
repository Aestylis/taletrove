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

// Belt-and-suspenders: some call sites (navigateToMap) disarm via a deferred,
// task-counter-gated callback instead of a plain finally. If that bookkeeping is ever wrong
// and the 30s timer never gets cleared, the overlay's own visibility is still checked before
// nagging — a spinner that isn't showing anymore must never trigger the "still running" toast,
// regardless of what caused the timer mismatch.
test('watchdog does not nag if the overlay was already hidden by another path', async ({ page }) => {
  await gotoApp(page);
  await page.clock.install();
  await page.evaluate(() => {
    setLoadingState(true, 'Testing');
    // Simulate the overlay being hidden without going through setLoadingState(false) —
    // e.g. a disarm path that forgot to clearTimeout(loadingTimeout).
    document.querySelector('#loadingOverlay').classList.add('hidden');
  });
  await page.clock.runFor(31000);
  const nags = await page.locator('#toastContainer .toast-message', { hasText: NAG }).count();
  expect(nags, 'overlay already hidden must suppress the watchdog toast').toBe(0);
});

// Regression: setLoadingState(false)'s 300ms anti-flicker hide timer was untracked. A
// false→true sequence inside that window (an export completes, the user immediately opens
// another map) let the stale timer hide the overlay mid-operation — and the hidden-overlay
// guard above then silently disarmed the hang watchdog too: no spinner AND no toast on a
// genuine hang. The true branch must cancel the pending hide timer.
test('an operation started inside the 300ms hide window keeps its overlay and watchdog', async ({ page }) => {
  await gotoApp(page);
  await page.clock.install();
  await page.evaluate(() => { setLoadingState(true, 'Op 1'); setLoadingState(false); });
  await page.clock.runFor(50);
  await page.evaluate(() => { setLoadingState(true, 'Op 2'); });
  await page.clock.runFor(500);
  const visible = await page.evaluate(() =>
    !document.querySelector('#loadingOverlay').classList.contains('hidden'));
  expect(visible, 'overlay must stay visible for the operation started inside the hide window').toBe(true);
  // and if Op 2 genuinely hangs, the watchdog must still fire
  await page.clock.runFor(30000);
  await expect(page.locator('#toastContainer .toast-message', { hasText: NAG })).toHaveCount(1);
});
