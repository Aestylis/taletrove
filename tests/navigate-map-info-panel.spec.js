/**
 * navigateToMap used to open the map's own info panel by default on desktop (any call site
 * that didn't explicitly pass `skipInfoPanel: true` — including the command palette, global
 * search, and wiki-links to a map) even though most in-app navigation paths (row clicks,
 * breadcrumbs) already opted out. Desktop now matches the existing compact-viewport behavior:
 * the panel stays closed unless a call site explicitly asks for it via `showInfoPanel: true`.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('navigateToMap — info panel default', () => {
  test('opening a map does not auto-open its info panel by default', async ({ page }) => {
    await gotoApp(page);
    const r = await page.evaluate(async () => {
      state.maps.push({ id: 'm-nav-2', name: 'Second Map', width: 1000, height: 800, parentId: state.maps[0].id });
      markEntityDirty('meta');
      await navigateToMap('m-nav-2'); // default options — e.g. command palette / global search path
      await new Promise(res => setTimeout(res, 300));
      return {
        active: state.activeMapId,
        panelVisible: document.querySelector('#infoPanel').classList.contains('is-visible'),
      };
    });
    expect(r.active, 'navigated to the map').toBe('m-nav-2');
    expect(r.panelVisible, 'map info panel stays closed by default').toBe(false);
  });

  test('creating a new map still opens its info panel (explicit opt-in)', async ({ page }) => {
    await gotoApp(page);
    const r = await page.evaluate(async () => {
      await createNewMap('Freshly Created Map');
      await new Promise(res => setTimeout(res, 300));
      const newMap = state.maps.find(m => m.name === 'Freshly Created Map');
      return {
        active: state.activeMapId,
        newMapId: newMap?.id,
        panelVisible: document.querySelector('#infoPanel').classList.contains('is-visible'),
      };
    });
    expect(r.active, 'navigated to the new map').toBe(r.newMapId);
    expect(r.panelVisible, 'new map info panel opens so you can immediately edit it').toBe(true);
  });
});
