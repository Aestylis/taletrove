/**
 * A11y basics — locks in the P2 accessibility floor:
 *  - live regions exist (toasts + loading overlay announce to screen readers)
 *  - no icon-only button is missing an accessible name
 *  - tree rows are keyboard-operable (Enter/Space activate, like click)
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('A11y basics', () => {
  test('live regions are present', async ({ page }) => {
    await gotoApp(page);
    const r = await page.evaluate(() => ({
      toastRole: document.getElementById('toastContainer')?.getAttribute('role'),
      toastLive: document.getElementById('toastContainer')?.getAttribute('aria-live'),
      loadingRole: document.getElementById('loadingOverlayText')?.getAttribute('role'),
    }));
    expect(r.toastRole).toBe('status');
    expect(r.toastLive).toBe('polite');
    expect(r.loadingRole).toBe('status');
  });

  test('every icon-only button has an accessible name', async ({ page }) => {
    await gotoApp(page);
    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter(b => !b.getAttribute('aria-label') && !b.textContent.trim())
        .map(b => b.id || b.className)
    );
    expect(offenders, `buttons without accessible names:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  test('tree rows activate with Enter and Space', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.map-row');
    const r = await page.evaluate(() => {
      const row = document.querySelector('.map-row');
      const attrs = { tabindex: row.getAttribute('tabindex'), role: row.getAttribute('role') };
      row.focus();
      let enterFired = false, spaceFired = false;
      row.addEventListener('click', () => { enterFired = true; }, { once: true });
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      row.addEventListener('click', () => { spaceFired = true; }, { once: true });
      row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      return { ...attrs, focused: document.activeElement === row, enterFired, spaceFired };
    });
    expect(r.tabindex).toBe('0');
    expect(r.role).toBe('button');
    expect(r.enterFired, 'Enter must activate a focused tree row').toBe(true);
    expect(r.spaceFired, 'Space must activate a focused tree row').toBe(true);
  });
});
