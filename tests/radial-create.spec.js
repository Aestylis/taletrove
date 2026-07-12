/**
 * Radial creation flows + demo-tour boot handoff.
 *
 * 1. Map radial "Add Pin" opens a Person/Place/Thing chooser (the long-press
 *    radial is the primary creation surface on phones — it must offer the same
 *    typed-pin choice as the toolbar flyout).
 * 2. The area (polygon) radial offers "Create Here" so pins can be placed
 *    inside an existing area — long-press there never reaches the map handler.
 * 3. A fresh `pendingDemoTour` localStorage flag starts the demo tutorial at
 *    boot (the demo import ends in location.reload(), so the tour must survive
 *    the reload via this flag).
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/**
 * Dispatch a contextmenu (what mobile long-press synthesizes) on an element.
 * `target` is a CSS selector string or { layerId } for a Leaflet layer element.
 */
async function contextmenuAt(page, target) {
  await page.evaluate((t) => {
    const el = typeof t === 'string'
      ? document.querySelector(t)
      : window.layerById.get(t.layerId).getElement();
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, view: window, button: 2,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
    }));
  }, target);
}

const radialBtn = (page, label) =>
  page.locator(`#featureRadialMenu .radial-btn[data-label="${label}"]`).last();

test.describe('Map radial — Add Pin opens the pin-type chooser', () => {
  test('Add Pin shows Person/Place/Thing, choosing Place creates a typed pin', async ({ page }) => {
    await gotoApp(page);

    await contextmenuAt(page, '#map');
    await expect(radialBtn(page, 'Add Pin')).toBeVisible();

    const before = await page.evaluate(() => state.articles.length);
    await radialBtn(page, 'Add Pin').click();

    // Second-stage chooser — the same three types as the toolbar pin flyout.
    await expect(radialBtn(page, 'Person')).toBeVisible();
    await expect(radialBtn(page, 'Place')).toBeVisible();
    await expect(radialBtn(page, 'Thing')).toBeVisible();

    await radialBtn(page, 'Place').click();
    await page.waitForFunction((n) => state.articles.length === n + 1, before);
    const created = await page.evaluate(() => state.articles[state.articles.length - 1]);
    expect(created.featureType).toBe('generic-pin');
    expect(created.geometry).toBe('point');
  });

  test('choosing Person creates a lore entry pinned to the map', async ({ page }) => {
    await gotoApp(page);

    await contextmenuAt(page, '#map');
    await radialBtn(page, 'Add Pin').click();

    const before = await page.evaluate(() => state.articles.length);
    await radialBtn(page, 'Person').click();
    await page.waitForFunction((n) => state.articles.length === n + 1, before);
    const created = await page.evaluate(() => state.articles[state.articles.length - 1]);
    expect(created.kind).toBe('entry');
    expect(created.featureType).toBe('generic-person');
  });
});

test.describe('Area radial — Create Here', () => {
  async function seedArea(page) {
    await page.evaluate(async () => {
      state.articles.push({
        id: 'rc-area', _silo: 'atlas', mapId: state.activeMapId, kind: 'feature',
        geometry: 'polygon', featureType: 'generic-area',
        title: 'Radial Test Area', name: 'Radial Test Area',
        color: '#ff0000', fillOpacity: 0.3, showLabel: false, showCoatOfArms: false,
        visibleToPlayers: true, tags: [], blocks: [], images: [], linkedMapIds: [],
        geojson: {
          type: 'Feature', properties: {},
          geometry: { type: 'Polygon', coordinates: [[[200, 200], [900, 200], [900, 700], [200, 700], [200, 200]]] },
        },
      });
      syncArticleViews();
      await render({ full: true });
    });
    await page.waitForFunction(() => !!window.layerById?.get('rc-area')?.getElement());
  }

  test('polygon radial offers Create Here, which opens the creation radial', async ({ page }) => {
    await gotoApp(page);
    await seedArea(page);

    await contextmenuAt(page, { layerId: 'rc-area' });

    // Area management options are still there…
    await expect(radialBtn(page, 'Properties')).toBeVisible();
    // …plus the creation escape hatch.
    await expect(radialBtn(page, 'Create Here')).toBeVisible();

    await radialBtn(page, 'Create Here').click();
    await expect(radialBtn(page, 'Add Pin')).toBeVisible();
    await expect(radialBtn(page, 'Add Area')).toBeVisible();
  });
});

test.describe('Demo tour survives the post-import reload', () => {
  test('fresh pendingDemoTour flag starts the tutorial at boot', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pendingDemoTour', JSON.stringify(Date.now()));
    });
    await page.goto('/forge/');
    await page.waitForSelector('.header-controls', { state: 'visible' });

    await expect(page.locator('#tutorialOverlay')).toBeVisible({ timeout: 5000 });
    // The sample-world first-run modal must not stack on top of the tour.
    await expect(page.locator('#sampleWorldModal')).toBeHidden();
    // Flag is consumed so a manual reload doesn't restart the tour.
    const flag = await page.evaluate(() => localStorage.getItem('pendingDemoTour'));
    expect(flag).toBeNull();
  });

  test('stale pendingDemoTour flag is ignored and cleared', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pendingDemoTour', JSON.stringify(Date.now() - 10 * 60 * 1000));
    });
    await page.goto('/forge/');
    await page.waitForSelector('.header-controls', { state: 'visible' });

    // Boot consumes the flag late in its async sequence — wait for that, then
    // assert the tour was NOT started.
    await page.waitForFunction(() => localStorage.getItem('pendingDemoTour') === null);
    await expect(page.locator('#tutorialOverlay')).toBeHidden();
  });
});
