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

  test('Atlas panel and Encyclopedia tab are present', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('#atlasPanel')).toBeVisible();
    await expect(page.locator('#encyclopediaTabBtn')).toBeVisible();
    await expect(page.locator('#encyclopediaView')).toBeAttached();
  });

  test('clicking Encyclopedia tab shows encyclopedia view', async ({ page }) => {
    await gotoApp(page);
    await page.click('#encyclopediaTabBtn');
    await expect(page.locator('#encyclopediaView')).toHaveClass(/active/);
  });
});
