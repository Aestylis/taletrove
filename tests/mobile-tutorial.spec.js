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

/** Synthetic touch long-press (same input path as initLongPressContextMenu). */
async function longPressAt(page, x, y) {
  await page.evaluate(async ({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    const opts = { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 7,
      clientX: x, clientY: y, isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    await new Promise((res) => setTimeout(res, 650));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
  }, { x, y });
}

test.describe('first-run try-it engine (compact)', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

  async function startFirstRun(page) {
    await gotoApp(page);
    await page.evaluate(() => startTutorial());
    await expect(page.locator('#mobileTutorialSheet')).toBeVisible();
  }

  /** Click Next until the sheet shows the given step title. */
  async function nextUntil(page, title) {
    for (let i = 0; i < 10; i++) {
      const t = await page.locator('#mobileTutorialSheet .mt-title').textContent();
      if (t === title) return;
      await page.locator('#mobileTutorialSheet .mt-next').click();
      await page.waitForTimeout(150);
    }
    throw new Error(`never reached step "${title}"`);
  }

  test('long-press step advances when the radial actually opens', async ({ page }) => {
    await startFirstRun(page);
    await nextUntil(page, 'Try it: long-press the map');
    // Try-it step: no Next button, skip link shown, ripple pulsing.
    await expect(page.locator('#mobileTutorialSheet .mt-next')).toBeHidden();
    await expect(page.locator('#mobileTutorialSheet .mt-skip-step')).toBeVisible();
    await expect(page.locator('#mobileTutorialRipple')).toBeVisible();

    const box = await page.locator('#map').boundingBox();
    await longPressAt(page, box.x + box.width / 2, box.y + box.height / 3);
    await expect(page.locator('#featureRadialMenu .radial-btn[data-label="Add Pin"]').last()).toBeVisible();
    // Sheet moved on to the next step.
    await expect(page.locator('#mobileTutorialSheet .mt-title')).not.toHaveText('Try it: long-press the map', { timeout: 3000 });
  });

  test('skip-this-step advances past a try-it without performing it', async ({ page }) => {
    await startFirstRun(page);
    await nextUntil(page, 'Try it: long-press the map');
    await page.locator('#mobileTutorialSheet .mt-skip-step').click();
    await expect(page.locator('#mobileTutorialSheet .mt-title')).not.toHaveText('Try it: long-press the map');
  });

  test('closing the tour sets hasCompletedTutorial and removes the UI', async ({ page }) => {
    await startFirstRun(page);
    await page.locator('#mobileTutorialSheet .mt-close').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#mobileTutorialSheet')).toHaveCount(0);
    const flag = await page.evaluate(() => loadLS('hasCompletedTutorial', false));
    expect(flag).toBe(true);
  });
});

test.describe('demo tour boot handoff (compact)', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

  test('pendingDemoTour flag boots into the mobile demo tour', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pendingDemoTour', JSON.stringify(Date.now()));
    });
    await page.goto('/forge/');
    await expect(page.locator('#mobileTutorialSheet')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#mobileTutorialSheet .mt-title')).toHaveText('Welcome to Aethermoor');
    await expect(page.locator('#mobileTutorialSheet .mt-dot')).toHaveCount(8);
    await expect(page.locator('#tutorialOverlay')).toBeHidden();
  });
});
