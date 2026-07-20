/**
 * Pin Color / Icon Color in the properties sheet used to call openColorPicker() with no
 * onSelectCallback, so the default handler mutated state but never rebuilt the sheet — the
 * swatch/label (built once at sheet-open time) stayed stale until the sheet was closed and
 * reopened. Event Color already worked around this by passing a callback that re-opens the
 * sheet; Pin Color and Icon Color now do the same.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const PIN_ID = 'art-pin-color-live';

test.describe('Pin Color / Icon Color live-update in the properties sheet', () => {
  test('picking a new pin color updates the swatch without closing the sheet', async ({ page }) => {
    await gotoApp(page);

    await page.evaluate(() => {
      const mid = state.activeMapId;
      const article = {
        id: 'art-pin-color-live', _silo: 'atlas', name: 'Live Color Pin', title: 'Live Color Pin',
        type: 'Location', featureType: 'generic-pin', icon: 'castle', iconColor: '#639bff',
        pinIconColor: '#ffffff', geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: mid, folderId: null, labelStyle: 'outline', labelColor: '#ffffff',
        visibleToPlayers: false, tags: [], links: [], blocks: [],
      };
      state.articles.push(article);
      syncArticleViews();
      window.openPropertiesSheet(article.id, 'feature');
    });

    // Outside article mode, openPropertiesSheet renders into #infoPanel's Properties tab
    // (peek mode) rather than the dedicated #propertiesSheet — same builder code either way.
    const pinColorLabel = page.locator('#infoPanel .form-label', { hasText: 'Pin Color' });
    await expect(pinColorLabel).toBeVisible();
    const pinColorSwatch = pinColorLabel.locator('xpath=following-sibling::div[1]//div[contains(@class,"style-picker-swatch")]');
    await expect(pinColorSwatch).toHaveCSS('background-color', 'rgb(99, 155, 255)'); // #639bff

    // Open the picker and choose the first preset (#000000 — guaranteed different from default).
    await pinColorLabel.locator('xpath=following-sibling::div[1]//button').click();
    await expect(page.locator('#colorPickerModal')).toBeVisible();
    await page.locator('#presetColorGrid .color-swatch').first().click();

    // The sheet must reflect the new color immediately — no reload, no re-navigating to it.
    const nags = await page.evaluate(() => state.articles.find(a => a.id === 'art-pin-color-live').iconColor);
    expect(nags, 'state must be updated').toBe('#000000');

    const updatedSwatch = page.locator('#infoPanel .form-label', { hasText: 'Pin Color' })
      .locator('xpath=following-sibling::div[1]//div[contains(@class,"style-picker-swatch")]');
    await expect(updatedSwatch).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(page.locator('#infoPanel .form-label', { hasText: 'Pin Color' })
      .locator('xpath=following-sibling::div[1]//span')).toHaveText('#000000');
  });
});
