/**
 * Terminology + first-run defaults (2026-10 UX pass, item 5).
 *
 * One word per concept in user-facing copy: lore records are "entries", the lore silo is "Lore"
 * (never "Encyclopedia"), destructive row actions say "Delete". Desktop viewports start with the
 * World panel open.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Consistent terminology', () => {
  test('command palette and search use Entry / Lore, never Article / Encyclopedia', async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(async () => {
      await window.flushSave();
      state.articles.push({ id: 'term-1', _silo: 'lore', name: 'Term Lore Entry', title: 'Term Lore Entry', type: 'Faction', folderId: null, tags: [], links: [], blocks: [], visibleToPlayers: true });
      syncArticleViews();
    });
    await page.keyboard.press('Control+k');
    const input = page.locator('#cpInput');
    await expect(input).toBeFocused();
    await input.fill('New En');
    await expect(page.locator('#commandPalette .cp-item-label', { hasText: /^New Entry$/ })).toBeVisible();
    await expect(page.locator('#commandPalette')).not.toContainText('New Article');
    await input.fill('Term Lore');
    const ctx = page.locator('#commandPalette .cp-item-context').first();
    await expect(ctx).toContainText('Lore');
    await expect(page.locator('#commandPalette')).not.toContainText('Encyclopedia');
  });

  test('atlas row context menu says Delete, not Remove', async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(async () => {
      await window.flushSave();
      state.articles.push({
        id: 'term-pin', _silo: 'atlas', name: 'Term Pin', title: 'Term Pin', type: 'Location', featureType: 'generic-pin',
        icon: 'castle', color: '#c9aa6e', geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: state.activeMapId, folderId: null, labelStyle: 'outline', labelColor: '#ffffff', visibleToPlayers: false, tags: [], links: [], blocks: [],
      });
      syncArticleViews();
      await refreshAtlasTree();
      if (document.getElementById('atlasPanel').classList.contains('is-hidden')) toggleAsidePanel(false);
    });
    const row = page.locator('#atlasPanel .feature-row[data-fid="term-pin"]').first();
    await row.click({ button: 'right' });
    const menu = page.locator('#atlasContextMenu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('li', { hasText: /^Delete$/ })).toHaveCount(1);
    await expect(menu.locator('li', { hasText: /^Remove$/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  test('desktop first run opens the World panel', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('#atlasPanel')).not.toHaveClass(/is-hidden/);
  });
});
