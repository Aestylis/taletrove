/**
 * MOB-A — compact shell (<600px). Runs the app at phone size and asserts the
 * M3-compact geometry: map as base pane, full-width drawer, bottom sheets,
 * article takeover, header/hub reflow.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

/** Seed one lore article and return its id (peek/article target). */
async function seedEntry(page) {
  await page.evaluate(async () => {
    state.articles.push({
      id: 'mc-1', _silo: 'lore', name: 'Compact Test Entry', title: 'Compact Test Entry',
      type: 'Character', folderId: null, tags: [], links: [],
      blocks: [{ blockId: 'mc-b1', type: 'text', data: { content: 'Body text for compact testing.' } }],
      visibleToPlayers: true,
    });
    syncArticleViews();
    await refreshEncyclopediaView();
  });
}

test.describe('MOB-A T1 — atlas panel is a full-width drawer', () => {
  test('open panel fills viewport width; closing restores the map', async ({ page }) => {
    await gotoApp(page);
    // toggleAsidePanel(hide): false = show, true = hide
    await page.evaluate(() => toggleAsidePanel(false));
    await page.waitForTimeout(500); // drawer transition
    const box = await page.locator('#atlasPanel').boundingBox();
    expect(Math.abs(box.x), 'drawer flush with left edge (no rail gutter, not offscreen)').toBeLessThanOrEqual(1);
    expect(box.width, 'drawer spans full viewport').toBeGreaterThanOrEqual(392);
    expect(box.width, 'drawer does not overflow').toBeLessThanOrEqual(394);

    await page.evaluate(() => toggleAsidePanel(true));
    await page.waitForTimeout(500);
    const hidden = await page.evaluate(() =>
      document.querySelector('#atlasPanel').getBoundingClientRect().right <= 0);
    expect(hidden, 'drawer fully offscreen when closed').toBe(true);

    const mapBox = await page.locator('#map').boundingBox();
    expect(mapBox.width, 'map is the base pane').toBeGreaterThan(300);
  });
});
