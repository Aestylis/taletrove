/**
 * Editor typing vs global single-key shortcuts.
 *
 * Regression for the 2026-10-12 UX audit finding: while an article was open (article-mode /
 * peek-mode / properties sheet / content-edit-mode) the keydown handler skipped its
 * "focus is in an editable" guard, so typing a word containing i/n/p/m/l/o/c/Tab inside a text
 * block fired map shortcuts — `i` re-rendered the info panel and discarded the textarea, `n`
 * switched to the pin tool, Tab collapsed the atlas panel.
 *
 * Also pins the fix's second half: TextField content is persisted on `input` (not only on
 * blur/`change`), so a re-render mid-sentence can never drop typed text again.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seedEntry = async (page) => {
  await page.evaluate(async () => {
    await window.flushSave();
    // A map feature that is also the current selection — the worst case, because the `i`
    // shortcut re-renders the panel for `selectedId` and `n`/`p`/`m` switch map tools.
    state.articles.push({
      id: 'ets-entry', _silo: 'atlas', name: 'Typing Target', title: 'Typing Target', type: 'Location',
      featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e', geometry: 'point',
      geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
      mapId: state.activeMapId, folderId: null, labelStyle: 'outline', labelColor: '#ffffff',
      visibleToPlayers: false, tags: [], links: [],
      blocks: [{ blockId: 'ets-blk', type: 'TextField', visibleToPlayers: true, data: { content: 'Start.', label: '' } }],
    });
    syncArticleViews();
    selectedId = 'ets-entry';
    window.enterArticleMode('ets-entry', 'feature');
  });
  await expect(page.locator('body')).toHaveClass(/article-mode/);
  await page.locator('#infoPanel .edit-mode-toggle-btn').click();
  await expect(page.locator('#infoPanel')).toHaveClass(/content-edit-mode/);
  // Selecting the block swaps the rendered markdown for the textarea editor.
  await page.locator('#infoPanel .canvas-block.type-textfield').first().click();
  const ta = page.locator('#infoPanel textarea.inline-editor');
  await expect(ta).toBeVisible();
  await ta.click();
  await page.keyboard.press('End');
  return ta;
};

test.describe('Editor typing is never hijacked by single-key map shortcuts', () => {
  test('letters that double as shortcuts stay in the textarea', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await gotoApp(page);
    const ta = await seedEntry(page);

    // p, i, n, m, l, o, c are all bound as single-key shortcuts.
    await page.keyboard.type(' pin lamp coin', { delay: 30 });

    await expect(ta).toBeFocused();
    await expect(ta).toHaveValue('Start. pin lamp coin');
    const after = await page.evaluate(() => ({
      mode: window.uiMode,
      body: document.body.className,
      panel: document.getElementById('infoPanel').className,
    }));
    expect(after.mode, 'typing n/p/m must not change the map tool').toBe('pointer');
    expect(after.body).toContain('article-mode');
    expect(after.panel).toContain('content-edit-mode');
    expect(errors).toEqual([]);
  });

  test('Tab inside the editor does not toggle the atlas panel', async ({ page }) => {
    await gotoApp(page);
    await seedEntry(page);
    const before = await page.evaluate(() => document.getElementById('atlasPanel').classList.contains('is-hidden'));
    await page.keyboard.press('Tab');
    const after = await page.evaluate(() => document.getElementById('atlasPanel').classList.contains('is-hidden'));
    expect(after).toBe(before);
  });

  test('typed text reaches state before blur (autosave on input)', async ({ page }) => {
    await gotoApp(page);
    await seedEntry(page);
    await page.keyboard.type(' saved early', { delay: 20 });
    await expect.poll(() => page.evaluate(() =>
      state.articles.find(a => a.id === 'ets-entry').blocks[0].data.content
    )).toBe('Start. saved early');
  });
});
