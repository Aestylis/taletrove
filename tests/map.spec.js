/**
 * Map render smoke test — guards Leaflet CDN load + init order.
 *
 * This is the safety net for WS1 (deferring CDN libs + app scripts): the single
 * most important surface is the Leaflet map, and deferring scripts most affects
 * Leaflet's init order. If `L` fails to load before map.js runs, or the container
 * never initializes, these assertions fail.
 *
 * Must pass with an empty world (Leaflet initializes the container regardless of
 * whether any world map image exists).
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Map render', () => {
  test('Leaflet container initializes', async ({ page }) => {
    await gotoApp(page);

    // L.map() synchronously adds .leaflet-container to #map and builds its panes.
    const mapEl = page.locator('#map');
    await expect(mapEl).toBeVisible();
    await expect(mapEl).toHaveClass(/leaflet-container/);

    // Panes are created by Leaflet on init — proves the instance mounted, not just
    // that the div exists.
    await expect(page.locator('#map .leaflet-map-pane')).toBeAttached();
    await expect(page.locator('#map .leaflet-tile-pane')).toBeAttached();
  });

  test('Leaflet global and map instance are available', async ({ page }) => {
    await gotoApp(page);

    // `L` (Leaflet CDN) and the app's `map` instance are lexical globals, not
    // window properties — probe via typeof and the instance's API surface.
    const status = await page.evaluate(() => ({
      hasL: typeof L !== 'undefined',
      // map.getCenter() exists only on a live Leaflet map instance
      mapReady: typeof map !== 'undefined' && map !== null &&
        typeof map.getCenter === 'function' && !!map.getCenter(),
    }));

    expect(status.hasL, 'Leaflet global L is not defined — CDN failed to load in order').toBe(true);
    expect(status.mapReady, 'Leaflet map instance not initialized').toBe(true);
  });
});
