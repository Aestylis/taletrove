/**
 * WS2 increment 2 — verify small-display image consumers render from thumbnails.
 *
 * Increment 1 switched the asset grid to `resolveThumbUrl`. Increment 2 extends it to other
 * small surfaces that are NOT lightbox-linked: map popup heroes, family-tree avatars, and
 * timeline/gantt event cards. They all share the same `thumb256-` cache as the asset grid.
 *
 * This test exercises the map popup hero path (`buildPopupHeader`) end to end: seed a full-size
 * `img-` hero blob, build the popup header, and assert it renders a blob URL and that a
 * `thumb256-<key>` was generated + persisted.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('WS2 inc2 — thumbnail consumers', () => {
  test.describe.configure({ timeout: 60_000 });

  test('map popup hero renders from a generated thumbnail', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const result = await page.evaluate(async () => {
      const dim = 1200;
      const key = 'img-popuptest-0';

      const db = await new Promise((res, rej) => {
        const q = indexedDB.open('worldbuilder', 2);
        q.onupgradeneeded = () => {
          const d = q.result;
          if (!d.objectStoreNames.contains('files'))   d.createObjectStore('files');
          if (!d.objectStoreNames.contains('objects')) d.createObjectStore('objects');
        };
        q.onsuccess = () => res(q.result);
        q.onerror   = () => rej(q.error);
      });
      const put = (k, b) => new Promise((res, rej) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(b, k);
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
      });
      const getSize = (k) => new Promise((res) => {
        const tx = db.transaction('files', 'readonly');
        const rq = tx.objectStore('files').get(k);
        rq.onsuccess = () => res(rq.result ? rq.result.size : 0);
        rq.onerror   = () => res(0);
      });

      // seed a realistic full-size hero image
      const c = document.createElement('canvas');
      c.width = c.height = dim;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, dim, dim);
      g.addColorStop(0, '#3a6'); g.addColorStop(1, '#148');
      ctx.fillStyle = g; ctx.fillRect(0, 0, dim, dim);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
      await put(key, blob);

      // build a map popup header for an item using that hero image
      const hero = await window.buildPopupHeader({
        id: 'art-popuptest', title: 'Popup Test', type: 'Location', icon: 'castle', heroImageKey: key,
      });

      // resolveThumbUrl awaits idbSet before returning, so the thumb is persisted by now
      const bg = hero.style.backgroundImage || '';
      const origKB  = Math.round((await getSize(key)) / 1024);
      const thumbKB = Math.round((await getSize(`thumb256-${key}`)) / 1024);
      db.close();

      return { bg, hasImageClass: hero.classList.contains('has-image'), origKB, thumbKB };
    });

    console.log('  WS2 inc2 popup:', JSON.stringify(result));

    expect(result.hasImageClass).toBe(true);
    expect(result.bg).toContain('blob:');
    // a thumbnail was generated, and it's materially smaller than the source
    expect(result.thumbKB).toBeGreaterThan(0);
    expect(result.thumbKB).toBeLessThan(result.origKB / 2);

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
