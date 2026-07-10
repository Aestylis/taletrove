/**
 * Phase M — flat drag & drop: _resolveFlatDropTarget rules + a real drag in virtual mode.
 *
 * Drop-target rules (insertion point = index the dragged row would occupy, rows exclude it):
 *  - top of tree → root of active map
 *  - after an EXPANDED folder/map → its first child
 *  - after a lore row → that map's root level (lore rows aren't drop parents)
 *  - otherwise → sibling of the row above (same parent)
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seedWorld = async (page) => page.evaluate(async () => {
  const mid = state.activeMapId;
  collapsedNodes.delete(mid);
  state.folders.push(
    { id: 'dnd-fA', name: 'Alpha Folder', mapId: mid, parentFolderId: null },
    { id: 'dnd-fB', name: 'Beta Folder', mapId: mid, parentFolderId: 'dnd-fA' },
    { id: 'dnd-fC', name: 'Collapsed Folder', mapId: mid, parentFolderId: null },
  );
  state.maps.push({ id: 'dnd-m2', name: 'Nested Map', parentId: mid, folderId: 'dnd-fA', visibleToPlayers: true });
  const mkFeat = (id, title, folderId) => ({
    id, _silo: 'atlas', name: title, title, type: 'Location',
    featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e', geometry: 'point',
    geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
    mapId: mid, folderId, labelStyle: 'outline', labelColor: '#ffffff',
    visibleToPlayers: false, tags: [], links: [], blocks: [],
  });
  state.articles.push(mkFeat('dnd-feat1', 'Deep Feature', 'dnd-fB'));
  state.articles.push(mkFeat('dnd-feat2', 'Root Feature', null));
  state.articles.push({
    id: 'dnd-lore1', _silo: 'lore', name: 'Nested Shrine', type: 'Location',
    mapId: 'dnd-m2', visibleToPlayers: false, tags: [], links: [], blocks: [],
  });
  syncArticleViews();
  collapsedFolderNodes.add('dnd-fC');
  await refreshAtlasTree();
  return mid;
});

test.describe('Phase M — flat atlas drag & drop', () => {
  test('_resolveFlatDropTarget rules', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await gotoApp(page);
    const r = await page.evaluate(async () => {
      const mid = state.activeMapId;
      collapsedNodes.delete(mid);
      state.folders.push(
        { id: 'dnd-fA', name: 'Alpha Folder', mapId: mid, parentFolderId: null },
        { id: 'dnd-fB', name: 'Beta Folder', mapId: mid, parentFolderId: 'dnd-fA' },
        { id: 'dnd-fC', name: 'Collapsed Folder', mapId: mid, parentFolderId: null },
      );
      state.maps.push({ id: 'dnd-m2', name: 'Nested Map', parentId: mid, folderId: 'dnd-fA', visibleToPlayers: true });
      const mkFeat = (id, title, folderId) => ({
        id, _silo: 'atlas', name: title, title, type: 'Location',
        featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e', geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: mid, folderId, labelStyle: 'outline', labelColor: '#ffffff',
        visibleToPlayers: false, tags: [], links: [], blocks: [],
      });
      state.articles.push(mkFeat('dnd-feat1', 'Deep Feature', 'dnd-fB'));
      state.articles.push(mkFeat('dnd-feat2', 'Root Feature', null));
      state.articles.push({
        id: 'dnd-lore1', _silo: 'lore', name: 'Nested Shrine', type: 'Location',
        mapId: 'dnd-m2', visibleToPlayers: false, tags: [], links: [], blocks: [],
      });
      syncArticleViews();
      collapsedFolderNodes.add('dnd-fC');

      const { itemsToShow, ancestorsToShow } = _computeAtlasFilterSets('');
      const rows = _computeAtlasFlatRows({ query: '', itemsToShow, ancestorsToShow, categoryFilter: null, activeMapAncestors: new Set() });
      const idxAfter = (id, kind) => rows.findIndex(r => r.id === id && (!kind || r.kind === kind)) + 1;

      const cases = {
        top: _resolveFlatDropTarget(rows, 0),                                  // → active map root
        afterOpenMap: _resolveFlatDropTarget(rows, idxAfter(mid, 'map')),       // → first child of mid
        afterOpenFolder: _resolveFlatDropTarget(rows, idxAfter('dnd-fA')),      // → into fA
        afterDeepFeature: _resolveFlatDropTarget(rows, idxAfter('dnd-feat1')),  // → sibling in fB
        afterNestedMap: _resolveFlatDropTarget(rows, idxAfter('dnd-m2', 'map')),// → into m2
        afterLoreSub: _resolveFlatDropTarget(rows, rows.findIndex(r => r.kind === 'lore-subheader') + 1),
        afterLoreEntry: _resolveFlatDropTarget(rows, idxAfter('dnd-lore1')),    // → m2 root
        afterCollapsedFolder: _resolveFlatDropTarget(rows, idxAfter('dnd-fC')), // → sibling at mid root
        afterRootFeature: _resolveFlatDropTarget(rows, idxAfter('dnd-feat2')),  // → mid root
      };
      collapsedFolderNodes.delete('dnd-fC');
      return { mid, cases };
    });

    const { mid, cases } = r;
    expect(cases.top).toEqual({ mapId: mid, folderId: null });
    expect(cases.afterOpenMap).toEqual({ mapId: mid, folderId: null });
    expect(cases.afterOpenFolder).toEqual({ mapId: mid, folderId: 'dnd-fA' });
    expect(cases.afterDeepFeature).toEqual({ mapId: mid, folderId: 'dnd-fB' });
    expect(cases.afterNestedMap).toEqual({ mapId: 'dnd-m2', folderId: null });
    expect(cases.afterLoreSub).toEqual({ mapId: 'dnd-m2', folderId: null });
    expect(cases.afterLoreEntry).toEqual({ mapId: 'dnd-m2', folderId: null });
    expect(cases.afterCollapsedFolder).toEqual({ mapId: mid, folderId: null });
    expect(cases.afterRootFeature).toEqual({ mapId: mid, folderId: null });

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('real drag in virtual mode moves a root feature into a folder', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await gotoApp(page);
    await page.waitForTimeout(1500); // boot settle (navigateToMap finally-timer)
    await seedWorld(page);
    await page.evaluate(() => toggleAsidePanel(false));
    await page.waitForTimeout(600); // drawer transition

    await page.waitForSelector('.feature-row[data-fid="dnd-feat2"]');
    const src = await page.locator('.feature-row[data-fid="dnd-feat2"]').boundingBox();
    const dstRow = await page.locator('.folder-row[data-folder-id="dnd-fA"]').boundingBox();
    expect(src && dstRow).toBeTruthy();

    // Drop just BELOW the open folder row → resolver targets fA's first-child position.
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300); // SortableJS delay: 150
    await page.mouse.move(dstRow.x + dstRow.width / 2, dstRow.y + dstRow.height + 4, { steps: 12 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(800);

    const moved = await page.evaluate(() => {
      const f = state.features.find(x => x.id === 'dnd-feat2');
      return { folderId: f.folderId, mapId: f.mapId };
    });
    expect(moved.folderId, 'dragged feature must land in folder fA').toBe('dnd-fA');

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
