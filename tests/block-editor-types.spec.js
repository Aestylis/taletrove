/**
 * C4 prep — characterization spec for renderBlock (block editor).
 *
 * Pins the observable DOM output of renderBlock BEFORE the C4 decomposition splits its edit-mode
 * switch into per-type builder functions. One render per block type in edit mode, plus a
 * view-mode render, asserting the key controls each type produces.
 *
 * renderBlock reads module globals (infoPanelFeatureId, selectedBlockId, isContentEditMode);
 * the test sets them directly and restores them in a finally block.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('C4 — block editor per-type controls', () => {
  test('each block type renders its edit-mode editor; view mode renders content', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await gotoApp(page);

    const r = await page.evaluate(async () => {
      const blocks = [
        { blockId: 'blk-text', type: 'TextField', visibleToPlayers: true, data: { content: 'Hello **world**', label: 'Intro' } },
        { blockId: 'blk-img', type: 'Image', visibleToPlayers: true, data: { src: '', caption: '' } },
        { blockId: 'blk-yt', type: 'YouTube', visibleToPlayers: true, data: { url: '' } },
        { blockId: 'blk-sp', type: 'Spotify', visibleToPlayers: true, data: { url: '' } },
        { blockId: 'blk-tags', type: 'Tags', visibleToPlayers: true, data: { tags: ['a', 'b'] } },
        { blockId: 'blk-fl', type: 'FeatureLink', visibleToPlayers: true, data: { targetIds: [] } },
        { blockId: 'blk-props', type: 'Properties', visibleToPlayers: true, data: { title: 'Stats', columns: 2, rows: [{ label: 'STR', value: '10', isSection: false }] } },
        { blockId: 'blk-tl', type: 'Timeline', visibleToPlayers: true, data: { events: [{ title: 'Battle', description: '', source: 'local', dateData: {} }] } },
        { blockId: 'blk-rel', type: 'Relationships', visibleToPlayers: true, data: { links: [{ targetId: null, type: 'Ally', isBidirectional: false }] } },
        { blockId: 'blk-meter', type: 'Meter', visibleToPlayers: false, data: { label: 'HP', current: 5, max: 10 } },
        { blockId: 'blk-map', type: 'MapEmbed', visibleToPlayers: true, data: { mapId: state.activeMapId, height: 280, caption: '' } },
      ];
      const feat = {
        id: 'cbe-owner', _silo: 'atlas', name: 'CBE Owner', title: 'CBE Owner', type: 'Location',
        featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e', geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } },
        mapId: state.activeMapId, folderId: null, labelStyle: 'outline', labelColor: '#ffffff',
        visibleToPlayers: false, tags: [], links: [], blocks,
      };
      state.articles.push(feat);
      syncArticleViews();

      const prev = {
        infoPanelFeatureId: typeof infoPanelFeatureId !== 'undefined' ? infoPanelFeatureId : null,
        selectedBlockId: typeof selectedBlockId !== 'undefined' ? selectedBlockId : null,
        isContentEditMode: typeof isContentEditMode !== 'undefined' ? isContentEditMode : false,
      };

      const out = {};
      try {
        infoPanelFeatureId = 'cbe-owner';
        isContentEditMode = true;

        const editWrapper = async (blockId) => {
          selectedBlockId = blockId;
          const blk = feat.blocks.find(b => b.blockId === blockId);
          return renderBlock(blk);
        };
        const has = (w, sel) => !!w.querySelector(sel);
        const btnText = (w, t) => [...w.querySelectorAll('button')].some(b => b.textContent.includes(t));
        const controls = (w) => has(w, '.block-drag-handle') && has(w, '.visibility-toggle') && has(w, '.delete-block-btn');

        let w = await editWrapper('blk-text');
        out.text = { editor: has(w, 'textarea.inline-editor'), snippets: has(w, '.markdown-snippet-bar'), label: has(w, 'input.label-input'), controls: controls(w) };

        w = await editWrapper('blk-img');
        out.image = { preview: has(w, '.block-image-preview'), float: has(w, '.float-position-group'), size: has(w, 'input[type="range"]'), controls: controls(w) };

        w = await editWrapper('blk-yt');
        out.youtube = { url: has(w, 'input[type="url"][placeholder="YouTube URL..."]') };

        w = await editWrapper('blk-sp');
        out.spotify = { url: has(w, 'input[type="url"][placeholder="Spotify URL..."]') };

        w = await editWrapper('blk-tags');
        out.tags = { input: has(w, 'input[placeholder="Comma, separated, tags..."]') };

        w = await editWrapper('blk-fl');
        out.featureLink = { multiselect: has(w, '.multiselect-container') };

        w = await editWrapper('blk-props');
        out.properties = { editor: has(w, '.properties-editor'), rows: has(w, '.properties-row-list'), addRow: btnText(w, '+ Add Row'), addSection: btnText(w, '+ Add Section') };

        w = await editWrapper('blk-tl');
        out.timeline = { editor: has(w, '.timeline-editor'), event: has(w, '.timeline-editor-event'), add: btnText(w, '+ Add Event') };

        w = await editWrapper('blk-rel');
        out.relationships = { editor: has(w, '.relationship-editor'), add: btnText(w, '+ Add Relationship') };

        w = await editWrapper('blk-meter');
        out.meter = { row: has(w, '.meter-inputs-row'), label: has(w, 'input.label-input'), gmOnly: w.classList.contains('gm-only-block') };

        w = await editWrapper('blk-map');
        out.mapEmbed = { fields: w.querySelectorAll('.block-embed-field').length === 3 };

        // View mode: unselected TextField renders markdown, no edit inputs
        selectedBlockId = null;
        const vw = await renderBlock(feat.blocks[0]);
        out.viewMode = {
          typed: vw.classList.contains('type-textfield'),
          noEditor: !vw.querySelector('textarea.inline-editor'),
          rendered: (vw.textContent || '').includes('Hello'),
        };
      } finally {
        infoPanelFeatureId = prev.infoPanelFeatureId;
        selectedBlockId = prev.selectedBlockId;
        isContentEditMode = prev.isContentEditMode;
      }
      return out;
    });

    console.log('  C4 block editors:', JSON.stringify(r));

    for (const [type, checks] of Object.entries(r)) {
      for (const [name, ok] of Object.entries(checks)) {
        expect(ok, `${type} → ${name}`).toBe(true);
      }
    }

    const critical = errors.filter(m => !m.includes('Babylon.js') && !m.includes('[SW]') && !m.includes('AppShell'));
    expect(critical, `JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
