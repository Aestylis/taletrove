/**
 * Command palette (Ctrl+K) — wiring smoke tests.
 *
 * Added alongside the WS7 extraction of the palette from worldbuilder.js into
 * command-palette.js: proves the cross-file globals still resolve (worldbuilder's keydown
 * handler ↔ palette functions, performGlobalSearch from data.js, getIconHTMLSync from ui.js).
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Command palette', () => {
  test('opens with Ctrl+K, lists commands, filters, closes with Escape', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    // Open via the real keyboard shortcut (exercises worldbuilder's keydown → openCommandPalette)
    await page.keyboard.press('Control+k');
    const palette = page.locator('#commandPalette');
    await expect(palette).toBeVisible();

    // Default view lists grouped commands
    await expect(page.locator('#cpResults .cp-item').first()).toBeVisible();
    const allCount = await page.locator('#cpResults .cp-item').count();
    expect(allCount).toBeGreaterThanOrEqual(10);

    // Typing filters (input wiring → renderCpResults → performGlobalSearch path)
    await page.locator('#cpInput').fill('undo');
    await expect(page.locator('#cpResults .cp-item')).toHaveCount(1);
    await expect(page.locator('#cpResults .cp-item-label')).toHaveText('Undo');

    // Escape closes (input keydown handler)
    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('navigates to a search result', async ({ page }) => {
    await gotoApp(page);

    // Seed one article directly in state so search has something to find
    await page.evaluate(() => {
      state.articles.push({
        id: 'art-cp-test', _silo: 'lore', name: 'Zanzibar the Unfindable', type: 'Person',
        geometry: null, geojson: null, mapId: null, folderId: null,
        visibleToPlayers: true, tags: [], links: [], blocks: [],
      });
      // state.encyclopedia is a materialized view of state.articles — re-sync after direct push
      syncArticleViews();
    });

    await page.keyboard.press('Control+k');
    await page.locator('#cpInput').fill('zanzibar');
    const result = page.locator('#cpResults .cp-item', { hasText: 'Zanzibar' });
    await expect(result).toBeVisible();
    await result.click();

    // Palette closes and the article opens in peek mode
    await expect(page.locator('#commandPalette')).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/peek-mode/);
  });
});
