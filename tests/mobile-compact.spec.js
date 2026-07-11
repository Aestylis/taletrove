/**
 * MOB-A — compact shell (<600px). Runs the app at phone size and asserts the
 * M3-compact geometry: map as base pane, full-width drawer, bottom sheets,
 * article takeover, header/hub reflow.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

/**
 * gotoApp + compact-safe first-run settling. At 393px some dismiss buttons fail
 * Playwright's actionability (offscreen in the pre-fix layouts), so gotoApp's
 * click()s get swallowed — dispatchEvent bypasses that, then Escape closes any
 * remaining overlay (help/tutorial).
 */
async function gotoCompact(page) {
  await gotoApp(page);
  for (const sel of ['#startFreshBtn', '#welcomeSkipBtn', '#tutorialCloseBtn']) {
    try { await page.locator(sel).dispatchEvent('click', { timeout: 1200 }); } catch { /* absent */ }
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

/** Seed one lore article and return its id (peek/article target). */
async function seedEntry(page) {
  await page.evaluate(async () => {
    state.articles.push({
      id: 'mc-1', _silo: 'lore', name: 'Compact Test Entry', title: 'Compact Test Entry',
      type: 'Character', folderId: null, tags: [], links: [],
      blocks: [{ blockId: 'mc-b1', type: 'TextField', data: { content: 'Body text for compact testing.' } }],
      visibleToPlayers: true,
    });
    syncArticleViews();
    await refreshEncyclopediaView();
  });
}

test.describe('MOB-A T1 — atlas panel is a full-width drawer', () => {
  test('open panel fills viewport width; closing restores the map', async ({ page }) => {
    await gotoCompact(page);
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

test.describe('MOB-A T2 — article mode takes over the screen', () => {
  test('article fills the viewport and shows content', async ({ page }) => {
    await gotoCompact(page);
    await seedEntry(page);
    await page.evaluate(() => enterArticleMode('mc-1', 'encyclopedia'));
    await page.waitForTimeout(600);
    const box = await page.locator('#infoPanel').boundingBox();
    expect(box.x, 'article starts at left edge').toBeLessThanOrEqual(1);
    expect(box.width, 'article spans full width').toBeGreaterThanOrEqual(392);
    await expect(page.locator('#selectionPanelContent')).toContainText('Body text for compact testing');
    await page.evaluate(() => exitArticleMode());
  });
});

test.describe('MOB-A T3 — peek is a bottom sheet over the map', () => {
  test('peek anchors to the bottom half; map stays visible above', async ({ page }) => {
    await gotoCompact(page);
    await seedEntry(page);
    await page.evaluate(() => enterPeekMode('mc-1', 'encyclopedia'));
    await page.waitForTimeout(600);
    const box = await page.locator('#infoPanel').boundingBox();
    expect(box.width, 'sheet spans full width').toBeGreaterThanOrEqual(392);
    expect(box.y, 'sheet occupies the lower half').toBeGreaterThanOrEqual(852 * 0.35);
    expect(box.y + box.height, 'sheet reaches the bottom edge').toBeGreaterThanOrEqual(845);
    const mapVisible = await page.evaluate(() => {
      const m = document.querySelector('#mainContainer');
      return m && getComputedStyle(m).display !== 'none';
    });
    expect(mapVisible, 'map remains the base pane behind the sheet').toBe(true);
    await page.evaluate(() => exitPeekMode());
  });
});
