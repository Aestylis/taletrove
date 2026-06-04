/**
 * Smoke tests — app loads and core shell elements are present.
 * These must pass with an empty world (no IDB data).
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('App shell', () => {
  test('loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await gotoApp(page);

    // Filter known third-party noise (Babylon.js banner, SW, AppShell scaling log)
    const critical = errors.filter(msg =>
      !msg.includes('Babylon.js') &&
      !msg.includes('[SW]') &&
      !msg.includes('AppShell')
    );
    expect(critical, `Unexpected JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('toolbar buttons are visible', async ({ page }) => {
    await gotoApp(page);
    for (const id of ['calendarBtn', 'relationalGraphBtn', 'familyTreeBtn', 'helpBtn', 'timelineBtn']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('Atlas panel and its tabs are present', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('#atlasPanel')).toBeVisible();
    // Post unified-panel refactor: the left panel has Atlas + Assets tabs (no Encyclopedia tab).
    await expect(page.locator('#atlasTabBtn')).toBeVisible();
    await expect(page.locator('#assetsTabBtn')).toBeVisible();
    await expect(page.locator('#atlasView')).toBeAttached();
  });

  test('clicking the Assets tab shows the assets view', async ({ page }) => {
    await gotoApp(page);
    const tab = page.locator('#assetsTabBtn');
    await tab.scrollIntoViewIfNeeded().catch(() => {});
    await tab.dispatchEvent('click'); // tab can sit outside the viewport; dispatch triggers the handler
    await expect(page.locator('#assetsView')).toBeVisible();
  });
});
