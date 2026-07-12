/**
 * Mobile interactive tutorial (mobile-tutorial.js) — routing, try-it engine,
 * skip paths, and the demo-tour boot handoff at compact.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('routing', () => {
  test.describe('compact', () => {
    test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

    test('startTutorial opens the mobile coach-mark sheet, not the desktop overlay', async ({ page }) => {
      await gotoApp(page);
      await page.evaluate(() => startTutorial());
      await expect(page.locator('#mobileTutorialSheet')).toBeVisible();
      await expect(page.locator('#tutorialOverlay')).toBeHidden();
    });
  });

  test.describe('desktop', () => {
    test('startTutorial keeps the desktop overlay at desktop size', async ({ page }) => {
      await gotoApp(page);
      await page.evaluate(() => startTutorial());
      await expect(page.locator('#tutorialOverlay')).toBeVisible();
      await expect(page.locator('#mobileTutorialSheet')).toHaveCount(0);
      await page.locator('#tutorialCloseBtn').dispatchEvent('click');
    });
  });
});
