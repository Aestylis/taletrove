/**
 * app-init.js — application boot (WS7 #14, extracted from worldbuilder.js).
 *
 * Registers the DOMContentLoaded boot handler: marked extensions, IDB state load
 * (per-entity format with legacy fallback + migration), first-run detection,
 * initEventListeners()/initUI()/initUserChip() and the rest of the startup sequence.
 *
 * LOAD ORDER MATTERS: this file must evaluate after worldbuilder.js (it reads its
 * globals at call time) and BEFORE panels.js/modals.js — DOMContentLoaded listeners
 * fire in registration order, and boot must run first (as it always has).
 */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    marked.use({ extensions: [wikiLinkExtension, calloutExtension, containerExtension, diceRollerExtension, highlightExtension, inlineStyleExtension, inlineIconExtension] });
    // Open external links in a new tab; internal wiki-links are handled by click handlers
    marked.use({ renderer: { link({ href, title, text }) {
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//'));
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      if (isExternal) return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
      return `<a href="${escapeHtml(href)}"${titleAttr}>${text}</a>`;
    } } });
    await loadAllData();
    await loadCustomAssets();
    L.drawLocal.edit.handlers.edit.tooltip.subtext = 'Use the Undo button to reverse changes.';
    
    const meta = await idbGetObject('worldState-meta');
    const oldState = await idbGetObject('worldState');
    const isNewUser = !meta && !oldState;

    if (meta) {
      // Per-entity format — uses unified 'article-{id}' keys.
      // Falls back to legacy 'feature-*' / 'encyclopedia-*' keys for worlds
      // that haven't run the migration yet (first open after upgrade).
      const allObjKeys       = await idbGetAllKeys('objects');
      const articleKeys      = allObjKeys.filter(k => k.startsWith('article-'));
      const featureKeys      = allObjKeys.filter(k => k.startsWith('feature-'));
      const encyclopediaKeys = allObjKeys.filter(k => k.startsWith('encyclopedia-'));
      const mapKeys          = allObjKeys.filter(k => k.startsWith('map-'));

      const maps = (await Promise.all(mapKeys.map(k => idbGetObject(k)))).filter(Boolean);

      if (articleKeys.length > 0) {
        // Post-migration: all entities in article-{id} keys.
        // Ensure _silo is set (fall back to geometry presence for articles written
        // before the migration could stamp them, e.g. during import with old code).
        const articles = (await Promise.all(articleKeys.map(k => idbGetObject(k)))).filter(Boolean);
        articles.forEach(a => {
          if (!a._silo) a._silo = (a.geojson?.geometry) ? 'atlas' : 'lore';
        });
        Object.assign(state, {
          ...meta,
          appVersion: meta.appVersion || '0.0.0',
          articles,
          maps,
        });
        syncArticleViews();
      } else {
        // Pre-migration: legacy feature-* and encyclopedia-* keys
        const [features, encyclopedia] = await Promise.all([
          Promise.all(featureKeys.map(k      => idbGetObject(k))),
          Promise.all(encyclopediaKeys.map(k => idbGetObject(k))),
        ]);
        const legacyFeatures = features.filter(Boolean).map(f => ({ ...f, _silo: f._silo || 'atlas' }));
        const legacyEntries  = encyclopedia.filter(Boolean).map(e => ({ ...e, _silo: e._silo || 'lore' }));
        Object.assign(state, {
          ...meta,
          appVersion: meta.appVersion || '0.0.0',
          articles:   [...legacyFeatures, ...legacyEntries],
          maps,
        });
        syncArticleViews();
      }
    } else if (oldState) {
      Object.assign(state, oldState);
      // Build unified articles array from legacy silos
      (state.features    || []).forEach(f => { if (!f._silo) f._silo = 'atlas'; });
      (state.encyclopedia|| []).forEach(e => { if (!e._silo) e._silo = 'lore';  });
      state.articles = [...(state.features || []), ...(state.encyclopedia || [])];
      syncArticleViews();

      markEntityDirty('meta');
      state.articles.forEach(a => markEntityDirty('article', a.id));
      state.maps.forEach(m => markEntityDirty('map', m.id));
      
      await save();                            // writes per-entity keys
      await idbDeleteObject('worldState');     // removes the old blob key
    }

    // Critical: Ensure maps is never empty even after loading meta
    if (!state.maps || state.maps.length === 0) {
      state.maps = [{ 
        id: 'map-default', 
        name: 'World Map', 
        parentId: null, 
        imageKey: null, 
        width: 2000, 
        height: 1200, 
        overlayKey: null, 
        overlayOpacity: 0.4, 
        scale: { pixels: 100, distance: 5, unit: 'miles' }, 
        grid: { enabled: false, type: 'square', size: 50, sizeX: 50, sizeY: 50, color: '#FFFFFF', opacity: 0.5, width: 1, offsetX: 0, offsetY: 0 },
        fog: { enabled: false, opacity: 1.0, mask: null }
      }];
      state.activeMapId = 'map-default';
    }

    applyCustomTheme();

    const needsMigrateSave = migrateState();
    const needsStarterSave = await seedStarterTemplates();

    if (needsMigrateSave || needsStarterSave) {
      markEntityDirty('meta');
      await save();
    }

    // Run a cleanup after a small delay to not block startup
    setTimeout(() => {
      if (window.cleanupOrphans) window.cleanupOrphans();
    }, 2000);

    initUI();
    if (window.applyAppearance) await applyAppearance(state.appearance || {});

    await navigateToMap(state.activeMapId, { skipInfoPanel: true });

    initEventListeners();
    initUserChip();
    initCommandPalette();

    // Google Drive — init after everything else is ready
    if (window.googleDrive) {
      window.googleDrive.init(_onDriveStatusChange);
    }

    const hasCompletedTutorial = loadLS('hasCompletedTutorial', false);
    const _urlParams = new URLSearchParams(window.location.search);
    if (_urlParams.get('demo') === '1') {
      history.replaceState({}, '', window.location.pathname);
      if (isNewUser) {
        _loadDemoWorld();
      } else {
        showConfirmationModal(
          'Launch Demo',
          'This will load the Aethermoor sample world and start a guided tour. Your current world will be replaced.',
          'Load Demo',
          () => _loadDemoWorld(),
          null
        );
      }
    } else if (isNewUser && !hasCompletedTutorial) {
      _showSampleWorldModal();
    }

    const lastSeenNewsVersion = loadLS('lastSeenNewsVersion', null);
    try {
      const response = await fetch(`data/news.json?v=${APP_VERSION}`);
      if (response.ok) {
        NEWS_DATA = await response.json();
        if (NEWS_DATA.length > 0) {
          LATEST_NEWS_VERSION = NEWS_DATA[0].id;
          populateNewsModal(NEWS_DATA);
          const lastSeenNewsVersion = loadLS('lastSeenNewsVersion', null);
          if (LATEST_NEWS_VERSION && LATEST_NEWS_VERSION !== lastSeenNewsVersion) {
            $('#newUpdateChip').classList.remove('hidden');
          }
        }
      }
    } catch (e) {
      console.warn("Could not load news.json for version check:", e);
    }
  } catch (err) {
    console.error("Critical Startup Error:", err);
    try { initUI(); } catch (e) {}
    showAlertModal('Critical Error', 'The application failed to initialize correctly. This is usually caused by blocked browser storage or a private browsing session. Your data may not be saved.');
  }
});
