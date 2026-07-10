/**
 * Phase M — _computeAtlasFlatRows parity spec.
 *
 * The flat row model must reproduce the LEGACY nested renderer's row order exactly (same
 * ids, same document order), plus correct depths, collapse behavior, and ghost flags.
 * Forces the legacy renderer via the atlasVirtualTree kill switch so this comparison stays
 * valid after virtual mode becomes the default.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Phase M — atlas flat row model', () => {
  test('flat rows mirror legacy DOM order, depths, collapse, and ghosts', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const r = await page.evaluate(async () => {
      saveLS('atlasVirtualTree', false); // pin the legacy renderer for the DOM comparison
      const mid = state.activeMapId;
      collapsedNodes.delete(mid);

      state.folders.push(
        { id: 'fr-fA', name: 'Alpha Folder', mapId: mid, parentFolderId: null },
        { id: 'fr-fB', name: 'Beta Folder', mapId: mid, parentFolderId: 'fr-fA' },
        { id: 'fr-fC', name: 'Collapsed Folder', mapId: mid, parentFolderId: null },
      );
      state.maps.push({ id: 'fr-m2', name: 'Nested Map', parentId: mid, folderId: 'fr-fA', visibleToPlayers: true });

      const mkFeat = (id, title, folderId) => ({
        id, _silo: 'atlas', name: title, title, type: 'Location',
        featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e', geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: mid, folderId, labelStyle: 'outline', labelColor: '#ffffff',
        visibleToPlayers: false, tags: [], links: [], blocks: [],
      });
      state.articles.push(mkFeat('fr-feat1', 'Xanadu Keep', 'fr-fB'));
      state.articles.push(mkFeat('fr-feat2', 'Unrelated Hamlet', null));
      state.articles.push(mkFeat('fr-feat3', 'Hidden In Collapsed', 'fr-fC'));
      state.articles.push({
        id: 'fr-lore1', _silo: 'lore', name: 'Xanadu Shrine', type: 'Location',
        mapId: 'fr-m2', visibleToPlayers: false, tags: [], links: [], blocks: [],
      });
      syncArticleViews();
      collapsedFolderNodes.add('fr-fC'); // exercise the collapsed branch

      const buildCtx = (rawQuery) => {
        const query = normalizeForSearch((rawQuery || '').trim());
        const { itemsToShow, ancestorsToShow } = _computeAtlasFilterSets(query);
        return { query, itemsToShow, ancestorsToShow, categoryFilter: null, activeMapAncestors: new Set() };
      };

      // Legacy DOM order: render the nested tree, then read row ids in document order.
      const legacyOrder = async (rawQuery) => {
        const input = document.querySelector('#atlasFilterInput');
        if (input) input.value = rawQuery || '';
        await refreshAtlasTree();
        const tc = document.querySelector('#atlasTreeContainer');
        // Legacy shape: data-map-id sits on the .map-node WRAPPER, not the .map-row.
        return [...tc.querySelectorAll(
          '.feature-row[data-fid], .folder-row[data-folder-id], .map-row, .lore-in-map-subheader, .encyclopedia-item[data-entry-id]'
        )].map(el => {
          if (el.classList.contains('map-row')) return el.dataset.mapId || el.closest('.map-node')?.dataset.mapId;
          if (el.classList.contains('lore-in-map-subheader')) return `lore-subheader:${el.closest('[data-lore-map-id]')?.dataset.loreMapId}`;
          return el.dataset.fid || el.dataset.folderId || el.dataset.entryId;
        });
      };

      const flatOrder = (rows) => rows.map(r => r.kind === 'lore-subheader' ? `lore-subheader:${r.id}` : r.id);

      const out = {};

      // Case 1: no query, one collapsed folder
      const rows1 = _computeAtlasFlatRows(buildCtx(''));
      out.noQuery = {
        flat: flatOrder(rows1),
        legacy: await legacyOrder(''),
        depths: Object.fromEntries(rows1.map(r => [flatOrder([r])[0], r.depth])),
        collapsedChildAbsent: !rows1.some(r => r.id === 'fr-feat3'),
        collapsedFolderPresent: rows1.some(r => r.id === 'fr-fC' && r.kind === 'folder'),
        anyGhost: rows1.some(r => r.ghost),
      };

      // Case 2: query 'xanadu' — ancestor bubbling + ghosts
      const rows2 = _computeAtlasFlatRows(buildCtx('xanadu'));
      out.query = {
        flat: flatOrder(rows2),
        legacy: await legacyOrder('xanadu'),
        ghostFA: rows2.find(r => r.id === 'fr-fA')?.ghost === true,
        matchNotGhost: rows2.find(r => r.id === 'fr-feat1')?.ghost === false,
        nonMatchAbsent: !rows2.some(r => r.id === 'fr-feat2'),
      };

      // cleanup
      const input = document.querySelector('#atlasFilterInput');
      if (input) input.value = '';
      collapsedFolderNodes.delete('fr-fC');
      localStorage.removeItem('atlasVirtualTree');

      return out;
    });

    console.log('  M flat rows:', JSON.stringify({
      noQueryLen: r.noQuery.flat.length, queryLen: r.query.flat.length,
      noQueryFlat: r.noQuery.flat, queryFlat: r.query.flat,
    }));

    expect(r.noQuery.flat, 'no-query: flat order must equal legacy DOM order').toEqual(r.noQuery.legacy);
    expect(r.query.flat, 'query: flat order must equal legacy DOM order').toEqual(r.query.legacy);

    // Depths for the known chain (main map=0, fA=1, fB=2, feat1=3, m2=2, lore subheader=3, lore entry=4)
    expect(r.noQuery.depths['fr-fA'], 'fA depth').toBe(1);
    expect(r.noQuery.depths['fr-fB'], 'fB depth').toBe(2);
    expect(r.noQuery.depths['fr-feat1'], 'feat1 depth').toBe(3);
    expect(r.noQuery.depths['fr-m2'], 'm2 depth').toBe(2);
    expect(r.noQuery.depths['lore-subheader:fr-m2'], 'lore subheader depth').toBe(3);
    expect(r.noQuery.depths['fr-lore1'], 'lore entry depth').toBe(4);

    expect(r.noQuery.collapsedChildAbsent, 'collapsed folder children excluded').toBe(true);
    expect(r.noQuery.collapsedFolderPresent, 'collapsed folder row itself present').toBe(true);
    expect(r.noQuery.anyGhost, 'no ghosts without a query').toBe(false);

    expect(r.query.ghostFA, 'fA is ghost (ancestor-only) under query').toBe(true);
    expect(r.query.matchNotGhost, 'matching feature not ghost').toBe(true);
    expect(r.query.nonMatchAbsent, 'non-match filtered out').toBe(true);

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
