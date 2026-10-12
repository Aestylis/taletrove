/**
 * Bundled sample world sanity: its play session must be a real Session entry so the Sessions
 * section is not empty while a "Sessions" lore folder shows the same item (2026-10 audit).
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('sample world ships its session as a Session entry', async ({ page }) => {
  await gotoApp(page);
  const info = await page.evaluate(async () => {
    const resp = await fetch('Examples/SampleWorld.trv');
    const zip = await JSZip.loadAsync(await resp.blob());
    const world = JSON.parse(await zip.file('world.json').async('string'));
    const st = world.state;
    const sessions = st.articles.filter(a => (a.type || '').toLowerCase() === 'session');
    return {
      ok: resp.ok,
      sessionNames: sessions.map(a => a.name),
      sessionFolders: st.folders.filter(f => /session/i.test(f.name || '')).map(f => f.name),
      orphanFolderIds: st.articles.filter(a => a.folderId && !st.folders.some(f => f.id === a.folderId)).map(a => a.id),
    };
  });
  expect(info.ok).toBe(true);
  expect(info.sessionNames.length).toBeGreaterThan(0);
  expect(info.sessionFolders).toEqual([]);
  expect(info.orphanFolderIds).toEqual([]);
});
