/**
 * Draw▾ trigger remembers the last sub-tool (2026-10 UX pass, tier 2): after a sub-tool is
 * picked, the trigger shows that tool's icon, a click on the icon re-arms it without opening the
 * menu, and the caret still opens the menu. The choice persists across reloads.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const mode = (page) => page.evaluate(() => window.uiMode);
const triggerIcon = (page) => page.evaluate(() => document.querySelector('#drawGroupBtn .icon-container:not(.draw-caret)').style.maskImage);

test('Draw trigger mirrors and re-arms the last sub-tool', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(() => window.flushSave());

  // Fresh profile: the trigger is a plain pencil and opens the menu.
  expect(await triggerIcon(page)).toContain('pencil.svg');
  await page.locator('#drawGroupBtn').click();
  await expect(page.locator('#drawGroupPopover')).toBeVisible();
  await page.locator('#modeAreaBtn').click();
  await expect(page.locator('#drawGroupPopover')).toBeHidden();
  await expect.poll(() => mode(page)).toBe('add-polygon');
  expect(await triggerIcon(page)).toContain('area.svg');

  await page.keyboard.press('Escape');
  await expect.poll(() => mode(page)).toBe('pointer');

  // Click on the icon half re-arms Area directly; the menu stays closed.
  const box = await page.locator('#drawGroupBtn').boundingBox();
  await page.mouse.click(box.x + 10, box.y + box.height / 2);
  await expect.poll(() => mode(page)).toBe('add-polygon');
  await expect(page.locator('#drawGroupPopover')).toBeHidden();
  await page.keyboard.press('Escape');

  // The caret opens the menu.
  await page.locator('#drawGroupBtn .draw-caret').click();
  await expect(page.locator('#drawGroupPopover')).toBeVisible();
  await page.keyboard.press('Escape');

  // Persists across reload.
  await page.reload();
  await page.waitForSelector('.header-controls', { state: 'visible' });
  // Boot wiring runs at DOMContentLoaded, after the static header is already visible.
  await expect.poll(() => triggerIcon(page)).toContain('area.svg');
});
