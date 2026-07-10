/**
 * C5 — refreshAtlasTree must coalesce concurrent calls, not drop them.
 *
 * The old guard (`if (isAtlasRefreshing) return;`) silently no-opped any call made while a
 * refresh was in flight. A caller who awaited that dropped call proceeded against a tree built
 * from PRE-mutation state (this produced the ws3-incremental flake, and in the app it leaves the
 * tree stale until the next unrelated refresh).
 *
 * Contract under test: `await refreshAtlasTree()` resolves only once the tree is ACTUALLY fresh —
 * a rebuild that started at-or-after the call, reflecting all state mutations made before it.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('C5 — atlas refresh coalescing', () => {
  test('a refresh requested mid-rebuild still lands (awaited call yields a fresh tree)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const r = await page.evaluate(async () => {
      // Settle any boot-time refresh so we start from a known-idle tree.
      await refreshAtlasTree();
      await new Promise(res => setTimeout(res, 300));

      // Expand the active map up front so the new row is renderable.
      collapsedNodes.delete(state.activeMapId);

      // Kick off a rebuild (do NOT await) — the guard window opens on its first internal await.
      const p1 = refreshAtlasTree();

      // Mutate state while that rebuild is in flight...
      const feat = {
        id: 'art-c5-1', _silo: 'atlas',
        name: 'C5 Pin', title: 'C5 Pin', type: 'Location',
        featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e',
        geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: state.activeMapId, folderId: null,
        labelStyle: 'outline', labelColor: '#ffffff', visibleToPlayers: false,
        tags: [], links: [], blocks: [],
      };
      state.articles.push(feat);
      syncArticleViews();

      // ...and request another refresh. With the drop-guard this resolves immediately,
      // while p1 is still mid-rebuild and the container is empty.
      await refreshAtlasTree();

      const treeContainer = document.querySelector('#atlasTreeContainer');
      return {
        // The awaited call must not resolve while a rebuild is still running.
        treePresent: !!treeContainer,
        rowPresent: !!document.querySelector('.feature-row[data-fid="art-c5-1"]'),
      };
    });

    console.log('  C5 coalesce:', JSON.stringify(r));

    expect(r.treePresent, 'awaited refresh resolved while the tree was still torn down').toBe(true);
    expect(r.rowPresent, 'mutation made before the awaited refresh must be visible after it').toBe(true);

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
