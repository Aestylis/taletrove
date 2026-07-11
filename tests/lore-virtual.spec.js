/**
 * Phase M part 2 — virtual Lore list: drop resolution, real drag, HTML5 folder drop,
 * rebuild perf at 5000 entries, window bounds, kill switch.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Phase M2 — virtual lore list', () => {
  test('drop resolution rules + HTML5 folder drop + perf/bounds/kill-switch', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const r = await page.evaluate(async () => {
      state.folders.push(
        { id: 'lv-A', name: 'Alpha', mapId: null, parentFolderId: null },
        { id: 'lv-B', name: 'Beta', mapId: null, parentFolderId: 'lv-A' },
        { id: 'lv-C', name: 'Collapsed', mapId: null, parentFolderId: null },
      );
      const mkEntry = (id, name, folderId) => ({
        id, _silo: 'lore', name, title: name, type: 'Location',
        folderId, tags: [], links: [], blocks: [], visibleToPlayers: false,
      });
      state.articles.push(mkEntry('lv-e1', 'Deep Entry', 'lv-B'));
      state.articles.push(mkEntry('lv-e2', 'Unfiled Entry', null));
      syncArticleViews();
      collapsedEncyclopediaFolderNodes.add('lv-C');

      const rows = _computeLoreFlatRows('');
      const idxAfter = (id) => rows.findIndex(r => r.id === id) + 1;
      const cases = {
        top: _resolveLoreFlatDropTarget(rows, 0),                       // → root
        afterOpenFolder: _resolveLoreFlatDropTarget(rows, idxAfter('lv-A')), // → into A
        afterDeepEntry: _resolveLoreFlatDropTarget(rows, idxAfter('lv-e1')), // → sibling in B
        afterCollapsed: _resolveLoreFlatDropTarget(rows, idxAfter('lv-C')),  // → root (C's parent)
        afterUnfiled: _resolveLoreFlatDropTarget(rows, idxAfter('lv-e2')),   // → root
      };

      // HTML5 folder drop (application/x-taleprove-entry) on a flat folder row
      await refreshEncyclopediaView();
      const folderRow = document.querySelector('#encyclopediaView .folder-row[data-folder-id="lv-A"]');
      let html5Drop = false;
      if (folderRow) {
        const dt = new DataTransfer();
        dt.setData('application/x-taleprove-entry', 'lv-e2');
        folderRow.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        await new Promise(res => setTimeout(res, 100));
        html5Drop = state.encyclopedia.find(e => e.id === 'lv-e2')?.folderId === 'lv-A';
        // restore
        state.encyclopedia.find(e => e.id === 'lv-e2').folderId = null;
      }

      // Perf: 5000 unfiled lore entries
      for (let i = 0; i < 5000; i++) state.articles.push(mkEntry(`lv-p${i}`, `Lore ${i}`, null));
      syncArticleViews();
      await refreshEncyclopediaView(); // warm-up
      const times = [];
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        await refreshEncyclopediaView();
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const median = times[1];

      const view = document.querySelector('#encyclopediaView');
      const materialized = view.querySelectorAll('.tree-row, .encyclopedia-item').length;
      const total = _loreSeg.rows.length;
      const spacers = view.querySelectorAll('.atlas-vspacer').length;

      // Kill switch → legacy nested shape
      saveLS('atlasVirtualTree', false);
      await refreshEncyclopediaView();
      const legacyShape = !!document.querySelector('#encyclopediaView .folder-node') &&
        !document.querySelector('#encyclopediaView .atlas-vspacer');
      localStorage.removeItem('atlasVirtualTree');
      await refreshEncyclopediaView();
      const virtualBack = !!document.querySelector('#encyclopediaView .atlas-vspacer');

      collapsedEncyclopediaFolderNodes.delete('lv-C');
      return { cases, html5Drop, median, times, materialized, total, spacers, legacyShape, virtualBack };
    });

    console.log(`  M2 lore virtual: rebuild median ${r.median.toFixed(1)}ms (runs: ${r.times.map(t => t.toFixed(1)).join('/')}) | ` +
      `rows ${r.materialized}/${r.total} materialized`);

    expect(r.cases.top, 'top → root').toBe(null);
    expect(r.cases.afterOpenFolder, 'after open folder → into it').toBe('lv-A');
    expect(r.cases.afterDeepEntry, 'after deep entry → its folder').toBe('lv-B');
    expect(r.cases.afterCollapsed, 'after collapsed folder → its parent (root)').toBe(null);
    expect(r.cases.afterUnfiled, 'after unfiled entry → root').toBe(null);
    expect(r.html5Drop, 'HTML5 application/x-taleprove-entry drop on flat folder row').toBe(true);

    expect(r.total, 'flat model contains the 5000-entry world').toBeGreaterThan(5000);
    expect(r.median, 'lore rebuild <150ms at 5000 entries (target 100)').toBeLessThan(150);
    expect(r.materialized, 'materialized rows bounded by viewport').toBeLessThan(200);
    expect(r.spacers, 'both spacers present').toBe(2);
    expect(r.legacyShape, 'kill switch restores legacy lore renderer').toBe(true);
    expect(r.virtualBack, 'flag removal returns to virtual lore renderer').toBe(true);

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('real Sortable drag moves an unfiled entry into a folder', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await gotoApp(page);
    await page.waitForTimeout(1500); // boot settle

    await page.evaluate(async () => {
      state.folders.push({ id: 'lv2-A', name: 'Alpha', mapId: null, parentFolderId: null });
      state.articles.push({
        id: 'lv2-e1', _silo: 'lore', name: 'Draggable Entry', title: 'Draggable Entry', type: 'Location',
        folderId: null, tags: [], links: [], blocks: [], visibleToPlayers: false,
      });
      syncArticleViews();
      toggleAsidePanel(false);
      await refreshEncyclopediaView();
    });
    await page.waitForTimeout(600); // drawer transition

    await page.waitForSelector('#encyclopediaView .encyclopedia-item[data-entry-id="lv2-e1"]');
    const src = await page.locator('#encyclopediaView .encyclopedia-item[data-entry-id="lv2-e1"]').boundingBox();
    const dst = await page.locator('#encyclopediaView .folder-row[data-folder-id="lv2-A"]').boundingBox();
    expect(src && dst).toBeTruthy();

    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300);
    await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height + 4, { steps: 12 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(800);

    const folderId = await page.evaluate(() => state.encyclopedia.find(e => e.id === 'lv2-e1')?.folderId);
    expect(folderId, 'dragged lore entry must land in folder lv2-A').toBe('lv2-A');

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
