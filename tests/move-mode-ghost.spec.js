/**
 * Move mode — ghost pin regressions.
 *
 * Move mode pulls clustered pins out of the `allLayers` cluster group onto the map directly
 * (`_unclusteredForMove`, forge/toolbar-modes.js) so dragging.enable() has a live icon. That
 * breaks the invariant "every tracked point layer lives in allLayers", which two other paths
 * rely on:
 *
 * 1. deleteFeature (forge/worldbuilder.js) removes the layer via allLayers.removeLayer() — a
 *    no-op for a map-parented move-mode layer, so the deleted pin stayed visible and clicking
 *    it opened a peek panel for the dead article. Exiting move mode then re-added it to
 *    allLayers permanently.
 * 2. Switching maps while move mode is active destroys the old map and creates a fresh
 *    allLayers, but the debounced move-mode cleanup still held the OLD map's layers and
 *    unconditionally re-added them — painting the previous map's pins onto the new map as
 *    untracked ghosts.
 *
 * These tests reproduce both and pin the fix: cleanup only restores layers still tracked in
 * layerById, deleteFeature detaches map-parented move-mode layers, and initMap discards stale
 * move-mode state.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import { seedWorld, clearWorld } from './perf/perf-helpers.js';

const MAP_A = 'map-ghost-a';
const MAP_B = 'map-ghost-b';
const PIN_0 = 'art-ghost-0';
const PIN_1 = 'art-ghost-1';

function makeMap(id, name) {
  return {
    id, name, parentId: null, folderId: null,
    imageKey: `img-${id}-missing`, width: 2000, height: 2000,
    overlayKey: null, overlayOpacity: 0.4,
    scale: { pixels: 100, distance: 10, unit: 'miles' },
    grid: { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 },
    fog: { enabled: false, opacity: 1.0, mask: null },
  };
}

function makeWorld() {
  return {
    meta: {
      appVersion: '0.6.84-alpha', activeMapId: MAP_A,
      folders: [], encyclopediaFolders: [], templates: [], layoutTemplates: [],
      customColors: [], assetNames: {}, assetMeta: {}, appearance: {},
    },
    maps: [makeMap(MAP_A, 'Ghost Map A'), makeMap(MAP_B, 'Ghost Map B')],
    // Two pins close enough to cluster, so move mode pulls them out (_unclusteredForMove).
    articles: [0, 1].map(i => ({
      id: `art-ghost-${i}`, _silo: 'atlas',
      name: `Ghost Pin ${i}`, title: `Ghost Pin ${i}`, type: 'Location',
      featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e',
      geometry: 'point',
      geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1000 + i * 5, 1000 + i * 5] } },
      mapId: MAP_A, folderId: null,
      labelStyle: 'outline', labelColor: '#ffffff', visibleToPlayers: false,
      tags: [], links: [], blocks: [],
    })),
  };
}

async function bootSeeded(page) {
  await gotoApp(page);
  await page.evaluate(async () => { try { if (window.flushSave) await window.flushSave(); } catch (_) {} });
  await clearWorld(page);
  await seedWorld(page, makeWorld());
  await page.reload();
  await page.waitForSelector('.header-controls', { state: 'visible' });
  await page.waitForFunction(() =>
    typeof state !== 'undefined' && state.features && state.features.length >= 2);
  await page.waitForFunction((pinId) => typeof layerById !== 'undefined' && layerById.get(pinId), PIN_0);
  await page.waitForTimeout(300);
}

async function enterMoveMode(page) {
  await page.evaluate(() => debouncedSetMode('move'));
  await page.waitForTimeout(200);
  await page.waitForFunction(() => window.uiMode === 'move');
  // Sanity: the pins were pulled out of the cluster group for move mode.
  const pulled = await page.evaluate((pinId) => !!layerById.get(pinId)?._unclusteredForMove, PIN_0);
  expect(pulled, 'move mode should pull the clustered pin out (_unclusteredForMove)').toBe(true);
}

test.describe('Move mode — ghost pins', () => {
  test.describe.configure({ timeout: 60_000 });

  test('deleting a pin during move mode removes it from the map for good', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await bootSeeded(page);
    await enterMoveMode(page);

    await page.evaluate((pinId) => deleteFeature(pinId), PIN_0);
    await page.waitForTimeout(300);

    const afterDelete = await page.evaluate((pinId) => ({
      inState: state.articles.some(a => a.id === pinId),
      tracked: !!layerById.get(pinId),
    }), PIN_0);
    expect(afterDelete.inState).toBe(false);
    expect(afterDelete.tracked, 'deleted pin must leave layerById').toBe(false);

    // Exit move mode: the cleanup block must NOT resurrect the deleted layer.
    await page.evaluate(() => debouncedSetMode('pointer'));
    await page.waitForTimeout(300);

    const afterExit = await page.evaluate((pinId) => ({
      ghostInClusterGroup: allLayers.getLayers().some(l => l.feature && l.feature.id === pinId),
      trackedCount: layerById.size,
      clusterCount: allLayers.getLayers().length,
    }), PIN_0);
    expect(afterExit.ghostInClusterGroup, 'deleted pin must not be re-added to allLayers on move-mode exit').toBe(false);
    expect(afterExit.clusterCount, 'only the surviving pin should be cluster-managed').toBe(1);

    expect(errors, `unexpected page errors: ${errors.join(', ')}`).toEqual([]);
  });

  test('switching maps during move mode does not leak the old map\'s pins', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await bootSeeded(page);
    await enterMoveMode(page);

    // Switch to the empty Map B while move mode is active. navigateToMap tears down the old
    // map (initMap) and debounces back to pointer mode; wait past both.
    await page.evaluate((mapId) => navigateToMap(mapId), MAP_B);
    await page.waitForFunction((mapId) => state.activeMapId === mapId, MAP_B);
    await page.waitForTimeout(600);

    const onMapB = await page.evaluate(() => ({
      foreignInClusterGroup: allLayers.getLayers().filter(l => l.feature && l.feature.mapId !== state.activeMapId).length,
      clusterCount: allLayers.getLayers().length,
      markerIcons: document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon').length,
    }));
    expect(onMapB.foreignInClusterGroup, 'no Map A layers may live in Map B\'s cluster group').toBe(0);
    expect(onMapB.clusterCount, 'Map B has no pins — its cluster group must be empty').toBe(0);
    expect(onMapB.markerIcons, 'no ghost marker icons may render on Map B').toBe(0);

    expect(errors, `unexpected page errors: ${errors.join(', ')}`).toEqual([]);
  });
});
