/**
 * Inline link autocomplete + hover preview (2026-10 UX pass, item 3).
 *
 * Typing `[[` or `@` in a text block opens a link palette listing matching articles; Enter inserts
 * `[[Name]]`; when nothing matches exactly, the last item creates a new lore entry with that name
 * and links it. Hovering a rendered wiki-link shows the quick entity preview.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const openEditor = async (page) => {
  await page.evaluate(async () => {
    await window.flushSave();
    const mk = (id, name, blocks = []) => ({
      id, _silo: 'lore', name, title: name, type: 'Faction', folderId: null, tags: [], links: [],
      visibleToPlayers: true, blocks,
    });
    state.articles.push(
      mk('la-host', 'Host Article', [{ blockId: 'la-blk', type: 'TextField', visibleToPlayers: true, data: { content: '', label: '' } }]),
      mk('la-1', 'Iron Order'),
      mk('la-2', 'Ironhold Keep'),
      mk('la-3', 'Silverport'),
    );
    syncArticleViews();
    window.enterArticleMode('la-host', 'encyclopedia');
  });
  await page.locator('#infoPanel .edit-mode-toggle-btn').click();
  await page.locator('#infoPanel .canvas-block.type-textfield').first().click();
  const ta = page.locator('#infoPanel textarea.inline-editor');
  await ta.click();
  return ta;
};

test.describe('Link autocomplete in text blocks', () => {
  test('[[ opens the palette, filters, and Enter inserts the wiki-link', async ({ page }) => {
    await gotoApp(page);
    const ta = await openEditor(page);
    await page.keyboard.type('Allied with [[Iro');
    const palette = page.locator('.link-palette');
    await expect(palette).toBeVisible();
    // Two matches plus the trailing "Create" item (no exact match for "Iro").
    await expect(palette.locator('.slash-item:not(.is-create)')).toHaveCount(2);
    await expect(palette.locator('.slash-item.is-create')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(palette).toBeHidden();
    await expect(ta).toHaveValue('Allied with [[Ironhold Keep]]');
    await expect(ta).toBeFocused();
  });

  test('@ mention works the same way and Escape closes without inserting', async ({ page }) => {
    await gotoApp(page);
    const ta = await openEditor(page);
    await page.keyboard.type('Ask @silv');
    const palette = page.locator('.link-palette');
    await expect(palette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
    await expect(ta).toHaveValue('Ask @silv');
    await expect(page.locator('body')).toHaveClass(/article-mode/);
    await page.keyboard.type('e');
    await expect(palette).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('Ask [[Silverport]]');
  });

  test('unmatched name offers "Create" which makes a lore entry and links it', async ({ page }) => {
    await gotoApp(page);
    const ta = await openEditor(page);
    await page.keyboard.type('Met [[Brand New Guild');
    const create = page.locator('.link-palette .slash-item.is-create');
    await expect(create).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('Met [[Brand New Guild]]');
    const names = await page.evaluate(() => state.articles.filter(a => a._silo === 'lore').map(a => a.name));
    expect(names).toContain('Brand New Guild');
    // Still editing the host article, not navigated away.
    await expect(page.locator('body')).toHaveClass(/article-mode/);
    await expect(ta).toBeFocused();
  });

  test('hovering a rendered wiki-link shows the quick preview', async ({ page }) => {
    await gotoApp(page);
    await openEditor(page);
    await page.keyboard.type('See [[Iron Order]] today.');
    await page.locator('#infoPanel .edit-mode-toggle-btn').click(); // Done
    const link = page.locator('#infoPanel a.wiki-link').first();
    await expect(link).toBeVisible();
    await link.hover();
    const pop = page.locator('#entity-quick-popover');
    await expect(pop).toBeVisible();
    await expect(pop).toContainText('Iron Order');
    await page.mouse.move(10, 500);
    await expect(pop).toBeHidden();
  });
});
