/**
 * Phase M — virtual atlas tree: rebuild perf, window bounds, scroll materialization,
 * kill switch, and flat-mode parity (visibility toggle patch, active-map highlight).
 *
 * Perf target (design doc): rebuild <100ms at 5000 articles fully expanded. Asserted at
 * <150ms to absorb CI jitter; the measured median is logged for the perf README.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Phase M — virtual atlas tree', () => {
  test('windowed rendering: perf, bounds, scroll, kill switch, parity', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const r = await page.evaluate(async () => {
      const mid = state.activeMapId;
      collapsedNodes.delete(mid);

      // 5000 features on the expanded active map — the pathological full-tree case.
      for (let i = 0; i < 5000; i++) {
        state.articles.push({
          id: `vt-${i}`, _silo: 'atlas', name: `Pin ${i}`, title: `Pin ${i}`, type: 'Location',
          featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e', geometry: 'point',
          geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [i % 100, (i / 100) | 0] } },
          mapId: mid, folderId: null, labelStyle: 'outline', labelColor: '#ffffff',
          visibleToPlayers: i % 2 === 0, tags: [], links: [], blocks: [],
        });
      }
      syncArticleViews();

      await refreshAtlasTree(); // warm-up (icon caches, height calibration)

      // (a) rebuild timing — median of 3
      const times = [];
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        await refreshAtlasTree();
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const median = times[1];

      // (b) window bounds
      const tc = document.querySelector('#atlasTreeContainer');
      const materialized = tc.querySelectorAll('.tree-row').length;
      const spacers = tc.querySelectorAll('.atlas-vspacer').length;
      const flatTotal = _atlasFlatRows.length;

      // (e1) visibility toggle patches a flat row in place
      const visTarget = document.querySelector('.feature-row[data-fid] .row-vis-btn');
      let visPatched = false;
      if (visTarget) {
        const fid = visTarget.closest('.feature-row').dataset.fid;
        const f = state.features.find(x => x.id === fid);
        f.visibleToPlayers = !f.visibleToPlayers;
        visPatched = updateRowVisibility(fid, 'feature') === true &&
          visTarget.classList.contains(f.visibleToPlayers ? 'is-player' : 'is-gm');
        f.visibleToPlayers = !f.visibleToPlayers; // restore
        updateRowVisibility(fid, 'feature');
      }

      // (e2) active map row highlighted in flat mode
      const activeHighlighted = !!document.querySelector(`.map-row[data-map-id="${mid}"].active`);

      // (c) scroll the tree segment's tail into view → last rows materialize
      // (container bottom is BELOW the tree — Lore/Sessions sections come after it)
      const container = document.querySelector('#atlasView');
      tc.querySelector('.atlas-vspacer-bottom').scrollIntoView(false);
      await new Promise(res => setTimeout(res, 200)); // rAF slice
      const lastId = _atlasFlatRows[_atlasFlatRows.length - 1].id;
      const lastRowPresent = !!document.querySelector(`[data-fid="${lastId}"], [data-map-id="${lastId}"], [data-folder-id="${lastId}"], [data-entry-id="${lastId}"]`);
      const boundedAfterScroll = tc.querySelectorAll('.tree-row').length < 200;
      container.scrollTop = 0;

      // (d) kill switch → legacy nested shape
      saveLS('atlasVirtualTree', false);
      await refreshAtlasTree();
      const legacyShape = !!document.querySelector('#atlasTreeContainer .tree-children') &&
        !document.querySelector('#atlasTreeContainer .atlas-vspacer');
      localStorage.removeItem('atlasVirtualTree');
      await refreshAtlasTree();
      const virtualBack = !!document.querySelector('#atlasTreeContainer .atlas-vspacer');

      return { median, times, materialized, spacers, flatTotal, visPatched, activeHighlighted, lastRowPresent, boundedAfterScroll, legacyShape, virtualBack };
    });

    console.log(`  M virtual: rebuild median ${r.median.toFixed(1)}ms (runs: ${r.times.map(t => t.toFixed(1)).join('/')}) | ` +
      `rows ${r.materialized}/${r.flatTotal} materialized`);

    expect(r.flatTotal, 'flat model contains the seeded world').toBeGreaterThan(5000);
    expect(r.median, 'rebuild must be <150ms at 5000 articles (target 100)').toBeLessThan(150);
    expect(r.materialized, 'materialized rows bounded by viewport, not world size').toBeLessThan(200);
    expect(r.spacers, 'both spacers present').toBe(2);
    expect(r.visPatched, 'updateRowVisibility patches flat rows in place').toBe(true);
    expect(r.activeHighlighted, 'active map row highlighted in flat mode').toBe(true);
    expect(r.lastRowPresent, 'scrolling to the bottom materializes the last row').toBe(true);
    expect(r.boundedAfterScroll, 'row count stays bounded after scrolling').toBe(true);
    expect(r.legacyShape, 'kill switch restores the legacy nested renderer').toBe(true);
    expect(r.virtualBack, 'removing the flag returns to the virtual renderer').toBe(true);

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
