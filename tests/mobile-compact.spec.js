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
    // paint-order guard: with the drawer open, the sheet must still be on top
    const paintedOnTop = await page.evaluate(() => {
      toggleAsidePanel(false); // open drawer under the sheet
      const r = document.querySelector('#infoPanel').getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!hit && !!hit.closest('#infoPanel');
    });
    expect(paintedOnTop, 'peek sheet paints above the open drawer').toBe(true);
    await page.evaluate(() => { toggleAsidePanel(true); exitPeekMode(); });
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
    expect(bar.height, 'bar height ~56px (compact-lean, still >=48 targets)').toBeGreaterThanOrEqual(52);
    expect(bar.height, 'bar not oversized').toBeLessThanOrEqual(62);
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

  test('More opens a tools sheet; Calendar launches from it', async ({ page }) => {
    await gotoCompact(page);
    const more = await page.locator('#mobileNavBar [data-mnav="more"]').boundingBox();
    await page.touchscreen.tap(more.x + more.width / 2, more.y + more.height / 2);
    await page.waitForTimeout(500);
    const sheet = await page.locator('#mobileMoreSheet .mobile-more-content').boundingBox();
    expect(sheet, 'More sheet rendered').not.toBeNull();
    expect(sheet.width, 'sheet spans full width').toBeGreaterThanOrEqual(392);
    expect(sheet.y + sheet.height, 'bottom-anchored').toBeGreaterThanOrEqual(845);
    const rows = await page.locator('#mobileMoreSheet [data-mnav-more]').all();
    expect(rows.length, 'tool rows present').toBeGreaterThanOrEqual(6);
    for (const row of rows.slice(0, 3)) {
      const rb = await row.boundingBox();
      expect(rb.height, 'row target >= 48px').toBeGreaterThanOrEqual(48);
    }
    // tap Calendar row → sheet closes, calendar opens
    const cal = await page.locator('#mobileMoreSheet [data-mnav-more="calendarBtn"]').boundingBox();
    await page.touchscreen.tap(cal.x + cal.width / 2, cal.y + cal.height / 2);
    await page.waitForSelector('#calendarModal:not(.hidden)', { timeout: 5000 });
    // sheet hides after its 250ms exit animation
    await page.waitForFunction(() =>
      document.querySelector('#mobileMoreSheet').classList.contains('hidden'), null, { timeout: 3000 });
  });
});

test.describe('MOB-C — touch long-press opens context menus', () => {
  /** Simulate a touch long-press: pointerdown (touch) → hold → pointerup. */
  const longPress = async (page, selector) => {
    await page.evaluate(async (sel) => {
      const el = document.querySelector(sel);
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const opts = { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 7,
        clientX: x, clientY: y, isPrimary: true };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      await new Promise(res => setTimeout(res, 650));
      el.dispatchEvent(new PointerEvent('pointerup', opts));
    }, selector);
    await page.waitForTimeout(300);
  };

  test('long-press on an atlas row opens the context menu', async ({ page }) => {
    await gotoCompact(page);
    await seedEntry(page);
    await page.evaluate(() => toggleAsidePanel(false));
    await page.waitForTimeout(500);
    await longPress(page, '#encyclopediaView .encyclopedia-item[data-entry-id="mc-1"]');
    const menu = await page.locator('#atlasContextMenu').count();
    expect(menu, 'atlas context menu opened by long-press').toBe(1);
  });

  test('long-press on a map pin opens the radial menu', async ({ page }) => {
    await gotoCompact(page);
    await page.evaluate(async () => {
      const m = state.maps.find(x => x.id === state.activeMapId);
      m.width = 1200; m.height = 800;
      state.articles.push({ id: 'mc-pin', _silo: 'atlas', name: 'Pin', title: 'Pin', type: 'City',
        mapId: state.activeMapId, geometry: 'point',
        geojson: { type: 'Feature', geometry: { type: 'Point', coordinates: [400, 400] } },
        tags: [], links: [], blocks: [], visibleToPlayers: true });
      syncArticleViews();
      await render({ full: true });
      map.setView([400, 400], 1, { animate: false });
    });
    await page.waitForTimeout(600);
    await longPress(page, '.leaflet-marker-icon');
    const radial = await page.evaluate(() =>
      !!document.querySelector('.radial-backdrop, .radial-ring'));
    expect(radial, 'radial menu opened by long-press on pin').toBe(true);
  });

  test('row delete affordance is visible without hover on coarse pointers', async ({ page }) => {
    await gotoCompact(page);
    await seedEntry(page);
    await page.evaluate(() => toggleAsidePanel(false));
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const coarse = matchMedia('(pointer: coarse)').matches;
      const actions = document.querySelector('.encyclopedia-item .row-actions, .tree-row .row-actions');
      return { coarse, opacity: actions ? getComputedStyle(actions).opacity : null };
    });
    expect(r.coarse, 'Playwright touch context emulates pointer:coarse').toBe(true);
    expect(r.opacity, 'row ··· actions fully visible without hover').toBe('1');
  });
});

test.describe('MOB-D — touch target sizes', () => {
  test('rows and panel buttons meet minimum touch sizes on coarse pointers', async ({ page }) => {
    await gotoCompact(page);
    await seedEntry(page);
    await page.evaluate(() => toggleAsidePanel(false));
    await page.waitForTimeout(500);
    const sizes = await page.evaluate(() => {
      const h = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().height : null;
      };
      return {
        row: h('.encyclopedia-item[data-entry-id="mc-1"]'),
        tabAction: h('.panel-tabs .tab-action-btn'),
        navItem: h('#mobileNavBar .mobile-nav-item'),
      };
    });
    expect(sizes.row, 'list row >= 44px').toBeGreaterThanOrEqual(44);
    expect(sizes.tabAction, 'panel action button >= 40px (documented deviation)').toBeGreaterThanOrEqual(40);
    expect(sizes.navItem, 'nav destination >= 48px').toBeGreaterThanOrEqual(48);
  });
});

test.describe('MOB-D — sheet drag handles + dismiss + motion', () => {
  test('peek sheet has a handle; dragging it down dismisses; motion uses M3 tokens', async ({ page }) => {
    await gotoCompact(page);
    await seedEntry(page);
    await page.evaluate(() => enterPeekMode('mc-1', 'encyclopedia'));
    await page.waitForTimeout(600);

    const handle = await page.locator('#infoPanel .sheet-drag-handle').boundingBox();
    expect(handle, 'drag handle visible on peek sheet').not.toBeNull();

    // M3 enter token on the open sheet
    const motion = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('#infoPanel'));
      return { dur: s.transitionDuration, ease: s.transitionTimingFunction };
    });
    expect(motion.dur, 'enter duration 400ms').toContain('0.4s');

    // drag the handle down ~50% of the sheet → dismiss
    await page.evaluate(async () => {
      const h = document.querySelector('#infoPanel .sheet-drag-handle');
      const r = h.getBoundingClientRect();
      const x = r.x + r.width / 2;
      let y = r.y + r.height / 2;
      const fire = (type, cy) => h.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 9,
        clientX: x, clientY: cy, isPrimary: true }));
      fire('pointerdown', y);
      for (let i = 1; i <= 10; i++) {
        await new Promise(res => setTimeout(res, 20));
        fire('pointermove', y + i * 25);
      }
      fire('pointerup', y + 250);
    });
    await page.waitForTimeout(600);
    const peekClosed = await page.evaluate(() => !document.body.classList.contains('peek-mode'));
    expect(peekClosed, 'drag-down dismisses the peek sheet').toBe(true);

    // tap the handle → also closes (M3 single-pointer alternative)
    await page.evaluate(() => enterPeekMode('mc-1', 'encyclopedia'));
    await page.waitForTimeout(600);
    await page.evaluate(async () => {
      const h = document.querySelector('#infoPanel .sheet-drag-handle');
      const r = h.getBoundingClientRect();
      const opts = { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 9,
        clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, isPrimary: true };
      h.dispatchEvent(new PointerEvent('pointerdown', opts));
      await new Promise(res => setTimeout(res, 80));
      h.dispatchEvent(new PointerEvent('pointerup', opts));
    });
    await page.waitForTimeout(600);
    const closedByTap = await page.evaluate(() => !document.body.classList.contains('peek-mode'));
    expect(closedByTap, 'handle tap dismisses the sheet').toBe(true);
  });
});

test.describe('MOB-D — meta + bar sync follow-ups', () => {
  test('iOS meta present; direct tab taps sync the bottom bar', async ({ page }) => {
    await gotoCompact(page);
    const meta = await page.evaluate(() => ({
      viewportFit: document.querySelector('meta[name="viewport"]').content.includes('viewport-fit=cover'),
      appleIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
    }));
    expect(meta.viewportFit, 'viewport-fit=cover set').toBe(true);
    expect(meta.appleIcon, 'apple-touch-icon set').toBe(true);

    // open the drawer via the bar, then tap the Assets TAB directly — bar must follow
    const world = await page.locator('#mobileNavBar [data-mnav="world"]').boundingBox();
    await page.touchscreen.tap(world.x + world.width / 2, world.y + world.height / 2);
    await page.waitForTimeout(500);
    await page.locator('#assetsTabBtn').dispatchEvent('click');
    await page.waitForTimeout(400);
    const active = await page.evaluate(() =>
      document.querySelector('#mobileNavBar .mobile-nav-item.is-active')?.dataset.mnav);
    expect(active, 'bar follows direct tab tap').toBe('assets');
  });

  test('pull tab hidden; zoom controls (incl. eye toggle) fully above the bar', async ({ page }) => {
    await gotoCompact(page);
    const r = await page.evaluate(() => {
      const tab = document.querySelector('.aside-toggle-btn');
      const zoom = document.querySelector('.map-zoom-controls');
      const bar = document.querySelector('#mobileNavBar').getBoundingClientRect();
      return {
        tabHidden: !tab || getComputedStyle(tab).display === 'none',
        zoomBottom: zoom ? zoom.getBoundingClientRect().bottom : null,
        barTop: bar.top,
      };
    });
    expect(r.tabHidden, 'aside pull tab hidden at compact').toBe(true);
    expect(r.zoomBottom, 'zoom controls end above the nav bar').toBeLessThanOrEqual(r.barTop + 1);
  });

  test('navigating to a map closes the properties sheet too', async ({ page }) => {
    await gotoCompact(page);
    await seedEntry(page);
    const r = await page.evaluate(async () => {
      state.maps.push({ id: 'm2', name: 'Second Map', width: 1000, height: 800 });
      markEntityDirty('meta');
      await enterArticleMode('mc-1', 'encyclopedia');
      await new Promise(res => setTimeout(res, 400));
      await openPropertiesSheet('mc-1', 'encyclopedia');
      await new Promise(res => setTimeout(res, 400));
      await navigateToMap('m2', { skipInfoPanel: true });
      await new Promise(res => setTimeout(res, 800));
      return {
        article: document.body.classList.contains('article-mode'),
        props: document.querySelector('#propertiesSheet').classList.contains('is-open'),
      };
    });
    expect(r.article, 'article mode exited').toBe(false);
    expect(r.props, 'properties sheet closed').toBe(false);
  });

  test('re-tapping Map returns to the top-level world map', async ({ page }) => {
    await gotoCompact(page);
    const r = await page.evaluate(async () => {
      state.maps.push({ id: 'm2', name: 'Second Map', width: 1000, height: 800, parentId: state.maps[0].id });
      markEntityDirty('meta');
      await navigateToMap('m2', { skipInfoPanel: true });
      await new Promise(res => setTimeout(res, 600));
      return { active: state.activeMapId, mainId: state.maps.find(m => m.parentId === null)?.id };
    });
    expect(r.active, 'on the sub-map').toBe('m2');
    const mapBtn = await page.locator('#mobileNavBar [data-mnav="map"]').boundingBox();
    await page.touchscreen.tap(mapBtn.x + mapBtn.width / 2, mapBtn.y + mapBtn.height / 2);
    await page.waitForFunction((mainId) => state.activeMapId === mainId, r.mainId, { timeout: 8000 });
    const active = await page.evaluate(() => state.activeMapId);
    expect(active, 'back on the main map').toBe(r.mainId);
  });

  test('opening a map at compact never auto-opens the map\'s own panel', async ({ page }) => {
    await gotoCompact(page);
    const r = await page.evaluate(async () => {
      state.maps.push({ id: 'm3', name: 'Third Map', width: 1000, height: 800, parentId: state.maps[0].id });
      markEntityDirty('meta');
      await navigateToMap('m3'); // DEFAULT options — the map-chip path
      await new Promise(res => setTimeout(res, 800));
      return {
        active: state.activeMapId,
        panelVisible: document.querySelector('#infoPanel').classList.contains('is-visible'),
        peek: document.body.classList.contains('peek-mode'),
      };
    });
    expect(r.active, 'navigated to the map').toBe('m3');
    expect(r.panelVisible, 'map info panel stays closed at compact').toBe(false);
    expect(r.peek, 'no peek either').toBe(false);
  });

  test('main toolbar collapsed by default; pencil toggle reveals it', async ({ page }) => {
    await gotoCompact(page);
    const before = await page.evaluate(() => ({
      toolbar: getComputedStyle(document.querySelector('#mainToolbar')).display,
      toggle: getComputedStyle(document.querySelector('#mobileToolsToggle')).display,
    }));
    expect(before.toolbar, 'toolbar hidden by default at compact').toBe('none');
    expect(before.toggle, 'pencil toggle visible at compact').not.toBe('none');
    const t = await page.locator('#mobileToolsToggle').boundingBox();
    await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height / 2);
    await page.waitForTimeout(300);
    const open = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#mainToolbar')).display);
    expect(open, 'toolbar shown after toggle').not.toBe('none');
    // the expanded toolbar must wrap within the viewport, and its overflow (···)
    // menu must open fully on-screen (0.6.71 device bug: unwrapped toolbar pushed
    // the ··· button offscreen, so its popover opened invisibly)
    const overflow = await page.evaluate(async () => {
      const tb = document.querySelector('#mainToolbar').getBoundingClientRect();
      const btn = document.querySelector('#toolbarOverflowBtn');
      const bb = btn.getBoundingClientRect();
      btn.click();
      await new Promise(res => setTimeout(res, 400));
      const pb = document.querySelector('#toolbarOverflowPopover').getBoundingClientRect();
      document.body.click(); // close popover again
      return { tbRight: tb.right, btnRight: bb.right, popLeft: pb.x, popRight: pb.right };
    });
    expect(overflow.tbRight, 'toolbar fits viewport').toBeLessThanOrEqual(394);
    expect(overflow.btnRight, 'overflow button on-screen').toBeLessThanOrEqual(394);
    expect(overflow.popLeft, 'popover left edge on-screen').toBeGreaterThanOrEqual(0);
    expect(overflow.popRight, 'popover right edge on-screen').toBeLessThanOrEqual(394);
    await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height / 2);
    await page.waitForTimeout(300);
    const closed = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#mainToolbar')).display);
    expect(closed, 'toolbar hidden again').toBe('none');
  });

  test('tapping a pin at compact opens the map popup, not the half-screen peek', async ({ page }) => {
    await gotoCompact(page);
    await page.evaluate(async () => {
      const m = state.maps.find(x => x.id === state.activeMapId);
      m.width = 1200; m.height = 800;
      state.articles.push({ id: 'pp-1', _silo: 'atlas', name: 'Popup Pin', title: 'Popup Pin', type: 'City',
        mapId: state.activeMapId, geometry: 'point',
        geojson: { type: 'Feature', geometry: { type: 'Point', coordinates: [400, 400] } },
        tags: [], links: [], blocks: [{ blockId: 'pb', type: 'TextField', data: { content: 'A city of popups.' } }],
        visibleToPlayers: true });
      syncArticleViews();
      await render({ full: true });
      map.setView([400, 400], 1, { animate: false });
    });
    await page.waitForTimeout(600);
    // fire through Leaflet's own event pipeline (headless touch synthesis does
    // not reach layer handlers reliably) — this still runs onFeatureClick
    const r = await page.evaluate(async () => {
      const layers = [];
      allLayers.eachLayer(l => layers.push(l));
      const target = layers.find(l => l._isPoint);
      target.fire('click', { latlng: target.getLatLng(), originalEvent: new MouseEvent('click') });
      await new Promise(res => setTimeout(res, 700)); // 220ms debounce + popup open
      return {
        popup: !!document.querySelector('.standardized-map-popup'),
        peek: document.body.classList.contains('peek-mode'),
      };
    });
    expect(r.popup, 'map popup opened').toBe(true);
    expect(r.peek, 'no half-screen peek at compact').toBe(false);
  });
});
