/**
 * WS2 — verify the asset grid renders via lazy-generated thumbnails.
 *
 * Seeds full-size `img-` blobs into the IDB `files` store, renders the asset grid (which now calls
 * resolveThumbUrl), then asserts: cards display blob URLs, `thumb256-img-*` thumbnails were created
 * in IDB, and each thumb is materially smaller than its source.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('WS2 — asset grid thumbnails', () => {
  test.describe.configure({ timeout: 60_000 });

  test('asset grid generates and uses thumbnails', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const result = await page.evaluate(async () => {
      const N = 8, dim = 1200;

      // open the shared IDB
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
      const put = (key, blob) => new Promise((res, rej) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(blob, key);
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
      });
      const sizeOf = (key) => new Promise((res) => {
        const tx = db.transaction('files', 'readonly');
        const rq = tx.objectStore('files').get(key);
        rq.onsuccess = () => res(rq.result ? rq.result.size : 0);
        rq.onerror   = () => res(0);
      });
      const allKeys = () => new Promise((res) => {
        const tx = db.transaction('files', 'readonly');
        const rq = tx.objectStore('files').getAllKeys();
        rq.onsuccess = () => res(rq.result || []);
        rq.onerror   = () => res([]);
      });

      // seed N realistic full-size images
      const seeded = [];
      for (let i = 0; i < N; i++) {
        const c = document.createElement('canvas');
        c.width = c.height = dim;
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, dim, dim);
        g.addColorStop(0, `hsl(${(i * 47) % 360},65%,50%)`);
        g.addColorStop(1, `hsl(${(i * 89) % 360},55%,25%)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, dim, dim);
        const band = ctx.getImageData(0, 0, dim, 300);
        for (let p = 0; p < band.data.length; p += 4) { const n = (Math.random() * 80) | 0; band.data[p] ^= n; }
        ctx.putImageData(band, 0, 0);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
        const key = `img-wstest-${i}`;
        await put(key, blob);
        seeded.push(key);
      }

      // render the asset grid (force a fresh IDB key fetch)
      window._cachedAssetKeys = null;
      await window.refreshAssetsView(true);
      // cards are appended inside a requestAnimationFrame — wait two frames for the flush
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      // collect rendered card img srcs + their data-keys
      const cards = [...document.querySelectorAll('#assetsGrid .asset-card')].map(card => ({
        key: card.getAttribute('data-key'),
        src: card.querySelector('img')?.getAttribute('src') || '',
      }));

      // measure thumb vs original for the rendered, seeded cards
      const keys = await allKeys();
      const thumbKeys = keys.filter(k => k.startsWith('thumb256-img-wstest-'));
      const sizes = [];
      for (const tk of thumbKeys) {
        const origKey = tk.replace(/^thumb256-/, '');
        sizes.push({ origKB: Math.round((await sizeOf(origKey)) / 1024), thumbKB: Math.round((await sizeOf(tk)) / 1024) });
      }
      db.close();

      return {
        seededCount: seeded.length,
        renderedCards: cards.length,
        renderedSeeded: cards.filter(c => c.key && c.key.startsWith('img-wstest-')).length,
        allBlobSrc: cards.every(c => c.src.startsWith('blob:')),
        thumbCount: thumbKeys.length,
        sizes,
      };
    });

    console.log('  WS2 thumbnails:', JSON.stringify(result));

    // cards rendered from blob URLs
    expect(result.renderedSeeded).toBeGreaterThan(0);
    expect(result.allBlobSrc).toBe(true);
    // a thumbnail was generated for every rendered seeded asset
    expect(result.thumbCount).toBe(result.renderedSeeded);
    // every thumbnail is materially smaller than its source
    for (const s of result.sizes) expect(s.thumbKB).toBeLessThan(s.origKB / 2);

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
