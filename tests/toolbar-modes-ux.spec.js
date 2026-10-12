/**
 * Placement-tool feel (2026-10 UX pass, item 4): Escape dismisses the pin-type flyout and
 * cancels an armed tool; placement modes show a crosshair and an on-canvas hint; Tool Lock keeps
 * the tool armed for rapid placement (and skips name-first focus); the filter bar is captioned so
 * it no longer reads as a second creation toolbar.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const armPinTool = async (page) => {
  await page.locator('#modePinBtn').click();
  await page.locator('#pinFlyout li', { hasText: 'Place' }).click();
  await expect.poll(() => page.evaluate(() => window.uiMode)).toBe('add-marker');
};
const clickMap = async (page, fx, fy) => {
  const box = await page.locator('#map').boundingBox();
  await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
  await page.mouse.down();
  await page.mouse.up();
};
const pinCount = (page) => page.evaluate(() => state.articles.filter(a => a.geometry === 'point').length);

test.describe('Placement tools', () => {
  test('Escape closes the pin flyout, and cancels an armed tool', async ({ page }) => {
    await gotoApp(page);
    await page.locator('#modePinBtn').click();
    await expect(page.locator('#pinFlyout')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#pinFlyout')).toHaveCount(0);

    await armPinTool(page);
    await expect(page.locator('.map-wrap')).toHaveClass(/cursor-add-marker/);
    await expect(page.locator('#modeHint')).toBeVisible();
    await expect(page.locator('#modeHint')).toContainText('place the pin');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => window.uiMode)).toBe('pointer');
    await expect(page.locator('#modeHint')).toBeHidden();
    await expect(page.locator('.map-wrap')).not.toHaveClass(/cursor-add-marker/);
  });

  test('Tool Lock keeps the pin tool armed and skips the naming focus', async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(() => window.flushSave());
    await armPinTool(page);
    await page.locator('#modeHintLock').check();

    // #map spans the full width under the overlays: the World panel covers the left ~410px,
    // a 480px peek sheet covers the right after the first pin, and the "Start with a base map"
    // card sits in the centre. Keep clicks in the middle band, above or below the card.
    await clickMap(page, 0.5, 0.2);
    await expect.poll(pinCount.bind(null, page)).toBe(1);
    await page.waitForTimeout(400); // past the mode debounce
    expect(await page.evaluate(() => window.uiMode)).toBe('add-marker');
    expect(await page.evaluate(() => document.activeElement?.isContentEditable || false)).toBe(false);

    await clickMap(page, 0.4, 0.85);
    await expect.poll(pinCount.bind(null, page)).toBe(2);
    await page.waitForTimeout(400); // re-arm is behind the same debounce

    await page.locator('#modeHintLock').uncheck();
    await clickMap(page, 0.6, 0.15);
    await expect.poll(pinCount.bind(null, page)).toBe(3);
    await expect.poll(() => page.evaluate(() => window.uiMode)).toBe('pointer');
  });

  test('the filter bar is captioned so it reads as a visibility control', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('#filterToolbar .toolbar-caption')).toHaveText('Show');
  });
});
