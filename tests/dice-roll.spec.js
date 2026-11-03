/**
 * Inline dice rolls (GitHub issue #2).
 *
 * Pre-fix, `rollDice` set the full-viewport #dice-box canvas to pointer-events:auto for the
 * roll and never reset it when a roll threw; any non-default theme threw (its theme.config.json
 * 404'd on the dice-box CDN dist), leaving an invisible layer that swallowed every click until
 * reload. Even successful rolls blocked the app for ~5 s.
 *
 * Needs network (dice-box + themes load from jsDelivr) and WebGL; skips if the engine can't init.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

async function openDiceEntry(page, theme) {
  await gotoApp(page);
  // dice-roller.js is an ES module that inits asynchronously from the CDN.
  const ready = await page.waitForFunction(() => {
    const el = document.getElementById('dice-box');
    return el && el.parentElement === document.body && el.querySelector('canvas');
  }, null, { timeout: 20000 }).then(() => true, () => false);
  test.skip(!ready, 'DiceBox engine did not initialise (offline / no WebGL)');
  await page.evaluate(async (theme) => {
    await window.flushSave();
    settings.diceTheme = theme;
    state.articles.push({ id: 'dice-e', _silo: 'lore', name: 'Dice', title: 'Dice', type: 'Lore', tags: [], links: [],
      blocks: [{ blockId: 'b1', type: 'TextField', visibleToPlayers: true, data: { content: 'Roll {{1d20}} now', label: '' } }] });
    syncArticleViews();
    window.enterArticleMode('dice-e', 'encyclopedia');
  }, theme);
  const btn = page.locator('#infoPanel .dice-roll-link').first();
  await expect(btn).toBeVisible();
  return btn;
}

const overlayBlocksCenter = (page) => page.evaluate(() => {
  const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return !!top && !!top.closest('#dice-box');
});

for (const theme of ['default', 'wooden']) {
  test(`rolling with the "${theme}" theme never blocks the app`, async ({ page }) => {
    test.setTimeout(60000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const themeResponses = [];
    page.on('response', r => { if (r.url().includes('theme.config.json')) themeResponses.push(`${r.status()} ${r.url()}`); });

    const btn = await openDiceEntry(page, theme);
    await btn.click();

    // Visible while rolling, but click-through.
    await expect(page.locator('#dice-box')).toHaveClass(/is-visible/);
    expect(await overlayBlocksCenter(page)).toBe(false);

    await expect(page.locator('#toastContainer .toast-item', { hasText: 'Roll Result' })).toBeVisible({ timeout: 20000 });
    expect(await overlayBlocksCenter(page)).toBe(false);

    // A second roll still works (the app is not frozen).
    await btn.click();
    await expect(page.locator('#toastContainer .toast-item', { hasText: 'Roll Result' })).toHaveCount(1, { timeout: 20000 });

    if (theme !== 'default') {
      expect(themeResponses.some(r => r.startsWith('200') && r.includes(`dice-themes@0.2.1/themes/${theme}/`))).toBe(true);
    }
    expect(themeResponses.filter(r => !r.startsWith('200'))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('an unavailable theme falls back to default and still rolls', async ({ page }) => {
  test.setTimeout(60000);
  const btn = await openDiceEntry(page, 'no-such-theme');
  await btn.click();
  await expect(page.locator('#toastContainer .toast-item', { hasText: 'Roll Result' })).toBeVisible({ timeout: 20000 });
  expect(await overlayBlocksCenter(page)).toBe(false);
});
