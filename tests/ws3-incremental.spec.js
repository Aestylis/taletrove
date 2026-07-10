/**
 * WS3 — incremental panel render.
 *
 * Toggling a feature's player-visibility used to trigger a full `render({ full: true })`,
 * rebuilding the entire atlas tree (scroll jump, lost hover, lost focus). It now patches just
 * that row's eye button in place via `updateRowVisibility`.
 *
 * This test proves the patch happens in place: we tag the row node with a sentinel attribute
 * BEFORE the toggle. If the tree were rebuilt, the node (and its sentinel) would be replaced.
 * After the toggle we assert the same node survives, the article state flipped, and the eye
 * button's class/icon flipped to match.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import { seedWorld, clearWorld } from './perf/perf-helpers.js';

const MAP_ID = 'map-ws3';

function makeWorld() {
  return {
    meta: {
      appVersion: '0.6.22-alpha', activeMapId: MAP_ID,
      folders: [], encyclopediaFolders: [], templates: [], layoutTemplates: [],
      customColors: [], assetNames: {}, assetMeta: {}, appearance: {},
    },
    maps: [{
      id: MAP_ID, name: 'WS3 World', parentId: null, folderId: null,
      imageKey: 'img-ws3-missing', width: 2000, height: 2000,
      overlayKey: null, overlayOpacity: 0.4,
      scale: { pixels: 100, distance: 10, unit: 'miles' },
      grid: { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 },
      fog: { enabled: false, opacity: 1.0, mask: null },
    }],
    articles: [0, 1, 2].map(i => ({
      id: `art-ws3-${i}`, _silo: 'atlas',
      name: `Pin ${i}`, title: `Pin ${i}`, type: 'Location',
      featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e',
      geometry: 'point',
      geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [100 + i * 200, 100 + i * 200] } },
      mapId: MAP_ID, folderId: null,
      labelStyle: 'outline', labelColor: '#ffffff', visibleToPlayers: false,
      tags: [], links: [], blocks: [],
    })),
  };
}

test.describe('WS3 — incremental row render', () => {
  test.describe.configure({ timeout: 60_000 });

  test('toggling visibility patches the row in place (no tree rebuild)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // Boot once to get an IDB context, seed a known world, reload into it.
    await gotoApp(page);
    // Flush the debounced blank-world save queued by dismissing first-run modals — under
    // parallel-suite load it otherwise fires AFTER seedWorld and clobbers worldState-meta.
    await page.evaluate(async () => { try { if (window.flushSave) await window.flushSave(); } catch (_) {} });
    await clearWorld(page);
    await seedWorld(page, makeWorld());
    await page.reload();
    await page.waitForSelector('.header-controls', { state: 'visible' });
    await page.waitForFunction(() =>
      typeof state !== 'undefined' && state.features && state.features.length >= 3);

    // The boot-time render({full:true}) (navigateToMap's 200ms finally-timer, stretched under
    // parallel-suite load) can race us: a rebuild wipes the tree synchronously
    // (`container.innerHTML = ''`) before repopulating it across awaits, so a found row can
    // vanish between two evaluates. (refreshAtlasTree also used to DROP concurrent calls;
    // it coalesces since 0.6.41 — see atlas-refresh-coalesce.spec.js — but the atomicity
    // here still matters for the wipe race.)
    // Fix: do the whole attempt (expand → refresh → sentinel → toggle → verify) in ONE evaluate.
    // Once the row is found, everything after is synchronous — atomic within one JS task — and
    // the toggle only ever runs on the attempt that finds the row, so retries never double-toggle.
    const attemptToggle = () => page.evaluate(async (mapId) => {
      if (typeof collapsedNodes !== 'undefined') collapsedNodes.delete(mapId);
      const fid = 'art-ws3-0';
      let row = document.querySelector(`.feature-row[data-fid="${fid}"]`);
      if (!row) {
        await refreshAtlasTree(); // may be dropped by the guard — caller retries
        row = document.querySelector(`.feature-row[data-fid="${fid}"]`);
      }
      if (!row) return { found: false };

      // Sentinel: survives only if the node is NOT replaced by a rebuild.
      row.setAttribute('data-ws3-sentinel', 'kept');
      const classBefore = row.querySelector('.row-vis-btn').className;
      const visBefore = state.features.find(f => f.id === fid).visibleToPlayers;

      // Hot path: the eye-button handler.
      window.toggleFeatureVisibility(fid);

      const row2 = document.querySelector(`.feature-row[data-fid="${fid}"]`);
      return {
        found: true,
        sameNode: !!row2 && row2.getAttribute('data-ws3-sentinel') === 'kept',
        classBefore,
        classAfter: row2 ? row2.querySelector('.row-vis-btn').className : '',
        visBefore,
        visAfter: state.features.find(f => f.id === fid).visibleToPlayers,
      };
    }, MAP_ID);

    let r = await attemptToggle();
    for (let i = 0; i < 100 && !r.found; i++) {
      await page.waitForTimeout(200);
      r = await attemptToggle();
    }

    console.log('  WS3 incremental:', JSON.stringify(r));

    expect(r.found, 'feature row should be rendered on the expanded map').toBe(true);
    expect(r.sameNode, 'row node must be patched in place, not rebuilt').toBe(true);
    // Article state flipped…
    expect(r.visAfter).toBe(!r.visBefore);
    // …and the eye button reflects it (is-gm → is-player).
    expect(r.classBefore).toContain('is-gm');
    expect(r.classAfter).toContain('is-player');

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
