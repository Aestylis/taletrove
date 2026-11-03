// Regression for GitHub issue #1: typing a place name (incl. Shift+C) must not fire map shortcuts.
// Covers the name fields; tests/editor-typing-shortcuts.spec.js covers text blocks.
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = (page) => page.evaluate(async () => {
  await window.flushSave();
  state.articles.push({
    id: 'i1-place', _silo: 'atlas', name: 'Old', title: 'Old', type: 'Location',
    featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e', geometry: 'point',
    geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
    mapId: state.activeMapId, folderId: null, visibleToPlayers: false, tags: [], links: [], blocks: [],
  });
  syncArticleViews();
  selectedId = 'i1-place';
});

const NAME = 'Mica Crossing Inn';

async function typeIntoNameField(page, root) {
  const input = page.locator(`${root} input[type="text"], ${root} input:not([type])`).first();
  await expect(input).toBeVisible();
  await input.click();
  await input.fill('');
  const before = await page.evaluate(() => ({ mode: window.uiMode, body: document.body.className }));
  await page.keyboard.type(NAME, { delay: 25 }); // includes Shift+M, Shift+C, Shift+I, i, n, c, o, s, r
  await expect(input).toHaveValue(NAME);
  await expect(input).toBeFocused();
  const after = await page.evaluate(() => ({ mode: window.uiMode, body: document.body.className }));
  expect(after.mode).toBe(before.mode);
  return { before, after };
}

test('issue #1 — properties sheet name field (article mode)', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await gotoApp(page);
  await seed(page);
  await page.evaluate(() => window.enterArticleMode('i1-place', 'feature'));
  await page.evaluate(() => window.openPropertiesSheet('i1-place', 'feature'));
  await expect(page.locator('#propertiesSheet')).toHaveClass(/is-open/);
  await typeIntoNameField(page, '#propertiesSheet');
  await expect(page.locator('#propertiesSheet')).toHaveClass(/is-open/);
  expect(errors).toEqual([]);
});

async function typeIntoEditableSpan(page, span) {
  await expect(span).toBeVisible();
  await span.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  const before = await page.evaluate(() => ({ mode: window.uiMode, sel: selectedId }));
  await page.keyboard.type(NAME, { delay: 25 });
  await expect(span).toHaveText(NAME);
  await expect(span).toBeFocused();
  const after = await page.evaluate(() => ({ mode: window.uiMode, sel: selectedId,
    name: state.articles.find(a => a.id === 'i1-place')?.name }));
  expect(after.mode).toBe(before.mode);
  expect(after.name).toBe(NAME);
}

test('issue #1 — editable title in info panel (map view, place selected)', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await gotoApp(page);
  await seed(page);
  await page.evaluate(() => window.enterArticleMode('i1-place', 'feature'));
  await typeIntoEditableSpan(page, page.locator('#infoPanel [contenteditable="true"]').first());
  await expect(page.locator('body')).toHaveClass(/article-mode/);
  expect(errors).toEqual([]);
});

test('issue #1 — naming a just-created place in peek', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await gotoApp(page);
  await seed(page);
  await page.evaluate(() => { window._pendingNameId = 'i1-place'; window.enterPeekMode('i1-place'); });
  await expect(page.locator('body')).toHaveClass(/peek-mode/);
  await typeIntoEditableSpan(page, page.locator('#infoPanel [contenteditable="true"]').first());
  await expect(page.locator('body')).toHaveClass(/peek-mode/);
  expect(errors).toEqual([]);
});
