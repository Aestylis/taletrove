/**
 * Move tool — pin dragging.
 *
 * Pins render inside a Leaflet.markercluster group (forge/map.js). Any pin close enough to
 * another to be absorbed into a cluster bubble has its marker icon detached from the DOM, so
 * `marker.dragging.enable()` binds to nothing and the pin cannot be dragged — the "move tool
 * does nothing" bug. Move mode must pull clustered pins out onto the map for the duration of
 * the mode (forge/toolbar-modes.js) so dragging.enable() has a live icon to bind to, then
 * restore clustering on exit.
 *
 * This test seeds two pins close enough together to guarantee clustering, confirms the cluster
 * actually forms, drags one pin via move mode, and asserts its stored coordinates changed.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import { seedWorld, clearWorld } from './perf/perf-helpers.js';

const MAP_ID = 'map-move-drag';
const PIN_ID = 'art-move-drag-0';

function makeWorld() {
  return {
    meta: {
      appVersion: '0.6.78-alpha', activeMapId: MAP_ID,
      folders: [], encyclopediaFolders: [], templates: [], layoutTemplates: [],
      customColors: [], assetNames: {}, assetMeta: {}, appearance: {},
    },
    maps: [{
      id: MAP_ID, name: 'Move Drag World', parentId: null, folderId: null,
      imageKey: 'img-move-drag-missing', width: 2000, height: 2000,
      overlayKey: null, overlayOpacity: 0.4,
      scale: { pixels: 100, distance: 10, unit: 'miles' },
      grid: { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 },
      fog: { enabled: false, opacity: 1.0, mask: null },
    }],
    // Two pins a few world-units apart — guaranteed to fall inside the 40px cluster
    // radius at any zoom level fitBounds() picks for a 2000x2000 map.
    articles: [0, 1].map(i => ({
      id: `art-move-drag-${i}`, _silo: 'atlas',
      name: `Cluster Pin ${i}`, title: `Cluster Pin ${i}`, type: 'Location',
      featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e',
      geometry: 'point',
      geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1000 + i * 5, 1000 + i * 5] } },
      mapId: MAP_ID, folderId: null,
      labelStyle: 'outline', labelColor: '#ffffff', visibleToPlayers: false,
      tags: [], links: [], blocks: [],
    })),
  };
}

test.describe('Move tool — pin dragging', () => {
  test.describe.configure({ timeout: 60_000 });

  test('dragging a clustered pin in move mode updates its coordinates', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);
    await page.evaluate(async () => { try { if (window.flushSave) await window.flushSave(); } catch (_) {} });
    await clearWorld(page);
    await seedWorld(page, makeWorld());
    await page.reload();
    await page.waitForSelector('.header-controls', { state: 'visible' });
    await page.waitForFunction(() =>
      typeof state !== 'undefined' && state.features && state.features.length >= 2);
    // navigateToMap's render({full:true}) call that populates layerById runs async (and again
    // after a 200ms settle timer) — wait for the marker layer to actually exist before probing it.
    await page.waitForFunction((pinId) => typeof layerById !== 'undefined' && layerById.get(pinId), PIN_ID);
    await page.waitForTimeout(300);

    // Sanity: the two pins are close enough to have merged into a cluster bubble, so the
    // individual marker icon is not attached to the DOM yet.
    const preClusterState = await page.evaluate((pinId) => {
      const lyr = layerById.get(pinId);
      return {
        hasClusterBubble: !!document.querySelector('.cluster-icon'),
        pinIconAttached: !!(lyr && lyr.getElement && lyr.getElement()),
      };
    }, PIN_ID);
    expect(preClusterState.hasClusterBubble, 'expected the two seeded pins to form a cluster bubble').toBe(true);
    expect(preClusterState.pinIconAttached, 'clustered pin should not have a live icon before move mode').toBe(false);

    const before = await page.evaluate((pinId) =>
      state.articles.find(a => a.id === pinId).geojson.geometry.coordinates, PIN_ID);

    // Activate move mode (debouncedSetMode is a 100ms-debounced global — wait it out).
    await page.evaluate(() => debouncedSetMode('move'));
    await page.waitForTimeout(200);
    await page.waitForFunction(() => window.uiMode === 'move');

    // The fix: move mode must pull the clustered pin out onto the map so it has a live,
    // draggable icon.
    const midState = await page.evaluate((pinId) => {
      const lyr = layerById.get(pinId);
      const el = lyr && lyr.getElement && lyr.getElement();
      return { pinIconAttached: !!el, draggingEnabled: !!(lyr && lyr.dragging && lyr.dragging.enabled()) };
    }, PIN_ID);
    expect(midState.pinIconAttached, 'pin should have a live icon while move mode is active').toBe(true);
    expect(midState.draggingEnabled, 'pin dragging should be enabled while move mode is active').toBe(true);

    // Drag the pin via real mouse events (exercises Leaflet's Draggable, not just the flag).
    const box = await page.evaluate((pinId) => {
      const el = layerById.get(pinId).getElement();
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, PIN_ID);

    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const after = await page.evaluate((pinId) =>
      state.articles.find(a => a.id === pinId).geojson.geometry.coordinates, PIN_ID);

    expect(after, 'pin coordinates should change after dragging in move mode').not.toEqual(before);

    // Exiting move mode must disable dragging and hand the pin back to cluster-group
    // management (dragging it 80px moved it past the 40px cluster radius, so it may no
    // longer visually recluster with its sibling — that's expected, not what we're checking).
    await page.evaluate(() => debouncedSetMode('pointer'));
    await page.waitForTimeout(200);
    const restored = await page.evaluate((pinId) => {
      const lyr = layerById.get(pinId);
      return {
        draggingEnabled: !!(lyr && lyr.dragging && lyr.dragging.enabled()),
        stillFlaggedUnclustered: !!(lyr && lyr._unclusteredForMove),
        managedByClusterGroup: !!(lyr && allLayers.hasLayer(lyr)),
      };
    }, PIN_ID);
    expect(restored.draggingEnabled, 'dragging should be disabled after leaving move mode').toBe(false);
    expect(restored.stillFlaggedUnclustered, '_unclusteredForMove flag should be cleared on exit').toBe(false);
    expect(restored.managedByClusterGroup, 'pin should be handed back to the cluster group on exit').toBe(true);

    expect(errors, `unexpected page errors: ${errors.join(', ')}`).toEqual([]);
  });
});
