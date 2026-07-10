/**
 * C4 prep — characterization spec for buildArticlePropertiesInspector.
 *
 * Pins the observable DOM output of the inspector BEFORE the C4 decomposition splits it into
 * per-section builder functions. One build per article shape; asserts the key controls each
 * guarded section produces (stable IDs/classes, not child counts), so it must stay green
 * unchanged across the refactor.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('C4 — article properties inspector sections', () => {
  test('each article shape renders its section controls', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const r = await page.evaluate(async () => {
      const mid = state.activeMapId;
      const baseFeat = (id, geometry, extra = {}) => ({
        id, _silo: 'atlas', name: id, title: id, type: 'Location',
        featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e',
        geometry,
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: mid, folderId: null, labelStyle: 'outline', labelColor: '#ffffff',
        visibleToPlayers: false, tags: [], links: [], blocks: [], ...extra,
      });
      const baseEnc = (id, type, extra = {}) => ({
        id, _silo: 'lore', name: id, title: id, type,
        tags: [], links: [], blocks: [], visibleToPlayers: false, ...extra,
      });

      const shapes = [
        { silo: 'feature', article: baseFeat('cip-poly', 'polygon') },
        { silo: 'feature', article: baseFeat('cip-line', 'polyline') },
        { silo: 'feature', article: baseFeat('cip-text', 'text', { text: 'Hi' }) },
        { silo: 'feature', article: baseFeat('cip-point', 'point') },
        { silo: 'encyclopedia', article: baseEnc('cip-event', 'Event') },
        { silo: 'encyclopedia', article: baseEnc('cip-char', 'Character') },
        { silo: 'encyclopedia', article: baseEnc('cip-sess', 'Session') },
        { silo: 'encyclopedia', article: baseEnc('cip-plain', 'Location') },
      ];
      shapes.forEach(s => state.articles.push(s.article));
      syncArticleViews();

      const out = {};
      for (const { silo, article } of shapes) {
        const box = document.createElement('div');
        document.body.appendChild(box);
        try {
          await buildArticlePropertiesInspector(article, box, silo);
          const has = sel => !!box.querySelector(sel);
          const text = sel => [...box.querySelectorAll(sel)].map(n => n.textContent);
          switch (article.id) {
            case 'cip-poly':
              out[article.id] = {
                fill: has('#areaColorIn'), opacity: has('#areaOpacityIn'),
                border: has('#lineWidthIn'), showLabel: has('#showLabelChk'),
                labelSection: has('#labelColorIn'),
              };
              break;
            case 'cip-line':
              out[article.id] = {
                color: has('#lineColorIn'), width: has('#lineWidthIn'),
                showLabel: has('#showLabelChk'), labelSection: has('#labelColorIn'),
              };
              break;
            case 'cip-text':
              out[article.id] = {
                content: has('#textContentIn'), size: has('#fontSizeIn'),
                color: has('#fontColorIn'), family: has('#fontFamilySel'),
                angle: has('#textAngleIn'), noLabelSection: !has('#labelColorIn'),
              };
              break;
            case 'cip-point':
              out[article.id] = {
                labelSection: has('#labelColorIn'),
                convert: text('.convert-silo-btn').some(t => t.includes('Move to Encyclopedia')),
              };
              break;
            case 'cip-event':
              out[article.id] = {
                recurrence: has('.recurrence-type-select'),
                datePickers: box.querySelectorAll('.event-date-group').length >= 2,
                colorBtns: has('.style-picker-btn'),
              };
              break;
            case 'cip-char':
              out[article.id] = {
                birthDeath: box.querySelectorAll('.event-date-group--char').length === 2,
                typeInput: has('#enc-type-input'),
              };
              break;
            case 'cip-sess':
              out[article.id] = {
                datePlayed: has('input[type="date"]'),
                sessionNum: has('input[type="number"][min="1"]'),
                typeInput: has('#enc-type-input'),
              };
              break;
            case 'cip-plain':
              out[article.id] = {
                typeInput: has('#enc-type-input'),
                convert: text('.convert-silo-btn').some(t => t.includes('Move to Atlas')),
                del: text('button.danger').some(t => t.includes('Delete Entry')),
              };
              break;
          }
        } catch (e) {
          out[article.id] = { threw: String(e && e.message || e) };
        } finally {
          box.remove();
        }
      }
      return out;
    });

    console.log('  C4 inspector sections:', JSON.stringify(r));

    for (const [id, checks] of Object.entries(r)) {
      expect(checks.threw, `${id} inspector build threw: ${checks.threw}`).toBeUndefined();
      for (const [name, ok] of Object.entries(checks)) {
        expect(ok, `${id} → ${name}`).toBe(true);
      }
    }

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
