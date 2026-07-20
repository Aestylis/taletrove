/**
 * endTutorial() schedules a 350ms-delayed `#contentContainer.innerHTML = ''` to clean up its
 * own fake demo content after the tutorial closes. It never checked whether the user had since
 * opened a REAL pin's info/article panel in that window — closing the tutorial and immediately
 * clicking into a pin raced the delayed wipe, which then destroyed the real content out from
 * under the user (surfacing as "editing the pin name randomly kicks me out of editing").
 */
import { test, expect } from '@playwright/test';

test.describe('Tutorial close does not wipe a real panel opened right after', () => {
  test('opening a real pin right after closing the tutorial survives the delayed cleanup', async ({ page }) => {
    await page.goto('/forge/');
    await page.waitForSelector('.header-controls', { state: 'visible' });

    await page.locator('#startFreshBtn').click(); // starts the tutorial
    await page.waitForSelector('#tutorialOverlay:not(.hidden)');
    await page.locator('#tutorialCloseBtn').click(); // endTutorial() — schedules the 350ms wipe
    await page.evaluate(async () => { try { if (window.flushSave) await window.flushSave(); } catch (_) {} });

    // Immediately (within the 350ms window) open a real pin's article view — like a user
    // closing the tutorial and clicking straight into a pin.
    await page.evaluate(async () => {
      const mid = state.activeMapId;
      const article = {
        id: 'art-tutorial-race', _silo: 'atlas', name: 'Race Pin', title: 'Race Pin',
        type: 'Location', featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e',
        geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: mid, folderId: null, labelStyle: 'outline', labelColor: '#ffffff',
        visibleToPlayers: false, tags: [], links: [], blocks: [],
      };
      state.articles.push(article);
      syncArticleViews();
      await window.enterArticleMode(article.id, 'feature');
    });

    // Wait past the 350ms delayed cleanup and confirm the real content survived.
    await page.waitForTimeout(600);

    await expect(page.locator('#infoPanel h3 span[contenteditable]'), 'editable name must survive the tutorial\'s delayed cleanup').toHaveText('Race Pin');
    await expect(page.locator('#infoPanel')).toHaveClass(/is-visible/);
    await expect(page.locator('#infoPanel')).not.toHaveClass(/hidden/);
  });
});
