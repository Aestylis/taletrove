/**
 * syncSingleLayer() had no reentrancy guard for creating a not-yet-tracked layer. Pin creation
 * fires an unawaited render() (which eventually calls syncSingleLayer to build the Leaflet
 * layer) at the same time the editable name field's per-keystroke handler can also call
 * syncSingleLayer for the same brand-new feature. Both calls saw no layerById entry yet and
 * independently built + added their own layer; only the last layerById.set() won, leaving the
 * others orphaned on the map (or the tracked layer itself detached) — the pin then rendered as
 * invisible until a hard reload rebuilt layerById from scratch.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Concurrent syncSingleLayer calls for a brand-new pin', () => {
  test('racing layer creation still ends with exactly one tracked, visible layer', async ({ page }) => {
    await gotoApp(page);

    const result = await page.evaluate(async () => {
      const latlng = map.getCenter();
      const layer = L.marker(latlng);
      map.fire(L.Draw.Event.CREATED, { layer, layerType: 'marker' });
      const newest = state.articles.filter(a => a.geometry === 'point').slice(-1)[0];

      // Fire several concurrent "keystrokes" in the same tick as creation's own unawaited
      // render() -> syncSingleLayer() call, before any of them can see a tracked layer yet.
      newest.title = 'Raced Name';
      newest.name = 'Raced Name';
      markEntityDirty('article', newest.id);
      const p1 = window.syncSingleLayer(newest);
      const p2 = window.syncSingleLayer(newest);
      const p3 = window.syncSingleLayer(newest);
      await Promise.all([p1, p2, p3]);
      await new Promise(r => setTimeout(r, 300));

      const layersForId = [];
      map.eachLayer(l => { if (l.feature?.id === newest.id) layersForId.push(l); });

      const tracked = layerById.get(newest.id);
      return {
        trackedExists: !!tracked,
        trackedHasIcon: tracked ? !!tracked.getElement?.() : false,
        trackedOnMap: tracked ? map.hasLayer(tracked) : false,
        leafletLayerCountForId: layersForId.length,
        leafletLayersMatchTracked: layersForId.every(l => l === tracked),
      };
    });

    expect(result.trackedExists, 'layerById must track a layer').toBe(true);
    expect(result.trackedOnMap, 'the tracked layer must actually be on the map').toBe(true);
    expect(result.trackedHasIcon, 'the tracked layer must have a live icon').toBe(true);
    expect(result.leafletLayerCountForId, 'exactly one Leaflet layer should exist for this feature').toBe(1);
    expect(result.leafletLayersMatchTracked, 'the on-map layer must be the one layerById tracks').toBe(true);
  });
});
