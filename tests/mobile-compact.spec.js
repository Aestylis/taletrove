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

test.describe('MOB-A T4 — properties + chrome sheets are bottom sheets', () => {
  test('properties sheet bottom-anchored full width', async ({ page }) => {
    await gotoCompact(page);
    await seedEntry(page);
    // #propertiesSheet is only used from article mode (openPropertiesSheet branches on articleViewMode)
    await page.evaluate(async () => { await enterArticleMode('mc-1', 'encyclopedia'); });
    await page.waitForTimeout(400);
    await page.evaluate(() => openPropertiesSheet('mc-1', 'encyclopedia'));
    await page.waitForTimeout(600);
    const box = await page.locator('#propertiesSheet').boundingBox();
    expect(box.width, 'sheet spans full width').toBeGreaterThanOrEqual(392);
    expect(box.y, 'bottom-anchored').toBeGreaterThanOrEqual(852 * 0.25);
    expect(box.y + box.height, 'reaches the bottom edge').toBeGreaterThanOrEqual(845);
  });

  test('help side-sheet fits the viewport as a bottom sheet', async ({ page }) => {
    await gotoCompact(page);
    await page.locator('#helpBtn').dispatchEvent('click');
    await page.waitForTimeout(500);
    const box = await page.locator('#helpModal .modal-content').boundingBox();
    expect(box.width, 'full width, no 360px side sheet').toBeGreaterThanOrEqual(392);
    expect(box.x, 'flush left').toBeLessThanOrEqual(1);
    expect(box.y, 'top edge on screen (sheet actually open, not resting offscreen)').toBeLessThan(700);
    expect(box.y + box.height, 'anchored to bottom edge').toBeGreaterThanOrEqual(845);
    expect(box.y + box.height, 'not hanging below the viewport').toBeLessThanOrEqual(853);
  });
});

test.describe('MOB-A T5 — header fits the phone', () => {
  test('no horizontal overflow; role toggle fully visible', async ({ page }) => {
    await gotoCompact(page);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'no horizontal page overflow').toBeLessThanOrEqual(0);
    const toggle = await page.locator('.role-toggle-wrapper').boundingBox();
    expect(toggle.x + toggle.width, 'role toggle inside viewport').toBeLessThanOrEqual(393);
    const search = await page.locator('#globalSearchInput').boundingBox();
    const brand = await page.locator('#brandLogo').boundingBox();
    expect(search.x, 'search does not overlap the brand').toBeGreaterThanOrEqual(brand.x + brand.width - 2);
  });
});

test.describe('MOB-A T6 — hub + large editors fit compact', () => {
  test('hub stacks; content pane visible', async ({ page }) => {
    await gotoCompact(page);
    await page.locator('#brandLogo').dispatchEvent('click');
    await page.waitForTimeout(600);
    const hub = await page.locator('.hub-content').boundingBox();
    expect(hub.width, 'hub fits viewport').toBeLessThanOrEqual(394);
    const pane = await page.locator('.hub-pane-area').boundingBox();
    expect(pane, 'content pane rendered').not.toBeNull();
    expect(pane.width, 'content pane spans usable width').toBeGreaterThan(300);
    expect(pane.x, 'content pane on screen').toBeGreaterThanOrEqual(0);
    expect(pane.x, 'content pane not pushed offscreen').toBeLessThan(393);
    await page.keyboard.press('Escape');
  });

  test('calendar modal is full-screen at compact', async ({ page }) => {
    await gotoCompact(page);
    await page.locator('#calendarBtn').dispatchEvent('click');
    await page.waitForSelector('#calendarModal:not(.hidden)', { timeout: 5000 });
    await page.waitForTimeout(400);
    const box = await page.locator('#calendarModal .modal-content').boundingBox();
    expect(box.width, 'full width').toBeGreaterThanOrEqual(392);
    expect(box.height, 'full height').toBeGreaterThanOrEqual(750);
  });
});

test.describe('MOB-B T1 — bottom navigation bar', () => {
  test('bar shown at compact with 48px targets; rail hidden; map controls lifted', async ({ page }) => {
    await gotoCompact(page);
    const bar = await page.locator('#mobileNavBar').boundingBox();
    expect(bar, 'nav bar rendered').not.toBeNull();
    expect(bar.width, 'bar spans full width').toBeGreaterThanOrEqual(392);
    expect(bar.y + bar.height, 'bar at bottom edge').toBeGreaterThanOrEqual(845);
    expect(bar.height, 'bar tall enough (64px M3 token)').toBeGreaterThanOrEqual(60);
    const items = await page.locator('#mobileNavBar .mobile-nav-item').all();
    expect(items.length, 'four destinations').toBe(4);
    for (const item of items) {
      const ib = await item.boundingBox();
      expect(ib.height, 'destination target >= 48px').toBeGreaterThanOrEqual(48);
    }
    const railHidden = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#navRail')).display === 'none');
    expect(railHidden, 'nav rail hidden at compact').toBe(true);
    const toolbarClear = await page.evaluate(() => {
      const t = document.querySelector('.toolbar.bottom, .map-toolbar.bottom');
      if (!t) return true; // no bottom toolbar variant present
      const bar = document.querySelector('#mobileNavBar').getBoundingClientRect();
      return t.getBoundingClientRect().bottom <= bar.top + 1;
    });
    expect(toolbarClear, 'bottom map toolbar sits above the bar').toBe(true);

    // desktop: bar hidden, rail visible
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.waitForTimeout(300);
    const desktop = await page.evaluate(() => ({
      bar: getComputedStyle(document.querySelector('#mobileNavBar')).display,
      rail: getComputedStyle(document.querySelector('#navRail')).display,
    }));
    expect(desktop.bar, 'bar hidden on desktop').toBe('none');
    expect(desktop.rail, 'rail visible on desktop').not.toBe('none');
  });

  test('destinations drive the drawer and tabs; active state follows', async ({ page }) => {
    await gotoCompact(page);
    const tap = async (dest) => {
      const el = await page.locator(`#mobileNavBar [data-mnav="${dest}"]`).boundingBox();
      await page.touchscreen.tap(el.x + el.width / 2, el.y + el.height / 2);
      await page.waitForTimeout(500);
    };
    await tap('world');
    let s = await page.evaluate(() => ({
      drawerOpen: !document.querySelector('#atlasPanel').classList.contains('is-hidden'),
      worldTab: document.querySelector('#atlasTabBtn').classList.contains('active'),
      active: document.querySelector('#mobileNavBar .mobile-nav-item.is-active')?.dataset.mnav,
    }));
    expect(s.drawerOpen, 'World opens the drawer').toBe(true);
    expect(s.worldTab, 'World tab active').toBe(true);
    expect(s.active, 'bar active = world').toBe('world');

    await tap('assets');
    await page.waitForFunction(() =>
      document.querySelector('#assetsTabBtn').classList.contains('active'), null, { timeout: 5000 });
    s = await page.evaluate(() => ({
      active: document.querySelector('#mobileNavBar .mobile-nav-item.is-active')?.dataset.mnav,
    }));
    expect(s.active, 'bar active = assets').toBe('assets');

    await tap('map');
    s = await page.evaluate(() => ({
      drawerHidden: document.querySelector('#atlasPanel').classList.contains('is-hidden'),
      active: document.querySelector('#mobileNavBar .mobile-nav-item.is-active')?.dataset.mnav,
    }));
    expect(s.drawerHidden, 'Map closes the drawer').toBe(true);
    expect(s.active, 'bar active = map').toBe('map');
  });
});
