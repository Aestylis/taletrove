/**
 * C4 prep — characterization spec for the atlas search filter / ancestor-walk logic.
 *
 * Pins the observable DOM behavior of the filtering block inside refreshAtlasTree BEFORE the
 * C4 decomposition moves it into _computeAtlasFilterSets. Asserts outcomes (which rows render),
 * not internals, so it must stay green unchanged across the refactor.
 *
 * Branches exercised:
 *  - feature match → ancestor folders bubble (folder→parentFolder→map walk)
 *  - map nested inside a folder (map→folder walk-back)
 *  - lore-pin match → its mapId bubbles into ancestorsToShow
 *  - non-matching feature is filtered out
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('C4 — atlas filter/ancestor sets', () => {
  test('search renders matches, their ancestor chain, and nothing else', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const r = await page.evaluate(async () => {
      // Settle any boot-time refresh so we start from a known-idle tree.
      await refreshAtlasTree();
      await new Promise(res => setTimeout(res, 300));

      const mid = state.activeMapId;
      collapsedNodes.delete(mid);

      // Folder chain on the active map: fA → fB
      state.folders.push(
        { id: 'c4fA', name: 'Alpha Folder', mapId: mid, parentFolderId: null },
        { id: 'c4fB', name: 'Beta Folder', mapId: mid, parentFolderId: 'c4fA' },
      );

      // Map nested inside folder fA (exercises the map→folder walk-back)
      state.maps.push({ id: 'c4m2', name: 'Nested Map', parentId: mid, folderId: 'c4fA', visibleToPlayers: true });

      const mkFeat = (id, title, folderId) => ({
        id, _silo: 'atlas',
        name: title, title, type: 'Location',
        featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e',
        geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: mid, folderId,
        labelStyle: 'outline', labelColor: '#ffffff', visibleToPlayers: false,
        tags: [], links: [], blocks: [],
      });
      // Match deep in the folder chain + a root-level non-match
      state.articles.push(mkFeat('c4feat1', 'Xanadu Keep', 'c4fB'));
      state.articles.push(mkFeat('c4feat2', 'Unrelated Hamlet', null));

      // Lore pin on the nested map — its name matches, so c4m2 must bubble into the tree
      state.articles.push({
        id: 'c4lore1', _silo: 'lore',
        name: 'Xanadu Shrine', type: 'Location',
        mapId: 'c4m2', visibleToPlayers: false,
        tags: [], links: [], blocks: [],
      });
      syncArticleViews();

      // Baseline (no query): rebuild and confirm the seeds render where expected.
      await refreshAtlasTree();
      const baseline = {
        feat2Row: !!document.querySelector('.feature-row[data-fid="c4feat2"]'),
        folderA: !!document.querySelector('.folder-node[data-folder-id="c4fA"]'),
      };

      // Apply the search query the way the app does: the rebuild reads #atlasFilterInput.
      const input = document.querySelector('#atlasFilterInput');
      input.value = 'xanadu';
      await refreshAtlasTree();

      const filtered = {
        feat1Row: !!document.querySelector('.feature-row[data-fid="c4feat1"]'),
        folderA: !!document.querySelector('.folder-node[data-folder-id="c4fA"]'),
        folderB: !!document.querySelector('.folder-node[data-folder-id="c4fB"]'),
        nestedMap: !!document.querySelector('.map-node[data-map-id="c4m2"]'),
        loreRow: !!document.querySelector('.encyclopedia-item[data-entry-id="c4lore1"]'),
        feat2Row: !!document.querySelector('.feature-row[data-fid="c4feat2"]'),
      };

      return { baseline, filtered };
    });

    console.log('  C4 filter sets:', JSON.stringify(r));

    // Baseline sanity — the seeds themselves render
    expect(r.baseline.feat2Row, 'seeded root feature must render with no query').toBe(true);
    expect(r.baseline.folderA, 'seeded folder must render with no query').toBe(true);

    // Filtered tree
    expect(r.filtered.feat1Row, 'matching feature must render').toBe(true);
    expect(r.filtered.folderA, 'ancestor folder fA must bubble in').toBe(true);
    expect(r.filtered.folderB, 'ancestor folder fB must bubble in').toBe(true);
    expect(r.filtered.nestedMap, 'lore match must bubble its mapId (nested map renders)').toBe(true);
    expect(r.filtered.loreRow, 'matching lore pin must render under its map').toBe(true);
    expect(r.filtered.feat2Row, 'non-matching feature must be filtered out').toBe(false);

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
