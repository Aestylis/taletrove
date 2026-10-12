/**
 * Command palette "Recent" group (2026-10 UX pass, item 6): an empty Ctrl+K lists the articles
 * the user opened most recently, newest first, and skips ones that no longer exist.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('empty palette shows recently opened articles, newest first', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(async () => {
    await window.flushSave();
    const mk = (id, name) => ({ id, _silo: 'lore', name, title: name, type: 'Faction', folderId: null, tags: [], links: [], blocks: [], visibleToPlayers: true });
    state.articles.push(mk('rc-1', 'First Opened'), mk('rc-2', 'Second Opened'), mk('rc-3', 'Deleted Later'));
    syncArticleViews();
    window.navigateAndPeek('rc-1', 'encyclopedia');
    window.navigateAndPeek('rc-3', 'encyclopedia');
    window.navigateAndPeek('rc-2', 'encyclopedia');
    // Simulate a deletion after it was opened.
    state.articles.splice(state.articles.findIndex(a => a.id === 'rc-3'), 1);
    syncArticleViews();
  });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  const palette = page.locator('#commandPalette');
  await expect(palette).toBeVisible();
  await expect(palette.locator('.cp-group-label').first()).toHaveText('Recent');
  const labels = await palette.locator('.cp-item .cp-item-label').allTextContents();
  expect(labels.slice(0, 2)).toEqual(['Second Opened', 'First Opened']);
  expect(labels).not.toContain('Deleted Later');
  // The first recent is pre-selected; Enter re-opens it.
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/peek-mode/);
  await expect(page.locator('#infoPanel h3')).toContainText('Second Opened');
});
