/**
 * Name-first creation (2026-10 UX pass, item 2).
 *
 * Every "create" path — Lore "+ → New Entry" and pin placement — used to drop a placeholder
 * ("New Entry", "Place (Pin)") into a read-only peek, so naming it cost four more clicks.
 * Now the new article opens in peek with its title focused and fully selected: typing replaces
 * the placeholder, Enter commits, Escape restores the placeholder.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const titleSel = '#infoPanel h3 [contenteditable="true"]';

const selectedText = (page) => page.evaluate(() => String(window.getSelection()));

test.describe('New articles open ready to be named', () => {
  test('Lore + → New Entry focuses and selects the placeholder title; typing + Enter renames', async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(() => window.flushSave());
    // The atlas panel starts collapsed on a fresh profile — open it so the section headers exist.
    await page.evaluate(() => { if (document.getElementById('atlasPanel').classList.contains('is-hidden')) toggleAsidePanel(false); });
    await page.locator('button[title="Add to Lore"]').first().click();
    await page.locator('.panel-section-popover.open .panel-section-popover-item', { hasText: 'New Entry' }).click();

    const title = page.locator(titleSel);
    await expect(title).toBeVisible();
    await expect(title).toBeFocused();
    await expect(title).toHaveText('New Entry');
    expect(await selectedText(page)).toBe('New Entry');

    await page.keyboard.type('Lady Mira');
    await page.keyboard.press('Enter');
    await expect(title).not.toBeFocused();
    const saved = await page.evaluate(() => state.articles.filter(a => a._silo === 'lore').map(a => a.name));
    expect(saved).toContain('Lady Mira');
    expect(saved).not.toContain('New Entry');
    // Every tree row for the entry follows without a full refresh (it can be listed twice).
    await expect(page.locator('#atlasPanel .entry-name, #atlasPanel .tree-label').filter({ hasText: 'Lady Mira' }).first()).toBeVisible();
    await expect(page.locator('#atlasPanel .entry-name, #atlasPanel .tree-label').filter({ hasText: /^New Entry$/ })).toHaveCount(0);
  });

  test('Escape while naming restores the placeholder and leaves peek open', async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(() => window.flushSave());
    await page.evaluate(() => { if (document.getElementById('atlasPanel').classList.contains('is-hidden')) toggleAsidePanel(false); });
    await page.locator('button[title="Add to Lore"]').first().click();
    await page.locator('.panel-section-popover.open .panel-section-popover-item', { hasText: 'New Entry' }).click();
    const title = page.locator(titleSel);
    await expect(title).toBeFocused();
    await page.keyboard.type('Half typed');
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveClass(/peek-mode/);
    const names = await page.evaluate(() => state.articles.filter(a => a._silo === 'lore').map(a => a.name));
    expect(names).toContain('New Entry');
    expect(names).not.toContain('Half typed');
  });

  test('placing a pin with the pin tool focuses the new pin title', async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(() => window.flushSave());
    await page.locator('#modePinBtn').click();
    await page.locator('#pinFlyout li', { hasText: 'Place' }).click();
    // Tool activation is debounced behind the template icon load — wait for it before clicking.
    await expect(page.locator('#modePinBtn')).toHaveClass(/active/);
    await expect.poll(() => page.evaluate(() => window.uiMode)).toBe('add-marker');
    // Fresh worlds show the "Start with a base map" card over the map centre — click clear of it.
    const box = await page.locator('#map').boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2);
    await page.mouse.down();
    await page.mouse.up();

    const title = page.locator(titleSel);
    await expect(title).toBeFocused();
    expect(await selectedText(page)).toBe(await title.textContent());
    await page.keyboard.type('Ironhold');
    await page.keyboard.press('Enter');
    const names = await page.evaluate(() => state.articles.filter(a => a.geometry === 'point').map(a => a.title));
    expect(names).toContain('Ironhold');
  });
});
