/**
 * Phase M part 2 — _computeLoreFlatRows parity spec.
 *
 * The flat lore model must reproduce the legacy refreshEncyclopediaView row order exactly:
 * sorted root folders → recursion (sorted subfolders → sorted entries) → unfiled entries,
 * with the query/tag filter visibility rules and folder collapse. Pins the legacy renderer
 * via the kill switch so the DOM comparison stays valid once lore goes virtual.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Phase M2 — lore flat row model', () => {
  test('flat rows mirror legacy lore DOM order, filters, and collapse', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const r = await page.evaluate(async () => {
      saveLS('atlasVirtualTree', false); // pin legacy renderers for the DOM comparison

      // Lore folders live in state.folders with mapId == null
      state.folders.push(
        { id: 'lf-A', name: 'Alpha Lore', mapId: null, parentFolderId: null },
        { id: 'lf-B', name: 'Beta Sub', mapId: null, parentFolderId: 'lf-A' },
        { id: 'lf-C', name: 'Collapsed Lore', mapId: null, parentFolderId: null },
      );
      const mkEntry = (id, name, folderId, tags = []) => ({
        id, _silo: 'lore', name, title: name, type: 'Location',
        folderId, tags, links: [], blocks: [], visibleToPlayers: false,
      });
      state.articles.push(mkEntry('le-1', 'Amber Keep', 'lf-B', ['royal']));
      state.articles.push(mkEntry('le-2', 'Zephyr Tower', 'lf-A'));
      state.articles.push(mkEntry('le-3', 'Hidden Vault', 'lf-C'));
      state.articles.push(mkEntry('le-4', 'Unfiled Shrine', null, ['royal']));
      syncArticleViews();
      collapsedEncyclopediaFolderNodes.add('lf-C');

      const legacyOrder = async (rawQuery) => {
        const input = document.querySelector('#atlasFilterInput');
        if (input) input.value = rawQuery || '';
        await refreshEncyclopediaView();
        const view = document.querySelector('#encyclopediaView');
        return [...view.querySelectorAll('.folder-row, .encyclopedia-item[data-entry-id]')].map(el =>
          el.classList.contains('folder-row')
            ? el.closest('.folder-node')?.dataset.folderId
            : el.dataset.entryId
        );
      };
      const flatOrder = (rows) => rows.map(r => r.id);

      const out = {};

      // Case 1: no filter — collapsed folder's entries hidden, folder row itself present
      const rows1 = _computeLoreFlatRows('');
      out.noFilter = {
        flat: flatOrder(rows1),
        legacy: await legacyOrder(''),
        depths: Object.fromEntries(rows1.map(r => [r.id, r.depth])),
        collapsedChildAbsent: !rows1.some(r => r.id === 'le-3'),
      };

      // Case 2: text query hits one deep entry — ancestor folders bubble; collapsed opens under filter
      const rows2 = _computeLoreFlatRows(normalizeForSearch('amber'));
      out.query = {
        flat: flatOrder(rows2),
        legacy: await legacyOrder('amber'),
      };

      // Case 3: tag filter (no text query) — activeTags path
      activeTags.add('royal');
      const rows3 = _computeLoreFlatRows('');
      out.tag = {
        flat: flatOrder(rows3),
        legacy: await legacyOrder(''),
      };
      activeTags.delete('royal');

      // cleanup
      const input = document.querySelector('#atlasFilterInput');
      if (input) input.value = '';
      collapsedEncyclopediaFolderNodes.delete('lf-C');
      localStorage.removeItem('atlasVirtualTree');

      return out;
    });

    console.log('  M2 lore rows:', JSON.stringify({ noFilter: r.noFilter.flat, query: r.query.flat, tag: r.tag.flat }));

    expect(r.noFilter.flat, 'no-filter: flat order equals legacy DOM order').toEqual(r.noFilter.legacy);
    expect(r.query.flat, 'query: flat order equals legacy DOM order').toEqual(r.query.legacy);
    expect(r.tag.flat, 'tag filter: flat order equals legacy DOM order').toEqual(r.tag.legacy);

    expect(r.noFilter.depths['lf-A'], 'root folder depth').toBe(0);
    expect(r.noFilter.depths['lf-B'], 'subfolder depth').toBe(1);
    expect(r.noFilter.depths['le-1'], 'entry-in-subfolder depth').toBe(2);
    expect(r.noFilter.depths['le-4'], 'unfiled entry depth').toBe(0);
    expect(r.noFilter.collapsedChildAbsent, 'collapsed folder children excluded').toBe(true);

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
