let _pwaInstallPrompt = null;

// Tracks point-marker layers that have native dragging enabled during move mode.
// L.EditToolbar.Edit + Leaflet 1.9.x breaks DivIcon iconAnchor on markers, so
// we bypass it for pins and use raw marker.dragging instead.
let activeMoveMarkers = [];

// Capture the prompt before it auto-fires (must be synchronous, top-level)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _pwaInstallPrompt = e;
  // Only show if not already running as a standalone PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone;
  if (!isStandalone) {
    $('#installPwaBtn')?.classList.remove('hidden');
  }
});

window.addEventListener('appinstalled', () => {
  _pwaInstallPrompt = null;
  $('#installPwaBtn')?.classList.add('hidden');
});



/**
 * Shows a modal with a text input field and calls onConfirm with the entered value.
 * Replaces native prompt() for a consistent UI experience.
 */
function showInputModal(title, placeholder, defaultValue, onConfirm) {
  const modal = $('#inputModal');
  $('#inputModalTitle').textContent = title;
  const field = $('#inputModalField');
  const subEl = $('#inputModalSubLabel');
  
  field.type = 'text';
  field.placeholder = placeholder;
  field.value = defaultValue || '';
  if (subEl) subEl.classList.add('hidden');

  const close = () => modal.classList.add('hidden');

  const confirm = () => {
    const value = field.value.trim();
    if (value) onConfirm(value);
    close();
  };

  $('#inputModalConfirmBtn').onclick = confirm;
  $('#inputModalCancelBtn').onclick = close;
  $('#inputModalCloseBtn').onclick = close;
  field.onkeydown = (e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') close(); };

  modal.classList.remove('hidden');
  setTimeout(() => {
    field.focus();
    field.select();
  }, 50);
}

/**
 * Shows a modal with a password input field and calls onConfirm with the entered value.
 * If the user leaves it blank and confirms, onConfirm is called with null.
 */
function showPasswordModal(title, placeholder, onConfirm, subLabel = '') {
  const modal = $('#inputModal');
  const titleEl = $('#inputModalTitle');
  const field = $('#inputModalField');
  const subEl = $('#inputModalSubLabel');
  
  titleEl.textContent = title;
  field.type = 'password';
  field.placeholder = placeholder || 'Enter password...';
  field.value = '';

  if (subLabel && subEl) {
    subEl.textContent = subLabel;
    subEl.classList.remove('hidden');
  } else if (subEl) {
    subEl.classList.add('hidden');
  }

  const close = () => {
    modal.classList.add('hidden');
    field.type = 'text';
  };

  const confirm = () => {
    const value = field.value; // Don't trim passwords
    onConfirm(value || null);
    close();
  };

  $('#inputModalConfirmBtn').onclick = confirm;
  $('#inputModalCancelBtn').onclick = close;
  $('#inputModalCloseBtn').onclick = close;
  field.onkeydown = (e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') close(); };

  modal.classList.remove('hidden');
  setTimeout(() => field.focus(), 50);
}

function saveFeatureAsTemplate(featureId) {
  const feature = state.features.find(f => f.id === featureId);
  if (!feature) return;

  showInputModal('Save as Template', 'Template name', feature.title || 'New Template', (templateName) => {
    recordState();
    const newTemplate = {
      templateId: 'template-' + uid(),
      name: templateName,
      geometry: feature.geometry,
      pinShape: feature.pinShape,
      iconClass: feature.iconClass,
      iconColor: feature.iconColor,
      pinIconColor: feature.pinIconColor,
      color: feature.color,
      fillOpacity: feature.fillOpacity,
      weight: feature.weight,
      dashArray: feature.dashArray,
      labelBold: feature.labelBold,
      labelColor: feature.labelColor,
      labelStyle: feature.labelStyle,
      markerSize: feature.markerSize,
      // Clone block structure, preserving labels but clearing content.
      blocks: structuredClone(feature.blocks || []).map(block => {
        const blockDef = BLOCK_DEFINITIONS[block.type];
        const newBlockData = { ...blockDef.defaultData };
        if (block.data.label) newBlockData.label = block.data.label;
        block.data = newBlockData;
        return block;
      })
    };
    state.templates.push(newTemplate);
    markEntityDirty('meta');
    showToast(`Template "${newTemplate.name}" saved!`);
    debouncedSave();
  });
}

/**
 * Replaces an item's current blocks with those from a layout template.
 */
function applyLayoutTemplate(itemId, itemType, templateId) {
  const item = state.features.find(f => f.id === itemId) || 
               state.encyclopedia.find(e => e.id === itemId) ||
               state.maps.find(m => m.id === itemId);
  const template = state.layoutTemplates.find(t => t.id === templateId);
  if (!item || !template) return;

  const onConfirm = () => {
    recordState();
    item.blocks = structuredClone(template.blocks).map(b => {
      // Regenerate block IDs to avoid collisions on new entities
      b.blockId = 'blk-' + uid();
      return b;
    });
    markEntityDirty(itemType, itemId);
    showInfoPanel(itemId, itemType);
    debouncedSave();
    showToast(`Applied layout "${template.name}".`);
  };

  if (item.blocks && item.blocks.length > 0) {
    showConfirmationModal('Apply Layout Template?', `This will REPLACE all ${item.blocks.length} existing blocks in this item.`, 'Replace Blocks', onConfirm);
  } else {
    onConfirm();
  }
}
window.applyLayoutTemplate = applyLayoutTemplate;

/**
 * Saves the current blocks and content of an entity as a "Layout Template".
 * Unlike feature templates, these preserve all block content.
 */
function saveLayoutTemplate(itemId, itemType = 'feature') {
  const item = state.features.find(f => f.id === itemId) ||
               state.encyclopedia.find(e => e.id === itemId) ||
               state.maps.find(m => m.id === itemId);
  if (!item || !item.blocks) return;

  const defaultName = item.name || item.title || 'New Layout';

  showInputModal('Save Layout Template', 'Template name (e.g. City, Character)', defaultName, (name) => {
    recordState();
    const newLayout = {
      id: 'ltpl-' + uid(),
      name: name,
      entityType: itemType,
      blocks: structuredClone(item.blocks).map(b => {
        // Regenerate block IDs to avoid collisions on load
        b.blockId = 'blk-' + uid();
        return b;
      })
    };
    state.layoutTemplates = state.layoutTemplates || [];
    state.layoutTemplates.push(newLayout);
    markEntityDirty('meta');
    showToast(`Layout Template "${name}" saved!`);
    debouncedSave();
  });
}
window.saveLayoutTemplate = saveLayoutTemplate;

function deleteLayoutTemplate(id) {
  if (!id) return;
  recordState();
  const index = (state.layoutTemplates || []).findIndex(t => t.id === id);
  if (index === -1) return;
  const name = state.layoutTemplates[index].name;
  state.layoutTemplates.splice(index, 1);
  markEntityDirty('meta');
  showToast(`Layout "${name}" deleted.`, () => undo());
  debouncedSave();
}
window.deleteLayoutTemplate = deleteLayoutTemplate;

let gridAlignPhase = 0;
let gridAlignFirstWorldPt = null;

function cancelGridAlign() {
  gridAlignPhase = 0;
  gridAlignFirstWorldPt = null;
  $('#gridAlignHint').classList.add('hidden');
  document.querySelector('.map-wrap').classList.remove('cursor-set-origin');
  if (window.map) window.map.off('click', gridAlignClickHandler);
}

function gridAlignClickHandler(e) {
  const origin = window.map.getPixelOrigin();
  const pt = window.map.latLngToContainerPoint(e.latlng);
  const wx = origin.x + pt.x, wy = origin.y + pt.y;
  if (gridAlignPhase === 1) {
    gridAlignFirstWorldPt = { x: wx, y: wy };
    gridAlignPhase = 2;
    $('#gridAlignHintText').textContent = 'Click the opposite corner of the cell';
  } else if (gridAlignPhase === 2) {
    const dx = Math.abs(wx - gridAlignFirstWorldPt.x);
    const dy = Math.abs(wy - gridAlignFirstWorldPt.y);
    if (dx < 5 || dy < 5) {
      $('#gridAlignHintText').textContent = 'Points too close — try again. Click the first corner.';
      gridAlignPhase = 1;
      gridAlignFirstWorldPt = null;
      return;
    }
    const fp = gridAlignFirstWorldPt;
    cancelGridAlign();
    const activeMap = state.maps.find(m => m.id === state.activeMapId);
    if (!activeMap) return;
    recordState();
    activeMap.grid.sizeX = Math.round(dx);
    activeMap.grid.sizeY = Math.round(dy);
    activeMap.grid.offsetX = ((fp.x % activeMap.grid.sizeX) + activeMap.grid.sizeX) % activeMap.grid.sizeX;
    activeMap.grid.offsetY = ((fp.y % activeMap.grid.sizeY) + activeMap.grid.sizeY) % activeMap.grid.sizeY;
    markEntityDirty('map', activeMap.id);
    if (window.updateGridLayer) window.updateGridLayer();
    debouncedSave();
  }
}

function toggleMapFullscreen() {
  const body = document.body;
  const isEnteringFullscreen = !body.classList.contains('map-fullscreen-mode');

  body.classList.toggle('map-fullscreen-mode');
  $('#mapFullscreenControls').classList.toggle('hidden');

  if (window.map) {
    if (isEnteringFullscreen) {
      if (typeof rhdSyncStart === 'function') rhdSyncStart();
      // When entering fullscreen, hide the main feature layers.
      if (window.map.hasLayer(window.allLayers)) map.removeLayer(window.allLayers);
      if (window.map.hasLayer(window.labelLayer)) map.removeLayer(window.labelLayer);
      // Reset the fullscreen pin-toggle to "off" — pins start hidden each entry.
      const togglePinsBtn = $('#togglePinsBtnFullscreen');
      if (togglePinsBtn) {
        togglePinsBtn.classList.remove('active-toggle');
        togglePinsBtn.setAttribute('aria-pressed', 'false');
        togglePinsBtn.setAttribute('data-tooltip', 'Show Pins');
        togglePinsBtn.setAttribute('aria-label', 'Show Pins');
      }
      // Start idle-hide timer.
      _fsMouseMoveBound = _fsResetIdle;
      document.addEventListener('mousemove', _fsMouseMoveBound);
      _fsResetIdle();
    } else {
      if (typeof rhdSyncStop === 'function') rhdSyncStop();
      // When exiting fullscreen, always hide the grid's settings popover and cancel any active align tool.
      $('#gridSettingsPopover').classList.add('hidden');
      if (gridAlignPhase > 0) cancelGridAlign();

      // Reset map rotation when leaving fullscreen.
      if (mapRotationAngle !== 0) resetMapRotation();

      // Show the main feature layers again.
      if (!window.map.hasLayer(window.allLayers)) map.addLayer(window.allLayers);
      if (!window.map.hasLayer(window.labelLayer)) map.addLayer(window.labelLayer);

      // Tear down idle-hide.
      if (_fsMouseMoveBound) {
        document.removeEventListener('mousemove', _fsMouseMoveBound);
        _fsMouseMoveBound = null;
      }
      clearTimeout(_fsIdleTimer);
      $('#mapFullscreenControls').classList.remove('fs-toolbar-idle', 'fs-toolbar-collapsed');
      $('#fsToolbarHandle').classList.remove('visible');
    }

    // After changing modes, always tell the grid layer to update.
    // It will correctly show or hide itself based on the new mode.
    if (window.updateGridLayer) {
      window.updateGridLayer();
    }

    if (window.updateFogLayer) {
      window.updateFogLayer();
    }

    // Tell Leaflet to recalculate its size after the CSS transition.
    setTimeout(() => {
      window.map.invalidateSize({ pan: false });
    }, 350);
  }
}
let _fsIdleTimer = null;
let _fsMouseMoveBound = null;

function _fsResetIdle() {
  const ctrl = $('#mapFullscreenControls');
  if (!ctrl || ctrl.classList.contains('hidden') || ctrl.classList.contains('fs-toolbar-collapsed')) return;
  ctrl.classList.remove('fs-toolbar-idle');
  clearTimeout(_fsIdleTimer);
  _fsIdleTimer = setTimeout(() => {
    if (!ctrl.classList.contains('fs-toolbar-collapsed')) ctrl.classList.add('fs-toolbar-idle');
  }, 3000);
}

// Cycles: 0° → +90° → 180° → -90° → 0°
const MAP_ROTATION_STEPS = [0, 90, 180, -90];
let mapRotationAngle = 0;

function toggleMapRotation() {
  const idx = MAP_ROTATION_STEPS.indexOf(mapRotationAngle);
  mapRotationAngle = MAP_ROTATION_STEPS[(idx + 1) % MAP_ROTATION_STEPS.length];
  window.setMapImageRotation?.(mapRotationAngle);
  const btn = $('#rotateMapBtn');
  if (btn) {
    btn.setAttribute('aria-pressed', String(mapRotationAngle !== 0));
    const label = mapRotationAngle === 0 ? 'Rotate Map' : `Rotate Map (${mapRotationAngle > 0 ? '+' : ''}${mapRotationAngle}°)`;
    btn.setAttribute('data-tooltip', label);
    btn.setAttribute('aria-label', label);
  }
}

function resetMapRotation() {
  mapRotationAngle = 0;
  window.setMapImageRotation?.(0);
  const btn = $('#rotateMapBtn');
  if (btn) {
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('data-tooltip', 'Rotate Map');
    btn.setAttribute('aria-label', 'Rotate Map');
  }
}
window.toggleMapRotation = toggleMapRotation;
function updateToolbarForRole() {
  const isPlayer = (role === 'player');

  ['#undoBtn', '#redoBtn', '#loadMapBtn'].forEach(id => {
    const btn = $(id);
    if (btn) btn.disabled = isPlayer;
  });

  ['#modePinBtn', '#modeAreaBtn', '#modeLineBtn', '#modeTextBtn', '#modeMoveBtn'].forEach(id => {
    const btn = $(id);
    if (btn) btn.disabled = isPlayer;
  });

  // Overlay & fog management — GM-only controls
  ['#overlayMenuBtn', '#overlayMenuBtnFullscreen', '#toggleFogBtn'].forEach(id => {
    const btn = $(id);
    if (btn) btn.disabled = isPlayer;
  });

  syncOverlayButtons();
}

/**
 * Shows/hides the overlay settings + toggle buttons based on whether
 * the active map has an overlay loaded. Reduces toolbar clutter when
 * no overlay is in use.
 */
function syncOverlayButtons() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId) || state.maps[0];
  const hasOverlay = !!(activeMap?.overlayKey);
  // Show/hide the settings section inside the overlay menu popover
  const settings = $('#overlayMenuSettings');
  if (settings) settings.classList.toggle('hidden', !hasOverlay);
  // Badge dot on the menu button when overlay is loaded
  const menuBtn = $('#overlayMenuBtn');
  if (menuBtn) menuBtn.classList.toggle('has-overlay', hasOverlay);
  const menuBtnFs = $('#overlayMenuBtnFullscreen');
  if (menuBtnFs) menuBtnFs.classList.toggle('has-overlay', hasOverlay);
}

function toggleFreeMove() {
  settings.freeMoveEnabled = !settings.freeMoveEnabled;
  saveLS('worldSettings', settings);
  window.applyFreeMoveState(); // This function will now handle all UI updates
}

function createNewEncyclopediaFolder() {
  showInputModal('New Encyclopedia Folder', 'Folder name', 'New Folder', (folderName) => {
    recordState();
    state.folders.push({ id: 'efld-' + uid(), name: folderName, mapId: null });
    markEntityDirty('meta');
    refreshEncyclopediaView();
    debouncedSave();
  });
}

// Returns true if targetFolderId is a descendant of ancestorFolderId (circular nesting guard)
function _isEncFolderDescendant(ancestorId, targetId) {
  let cur = state.folders.find(f => f.mapId == null && f.id === targetId);
  while (cur) {
    if (cur.id === ancestorId) return true;
    cur = state.folders.find(f => f.mapId == null && f.id === cur.parentFolderId);
  }
  return false;
}

function handleEncyclopediaDrop(evt) {
  const draggedItem = evt.item;
  const entryId = draggedItem.dataset.entryId;
  const folderId = draggedItem.dataset.folderId;
  const draggedId = entryId || folderId;
  if (!draggedId) return;

  // If dropped outside the encyclopedia panel (e.g. on the map), the map's own
  // drop handler creates the pin. Just restore the DOM and bail out.
  if (!evt.to.classList.contains('encyclopedia-list') && !evt.to.classList.contains('tree-children')) {
    refreshAtlasTree();
    return;
  }

  const toFolderNode = evt.to.closest('.folder-node');
  const newParentFolderId = toFolderNode ? toFolderNode.dataset.folderId : null;

  const idsToMove = multiSelectedIds.has(draggedId) ? Array.from(multiSelectedIds) : [draggedId];
  let changed = false;

  idsToMove.forEach(id => {
    if (entryId || state.encyclopedia.find(e => e.id === id)) {
      // Moving an entry
      const entry = state.encyclopedia.find(e => e.id === id);
      if (!entry) return;
      if (!changed) { recordState(); changed = true; }
      if (entry.folderId !== newParentFolderId) {
        entry.folderId = newParentFolderId;
        markEntityDirty('article', id);
      }
    } else {
      // Moving a folder (only valid within unplaced lore — folders don't live under maps)
      const folder = state.folders.find(f => f.mapId == null && f.id === id);
      if (folder && folder.parentFolderId !== newParentFolderId) {
        // Prevent dropping a folder into itself or its own descendant
        if (id === newParentFolderId || _isEncFolderDescendant(id, newParentFolderId)) return;
        if (!changed) { recordState(); changed = true; }
        folder.parentFolderId = newParentFolderId || null;
        markEntityDirty('meta');
      }
    }
  });

  if (changed) {
    debouncedSave();
    refreshEncyclopediaView();
    // Refresh atlas tree too — the read-only lore subsection under each map needs to stay in sync
    refreshAtlasTree();
  }
}

function handleEncyclopediaFolderDrop(draggedId, targetFolderId) {
  const idsToMove = (multiSelectedIds.has(draggedId)) ? Array.from(multiSelectedIds) : [draggedId];
  let changed = false;
  idsToMove.forEach(id => {
    const entry = state.encyclopedia.find(e => e.id === id);
    if (entry && entry.folderId !== targetFolderId) {
      if (!changed) { recordState(); changed = true; }
      entry.folderId = targetFolderId;
      markEntityDirty('article', id);
    }
  });
  if (changed) {
    debouncedSave();
    refreshEncyclopediaView();
  }
}

function toggleEncyclopediaFolderCollapsed(folderId) {
  if (collapsedEncyclopediaFolderNodes.has(folderId)) {
    collapsedEncyclopediaFolderNodes.delete(folderId);
  } else {
    collapsedEncyclopediaFolderNodes.add(folderId);
  }
  saveCollapsedState();
  refreshEncyclopediaView();
}

function createNewFolder(mapId) {
  showInputModal('New Folder', 'Folder name', 'New Folder', (folderName) => {
    recordState();
    state.folders.push({ id: 'fld-' + uid(), name: folderName, mapId });
    markEntityDirty('meta');
    render({ full: true });
    debouncedSave();
  });
}

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

async function _loadDemoWorld() {
  setLoadingState(true, 'Loading Aethermoor…');
  try {
    const resp = await fetch('Examples/SampleWorld.trv');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const file = new File([blob], 'SampleWorld.trv', { type: 'application/zip' });
    await window._handleImportFile(file);
    startTutorial(true);
  } catch (err) {
    setLoadingState(false);
    showAlertModal('Demo Unavailable', 'Could not load the demo world. You can load it manually via Project Hub → Import.');
  }
}

function _showSampleWorldModal() {
  const modal = $('#sampleWorldModal');
  if (!modal) { startTutorial(); return; }
  modal.classList.remove('hidden');

  $('#loadSampleWorldBtn').addEventListener('click', async () => {
    modal.classList.add('hidden');
    setLoadingState(true, 'Loading Sample World…');
    try {
      const resp = await fetch('Examples/SampleWorld.trv');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const file = new File([blob], 'SampleWorld.trv', { type: 'application/zip' });
      saveLS('hasCompletedTutorial', true); // skip tutorial after load
      await window._handleImportFile(file);
    } catch (err) {
      setLoadingState(false);
      showAlertModal('Sample World Unavailable', 'Could not load the sample world. You can load it manually later via Project Hub → Import. Starting fresh instead.');
      modal.classList.add('hidden');
      startTutorial();
    }
  }, { once: true });

  $('#startFreshBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
    startTutorial();
  }, { once: true });
}

if (loadLS('showWelcome', false) && !loadLS('hideWelcomePermanently', false)) {
  $('#welcomeModal').classList.remove('hidden');
  localStorage.removeItem('showWelcome');
  $('#welcomeTourBtn').addEventListener('click', () => {
    $('#welcomeModal').classList.add('hidden');
    startTutorial();
  });
  $('#neverShowWelcomeChk').addEventListener('change', (e) => {
    saveLS('hideWelcomePermanently', e.target.checked);
  });
} else if (loadLS('showWelcome', false)) {
  localStorage.removeItem('showWelcome');
}

/**
 * Renders the entire application UI based on the current state.
 * This is the single source of truth for all UI updates.
 */
async function render(options = {}) {
  const { full = false } = options;

  if (full) {
    await refreshAtlasTree();
    await syncAllLayers();
  }

  updateToolbarForRole();
  refreshBreadcrumbs();
  updateSelectionStyles();
}

function showConfirmationModal(title, text, confirmText, onConfirm, onCancel) {
  const modal = $('#confirmModal');
  $('#confirmModalTitle').textContent = title;
  $('#confirmModalText').textContent = text;
  const confirmBtn = $('#confirmModalConfirmBtn');
  confirmBtn.textContent = confirmText;

  const close = () => modal.classList.add('hidden');

  const confirmHandler = () => {
    onConfirm();
    close();
  };

  const cancelHandler = () => {
    if (onCancel) onCancel();
    close();
  };

  confirmBtn.onclick = confirmHandler;
  $('#confirmModalCancelBtn').onclick = cancelHandler;
  $('#confirmModalCloseBtn').onclick = cancelHandler;

  modal.classList.remove('hidden');
}

function showAlertModal(title, text) {
  const modal = $('#alertModal');
  $('#alertModalTitle').textContent = title;
  $('#alertModalText').textContent = text;

  const close = () => modal.classList.add('hidden');

  $('#alertModalConfirmBtn').onclick = close;
  $('#alertModalCloseBtn').onclick = close;

  modal.classList.remove('hidden');
}

window.showAlertModal = showAlertModal;
window.showConfirmationModal = showConfirmationModal;

function showLightbox(url) {
  const existing = document.getElementById('ttLightbox');
  if (existing) existing.remove();

  const overlay = el('div', { id: 'ttLightbox', class: 'lightbox-overlay' });
  const img     = el('img', { src: url, alt: 'Full size image', class: 'lightbox-img' });
  const closeBtn = el('button', { class: 'lightbox-close', 'aria-label': 'Close' });
  closeBtn.textContent = '×';

  const dismiss = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 150);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') dismiss(); };

  closeBtn.onclick = dismiss;
  overlay.onclick  = (e) => { if (e.target === overlay) dismiss(); };
  document.addEventListener('keydown', onKey);

  overlay.append(closeBtn, img);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
}
window.showLightbox = showLightbox;

// Delegated click for data-lightbox on Image blocks (survive innerHTML assignment)
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-lightbox]');
  if (target) {
    e.preventDefault();
    showLightbox(target.dataset.lightbox);
  }
});
function toggleNodeCollapsed(mapId) {
  if (collapsedNodes.has(mapId)) {
    collapsedNodes.delete(mapId);
  } else {
    collapsedNodes.add(mapId);
  }
  saveCollapsedState();
  refreshAtlasTree();
}
/**
 * Sets the current UI interaction mode.
 * @param {string} mode - The mode to set ('pointer', 'move', 'add-marker', 'add-polygon', 'add-polyline', 'add-text').
 */
const debouncedSetMode = debounce((mode, options = {}) => {
  if (role === 'player') mode = 'pointer';
  const editTooltip = document.querySelector('.leaflet-draw-tooltip-subtext');
  if (editTooltip) {
    editTooltip.remove();
  }
  const mapWrap = $('.map-wrap');
  const CURSOR_CLASSES = ['cursor-add-polyline', 'cursor-add-polygon', 'cursor-add-text'];
  CURSOR_CLASSES.forEach(c => mapWrap.classList.remove(c));

  if (uiMode === 'move' && activeDraw) {
    activeDraw.save();
  }
  if (activeDraw) {
    try {
      activeDraw.disable();
    } catch (e) { }
    activeDraw = null;
  }
  // Clean up native-dragging markers from previous move mode
  if (activeMoveMarkers.length) {
    activeMoveMarkers.forEach(lyr => {
      if (lyr.dragging) lyr.dragging.disable();
      if (lyr._moveModeOnDrag) { lyr.off('drag', lyr._moveModeOnDrag); delete lyr._moveModeOnDrag; }
      if (lyr._moveModeOnDragEnd) { lyr.off('dragend', lyr._moveModeOnDragEnd); delete lyr._moveModeOnDragEnd; }
    });
    activeMoveMarkers = [];
  }
  if (map && map.listens && map.listens('click')) map.off('click', onMapClickForText);

  uiMode = mode;
  saveLS('uiMode', window.uiMode);

  if (window.syncFogPointerEvents) window.syncFogPointerEvents();

  // Fog brush cursor ring visibility
  if (mode === 'fog') {
    mapWrap.classList.add('is-fog-mode');
    const activeMap = state.maps.find(m => m.id === state.activeMapId);
    updateFogBrushCursorSize(activeMap?.fog?.brushSize ?? 40);
  } else {
    mapWrap.classList.remove('is-fog-mode');
  }

  if (map) {
    if (mode === 'fog') {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }

    if (mode === 'add-marker') {
      activeDraw = new L.Draw.Marker(map, { ...drawOptions.marker, ...(options.marker || {}) });
      activeDraw.enable();
    } else if (mode === 'add-polygon') {
      activeDraw = new L.Draw.Polygon(map, { ...drawOptions.polygon, ...(options.polygon || {}) });
      activeDraw.enable();
    } else if (mode === 'add-polyline') {
      activeDraw = new L.Draw.Polyline(map, { ...drawOptions.polyline, ...(options.polyline || {}) });
      activeDraw.enable();
    } else if (mode === 'add-text') {
      map.on('click', onMapClickForText);
    } else if (mode === 'measure') {
      // Disable the library's default tooltip to use our custom measurement display instead.
      activeDraw = new L.Draw.Polyline(map, {
        shapeOptions: { color: '#ff7a1a', weight: 3, dashArray: '5, 5' },
        showLength: false
      });
      activeDraw.enable();
    } else if (mode === 'move') {
      // Polygons and polylines go through Leaflet.draw's EditToolbar (vertex handles work fine).
      // Point markers are excluded — L.EditToolbar.Edit calls marker.dragging.enable() via
      // L.Edit.Marker.addHooks() which in Leaflet 1.9.x causes DivIcon iconAnchor to be
      // mis-applied, visually shifting all pins when edit mode is entered/exited.
      const polyLayers = L.featureGroup(
        Array.from(layerById.values()).filter(l =>
          l.feature && l.feature.mapId === state.activeMapId &&
          (l.feature.geometry === 'polygon' || l.feature.geometry === 'polyline')
        )
      );
      activeDraw = new L.EditToolbar.Edit(map, { featureGroup: polyLayers, edit: { remove: false }, remove: false });
      activeDraw.enable();

      // Point markers (atlas pins + lore pins + text labels): use native Leaflet dragging.
      const ptLayers = Array.from(layerById.values()).filter(l =>
        l.feature && l.feature.mapId === state.activeMapId &&
        (l.feature.geometry === 'point' || l.feature.geometry === 'text' || l.feature.kind === 'entry')
      );
      ptLayers.forEach(lyr => {
        const onDrag = () => {
          updateLabelsFor(lyr.feature.id);
        };
        const onDragEnd = () => {
          const latlng = lyr.getLatLng();
          lyr.feature.geojson.geometry.coordinates = [latlng.lng, latlng.lat];
          updateLabelsFor(lyr.feature.id);
          markEntityDirty('article', lyr.feature.id);
          debouncedSave();
        };
        lyr._moveModeOnDrag = onDrag;
        lyr._moveModeOnDragEnd = onDragEnd;
        lyr.dragging.enable();
        lyr.on('drag', onDrag);
        lyr.on('dragend', onDragEnd);
      });
      activeMoveMarkers = ptLayers;
    }
  }

  updateModeButtons();
}, 100);


function findBlockOwner(blockId) {
  const ownerFeature = state.features.find(f => (f.blocks || []).some(b => b.blockId === blockId));
  if (ownerFeature) {
    return { block: ownerFeature.blocks.find(b => b.blockId === blockId), ownerType: 'feature', ownerId: ownerFeature.id };
  }
  const ownerEntry = state.encyclopedia.find(e => (e.blocks || []).some(b => b.blockId === blockId));
  if (ownerEntry) {
    return { block: ownerEntry.blocks.find(b => b.blockId === blockId), ownerType: 'encyclopedia', ownerId: ownerEntry.id };
  }
  return { block: null, ownerType: null, ownerId: null };
}

function addTimelineEvent(blockId) {
  const { block, ownerType, ownerId } = findBlockOwner(blockId);
  if (!block) return;
  recordState();
  block.data.events.push({
    dateData: { year: 1, month: '', day: 1, era: '' },
    title: 'New Event',
    description: '',
    source: 'local',
    linkedId: null
  });
  markEntityDirty(ownerType, ownerId);
  showInfoPanel(ownerId, ownerType);
  debouncedSave();
}

function removeTimelineEvent(blockId, index) {
  const { block, ownerType, ownerId } = findBlockOwner(blockId);
  if (!block || !block.data.events[index]) return;
  recordState();
  const removedEvent = block.data.events[index];
  block.data.events.splice(index, 1);
  markEntityDirty(ownerType, ownerId);
  showToast(`Event "${removedEvent.title || 'Untitled'}" removed.`, () => undo());
  showInfoPanel(ownerId, ownerType);
  debouncedSave();
}

function updateTimelineEvent(blockId, index, data) {
  const { block, ownerType, ownerId } = findBlockOwner(blockId);
  if (!block || !block.data.events || !block.data.events[index]) return;

  recordState();
  const targetEvent = block.data.events[index];

  Object.assign(targetEvent, data);

  // Sync string fields for legacy/calendar compatibility if dateData changed
  if (data.dateData) {
    const d = data.dateData;
    targetEvent.date = `Year ${d.year || '?'}, ${d.month || '?'}, Day ${d.day || '?'}`;
  }
  if (data.endDateData) {
    const d = data.endDateData;
    if (d.year && d.month && d.day) {
      targetEvent.endDate = `Year ${d.year}, ${d.month}, Day ${d.day}`;
    } else {
      targetEvent.endDate = '';
    }
  }
  
  if (targetEvent.date) {
    targetEvent.displayDate = targetEvent.endDate ? `${targetEvent.date} → ${targetEvent.endDate}` : targetEvent.date;
    targetEvent.sortableDate = parseSortableDate(targetEvent.date);
  }
  
  markEntityDirty(ownerType, ownerId);
  debouncedSave();
}

// Helper function to activate the drawing tool with the correct preview icon
const activateToolWithTemplate = (templateId, geometryType) => {
  let options = {};
  if (geometryType === 'point') {
    let template;
    if (templateId && templateId.startsWith('template-')) {
      template = state.templates.find(t => t.templateId === templateId);
    } else {
      template = getTaxonomyItem(templateId);
    }

    if (template) {
      getItemIconHTML(template).then(newIconHtml => {
        const shape = template.pinShape || 'marker';
        const isBlank = shape === 'blank';
        const newIcon = L.divIcon({
          className: 'custom-marker-wrapper',
          html: newIconHtml,
          iconSize: [40, 40],
          iconAnchor: isBlank ? [20, 20] : [20, 40]
        });
        options = { marker: { icon: newIcon } };
        // Apply the mode AFTER icon is ready
        pendingTemplateId = templateId;
        lastUsedTemplateIds[geometryType] = templateId;
        const mode = geometryType === 'point' ? 'add-marker' : (geometryType === 'polygon' ? 'add-polygon' : 'add-polyline');
        debouncedSetMode(mode, options);
      }).catch(e => console.error('[worldbuilder] Icon load failed:', e));
      return; // Exit early as we handle the mode in the promise
    }  }

  pendingTemplateId = templateId;
  lastUsedTemplateIds[geometryType] = templateId;
  const mode = geometryType === 'point' ? 'add-marker' : (geometryType === 'polygon' ? 'add-polygon' : 'add-polyline');
  debouncedSetMode(mode, options);
};
window.activateToolWithTemplate = activateToolWithTemplate;

const setupFeatureButton = (btnId, geometryType, mode) => {
  const btn = $(btnId);
  if (!btn) return;

  // Handle the left-click action to select and enable a tool.
  btn.addEventListener('click', async (e) => {
    if (geometryType === 'point') {
      // Show flyout for Pin tool
      window.showPinFlyout(e.clientX, e.clientY);
    } else {
      // Direct activation for others
      pendingTemplateId = lastUsedTemplateIds[geometryType];
      debouncedSetMode(mode);
    }
  });

  // Handle the right-click action to open the template selection modal.
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showFeatureCreatorModal(e.clientX, e.clientY, geometryType);
  });
};

$('#modePointerBtn').addEventListener('click', () => debouncedSetMode('pointer'));
$('#modeMoveBtn').addEventListener('click', () => debouncedSetMode('move'));
setupFeatureButton('#modePinBtn', 'point', 'add-marker');
setupFeatureButton('#modeAreaBtn', 'polygon', 'add-polygon');
setupFeatureButton('#modeLineBtn', 'polyline', 'add-polyline');
$('#modeTextBtn').addEventListener('click', () => {
  pendingTemplateId = 'generic-text';
  debouncedSetMode('add-text');
});
$('#modeMeasureBtn').addEventListener('click', () => debouncedSetMode('measure'));

function deleteTemplate(templateId) {
  if (!templateId) return;
  recordState();
  const index = state.templates.findIndex(t => t.templateId === templateId);
  if (index > -1) {
    const deletedTemplateName = state.templates[index].name;
    state.templates.splice(index, 1);
    markEntityDirty('meta');
    showToast(`Template "${deletedTemplateName}" deleted.`, () => undo());
    debouncedSave();
  }
}

function toggleContentEditMode(ownerId, ownerType) {
  isContentEditMode = !isContentEditMode;
  if (!isContentEditMode) {
    selectedBlockId = null;
  }
  window.showInfoPanel(ownerId, ownerType);
}

function showEntityPopover(id, type, anchorEl) {
  document.getElementById('entity-quick-popover')?.remove();

  const entity = type === 'feature'
    ? state.features.find(f => f.id === id)
    : state.encyclopedia.find(e => e.id === id);
  if (!entity) return;

  const name = entity.title || entity.name || 'Untitled';
  const typeLabel = entity.featureType || entity.type || '';
  const textBlock = (entity.blocks || []).find(b => b.type === 'TextField');
  let snippet = '';
  if (textBlock?.data?.content) {
    const raw = textBlock.data.content.replace(/[#*`[\]]/g, '').trim();
    snippet = raw.length > 100 ? raw.slice(0, 100) + '…' : raw;
  }

  const openBtn = el('button', { class: 'primary eq-open-btn', text: 'Open Article →' });
  openBtn.addEventListener('click', () => {
    document.getElementById('entity-quick-popover')?.remove();
    if (window.enterArticleMode) window.enterArticleMode(id, type);
  });

  const children = [el('div', { class: 'eq-name', text: name })];
  if (typeLabel) children.push(el('span', { class: 'chip eq-type-chip', text: typeLabel }));
  if (snippet) children.push(el('p', { class: 'eq-snippet', text: snippet }));
  children.push(openBtn);

  const popover = el('div', { id: 'entity-quick-popover', class: 'entity-quick-popover' }, children);
  document.body.appendChild(popover);

  // Position to the right of the panel row
  const rect = anchorEl.getBoundingClientRect();
  const pw = 240;
  const left = rect.right + 8;
  const top = Math.min(rect.top, window.innerHeight - 160);
  popover.style.left = (left + pw > window.innerWidth ? rect.left - pw - 8 : left) + 'px';
  popover.style.top = top + 'px';

  setTimeout(() => {
    document.addEventListener('mousedown', (e) => {
      if (!popover.contains(e.target)) popover.remove();
    }, { once: true, capture: true });
  }, 0);
}
window.showEntityPopover = showEntityPopover;

function onMapClickForText(e) {
  recordState();
  const newFeat = addTextFeature(e.latlng, "New Label");
  selectFeature(newFeat.id);
  render({ full: true }); // This change forces the map to redraw
  debouncedSave();
  debouncedSetMode('pointer')
}

function selectFeatureSilent(id) {
  if (!id) return;
  selectedEncyclopediaEntryId = null;
  multiSelectedIds.clear();
  multiSelectedIds.add(id);
  selectedId = id;
  render();
  window.expandToItem(id);
  window.highlightItemInAtlas(id);
  updateSelectionStyles();
}

function selectEncyclopediaEntrySilent(entryId) {
  if (!entryId) return;
  selectedId = null;
  multiSelectedIds.clear();
  selectedEncyclopediaEntryId = entryId;
  multiSelectedIds.add(entryId);
  render();
  window.expandToEncyclopediaItem(entryId);
  window.highlightItemInEncyclopedia(entryId);
  updateSelectionStyles();
}

/**
 * A lightweight selection function that updates the selected ID and 
 * redraws the inspector/highlights without opening the side panel.
 */
function selectFeatureLight(id) {
  // We remove the 'panelIsOpen' check because selecting a feature via click
  // should always ensure the data is fresh, even if the panel was closed.

  if (id) {
    setRightPanelHidden(false);
    selectedEncyclopediaEntryId = null;
    multiSelectedIds.clear();
    multiSelectedIds.add(id);
    selectedId = id;
  } else {
    multiSelectedIds.clear();
    selectedId = null;
  }

  render();

  if (id) {
    window.showInfoPanel(id, 'feature');
    window.expandToItem(id);
    window.highlightItemInAtlas(id);
  }
}

function selectFeature(id) {
  if (!id) return;

  if (selectedId !== id) {
    isContentEditMode = false;
  }

  multiSelectedIds.clear();
  multiSelectedIds.add(id);
  selectedId = id;

  window.showInfoPanel(id, 'feature');
  window.expandToItem(id);
  window.highlightItemInAtlas(id);
  updateSelectionStyles();
  render();
}


function deleteFolder(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder) return;

  const featuresInFolder = state.features.filter(f => f.folderId === folderId);

  const onConfirm = () => {
    recordState();

    // Un-assign features from the folder before deleting it
    featuresInFolder.forEach(f => {
      f.folderId = null;
    });

    // Remove the folder from the state
    state.folders = state.folders.filter(f => f.id !== folderId);

    // If the deleted folder was the selected item, deselect it
    if (selectedId === folderId) {
      selectedId = null;
    }

    showToast(`Folder "${folder.name}" deleted. Its features were moved to the parent map.`);
    render({ full: true });
    debouncedSave();
  };

  showConfirmationModal(
    `Delete folder "${folder.name}"?`,
    `This will not delete the ${featuresInFolder?.length || 0} features inside. They will be moved to the parent map.`,
    'Delete Folder',
    onConfirm
  );
}

function renameFolder(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder) return;

  showInputModal('Rename Folder', 'Folder name', folder.name, (newName) => {
    if (newName !== folder.name) {
      recordState();
      folder.name = newName;
      markEntityDirty('meta');
      render({ full: true });
      debouncedSave();
    }
  });
}

// Alias — lore folders use the same unified folders array; renameFolder handles both silos.
const renameEncyclopediaFolder = renameFolder;

// Panel row click: switch map if needed, center on pin, open peek panel.
async function navigateAndPeek(id, type) {
  const readingLevel = window.preferredReadingLevel;
  window.exitArticleMode?.();

  if (type === 'feature') {
    const feature = state.features.find(f => f.id === id);
    if (!feature) return;
    if (feature.mapId && feature.mapId !== state.activeMapId) {
      await navigateToMap(feature.mapId, { skipInfoPanel: true });
    }
    window.expandToItem?.(id);
    window.highlightItemInAtlas?.(id);
    selectedId = id;
    selectedEncyclopediaEntryId = null;
    updateSelectionStyles();
    // Fly to feature after short delay so map has settled
    setTimeout(() => {
      const layer = layerById.get(id);
      if (layer && map) {
        map.invalidateSize();
        map.stop(); // cancel any in-progress animation before starting a new one
        if (layer.getBounds) {
          // Area/polygon: fit actual bounds with asymmetric panel offset on right only
          map.flyToBounds(layer.getBounds(), {
            paddingTopLeft: [60, 60],
            paddingBottomRight: [60, 500],
            maxZoom: Math.max(map.getZoom(), 1),
            duration: 0.6
          });
        } else {
          // Point pin: zero-size bounds + uniform offset accounts for right panel
          map.flyToBounds(L.latLngBounds(layer.getLatLng(), layer.getLatLng()), {
            padding: [100, 520],
            maxZoom: Math.max(map.getZoom(), 1),
            duration: 0.8
          });
        }
      }
    }, 100);
  } else {
    const entry = state.encyclopedia.find(e => e.id === id);
    if (!entry) return;
    if (entry.mapId && entry.mapId !== state.activeMapId) {
      await navigateToMap(entry.mapId, { skipInfoPanel: true });
    }
    window.expandToEncyclopediaItem?.(id);
    window.highlightItemInEncyclopedia?.(id);
    selectedEncyclopediaEntryId = id;
    selectedId = null;
    updateSelectionStyles();
    if (entry.mapId) {
      setTimeout(() => {
        const layer = layerById.get(id);
        if (layer && map) {
          map.invalidateSize();
          map.stop();
          if (layer.getBounds) {
            map.flyToBounds(layer.getBounds(), {
              paddingTopLeft: [60, 60],
              paddingBottomRight: [60, 500],
              maxZoom: Math.max(map.getZoom(), 1),
              duration: 0.6
            });
          } else {
            const latlng = layer.getLatLng();
            map.flyToBounds(L.latLngBounds(latlng, latlng), {
              padding: [100, 520],
              maxZoom: Math.max(map.getZoom(), 1),
              duration: 0.8
            });
          }
        }
      }, 100);
    }
  }

  if (readingLevel === 'article') {
    window.enterArticleMode?.(id, type);
  } else {
    window.enterPeekMode?.(id, type);
  }
}

// Open content (wiki text) for a map pin click — no zoom, no properties form.
function openPinContent(id, type) {
  if (type === 'encyclopedia') {
    selectedId = null;
    selectedEncyclopediaEntryId = id;
    window.expandToEncyclopediaItem?.(id);
    window.highlightItemInEncyclopedia?.(id);
  } else {
    selectedEncyclopediaEntryId = null;
    multiSelectedIds.clear();
    selectedId = id;
    window.expandToItem?.(id);
    window.highlightItemInAtlas?.(id);
  }
  updateSelectionStyles();
  window.showInfoPanel?.(id, type);
}

async function navigateToFeature(featureId) {
  const feature = state.features.find(f => f.id === featureId);
  if (!feature) {
    console.error(`Feature with ID ${featureId} not found.`);
    return;
  }

  // Exit article/peek mode so the map is visible before panning
  window.exitArticleMode?.();
  window.exitPeekMode?.();

  if (feature.mapId !== state.activeMapId) {
    await navigateToMap(feature.mapId);
  }

  selectFeature(feature.id);

  // Pan/zoom the map to the feature — invalidate first so Leaflet has correct dimensions
  const layer = layerById.get(feature.id);
  if (layer) {
    map.invalidateSize();
    const bounds = layer.getBounds ? layer.getBounds() : L.latLngBounds(layer.getLatLng(), layer.getLatLng());
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: Math.max(map.getZoom(), 1) });
  }
}

function toggleMapVisibility(mapId) {
  const map = state.maps.find(m => m.id === mapId);
  if (map) {
    recordState();
    map.visibleToPlayers = !map.visibleToPlayers;
    markEntityDirty('map', map.id);
    render({ full: true }); // Use a full render to update visibility
    debouncedSave();
  }
}

function deselectEncyclopediaEntry() {
  if (!selectedEncyclopediaEntryId) return;
  selectedEncyclopediaEntryId = null;
  window.hideInfoPanel();
  render();
}

function selectEncyclopediaEntry(entryId) {
  if (selectedEncyclopediaEntryId !== entryId) {
    isContentEditMode = false;
  }

  selectedId = null;
  multiSelectedIds.clear();
  selectedEncyclopediaEntryId = entryId;
  // Add to multiSelectedIds so updateSelectionStyles() applies the map selection ring
  if (entryId) multiSelectedIds.add(entryId);
  render();
  window.expandToEncyclopediaItem(entryId);
  window.highlightItemInEncyclopedia(entryId);
  window.enterPeekMode?.(entryId, 'encyclopedia');
}

function deleteFeature(id) {
  recordState();

  const idx = state.articles.findIndex(a => a.id === id);
  if (idx < 0) return;
  const [removed] = state.articles.splice(idx, 1);
  syncArticleViews();

  idbDeleteObject(`article-${removed.id}`);

  const l = window.layerById?.get(id);
  if (l) {
    window.allLayers?.removeLayer(l);
    if (l._nameMarker) window.labelLayer?.removeLayer(l._nameMarker);
    if (l._coaMarker) window.labelLayer?.removeLayer(l._coaMarker);
    window.layerById?.delete(id);
  }

  // Clean up cross-links from all other articles pointing to this one
  state.articles.forEach(a => {
    if ((a.links || []).some(l => l.targetId === id)) {
      a.links = a.links.filter(l => l.targetId !== id);
      markEntityDirty('article', a.id);
    }
  });

  if (selectedId === id) deselectAll();
  if (selectedEncyclopediaEntryId === id) {
    selectedEncyclopediaEntryId = null;
    hideInfoPanel();
  }

  const label = removed.title || removed.name || '(untitled)';
  showToast(`"${label}" deleted.`, () => undo());

  render({ full: true });
  debouncedSave();
}

function duplicateFeature(featureId) {
  const originalFeature = state.features.find(f => f.id === featureId);
  if (!originalFeature) return;

  recordState();

  // Create a deep copy of the feature
  const newFeature = structuredClone(originalFeature);

  // Assign a new unique ID
  newFeature.id = 'feat-' + uid();

  // Update the title to indicate it's a copy
  newFeature.title = `${originalFeature.title || 'Untitled'} (Copy)`;

  // Reset selection-specific properties
  newFeature.selected = false;

  // Add the new feature to the state
  state.articles.push(newFeature);
  syncArticleViews();
  markEntityDirty('article', newFeature.id);

  // A full render is needed to update the Atlas and the map
  render({ full: true });
  debouncedSave();

  // Select the newly created feature
  selectFeature(newFeature.id);
  showToast(`Feature "${originalFeature.title}" duplicated.`);
}

/**
 * Duplicates an encyclopedia entry.
 * @param {string} entryId - The ID of the entry to duplicate.
 */
function duplicateEncyclopediaEntry(entryId) {
  const originalEntry = state.encyclopedia.find(e => e.id === entryId);
  if (!originalEntry) return;

  recordState();

  const newEntry = structuredClone(originalEntry);
  newEntry.id = 'ency-' + uid();
  newEntry.name = `${originalEntry.name || 'Untitled'} (Copy)`;
  
  // If it has blocks, regenerate their IDs
  if (newEntry.blocks) {
    newEntry.blocks = newEntry.blocks.map(b => ({ ...b, blockId: 'blk-' + uid() }));
  }

  state.articles.push(newEntry);
  syncArticleViews();
  markEntityDirty('article', newEntry.id);

  render({ full: true });
  debouncedSave();

  window.selectEncyclopediaEntry(newEntry.id);
  showToast(`Entry "${originalEntry.name}" duplicated.`);
}


async function deleteCustomIcon(iconKey) {
  if (!iconKey || !iconKey.startsWith('ci-')) return;

  const onConfirm = async () => {
    recordState();
    await idbDelete(iconKey);

    // Revoke cached blob URL so the old icon's memory is freed immediately.
    if (window.evictCustomIconUrl) window.evictCustomIconUrl(iconKey);

    // Refresh the manifest and the UI
    await loadCustomAssets();

    // Use document.getElementById safely
    const iconPickerModal = document.getElementById('iconPickerModal');
    if (iconPickerModal && iconPickerModal.populateGrid) {
      await iconPickerModal.populateGrid();
    }

    showToast(`Icon "${iconKey}" deleted.`);

    // Force a full render to remove the icon from any features currently using it
    render({ full: true });
    debouncedSave();
  };

  showConfirmationModal('Delete Custom Icon?', `Are you sure you want to permanently delete the icon "${iconKey}"? This cannot be undone.`, 'Delete Icon', onConfirm);
}

// At the end of the file, in the "if (typeof window !== 'undefined')" block:
if (typeof window !== 'undefined') {
  // ... other functions
  window.deleteCustomIcon = deleteCustomIcon;
}

function renameMap(mapId, newName) {
  recordState();
  const map = state.maps.find(m => m.id === mapId);
  if (map) {
    map.name = newName;
    markEntityDirty('map', map.id);
    render({ full: true }); // Use a full render to update Atlas
    debouncedSave();
  }
}

function toggleFeatureVisibility(featureId) {
  const feature = state.features.find(f => f.id === featureId);
  if (feature) {
    recordState();
    feature.visibleToPlayers = !feature.visibleToPlayers;
    markEntityDirty('article', feature.id);
    render({ full: true }); // Use a full render to update visibility
    debouncedSave();
  }
}

function toggleEncyclopediaEntryVisibility(entryId) {
  const entry = state.encyclopedia.find(e => e.id === entryId);
  if (entry) {
    recordState();
    entry.visibleToPlayers = !entry.visibleToPlayers;
    markEntityDirty('article', entry.id);
    render({ full: true });
    debouncedSave();
  }
}

function undo() {
  if (undoStack.length === 0) return;

  const inspectorContent = document.querySelector('#inspectorContent');
  const infoPanelContent = document.querySelector('.info-panel-body');
  const inspectorScrollTop = inspectorContent ? inspectorContent.scrollTop : 0;
  const infoPanelScrollTop = infoPanelContent ? infoPanelContent.scrollTop : 0;

  isRestoringState = true;
  try {
    const currentSnapshot = {
      mapState: structuredClone(state),
      uiState: { inspectorViewMode: inspectorViewMode }
    };
    redoStack.push(currentSnapshot);

    const prevSnapshot = undoStack.pop();
    state = prevSnapshot.mapState;
    if (!Array.isArray(state.articles)) { state.articles = [...(state.features||[]), ...(state.encyclopedia||[])]; }
    syncArticleViews();
    inspectorViewMode = prevSnapshot.uiState.inspectorViewMode;

    // Mark everything dirty since we've swapped the entire state object
    markEntityDirty('meta');
    state.articles.forEach(a => markEntityDirty('article', a.id));
    state.maps.forEach(m => markEntityDirty('map', m.id));

    render({ full: true });

    const infoPanel = $('#infoPanel');
    if (infoPanel && infoPanel.classList.contains('is-visible') && selectedId) {
      showInfoPanel(selectedId);
    }
    const newInspectorContent = document.querySelector('#inspectorContent');
    const newInfoPanelContent = document.querySelector('.info-panel-body');
    if (newInspectorContent) newInspectorContent.scrollTop = inspectorScrollTop;
    if (newInfoPanelContent) newInfoPanelContent.scrollTop = infoPanelScrollTop;

    debouncedSave();
  } finally {
    isRestoringState = false;
  }
  debouncedSetMode('pointer');
}

function redo() {
  if (redoStack.length === 0) return;

  const inspectorContent = document.querySelector('#inspectorContent');
  const infoPanelContent = document.querySelector('.info-panel-body');
  const inspectorScrollTop = inspectorContent ? inspectorContent.scrollTop : 0;
  const infoPanelScrollTop = infoPanelContent ? infoPanelContent.scrollTop : 0;

  isRestoringState = true;
  try {
    const currentSnapshot = {
      mapState: structuredClone(state),
      uiState: { inspectorViewMode: inspectorViewMode }
    };
    undoStack.push(currentSnapshot);

    const nextSnapshot = redoStack.pop();
    state = nextSnapshot.mapState;
    if (!Array.isArray(state.articles)) { state.articles = [...(state.features||[]), ...(state.encyclopedia||[])]; }
    syncArticleViews();
    inspectorViewMode = nextSnapshot.uiState.inspectorViewMode;

    // Mark everything dirty since we've swapped the entire state object
    markEntityDirty('meta');
    state.articles.forEach(a => markEntityDirty('article', a.id));
    state.maps.forEach(m => markEntityDirty('map', m.id));

    render({ full: true });

    const infoPanel = $('#infoPanel');
    if (infoPanel && infoPanel.classList.contains('is-visible') && selectedId) {
      showInfoPanel(selectedId);
    }

    const newInspectorContent = document.querySelector('#inspectorContent');
    const newInfoPanelContent = document.querySelector('.info-panel-body');
    if (newInspectorContent) newInspectorContent.scrollTop = inspectorScrollTop;
    if (newInfoPanelContent) newInfoPanelContent.scrollTop = infoPanelScrollTop;

    debouncedSave();
  } finally {
    isRestoringState = false;
  }
  debouncedSetMode('pointer');
}
/**
 * Creates a new map and, if an image is provided, sets it.
 * @param {string} newMapName - The name of the new map.
 * @param {string} parentId - The parent map's ID.
 */
async function createNewMap(newMapName) {
  recordState();
  const parentId = state.activeMapId;
  const newMap = {
    id: 'map-' + uid(),
    name: newMapName || 'New Map',
    parentId: parentId,
    imageKey: null,
    width: 2000,
    height: 1200,
    overlayKey: null,
    overlayOpacity: 0.4,
    visibleToPlayers: true,
    scale: { pixels: 100, distance: 5, unit: 'miles' },
    grid: { enabled: false, type: 'square', size: 50, sizeX: 50, sizeY: 50, color: '#FFFFFF', opacity: 0.5, width: 1, offsetX: 0, offsetY: 0 }
  };
  state.maps.push(newMap);
  markEntityDirty('map', newMap.id);
  markEntityDirty('meta');
  navigateToMap(newMap.id);
}

function handleBulkUpdate(propertiesToUpdate, isDelete = false) {
  if (multiSelectedIds.size === 0) return;
  recordState();

  const ids = Array.from(multiSelectedIds);
  const idsSet = new Set(ids);
  let featuresCount = 0;
  let entriesCount = 0;

  if (isDelete) {
    state.articles = state.articles.filter(a => {
      if (idsSet.has(a.id)) {
        idbDeleteObject(`article-${a.id}`);
        if (a._silo === 'atlas') featuresCount++;
        else entriesCount++;
        return false;
      }
      return true;
    });
    syncArticleViews();
  } else {
    ids.forEach(id => {
      let feature = state.features.find(f => f.id === id);
      let entry = state.encyclopedia.find(e => e.id === id);
      let target = feature || entry;
      if (!target) return;

      if (feature) featuresCount++;
      if (entry) entriesCount++;

      const propsToApply = { ...propertiesToUpdate };

      // Special handling for colors (Features only)
      if (propsToApply.color && feature) {
        if (feature.geometry === 'point') {
          feature.iconColor = propsToApply.color;
        } else {
          feature.color = propsToApply.color;
        }
        delete propsToApply.color;
      }

      // Special handling for tags (Additive/Subtractive)
      if (propsToApply.addTags) {
        target.tags = target.tags || [];
        propsToApply.addTags.forEach(tag => {
          if (!target.tags.includes(tag)) target.tags.push(tag);
        });
        delete propsToApply.addTags;
      }
      if (propsToApply.removeTags) {
        target.tags = (target.tags || []).filter(tag => !propsToApply.removeTags.includes(tag));
        delete propsToApply.removeTags;
      }

      // Special handling for folders (Ensures Map consistency for Atlas items)
      if (propsToApply.folderId !== undefined) {
        if (feature) {
          const folder = state.folders.find(f => f.id === propsToApply.folderId);
          feature.folderId = propsToApply.folderId;
          if (folder) feature.mapId = folder.mapId;
        } else if (entry) {
          entry.folderId = propsToApply.folderId;
        }
        delete propsToApply.folderId;
      }

      // Apply other properties (like visibleToPlayers)
      Object.assign(target, propsToApply);

      // Mark as dirty
      if (feature) markEntityDirty('article', id);
      else if (entry) markEntityDirty('article', id);
    });
  }

  const total = featuresCount + entriesCount;
  if (isDelete) {
    showToast(`${total} items deleted.`, () => undo());
    multiSelectedIds.clear();
    selectedId = null;
    selectedEncyclopediaEntryId = null;
  } else {
    let actionLabel = 'Updated';
    if (propertiesToUpdate) {
      if ('visibleToPlayers' in propertiesToUpdate) actionLabel = propertiesToUpdate.visibleToPlayers ? 'Set to Player Visible' : 'Set to GM Only';
      else if (propertiesToUpdate.addTags)    actionLabel = 'Tags added';
      else if (propertiesToUpdate.removeTags) actionLabel = 'Tags removed';
      else if (propertiesToUpdate.color)      actionLabel = 'Color updated';
      else if ('folderId' in propertiesToUpdate) actionLabel = 'Moved';
    }
    showToast(`${total} items: ${actionLabel}.`, () => undo());
    // Selection is preserved after updates to allow sequential bulk actions.
    // User can click away or press Escape to clear.
  }

  render({ full: true });
  debouncedSave();
}

function deleteMapWithConfirmation(mapId, mapName) {
  showConfirmationModal(
    'Delete Map?',
    `Are you sure you want to delete the map "${mapName}" and all its content? This cannot be undone.`,
    'Delete Map',
    () => {
      recordState();

      // Find and remove the map
      const mapIndex = state.maps.findIndex(m => m.id === mapId);
      if (mapIndex > -1) {
        state.maps.splice(mapIndex, 1);
        idbDeleteObject(`map-${mapId}`);
      }

      // Find and remove all features associated with that map
      state.articles.filter(a => a._silo === 'atlas' && a.mapId === mapId)
        .forEach(a => idbDeleteObject(`article-${a.id}`));
      state.articles = state.articles.filter(a => !(a._silo === 'atlas' && a.mapId === mapId));
      syncArticleViews();

      // Find and remove all folders associated with that map
      state.folders = state.folders.filter(f => f.mapId !== mapId);
      markEntityDirty('meta');

      // If the deleted map was the active one, navigate to the main map
      if (state.activeMapId === mapId) {
        const mainMap = state.maps.find(m => m.parentId === null) || state.maps[0];
        navigateToMap(mainMap.id);
      } else {
        // If we're on a different map, just perform a full render to update the Atlas Tree
        render({ full: true });
      }

      showToast(`Map "${mapName}" deleted.`, () => undo());
      debouncedSave();
    }
  );
}

const wikiLinkExtension = {
  name: 'wikiLink',
  level: 'inline',
  start(src) { return src.indexOf('[['); },
  tokenizer(src, tokens) {
    const rule = /^\[\[([^\]]+)\]\]/; // Regex to find [[Anything]]
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'wikiLink',
        raw: match[0],
        text: match[1].trim(),
      };
    }
  },
  renderer(token) {
    const entryName = token.text;
    const lowerName = entryName.toLowerCase();

    // Resolve by name at render time only to determine broken-link styling.
    // The ID is intentionally NOT stored — navigation resolves by name at
    // click time so links never go stale after renames or deletions.
    const found =
      state.encyclopedia.some(e => e.name.toLowerCase() === lowerName) ||
      state.features.some(f => (f.title || f.name || '').toLowerCase() === lowerName);

    const cls = found ? 'wiki-link' : 'wiki-link is-broken';
    const title = found ? '' : ` title="Entry not found: ${escapeHtml(entryName)}"`;
    return `<a href="#" class="${cls}" data-wiki-name="${escapeHtml(entryName)}"${title}>${escapeHtml(entryName)}</a>`;
  },
};

function navigateToEncyclopediaEntry(entryId) {
  $('#atlasTabBtn')?.click();
  setTimeout(() => selectEncyclopediaEntry(entryId), 50);
}

async function navigateToPinForEntry(entryId) {
  const entry = state.encyclopedia.find(e => e.id === entryId);
  if (!entry || !entry.mapId) return;

  // Exit article/peek mode so the map is visible before panning
  window.exitArticleMode?.();
  window.exitPeekMode?.();

  if (entry.mapId !== state.activeMapId) {
    await navigateToMap(entry.mapId);
  }

  selectEncyclopediaEntry(entryId);

  // Pan map to the pin — invalidateSize inside timeout so CSS transition has completed
  setTimeout(() => {
    const layer = layerById.get(entryId);
    if (!layer || !map) return;
    map.invalidateSize();
    const latlng = layer.getLatLng ? layer.getLatLng() : layer.getBounds?.().getCenter();
    if (latlng) map.fitBounds(L.latLngBounds(latlng, latlng), { padding: [120, 120], maxZoom: Math.max(map.getZoom(), 1) });
  }, 380);
}

function deleteEncyclopediaEntry(entryId) {
  const entry = state.encyclopedia.find(e => e.id === entryId);
  if (!entry) return;

  const onConfirm = () => {
    recordState();

    idbDeleteObject(`article-${entryId}`);
    state.articles = state.articles.filter(a => a.id !== entryId);
    syncArticleViews();

    state.articles.forEach(a => {
      if (a.id !== entryId && (a.links || []).some(l => l.targetId === entryId)) {
        a.links = a.links.filter(l => l.targetId !== entryId);
        markEntityDirty('article', a.id);
      }
    });

    if (selectedEncyclopediaEntryId === entryId) {
      selectedEncyclopediaEntryId = null;
      hideInfoPanel(); // Close the panel
    }

    showToast(`Entry "${entry.name}" deleted.`, () => undo());
    refreshEncyclopediaView(); // Redraw the list
    debouncedSave();
  };

  showConfirmationModal(
    `Delete Entry "${entry.name}"?`,
    '',
    'Delete Entry',
    onConfirm
  );
}

function convertEntryToFeature(entryId) {
  const entry = state.encyclopedia.find(e => e.id === entryId);
  if (!entry) return;

  showConfirmationModal(
    'Move to Atlas?',
    'This entry will become an Atlas pin. Its content, tags, and links will be preserved. This cannot be undone.',
    'Move to Atlas',
    () => {
      recordState();

      const _center = window.map ? window.map.getCenter() : { lat: 0, lng: 0 };
      const newFeat = {
        id: 'feature-' + uid(),
        _silo: 'atlas',
        title: entry.name,
        name: entry.name,
        kind: 'feature',
        featureType: 'generic-pin',
        geometry: 'point',
        domain: 'Points of Interest',
        category: 'Geography',
        lat: _center.lat, lng: _center.lng,
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [_center.lng, _center.lat] } },
        mapId: state.activeMapId || state.maps[0]?.id,
        blocks: entry.blocks || [],
        heroImageKey: entry.heroImageKey || null,
        tags: entry.tags || [],
        links: entry.links || [],
        iconClass: entry.iconClass || null,
        visibleToPlayers: entry.visibleToPlayers ?? true,
        coatOfArms: null,
        coatOfArmsKey: null,
        showCoatOfArms: true,
      };

      // Update backlinks in all features and encyclopedia entries
      state.features.forEach(f => {
        if ((f.links || []).some(l => l.targetId === entry.id && l.targetType === 'encyclopedia')) {
          f.links = f.links.map(l =>
            (l.targetId === entry.id && l.targetType === 'encyclopedia')
              ? { ...l, targetId: newFeat.id, targetType: 'feature' }
              : l
          );
          markEntityDirty('article', f.id);
        }
      });
      state.encyclopedia.forEach(e => {
        if (e.id !== entry.id && (e.links || []).some(l => l.targetId === entry.id && l.targetType === 'encyclopedia')) {
          e.links = e.links.map(l =>
            (l.targetId === entry.id && l.targetType === 'encyclopedia')
              ? { ...l, targetId: newFeat.id, targetType: 'feature' }
              : l
          );
          markEntityDirty('article', e.id);
        }
      });

      const idx = state.articles.findIndex(a => a.id === entry.id);
      if (idx !== -1) state.articles.splice(idx, 1);
      idbDeleteObject('article-' + entry.id);

      state.articles.push(newFeat);
      syncArticleViews();
      markEntityDirty('article', newFeat.id);
      markEntityDirty('meta');
      debouncedSave();

      render({ full: true });
      refreshAtlasTree();
      refreshEncyclopediaView();
      selectFeature(newFeat.id);
      showToast('"' + entry.name + '" moved to Atlas. Drag the pin to place it.');
    }
  );
}
window.convertEntryToFeature = convertEntryToFeature;

function convertFeatureToEntry(featureId) {
  const feature = state.features.find(f => f.id === featureId);
  if (!feature) return;

  if (feature.geometry !== 'point') {
    showAlertModal('Cannot Convert', 'Only pin features can be moved to the Encyclopedia. Areas and lines must remain on the Atlas.');
    return;
  }

  showConfirmationModal(
    'Move to Lore?',
    'This pin will become a Lore entry. Its content, tags, and links will be preserved. This cannot be undone.',
    'Move to Lore',
    () => {
      recordState();

      const newEntry = {
        id: 'ent-' + uid(),
        _silo: 'lore',
        name: feature.title || feature.name || 'Untitled',
        type: 'Location',
        blocks: feature.blocks || [],
        heroImageKey: feature.heroImageKey || null,
        tags: feature.tags || [],
        links: feature.links || [],
        iconClass: feature.iconClass || null,
        visibleToPlayers: feature.visibleToPlayers ?? true,
        folderId: null,
      };

      // Update backlinks in all features and encyclopedia entries
      state.features.forEach(f => {
        if (f.id !== feature.id && (f.links || []).some(l => l.targetId === feature.id && l.targetType === 'feature')) {
          f.links = f.links.map(l =>
            (l.targetId === feature.id && l.targetType === 'feature')
              ? { ...l, targetId: newEntry.id, targetType: 'encyclopedia' }
              : l
          );
          markEntityDirty('article', f.id);
        }
      });
      state.encyclopedia.forEach(e => {
        if ((e.links || []).some(l => l.targetId === feature.id && l.targetType === 'feature')) {
          e.links = e.links.map(l =>
            (l.targetId === feature.id && l.targetType === 'feature')
              ? { ...l, targetId: newEntry.id, targetType: 'encyclopedia' }
              : l
          );
          markEntityDirty('article', e.id);
        }
      });

      // Remove from map if it has a layer
      const layer = window.layerById?.get(feature.id);
      if (layer) {
        window.allLayers?.removeLayer(layer);
        if (layer._nameMarker) window.labelLayer?.removeLayer(layer._nameMarker);
        if (layer._coaMarker) window.labelLayer?.removeLayer(layer._coaMarker);
        window.layerById?.delete(feature.id);
      }

      const idx = state.articles.findIndex(a => a.id === feature.id);
      if (idx !== -1) state.articles.splice(idx, 1);
      idbDeleteObject('article-' + feature.id);

      state.articles.push(newEntry);
      syncArticleViews();
      markEntityDirty('article', newEntry.id);
      markEntityDirty('meta');
      debouncedSave();

      render({ full: true });
      refreshAtlasTree();
      refreshEncyclopediaView();
      window.selectEncyclopediaEntry(newEntry.id);
      showToast('"' + (feature.title || feature.name) + '" moved to Lore.');
    }
  );
}
window.convertFeatureToEntry = convertFeatureToEntry;

function createLinkedPinFromEntry(entryId, latlng) {
  const entry = state.encyclopedia.find(e => e.id === entryId);
  if (!entry) return;

  // Duplicate guard — entry is already pinned on this map
  if (entry.mapId === state.activeMapId) {
    selectEncyclopediaEntry(entry.id);
    showToast(`"${entry.name}" is already on the map.`);
    return;
  }

  recordState();

  // Place the existing encyclopedia entry on the map (single-entity path, same as pin tool)
  entry.mapId = state.activeMapId;
  entry.geojson = L.marker(latlng).toGeoJSON(15);
  entry.geometry = 'point';

  // Apply spatial style defaults from taxonomy — only if not already set.
  // Lore entries use type labels (e.g. 'Character') but TAXONOMY is keyed by featureType
  // (e.g. 'generic-person'), so search by the type field value, not the key.
  let loreTemplate = {};
  for (const key in TAXONOMY) {
    if (TAXONOMY[key].type === entry.type) { loreTemplate = TAXONOMY[key]; break; }
  }
  if (!entry.pinShape)     entry.pinShape     = loreTemplate.pinShape    || 'blank';
  if (!entry.iconClass)    entry.iconClass    = loreTemplate.icon || loreTemplate.iconClass || 'person';
  if (!entry.iconColor)    entry.iconColor    = loreTemplate.iconColor   || '#ffffff';
  if (!entry.pinIconColor) entry.pinIconColor = loreTemplate.pinIconColor || '#ffffff';

  // Add location tag
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (activeMap?.name) {
    if (!entry.tags) entry.tags = [];
    const locationTag = `@${activeMap.name}`;
    if (!entry.tags.includes(locationTag)) entry.tags.push(locationTag);
  }

  markEntityDirty('article', entry.id);
  debouncedSave();
  render({ full: true });
  selectEncyclopediaEntry(entry.id);
  showToast(`"${entry.name}" placed on map.`);
}

function showFogPopover(triggerBtn) {
  const popover = $('#fogControlsPopover');
  if (!popover || !triggerBtn) return;

  // Sync slider values from state
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (activeMap?.fog) {
    $('#fogOpacitySlider').value = activeMap.fog.opacity ?? 0.85;
    $('#fogBrushSizeSlider').value = activeMap.fog.brushSize ?? 40;
    $('#fogBrushSizeInput').value = activeMap.fog.brushSize ?? 40;
  }

  // Position anchored to the trigger button
  const btnRect = triggerBtn.getBoundingClientRect();
  const wrapRect = $('.map-wrap').getBoundingClientRect();
  const popoverHalfWidth = 130; // half of the 260px popover width
  const edgePad = 8;
  const rawCenter = btnRect.left - wrapRect.left + btnRect.width / 2;
  const maxLeft = wrapRect.width - popoverHalfWidth - edgePad;
  const leftCenter = Math.min(rawCenter, maxLeft);

  popover.style.left = `${leftCenter}px`;
  popover.style.transform = 'translateX(-50%)';

  // Place above or below depending on available space
  const spaceBelow = window.innerHeight - btnRect.bottom;
  if (spaceBelow > 130) {
    popover.style.top = `${btnRect.bottom - wrapRect.top + 8}px`;
    popover.style.bottom = '';
  } else {
    popover.style.top = 'auto';
    popover.style.bottom = `${wrapRect.bottom - btnRect.top + 8}px`;
  }

  popover.classList.remove('hidden');
}

function hideFogPopover() {
  const popover = $('#fogControlsPopover');
  if (popover) popover.classList.add('hidden');
}

function hideOverlayMenuPopover() {
  const popover = $('#overlayMenuPopover');
  if (popover) popover.classList.add('hidden');
  ['#overlayMenuBtn', '#overlayMenuBtnFullscreen'].forEach(id => {
    const b = $(id);
    if (b) b.setAttribute('aria-expanded', 'false');
  });
}

function toggleFog() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (!activeMap) return;
  recordState();
  activeMap.fog = activeMap.fog || { enabled: false, opacity: 0.85, brushSize: 40, mask: null };
  activeMap.fog.enabled = !activeMap.fog.enabled;

  // Clear the saved mask when turning fog off so it starts fully opaque next time
  if (!activeMap.fog.enabled) {
    activeMap.fog.mask = null;
  }

  if (activeMap.fog.enabled && role === 'gm') {
    debouncedSetMode('fog');
  } else {
    debouncedSetMode('pointer');
  }

  window.updateFogLayer();
  const fogEnabled = activeMap.fog.enabled;
  [$('#toggleFogBtn'), $('#toggleFogBtnFullscreen')].forEach(btn => {
    if (btn) {
      btn.setAttribute('aria-pressed', String(fogEnabled));
      btn.setAttribute('aria-label', fogEnabled ? 'Fog of War Settings' : 'Show Fog of War');
    }
  });

  if (fogEnabled && role === 'gm') {
    // Pick the button that is actually visible — in map fullscreen mode the main toolbar is hidden
    const triggerBtn = document.body.classList.contains('map-fullscreen-mode')
      ? $('#toggleFogBtnFullscreen')
      : $('#toggleFogBtn');
    showFogPopover(triggerBtn);
  } else {
    hideFogPopover();
  }

  markEntityDirty('map', activeMap.id);
  save(); // Flush immediately — fog enabled/disabled must not be lost on F5
}

async function navigateToMap(mapId, options = {}) {
  // Close any open reading views — navigation is always map-centric
  window.exitPeekMode?.();
  window.exitArticleMode?.();

  // Guard clause: If already on this map, do nothing to prevent reload
  if (selectedId === mapId && !options.force) {
    if (!options.skipInfoPanel) showInfoPanel(mapId, 'map');
    return;
  }

  const currentTask = ++window.navigationTask;
  setLoadingState(true, "Loading Map..."); // <--- START LOADING

  try {
    hideInfoPanel(false);
    multiSelectedIds.clear();
    selectedId = mapId;
    state.activeMapId = mapId;
    markEntityDirty('meta');
    debouncedSave();
    selectedBlockId = null;

    const trail = [];
    let currentMapId = mapId;
    while (currentMapId) {
      const map = state.maps.find(m => m.id === currentMapId);
      if (map) {
        trail.unshift(map.id);
        currentMapId = map.parentId;
      } else {
        break;
      }
    }
    trail.forEach(id => collapsedNodes.delete(id));

    let activeMap = state.maps.find(m => m.id === mapId);

    // Fallback if the requested map is missing
    if (!activeMap) {
      console.warn(`Map "${mapId}" not found. Falling back to the first available map.`);
      activeMap = state.maps[0];
      if (activeMap) {
        state.activeMapId = activeMap.id;
      }
    }

    if (!activeMap) {
      console.error("Critical Error: No maps found in project state.");
      return;
    }

    // Read saved viewport before initMap resets it via fitBounds
    const savedView = loadLS(`mapView-${mapId}`, null);
    initMap(activeMap);
    syncMapBackground();

    let loadedBase = false;
    if (activeMap.imageKey) {
      const url = await resolveImageUrl(activeMap.imageKey);
      if (url) {
        applyMapURL(url, activeMap.width, activeMap.height);
        loadedBase = true;
      }
    }

    if (!loadedBase) {
      map.fitBounds([[0, 0], [activeMap.height, activeMap.width]]);
    }

    if (savedView?.center && typeof savedView.zoom === 'number') {
      map.setView([savedView.center.lat, savedView.center.lng], savedView.zoom, { animate: false });
    }

    if (activeMap.overlayKey) {
      const url2 = await resolveImageUrl(activeMap.overlayKey);
      if (url2) {
        applyOverlayURL(url2, activeMap);
      }
    }

    setOverlayOpacity(activeMap.overlayOpacity ?? 0.4, activeMap);

    window.updateFogLayer(); // Sync Fog Layer

    render({ full: true }); // Full render is okay here because map context changed entirely
    debouncedSetMode('pointer');

    highlightItemInAtlas(mapId);
    if (!options.skipInfoPanel) {
      showInfoPanel(mapId, 'map');
    }

    await detectAndWarnMissingImages();

  } catch (e) {
    console.error(e);
    showToast("Error loading map");
  } finally {
    // Give a small buffer for DOM to settle before hiding spinner
    setTimeout(async () => {
      if (currentTask !== window.navigationTask) return;
      setLoadingState(false);
      // Final sync once spinner is gone
      await render({ full: true });
    }, 200); 
  }
}

function updateBlockData(ownerId, blockId, newData) {
  if (!ownerId || !blockId) return;

  const item = state.features.find(f => f.id === ownerId) ||
               state.encyclopedia.find(e => e.id === ownerId) ||
               state.maps.find(m => m.id === ownerId);
  const block = item?.blocks?.find(b => b.blockId === blockId);
  if (!block) return;

  recordState();
  Object.assign(block.data, newData);

  let ownerType = 'feature';
  if (state.encyclopedia.some(e => e.id === ownerId)) ownerType = 'encyclopedia';
  else if (state.maps.some(m => m.id === ownerId)) ownerType = 'map';

  markEntityDirty(ownerType, ownerId);
  showInfoPanel(ownerId, ownerType);
  debouncedSave();

  // Check YouTube embeddability and auto-set hero when a YouTube URL is saved
  if (block.type === 'YouTube' && newData.url) {
    const videoId = getYoutubeVideoId(newData.url);
    if (videoId) _checkYouTubeVideo(item, block, videoId, ownerType);
  }
}

async function _checkYouTubeVideo(item, block, videoId, ownerType) {
  // oEmbed returns 200 + thumbnail data if embeddable, 401 if not
  let embeddable = false;
  let thumbnailUrl = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch%3Fv%3D${encodeURIComponent(videoId)}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      embeddable = true;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    }
  } catch (_) {}

  // Store result on block data so renderBlockViewMode can use it
  block.data._ytEmbeddable = embeddable;
  markEntityDirty(ownerType, item.id);
  showInfoPanel(item.id, ownerType);
  debouncedSave();

  // Auto-set hero from thumbnail if none is set yet.
  // Always use img.youtube.com (CORS-safe) rather than the oEmbed CDN URL (i.ytimg.com).
  if (!item.heroImageKey) {
    try {
      const heroFetchUrl = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;
      let res = await fetch(heroFetchUrl);
      if (!res.ok) res = await fetch(`https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`);
      if (!res.ok) return;
      const blob = await res.blob();
      if (item.heroImageKey) return; // set by user while we were fetching
      const processed = await processImageUpload(blob);
      const imageKey = 'img-' + uid();
      await idbSet(imageKey, processed);
      state.assetNames = state.assetNames || {};
      state.assetNames[imageKey] = `${item.title || item.name || 'Entity'} · Hero`;
      markEntityDirty('meta');
      item.heroImageKey = imageKey;
      markEntityDirty(ownerType, item.id);
      showInfoPanel(item.id, ownerType);
      debouncedSave();
      showToast('YouTube thumbnail set as hero image.', () => {
        item.heroImageKey = null;
        markEntityDirty(ownerType, item.id);
        showInfoPanel(item.id, ownerType);
        debouncedSave();
      });
    } catch (_) {}
  }
}

function addCustomColor(hexColor) {
  if (!hexColor) return;
  recordState();
  // Ensure we don't exceed the 8-slot limit
  if (state.customColors.length >= 8) {
    state.customColors.shift(); // Remove the oldest color
  }
  state.customColors.push(hexColor);
  markEntityDirty('meta');
  debouncedSave();
}

function handleAddAssetToInfoPanel(assetKey) {
  // Find target (feature or encyclopedia)
  const targetItemId = infoPanelFeatureId || selectedEncyclopediaEntryId;
  if (!targetItemId) return;

  const targetItem = state.features.find(f => f.id === targetItemId) || state.encyclopedia.find(e => e.id === targetItemId);
  if (!targetItem) return;

  recordState();

  // Create Image Block linked to existing key
  const imageBlock = {
    blockId: 'blk-' + uid(),
    type: 'Image',
    visibleToPlayers: true,
    data: { src: assetKey, caption: '', size: 100 }
  };

  targetItem.blocks = targetItem.blocks || [];
  targetItem.blocks.push(imageBlock);

  const ownerType = infoPanelFeatureId ? 'feature' : 'encyclopedia';
  markEntityDirty(ownerType, targetItemId);
  showInfoPanel(targetItemId, ownerType);
  debouncedSave();
  showToast('Image asset added.');
}




function addBlock(ownerId, ownerType, blockType) {
  const item = state.features.find(f => f.id === ownerId) || 
               state.encyclopedia.find(e => e.id === ownerId) ||
               state.maps.find(m => m.id === ownerId);
  const blockDef = BLOCK_DEFINITIONS[blockType];

  if (!item || !blockDef) return;

  recordState();

  const newBlock = {
    blockId: 'blk-' + uid(),
    type: blockType,
    visibleToPlayers: true,
    data: structuredClone(blockDef.defaultData)
  };

  if (!item.blocks) item.blocks = [];
  item.blocks.push(newBlock);
  markEntityDirty(ownerType, ownerId);

  shouldScrollToSelectedBlock = true;
  selectedBlockId = newBlock.blockId;
  showInfoPanel(ownerId, ownerType);
  debouncedSave();
}

function selectBlock(ownerId, blockId, ownerType = 'feature') {
  const justDeselected = (selectedBlockId !== null && blockId === null);
  const selectedNewBlock = (selectedBlockId !== blockId);

  selectedBlockId = blockId;

  if (ownerType === 'feature') {
    if (selectedId !== ownerId) {
      selectFeature(ownerId);
    }
  } else if (ownerType === 'encyclopedia') {
    if (selectedEncyclopediaEntryId !== ownerId) {
      selectEncyclopediaEntry(ownerId);
    }
  } else if (ownerType === 'map') {
    if (state.activeMapId !== ownerId) {
      navigateToMap(ownerId);
    }
  }

  if (selectedNewBlock || justDeselected) {
    // Pass the owner type along to showInfoPanel.
    showInfoPanel(ownerId, ownerType);
  }
}

function removeOverlayImage() {
  recordState();
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (activeMap && activeMap.overlayKey) {
    activeMap.overlayKey = null;
    markEntityDirty('map', activeMap.id);

    // This existing function will handle removing the layer and updating the toolbar buttons
    applyOverlayURL(null, activeMap);

    render();
    debouncedSave();
  }
}

async function handleNewProject() {
  const onConfirm = async () => {
    // 1. Read settings to preserve BEFORE any clearing (synchronous, cannot fail)
    const hideWelcome  = loadLS('hideWelcomePermanently', false);
    const theme        = loadLS('siteTheme', 'dark');
    const roleSetting  = loadLS('role', 'gm');
    const newsVersion  = loadLS('lastSeenNewsVersion', null);
    const toolbar      = loadLS('toolbarPos', 'center');
    const tutorialDone = loadLS('hasCompletedTutorial', false);

    // 2. Best-effort snapshot — isolated try/catch so a slow/failing zip never
    //    blocks the critical path below.
    try { await saveFullSnapshot(settings.worldId); } catch (e) { console.warn('[NewProject] Snapshot failed:', e); }
    try { await saveRecentProject(); }               catch (e) { console.warn('[NewProject] Recent save failed:', e); }

    // Read recentProjects AFTER saveRecentProject so it includes the outgoing world
    const recentProjects = loadLS('recentProjects', []);

    // 3. Critical path — these must always run
    await idbClear();
    localStorage.clear();

    // 4. Restore UI-level settings
    if (hideWelcome)  saveLS('hideWelcomePermanently', true);
    saveLS('siteTheme', theme);
    saveLS('role', roleSetting);
    if (newsVersion)  saveLS('lastSeenNewsVersion', newsVersion);
    saveLS('toolbarPos', toolbar);
    if (tutorialDone) saveLS('hasCompletedTutorial', true);
    if (recentProjects.length) saveLS('recentProjects', recentProjects);
    localStorage.setItem('showWelcome', 'true');

    // 5. Reload into a clean world
    window.location.reload();
  };
  showConfirmationModal('Create a New Project?', 'All current unsaved work will be lost. This cannot be undone.', 'Create New Project', onConfirm);
}

async function handleSaveProject() {
  showPasswordModal('Export Project', 'Enter password...', async (password) => {
    const filename = (settings.projectName.replace(/[^a-z0-9_-]/gi, '_') || 'world') + '.trv';
    const clone = { settings, state };
    // Include all img-* keys from IDB so asset-library images that haven't been placed
    // in any block yet are preserved across export/import cycles.
    const allIdbKeys = await idbGetAllKeys('files');
    const assetLibraryKeys = allIdbKeys.filter(k => k.startsWith('img-'));
    await exportBundleFrom(clone, filename, assetLibraryKeys, password);
  }, '(Optional) Enter a password to protect your project file');
}

function handleLoadProject() {
  $('#importFile').click();
}

async function handleExportPlayer() {
  showPasswordModal('Export Player Project', 'Enter password...', async (password) => {
    const filename = (settings.projectName.replace(/[^a-z0-9_-]/gi, '_') || 'player_export') + '_player.trv';
    const playerState = sanitizeForPlayer({ settings, state });
    await exportBundleFrom(playerState, filename, [], password);
  }, '(Optional) Enter a password to protect this player project');
}

function handleDropOnInfoPanel(draggedEntryId) {
  if (!draggedEntryId) return;

  // Find the item that is currently open in the info panel
  const targetItemId = infoPanelFeatureId || selectedEncyclopediaEntryId;
  if (!targetItemId || targetItemId === draggedEntryId) return;

  const targetItem = state.features.find(f => f.id === targetItemId) || state.encyclopedia.find(e => e.id === targetItemId);
  const draggedEntry = state.encyclopedia.find(e => e.id === draggedEntryId);

  if (!targetItem || !draggedEntry) return;

  recordState();

  // Ensure the target item has a blocks array
  targetItem.blocks = targetItem.blocks || [];

  // Find the first available text field to append the link to
  let textField = targetItem.blocks.find(b => b.type === 'TextField');

  // If no text field exists, create one
  if (!textField) {
    textField = {
      blockId: 'blk-' + uid(),
      type: 'TextField',
      visibleToPlayers: true,
      data: { label: '', content: '' }
    };
    targetItem.blocks.push(textField);
  }

  const linkText = `[[${draggedEntry.name}]]`;

  // Append the new link
  textField.data.content = (textField.data.content || '').trim() + `\n\n${linkText}`;

  const ownerType = infoPanelFeatureId ? 'feature' : 'encyclopedia';
  markEntityDirty(ownerType, targetItemId);

  showInfoPanel(targetItemId, ownerType); // Refresh the panel to show the new link
  debouncedSave();
  showToast(`Linked to "${draggedEntry.name}"`);
}

/**
 * Handles the logic when one or more features/maps/folders are dropped in the Atlas tree.
 * @param {Event} evt - The event object from SortableJS.
 */
function handleAtlasDrop(evt) {
  recordState();

  const draggedItem = evt.item;
  const fid = draggedItem.dataset.fid;
  const fld = draggedItem.dataset.folderId;
  const mid = draggedItem.dataset.mapId;
  const draggedId = fid || fld || mid;

  // Use multi-selection if the dragged item is part of it; otherwise just the dragged item.
  const idsToMove = (multiSelectedIds.has(draggedId)) ? Array.from(multiSelectedIds) : [draggedId];

  // forceFallback (pointer-based) drag has a known SortableJS bug: evt.to is unreliable
  // for cross-nested-container drops. After onEnd fires, SortableJS has already moved
  // evt.item into the correct target container, so evt.item.parentElement is the
  // ground-truth drop target — more reliable than evt.to or any captured onMove value.
  window._atlasDragLastTo = null;
  const effectiveTo = evt.item.parentElement || evt.to;

  // Determine the new parent context (shared for all items in this drop)
  const newParentFolderNode = effectiveTo.closest('.folder-node');
  const newParentMapNode = effectiveTo.closest('.map-node');

  // Use the nearer (more specific) ancestor. If the folder-node contains the map-node,
  // the map-node is closer to effectiveTo and should be used as the parent (e.g. dropping
  // inside a map that itself lives inside a folder). If the map-node contains the folder-node,
  // the folder is closer and should be used instead.
  const useMapNode = newParentMapNode && (!newParentFolderNode || newParentFolderNode.contains(newParentMapNode));

  let newParentFolderId = useMapNode ? null : (newParentFolderNode ? newParentFolderNode.dataset.folderId : null);
  let newParentMapId = null;

  if (useMapNode) {
    const targetMapId = newParentMapNode.dataset.mapId;
    // Cycle guard: reject if targetMapId is a descendant of the dragged map
    if (mid) {
      const wouldCycle = (() => {
        let cur = targetMapId;
        while (cur) {
          if (cur === mid) return true;
          cur = (state.maps.find(m => m.id === cur) || {}).parentId;
        }
        return false;
      })();
      newParentMapId = wouldCycle ? state.activeMapId : targetMapId;
    } else {
      newParentMapId = targetMapId;
    }
  } else if (newParentFolderNode) {
    // Resolve the Map ID from the folder
    const parentFolder = state.folders.find(f => f.id === newParentFolderId);
    if (parentFolder) newParentMapId = parentFolder.mapId;
  } else {
    // Dropped at root level
    newParentMapId = state.activeMapId;
  }

  idsToMove.forEach(id => {
    const feature = state.features.find(f => f.id === id);
    const map = state.maps.find(m => m.id === id);
    const folder = state.folders.find(f => f.id === id);

    if (feature) {
      feature.mapId = newParentMapId;
      feature.folderId = newParentFolderId;
      markEntityDirty('article', id);
    } else if (map) {
      // Prevent mapping a map to itself as parent
      map.parentId = (id === newParentMapId) ? null : newParentMapId;
      map.folderId = newParentFolderId;
      markEntityDirty('map', id);
    } else if (folder) {
      // Prevent dragging a folder into itself
      if (id !== newParentFolderId) {
        folder.parentFolderId = newParentFolderId || null;
        folder.mapId = newParentMapId;
        markEntityDirty('meta');
      }
    }
  });

  debouncedSave();
  render({ full: true });
}

function applyTemplateToFeature(featureId, templateId) {
  const feature = state.features.find(f => f.id === featureId);
  const template = getTaxonomyItem(templateId);

  if (!feature || !template) return;

  recordState(); // Record the state for undo/redo.

  // Update core properties
  feature.featureType = templateId;
  feature.domain = template.domain;
  feature.category = template.category;

  // Apply default visual properties from the new template
  const geometryType = template.geometry || feature.geometry;
  if (geometryType === 'point') {
    feature.iconClass = template.icon;
    feature.iconColor = template.color;
    feature.pinIconColor = '#ffffff'; // Reset pin icon color
  } else if (geometryType === 'polygon') {
    feature.color = template.color;
    feature.fillOpacity = template.fillOpacity;
  } else if (geometryType === 'polyline') {
    feature.color = template.color;
    feature.weight = template.weight;
    feature.dashArray = template.dashArray;
  }

  markEntityDirty('article', featureId);
  render(); // Re-render the UI to show changes on the map and in the inspector.
  debouncedSave(); // Save the new state.
}
async function detectAndWarnMissingImages() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId) || state.maps[0];
  const missing = [];
  if (activeMap?.imageKey && !(await idbHas(activeMap.imageKey))) missing.push('Base map');
  if (activeMap?.overlayKey && !(await idbHas(activeMap.overlayKey))) missing.push('Overlay');
  if (missing.length > 0) {
    showMapNotice(`${missing.join(' & ')} image missing from storage. Re-select the image file to restore.`);
  }
}

async function exportBundleFrom(clone, filename, additionalKeys = [], password = null) {
  if (typeof JSZip === 'undefined') {
    showAlertModal('Dependency Missing', 'JSZip library not loaded. Export functionality will be limited.');
    return;
  }
  
  setLoadingState(true, "Preparing Project...");
  const zip = new JSZip();
  console.log("Starting project export...");

  // 1. Create a Set to collect all unique image/blob keys from the entire project.
  //    Seed with any extra keys passed by the caller (e.g. orphaned asset-library images).
  const allKeysToExport = new Set(additionalKeys);

  // From maps (base, overlay, and banner images)
  (clone.state.maps || []).forEach(map => {
    if (map.imageKey) allKeysToExport.add(map.imageKey);
    if (map.overlayKey) allKeysToExport.add(map.overlayKey);
    if (map.id) allKeysToExport.add(`banner-${map.id}`);
  });

  // From features/atlas entries (hero images, imageKey, and image blocks)
  (clone.state.features || []).forEach(feature => {
    if (feature.heroImageKey) allKeysToExport.add(feature.heroImageKey);
    if (feature.coatOfArmsKey) allKeysToExport.add(feature.coatOfArmsKey);
    if (feature.imageKey) allKeysToExport.add(feature.imageKey);
    (feature.blocks || []).forEach(block => {
      if (block.type === 'Image' && block.data.src && block.data.src.startsWith('img-')) {
        allKeysToExport.add(block.data.src);
      }
    });
  });

  // From encyclopedia entries (hero images, CoA, and image blocks)
  (clone.state.encyclopedia || []).forEach(entry => {
    if (entry.heroImageKey) allKeysToExport.add(entry.heroImageKey);
    if (entry.coatOfArmsKey) allKeysToExport.add(entry.coatOfArmsKey);
    if (entry.imageKey) allKeysToExport.add(entry.imageKey);
    (entry.blocks || []).forEach(block => {
      if (block.type === 'Image' && block.data.src && block.data.src.startsWith('img-')) {
        allKeysToExport.add(block.data.src);
      }
    });
  });

  // From custom theme background
  if (clone.settings.customTheme?.backgroundImageKey) {
    allKeysToExport.add(clone.settings.customTheme.backgroundImageKey);
  }
  // From appearance map background (stored in state.meta)
  if (clone.state.appearance?.mapBgKey) {
    allKeysToExport.add(clone.state.appearance.mapBgKey);
  }

  // From custom icons – use the already-cached manifest instead of scanning all IDB keys.
  CUSTOM_ICON_MANIFEST.forEach(key => allKeysToExport.add(key));

  console.log(`Found ${allKeysToExport.size} unique image/blob keys to export:`, Array.from(allKeysToExport));

  // 2. Asynchronously get each file from IndexedDB and add it to the zip.
  const filePromises = Array.from(allKeysToExport).map(async (key) => {
    if (key) { // Safety check for null/undefined keys
      const blob = await idbGet(key);
      if (blob) {
        zip.file(key, blob);
      } else {
        console.warn(`Could not find blob for key "${key}" in IndexedDB.`);
      }
    }
  });

  // Wait for all files to be added to the zip object.
  await Promise.all(filePromises);
  console.log("Finished adding files to zip.");

  // 3. Add the main world.json file.
  zip.file('world.json', JSON.stringify(clone, null, 2));

  // 4. Attempt Streaming Export (File System Access API)
  const canStream = typeof window.showSaveFilePicker === 'function';

  if (canStream) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'TaleTrove Project', accept: { 'application/octet-stream': ['.trv', '.wbundle'] } }]
      });
      
      setLoadingState(true, "Generating Project...");
      let blob = await zip.generateAsync({ type: 'blob' });

      if (password) {
        const buf = await blob.arrayBuffer();
        const encrypted = await encryptData(new Uint8Array(buf), password);
        blob = new Blob([encrypted], { type: 'application/octet-stream' });
      }

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      showToast("Project exported successfully!");
      setLoadingState(false);
      console.log("Streaming project export complete.");
      return;
    } catch (err) {
      setLoadingState(false);
      if (err.name === 'AbortError') {
        console.log("Export cancelled by user.");
        return;
      }
      console.error("Streaming export failed, falling back to in-memory:", err);
      // Fall through to in-memory approach
    }
  }

  // 5. Fallback: Generate the final .wbundle file in memory and trigger the download.
  setLoadingState(true, password ? "Encrypting Project..." : "Generating Project...");
  const out = await zip.generateAsync({ type: 'blob', streamFiles: true });
  let finalContent = out;

  if (password) {
    console.log("Encrypting project (in-memory fallback)...");
    const buffer = await out.arrayBuffer();
    // encryptData now natively outputs the TEN2 format.
    const encrypted = await encryptData(new Uint8Array(buffer), password);
    finalContent = new Blob([encrypted], { type: 'application/octet-stream' });
  }

  const url = URL.createObjectURL(finalContent);
  const a = el('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setLoadingState(false);
  console.log("Project download initiated.");
}

function sanitizeForPlayer(full) {
  const clone = structuredClone(full);

  // 1. Filter out GM-only maps
  const playerMapIds = new Set(clone.state.maps.filter(m => m.visibleToPlayers).map(m => m.id));
  clone.state.maps = clone.state.maps.filter(m => m.visibleToPlayers);

  // 2. If the active map is GM-only, fall back to the first player-visible map so the
  //    bundle doesn't load into a permanent loading spinner.
  if (!playerMapIds.has(clone.state.activeMapId)) {
    clone.state.activeMapId = clone.state.maps[0]?.id || null;
  }

  // 3. Filter articles by visibility; atlas articles must also be on a visible map
  clone.state.articles = (clone.state.articles || [])
    .filter(a => {
      if (!a.visibleToPlayers) return false;
      if (a._silo === 'atlas' && !playerMapIds.has(a.mapId)) return false;
      return true;
    })
    .map(a => ({ ...a, blocks: (a.blocks || []).filter(b => b.visibleToPlayers) }));

  // Rebuild derived silo views on the clone
  clone.state.features    = clone.state.articles.filter(a => a._silo === 'atlas');
  clone.state.encyclopedia = clone.state.articles.filter(a => a._silo === 'lore');

  return clone;
}


function deleteEncyclopediaFolder(folderId) {
  const folder = state.folders.find(f => f.mapId == null && f.id === folderId);
  if (!folder) return;

  const entriesInFolder = state.encyclopedia.filter(e => e.folderId === folderId);

  const childFolders = state.folders.filter(f => f.mapId == null && f.parentFolderId === folderId);

  const onConfirm = () => {
    recordState();
    // Move entries to root
    entriesInFolder.forEach(e => { e.folderId = null; });
    // Move child folders to root
    childFolders.forEach(f => { f.parentFolderId = null; markEntityDirty('meta'); });
    // Remove the folder from the unified folders array
    state.folders = state.folders.filter(f => f.id !== folderId);

    showToast(`Folder "${folder.name}" deleted. Its contents were moved to the root.`);
    refreshEncyclopediaView();
    debouncedSave();
  };

  showConfirmationModal(
    `Delete folder "${folder.name}"?`,
    `This will not delete the ${entriesInFolder.length + childFolders.length} items inside. They will be moved to the root of the Encyclopedia.`,
    'Delete Folder',
    onConfirm
  );
}

function createNewEncyclopediaEntry() {
  recordState();

  const newEntry = {
    id: 'ent-' + uid(),
    _silo: 'lore',
    name: getUniqueName('New Entry', state.encyclopedia.map(e => e.name)),
    type: 'Character',
    mapId: state.activeMapId || null,
    tags: [],
    blocks: [],
    heroImageKey: null,
    iconClass: null,
    visibleToPlayers: true
  };

  state.articles.push(newEntry);
  syncArticleViews();
  markEntityDirty('article', newEntry.id);

  window.refreshAtlasTree?.();
  selectEncyclopediaEntry(newEntry.id);
  debouncedSave();
}

function createNewSession() {
  recordState();

  const sessions = state.encyclopedia.filter(e => (e.type || '').toLowerCase() === 'session');
  const maxNum = sessions.reduce((max, s) => Math.max(max, s.sessionData?.number || 0), 0);
  const nextNum = maxNum + 1;

  const newSession = {
    id: 'ent-' + uid(),
    _silo: 'lore',
    name: `Session ${nextNum}`,
    type: 'Session',
    tags: [],
    blocks: [],
    heroImageKey: null,
    iconClass: null,
    visibleToPlayers: false,
    sessionData: {
      number: nextNum,
      realDate: '',
      participants: ''
    }
  };

  state.articles.push(newSession);
  syncArticleViews();
  markEntityDirty('article', newSession.id);

  window.refreshSessionsView?.();
  selectEncyclopediaEntry(newSession.id);
  debouncedSave();
}

function syncMapBackground() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const theme = settings.customTheme;
  if (theme && theme.backgroundImageKey) {
    // If a custom background exists, make the map transparent
    mapEl.style.backgroundImage = 'none';
    mapEl.style.backgroundColor = 'transparent';
  } else {
    // Otherwise, clear the inline styles to let the default CSS take over
    mapEl.style.backgroundImage = '';
    mapEl.style.backgroundColor = '';
  }
}

function createEventFromDonjonNote(year, month, day, noteText) {
  recordState();
  const newEntry = {
    id: 'ent-' + uid(),
    _silo: 'lore',
    // Create a sensible default name from the note content
    name: noteText.length > 40 ? noteText.substring(0, 37) + '...' : noteText,
    type: 'Event',
    tags: ['donjon-import'], // A tag to identify the source
    blocks: [{
      blockId: 'blk-' + uid(),
      type: 'TextField',
      visibleToPlayers: true,
      data: {
        label: 'Notes',
        content: noteText
      }
    }],
    eventData: { year, month, day },
    visibleToPlayers: true
  };
  state.articles.push(newEntry);
  syncArticleViews();
  markEntityDirty('article', newEntry.id);
  debouncedSave();
  return newEntry; // Return the newly created entry
}

async function promptAndSetMapImage(mapId) {
  const fileInput = el('input', { type: 'file', accept: 'image/*' });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMapImage(mapId, file);
  });

  fileInput.click();
}

/**
 * Reads a user-provided CSS file and extracts only the allowed properties.
 * @param {string} cssText - The raw text content of the CSS file.
 * @returns {object} A sanitized object of CSS rules to be saved.
 */
function parseAndSanitizeCss(cssText) {
  const allowedRootProps = [
    '--bg', '--panel', '--text', '--muted', '--accent-orange', '--accent-magenta',
    '--border', '--card', '--toolbar-bg', '--tooltip-bg', '--tooltip-text',
    '--map-banner-text-shadow', '--map-banner-icon-filter',
    '--map-banner-text-color', '--map-banner-icon-color',
    '--gm', '--player', '--primary-btn-text', '--danger-btn-text', '--toolbar-icon-color',
    '--accent-orange-rgb',
    '--danger-rgb',
    '--callout-note-border',
    '--callout-note-bg',
    '--callout-note-title',
    '--callout-warning-border',
    '--callout-warning-bg',
    '--callout-warning-title'
  ];
  const allowedBodyProps = ['font-family'];

  const sanitized = { ':root': {}, 'body': {} };
  cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

  const rootMatch = cssText.match(/:root\s*\{([^}]+)\}/);
  if (rootMatch && rootMatch[1]) {
    rootMatch[1].split(';').forEach(line => {
      const parts = line.split(':');
      if (parts.length < 2) return;
      const prop = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      if (allowedRootProps.includes(prop)) sanitized[':root'][prop] = value;
    });
  }

  const bodyMatch = cssText.match(/body\s*\{([^}]+)\}/);
  if (bodyMatch && bodyMatch[1]) {
    bodyMatch[1].split(';').forEach(line => {
      const parts = line.split(':');
      if (parts.length < 2) return;
      const prop = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      if (allowedBodyProps.includes(prop)) sanitized['body'][prop] = value;
    });
  }
  return sanitized;
}

/**
 * Handles the uploaded theme files, saves them, and applies the new theme.
 * @param {File} imageFile - The background image file.
 * @param {File} cssFile - The custom CSS file.
 */
async function handleCustomThemeUpload(imageFile, cssFile) {
  recordState();
  settings.customTheme = settings.customTheme || {};

  // Handle image upload
  if (imageFile) {
    // Clean up old image from database
    if (settings.customTheme.backgroundImageKey) {
      await idbDelete(settings.customTheme.backgroundImageKey);
    }

    const processedFile = await processImageUpload(imageFile);

    // File objects inherit from Blob, so we can store them directly in IndexedDB
    // without reading into a string — avoids unnecessary lag.
    const newKey = 'bg-img-' + uid();
    await idbSet(newKey, processedFile);

    settings.customTheme.backgroundImageKey = newKey;
  }

  // Handle CSS upload
  if (cssFile) {
    // CSS files are small text, so reading them is fine
    const cssText = await cssFile.text();
    settings.customTheme.cssProperties = parseAndSanitizeCss(cssText);
  }

  await save();
  applyCustomTheme();
  showToast('Custom theme applied!');
}

/**
 * Updates the state of the theme toggle in the project actions menu.
 * Disables it if a custom theme is applied.
 */
function updateThemeToggleState() {
  const themeToggle = document.getElementById('themeToggleInMenu');
  if (!themeToggle) return;

  const isCustomTheme = !!settings.customTheme;
  themeToggle.disabled = isCustomTheme;

  const parentLi = themeToggle.closest('li.has-control');
  if (parentLi) {
    if (isCustomTheme) {
      parentLi.classList.add('disabled');
      parentLi.title = "Dark Mode is disabled while a custom theme is applied.";
    } else {
      parentLi.classList.remove('disabled');
      parentLi.title = "";
    }
  }
}

/**
 * Applies the saved custom theme to the document, or removes it if none exists.
 */
async function applyCustomTheme() {
  const existingStyleTag = document.getElementById('custom-theme-style');
  if (existingStyleTag) existingStyleTag.remove();

  document.body.style.backgroundImage = '';
  document.body.style.backgroundSize = '';
  document.body.style.backgroundPosition = '';
  document.body.style.backgroundAttachment = '';

  const theme = settings.customTheme;

  syncMapBackground(); // Call the new sync function
  updateThemeToggleState();

  if (!theme) return;

  if (theme.backgroundImageKey) {
    const url = await resolveImageUrl(theme.backgroundImageKey);
    if (url) {
      document.body.style.backgroundImage = `url('${url}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }

  if (theme.cssProperties) {
    let cssString = '';
    const rootProps = Object.entries(theme.cssProperties[':root'] || {});
    const bodyProps = Object.entries(theme.cssProperties['body'] || {});
    if (rootProps.length > 0) {
      cssString += '.theme-dark, .theme-light {\n';
      rootProps.forEach(([prop, value]) => { cssString += `  ${prop}: ${value};\n`; });
      cssString += '}\n';
    }
    if (bodyProps.length > 0) {
      cssString += 'body.theme-dark, body.theme-light {\n';
      bodyProps.forEach(([prop, value]) => { cssString += `  ${prop}: ${value};\n`; });
      cssString += '}\n';
    }
    if (cssString) {
      const styleTag = el('style', { id: 'custom-theme-style', innerHTML: cssString });
      document.head.appendChild(styleTag);
    }
  }
}

/**
 * Removes the custom theme and styles from the application.
 */
async function removeCustomTheme() {
  if (!settings.customTheme) return;
  recordState();
  if (settings.customTheme.backgroundImageKey) {
    await idbDelete(settings.customTheme.backgroundImageKey);
  }
  settings.customTheme = null;
  await save();
  applyCustomTheme(); // This will now remove the styles
  showToast('Custom theme removed.');
}

function updateFogBrushCursorSize(size) {
  const cursor = $('#fogBrushCursor');
  if (!cursor) return;
  cursor.style.width = `${size * 2}px`;
  cursor.style.height = `${size * 2}px`;
  const label = $('#fogBrushCursorLabel');
  if (label) label.textContent = `${size}px`;
}

function initEventListeners() {
  $('#toggleEncyclopediaEventsBtn').addEventListener('click', () => {
    showEncyclopediaEvents = !showEncyclopediaEvents; // Toggle the boolean state
    saveLS('showEncyclopediaEvents', showEncyclopediaEvents);

    // Re-render the active modal to apply the filter
    if (!$('#timelineModal').classList.contains('hidden')) {
      showGlobalTimeline();
    }
    if (!$('#calendarModal').classList.contains('hidden')) {
      showCalendarModal();
    }
  });
  // Timeline view-mode toggle
  // Delegated document click handler — see _initDocumentClickDelegate() below
  document.getElementById('timelineZoomInBtn')?.addEventListener('click',    () => { zoomTimeline('in');    applyTimelineZoom(); });
  document.getElementById('timelineZoomOutBtn')?.addEventListener('click',   () => { zoomTimeline('out');   applyTimelineZoom(); });
  document.getElementById('timelineZoomResetBtn')?.addEventListener('click', () => { zoomTimeline('reset'); applyTimelineZoom(); });

  $('#calendarBtn').addEventListener('click', showCalendarModal);
  $('#donjonCalendarFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => showAlertModal('Read Error', 'Could not read the calendar file. It may be in use or inaccessible.');
    reader.onload = (event) => {
      try {
        const calendarData = JSON.parse(event.target.result);

        // Basic validation to check if it's a Donjon file
        if (calendarData && calendarData.year_len && calendarData.n_months) {
          recordState(); // For undo/redo
          settings.donjonCalendar = calendarData;
          debouncedSave();
          populateCalendarSettings();
          showToast('Donjon calendar imported successfully!');
        } else {
          showAlertModal('Invalid Format', 'This does not appear to be a valid Donjon calendar file.');
        }
      } catch (err) {
        console.error("Failed to parse Donjon calendar JSON:", err);
        showAlertModal('Import Error', 'Failed to read calendar file. It may be corrupted.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Clear the input so the same file can be loaded again
  });

  $('#mapImageFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMapImage(targetMapIdForUpload || state.activeMapId, file);
    e.target.value = null;
  });

  $('#uploadAssetBtn')?.addEventListener('click', () => {
    $('#globalAssetUpload').click();
  });

  $('#globalAssetUpload')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    for (let file of files) {
      const originalName = file.name;
      file = await processImageUpload(file);
      const imageKey = 'img-' + uid();
      await idbSet(imageKey, file); // Save direct to DB
      state.assetNames = state.assetNames || {};
      state.assetNames[imageKey] = originalName;
    }
    markEntityDirty('meta');
    debouncedSave();

    showToast(`${files.length} assets uploaded.`);
    refreshAssetsView();
    e.target.value = null;
  });

  $('#searchImagesBtn')?.addEventListener('click', () => {
    if (typeof window.openImageSearchModal !== 'function') {
      showAlertModal('Image Search Unavailable', 'The image search module did not load.');
      return;
    }
    window.openImageSearchModal({
      title: 'Search Images',
      onPick: async (blob, meta) => {
        // Same pipeline as direct uploads, with attribution sidecar.
        const processed = await processImageUpload(blob);
        const imageKey = 'img-' + uid();
        await idbSet(imageKey, processed);
        state.assetNames = state.assetNames || {};
        state.assetNames[imageKey] = meta.title || 'Untitled';
        state.assetMeta = state.assetMeta || {};
        state.assetMeta[imageKey] = meta;
        markEntityDirty('meta');
        debouncedSave();
        showToast(`Saved “${meta.title}” to your library.`);
        refreshAssetsView();
      },
    });
  });
  $('#importUrlAssetBtn')?.addEventListener('click', () => {
    showInputModal('Import Image from URL', 'https://example.com/image.png', '', async (raw) => {
      const url = (raw || '').trim();
      if (!url) return;

      // Security: only http/https, no credentials
      let parsed;
      try { parsed = new URL(url); } catch {
        showAlertModal('Invalid URL', 'Please enter a valid URL starting with https:// or http://.');
        return;
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        showAlertModal('Invalid URL', 'Only https:// and http:// URLs are allowed.');
        return;
      }
      if (parsed.username || parsed.password) {
        showAlertModal('Invalid URL', 'URLs with embedded credentials are not allowed.');
        return;
      }

      setLoadingState(true, 'Fetching image…');
      try {
        const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`Server returned ${res.status}.`);

        const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
        if (!ct.startsWith('image/')) throw new Error('URL did not return an image (got: ' + (ct || 'unknown') + ').');

        const cl = parseInt(res.headers.get('content-length') || '0', 10);
        if (cl > MAX_BYTES) throw new Error('Image exceeds the 10 MB size limit.');

        // Stream with rolling size guard — defence against missing Content-Length
        const reader = res.body.getReader();
        const chunks = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > MAX_BYTES) { reader.cancel(); throw new Error('Image exceeds the 10 MB size limit.'); }
          chunks.push(value);
        }
        const blob = new Blob(chunks, { type: ct });

        const processed = await processImageUpload(blob);
        const imageKey = 'img-' + uid();
        await idbSet(imageKey, processed);
        state.assetNames = state.assetNames || {};
        state.assetNames[imageKey] = parsed.pathname.split('/').pop() || 'url-import';
        markEntityDirty('meta');
        debouncedSave();
        showToast('Image imported from URL.');
        refreshAssetsView();
      } catch (err) {
        const msg = err.name === 'TimeoutError'
          ? 'Request timed out. The server may be too slow or blocking external access.'
          : err.name === 'TypeError'
          ? 'Could not reach the URL. The server may be blocking cross-origin requests (CORS).'
          : err.message;
        showAlertModal('Import Failed', msg);
      } finally {
        setLoadingState(false);
      }
    });
  });

  // Helper used by the custom icon upload flow.
  async function saveCustomIcon(file, iconKey, feature, modal) {
    const reader = new FileReader();
    reader.onerror = () => showAlertModal('Read Error', 'Could not read the SVG file. It may be in use or inaccessible.');
    reader.onload = async (e_read) => {
      const clean = DOMPurify.sanitize(e_read.target.result, { USE_PROFILES: { svg: true } });
      const blob = new Blob([clean], { type: 'image/svg+xml' });
      // Evict stale blob URL before writing new one (handles icon replacement).
      if (window.evictCustomIconUrl) window.evictCustomIconUrl(iconKey);
      await idbSet(iconKey, blob);
      recordState();
      feature.iconClass = iconKey;
      render({ full: true });
      debouncedSave();
      await loadCustomAssets();
      if (modal && modal.populateGrid) await modal.populateGrid();
    };
    reader.readAsText(file);
  }

  $('#customIconFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const feature = window.currentTargetFeatureForIcon;
    const modal = $('#iconPickerModal');

    if (!file || !feature) return;

    // Reset value immediately so the same file can be picked again if needed,
    // and even if the following modal is cancelled.
    e.target.value = null;

    showInputModal('Name this Icon', 'Icon name', file.name.replace(/\.svg/i, ''), async (rawName) => {
      const sanitizedName = rawName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const iconKey = `ci-${sanitizedName}`;

      try {
        const existingIcon = await idbGet(iconKey);
        if (existingIcon) {
          showConfirmationModal(
            'Icon Already Exists',
            `An icon named "${iconKey}" already exists. Overwrite it?`,
            'Overwrite',
            async () => {
              await saveCustomIcon(file, iconKey, feature, modal);
            }
          );
        } else {
          await saveCustomIcon(file, iconKey, feature, modal);
        }
      } catch (err) {
        console.error("Failed to upload custom icon:", err);
      }
    });
  });

  const dropZones = [$('.map-wrap')];

  const handleFileDrop = async (file, dropTarget) => {
    // We only care about the first image file
    if (!file || !file.type.startsWith('image/')) {
      showToast('Invalid file type. Please drop an image.');
      return;
    }
    window.handleFileDrop = handleFileDrop;
    const reader = new FileReader();
    reader.onerror = () => showToast('Could not read the dropped file. It may be in use or inaccessible.');
    reader.onload = (e_read) => {
      const dataUrl = e_read.target.result;

      if (dropTarget.id === 'map') {
        // If dropped on the map, set it as the base map image.
        setMapImage(state.activeMapId, dataUrl);
        showToast('Map image updated.');
      } else if (dropTarget.id === 'infoPanelHero' || dropTarget.classList.contains('hero-image-preview')) {
        const item = window.currentTargetForHeroImage;
        if (item) {
          const blob = dataUrlToBlob(dataUrl);
          const imageKey = 'img-' + uid();
          idbSet(imageKey, blob).then(() => {
            state.assetNames = state.assetNames || {};
            state.assetNames[imageKey] = file.name;
            markEntityDirty('meta');
            recordState();
            item.heroImageKey = imageKey;

            // Re-render and refresh UIs depending on if it's an atlas feature or encyclopedia entry
            if (item.geometry) render(); // It's an atlas feature
            if ($('#infoPanel').classList.contains('is-visible')) {
                const type = item.geometry ? 'feature' : 'encyclopedia';
                showInfoPanel(item.id, type);
            }
            refreshAssetsView(true);
            debouncedSave();
            showToast('Hero image updated.');
          }).catch(e => { console.error('[worldbuilder] Hero image save failed:', e); showAlertModal('Save Error', 'Could not save the hero image.'); });
        }
      } else if (dropTarget.id === 'infoPanel' && selectedId) {
        // If dropped on the info panel, add it as a new Image block to the selected feature.
        const feature = state.features.find(f => f.id === selectedId);
        if (feature) {
          const blob = dataUrlToBlob(dataUrl);
          const imageKey = 'img-' + uid();
          idbSet(imageKey, blob).then(() => {
            state.assetNames = state.assetNames || {};
            state.assetNames[imageKey] = file.name;
            markEntityDirty('meta');
            const imageBlock = {
              blockId: 'blk-' + uid(),
              type: 'Image',
              visibleToPlayers: true,
              data: { src: imageKey, caption: '', size: 100 }
            };
            recordState();
            feature.blocks = feature.blocks || [];
            feature.blocks.push(imageBlock);
            showInfoPanel(selectedId);
            refreshAssetsView(true);
            debouncedSave();
            showToast('Image added to feature.');
          }).catch(e => { console.error('[worldbuilder] Image block save failed:', e); showAlertModal('Save Error', 'Could not save the image.'); });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  dropZones.forEach(zone => {
    if (!zone) return;

    // The target for the drop event is the #map div, not its wrapper
    const dropTarget = zone.classList.contains('map-wrap') ? $('#map') : zone;

    zone.addEventListener('dragover', (e) => {
      e.preventDefault(); // Always required to allow a drop
      // Only show the "Drop Image to Upload" overlay for actual file drags.
      // Encyclopedia entries and asset chips have their own handlers on #map.
      if (e.dataTransfer.types.includes('Files')) {
        zone.classList.add('drag-over');
      }
    });

    zone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');

      if (e.dataTransfer.files.length > 0) {
        handleFileDrop(e.dataTransfer.files[0], dropTarget);
      }
    });
  });
  $('#toggleFreeMoveBtn').addEventListener('click', () => toggleFreeMove());
  $('#heroImageFile').addEventListener('change', async (e) => {
    let file = e.target.files[0];
    // The target item (Feature or Encyclopedia Entry) is now passed via a global variable
    const targetItem = window.currentTargetForHeroImage || state.features.find(f => f.id === selectedId);

    if (!file || !targetItem) {
      e.target.value = null;
      window.currentTargetForHeroImage = null;
      return;
    }

    file = await processImageUpload(file);

    // This function now works for both item types
    openHeroCropper(file, targetItem);

    e.target.value = null; // Clear the input
    window.currentTargetForHeroImage = null; // Clear the global target
  });

function initUserChip() {
  const AVATAR_COLORS = [
    '#ff7a1a', '#e74c3c', '#e91e8c', '#9b59b6',
    '#3498db', '#1abc9c', '#2ecc71', '#f1c40f',
    '#16a085', '#8e44ad', '#c0392b', '#27ae60',
    '#2980b9', '#d35400', '#7f8c8d', '#34495e'
  ];

  if (!settings.userProfile) {
    settings.userProfile = { name: '', color: '#ff7a1a' };
  }

  const chip          = $('#userChip');
  const avatar        = $('#userAvatar');
  const avatarPreview = $('#userAvatarPreview');
  const popover       = $('#userChipPopover');
  const nameInput     = $('#userNameInput');
  const swatches      = $('#userColorSwatches');

  if (!chip) return;

  const updateChip = () => {
    const { name, color } = settings.userProfile;
    const display = name.trim() || 'Guest';
    const initial = display.charAt(0).toUpperCase();
    const safeColor = safeCssColor(color);
    avatar.textContent = initial;
    avatar.style.backgroundColor = safeColor;
    if (avatarPreview) {
      avatarPreview.textContent = initial;
      avatarPreview.style.backgroundColor = safeColor;
    }
    nameInput.value = name;
    swatches.querySelectorAll('.user-color-swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === color);
    });
  };

  AVATAR_COLORS.forEach(color => {
    const swatch = el('div', {
      class: 'user-color-swatch',
      'data-color': color,
      style: `background-color: ${safeCssColor(color)}`
    });
    swatch.onclick = () => {
      settings.userProfile.color = color;
      saveLS('worldSettings', settings);
      updateChip();
    };
    swatches.appendChild(swatch);
  });

  nameInput.oninput = () => {
    settings.userProfile.name = nameInput.value;
    saveLS('worldSettings', settings);
    updateChip();
  };

  chip.addEventListener('click', () => {
    const isOpen = !popover.classList.contains('hidden');
    if (isOpen) {
      popover.classList.add('hidden');
      return;
    }
    popover.classList.remove('hidden');
    setTimeout(() => {
      const closePopover = (e) => {
        if (!popover.contains(e.target) && !chip.contains(e.target)) {
          popover.classList.add('hidden');
          document.removeEventListener('click', closePopover, true);
        }
      };
      document.addEventListener('click', closePopover, true);
    }, 0);
  });

  popover.addEventListener('click', (e) => {
    const actionItem = e.target.closest('[data-action]');
    if (!actionItem) return;
    if (actionItem.dataset.action === 'drive-signout') {
      window.googleDrive?.signOut();
      popover.classList.add('hidden');
    }
  });

  updateChip();
}
window.initUserChip = initUserChip;

function setAppShellScaled(active) {
  document.body.classList.toggle('modal-open-scale', active);
}
window.setAppShellScaled = setAppShellScaled;

async function captureProjectThumbnail() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (!activeMap?.imageKey) return null;
  const url = await resolveImageUrl(activeMap.imageKey);
  if (!url) return null;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_W = 400, MAX_H = 225;
      const scale = Math.min(MAX_W / img.width, MAX_H / img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function saveRecentProject() {
  const thumbnail = await captureProjectThumbnail();
  const entry = {
    worldId: settings.worldId,
    name: settings.projectName || 'Untitled World',
    lastModified: new Date().toISOString(),
    thumbnailDataUrl: thumbnail
  };
  const recent = loadLS('recentProjects', []);
  // Deduplicate by both worldId and name — same bundle re-imported generates a new worldId each time
  const filtered = recent.filter(r => r.worldId !== entry.worldId && r.name !== entry.name);
  saveLS('recentProjects', [entry, ...filtered].slice(0, 6));
}

async function saveFullSnapshot(worldId) {
  if (typeof JSZip === 'undefined' || !worldId) return;
  try {
    const zip = new JSZip();
    zip.file('world.json', JSON.stringify({ settings, state }));
    const fileKeys = await idbGetAllKeys('files');
    await Promise.all(
      fileKeys
        .filter(k => !k.startsWith('recent-snapshot-'))
        .map(async k => {
          const blob = await idbGet(k);
          if (blob) zip.file(k, blob);
        })
    );
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
    await idbSet(`recent-snapshot-${worldId}`, blob);
  } catch (e) {
    console.warn('[Snapshot] Failed to save world snapshot:', e);
  }
}

async function restoreWorldSnapshot(worldId) {
  const blob = await idbGet(`recent-snapshot-${worldId}`);
  if (!blob) {
    showAlertModal('Snapshot Unavailable', 'The full snapshot for this world was not found. Re-import the original .trv file to continue working on it.');
    return;
  }
  setLoadingState(true, 'Restoring World...');
  // Save the current outgoing world before restoring
  await saveFullSnapshot(settings.worldId);
  await saveRecentProject();
  // Feed the snapshot blob directly into the existing import pipeline
  window._handleImportFile(new File([blob], 'snapshot.trv', { type: 'application/zip' }));
}

function renderRecentProjects() {
  const section = $('#hubRecentSection');
  const grid = $('#hubRecentGrid');
  if (!section || !grid) return;

  const recent = loadLS('recentProjects', []);
  const others = recent.filter(r => r.worldId !== settings.worldId);

  if (others.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  grid.innerHTML = '';

  others.forEach(entry => {
    const dateStr = new Date(entry.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const card = el('div', { class: 'hub-recent-card', title: `Open "${entry.name}"` });
    const thumb = el('div', { class: 'hub-recent-thumb' });
    if (entry.thumbnailDataUrl && /^data:image\/[a-z]+;base64,/.test(entry.thumbnailDataUrl)) {
      thumb.style.backgroundImage = `url('${entry.thumbnailDataUrl}')`;
    }
    const name = el('div', { class: 'hub-recent-name', text: entry.name });
    const date = el('div', { class: 'hub-recent-date', text: dateStr });
    const info = el('div', { class: 'hub-recent-info' }, [name, date]);
    card.append(thumb, info);
    card.addEventListener('click', () => {
      showConfirmationModal(
        `Open "${entry.name}"?`,
        'Your current world will be saved as a recent entry and can be restored later.',
        'Open World',
        () => restoreWorldSnapshot(entry.worldId)
      );
    });
    grid.append(card);
  });
}

  $('#brandLogo').addEventListener('click', () => {
    const projectModal = document.getElementById('projectActionsModal');
    if (projectModal) {
      if (window.showHubOverview) window.showHubOverview();
      const nameEl = $('#hubCurrentProjectName');
      if (nameEl) nameEl.textContent = settings.projectName || 'Untitled World';
      const sidebarNameEl = $('#hubSidebarWorldName');
      if (sidebarNameEl) sidebarNameEl.textContent = settings.projectName || 'My World';

      const catToggle = $('#catToggleInHub');
      if (catToggle) {
        catToggle.checked = showCats;
      }

      // Show modal immediately — async work populates in the background
      projectModal.classList.remove('hidden');

      const heroEl = $('#hubCurrentProjectHero');
      if (heroEl) {
        heroEl.style.backgroundImage = 'none';
        const activeMap = state.maps.find(m => m.id === state.activeMapId);
        if (activeMap && activeMap.imageKey) {
          resolveImageUrl(activeMap.imageKey).then(url => {
            if (url) heroEl.style.backgroundImage = `url('${url}')`;
          }).catch(() => {});
        }
      }

      const sizeEl = $('#hubProjectSize');
      if (sizeEl) {
        sizeEl.textContent = 'Calculating usage...';
        calculateProjectSize().then(bytes => {
          sizeEl.textContent = `Project Usage: ${formatBytes(bytes)}`;
        }).catch(() => { sizeEl.textContent = 'Project Usage: unavailable'; });
      }

      saveRecentProject().then(() => renderRecentProjects()).catch(e => console.error('[worldbuilder] saveRecentProject failed:', e));
    }
  });

  $('#imageBlockUploadFile').addEventListener('change', async (e) => {
    let file = e.target.files[0];
    if (!file || !window.targetBlockForUpload) return;

    try {
      const originalName = file.name;
      file = await processImageUpload(file);
      const imageKey = 'img-' + uid();
      await idbSet(imageKey, file);
      state.assetNames = state.assetNames || {};
      state.assetNames[imageKey] = originalName;
      markEntityDirty('meta');

      updateBlockData(selectedId, window.targetBlockForUpload, { src: imageKey });
      window.targetBlockForUpload = null;
      refreshAssetsView(true);
    } catch (err) {
      console.error("Failed to upload block image:", err);
    }
    e.target.value = null;
  });

  // (project-name breadcrumb — handled in delegated handler below)

  const mapContainer = $('#map');
  if (mapContainer && map) {
    mapContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      // Encyclopedia entries are dragged by SortableJS which locks effectAllowed to 'move'.
      // Use 'move' for those so the browser accepts the drop. Files and asset chips use 'copy'.
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-taleprove-entry')
        ? 'move'
        : 'copy';
    });

    mapContainer.addEventListener('drop', (e) => {
      e.preventDefault();

      const assetKey = e.dataTransfer.getData("application/x-taleprove-asset");
      const entryId = e.dataTransfer.getData("application/x-taleprove-entry");

      if (assetKey) {
        const latlng = map.containerPointToLatLng([e.clientX, e.clientY]);
        recordState();
        const newFeat = addFeatureFromLayer({ toGeoJSON: () => L.marker(latlng).toGeoJSON() }, 'point');
        newFeat.title = "New Image Feature";
        newFeat.heroImageKey = assetKey;
        render({ full: true });
        debouncedSave();
        selectFeature(newFeat.id);
        showToast("Feature created from Asset");
      }
      else if (entryId) {
        const latlng = map.containerPointToLatLng([e.clientX, e.clientY]);
        createLinkedPinFromEntry(entryId, latlng);
      }
    });
  }
  
    // ([data-action="edit"] — handled in delegated handler below)
  
    if (map) {
      map.on('draw:editmove', function (e) {
        const layer = e.layer;
        if (layer && layer.feature) {
          const newGeoJSON = layer.toGeoJSON();
          layer.feature.geojson.geometry = newGeoJSON.geometry;
          updateLabelsFor(layer.feature.id, layer.getLatLng());
          markEntityDirty('article', layer.feature.id);
          debouncedSave();
        }
      });

      map.on('draw:edited', function (e) {
        e.layers.eachLayer(function (layer) {
          const feature = state.features.find(f => f.id === layer.feature.id);
          if (feature) {
            const newGeoJSON = layer.toGeoJSON();
            feature.geojson.geometry = newGeoJSON.geometry;
            markEntityDirty('article', feature.id);
          }
        });
        render({ full: true });
        debouncedSave();
      });
    }
    // (.generate-btn — handled in delegated handler below)

  $('#notificationBellBtn').addEventListener('click', () => {
    const newsModal = $('#newsModal');
    if (window.openSideSheet) window.openSideSheet(newsModal);
    else newsModal.classList.remove('hidden');
    $('#newUpdateChip').classList.add('hidden');
    if (LATEST_NEWS_VERSION) {
      saveLS('lastSeenNewsVersion', LATEST_NEWS_VERSION);
    }
  });

  if (map) {
    map.on('draw:editstart', function (e) {
      recordState();
      cancelHasBeenClicked = false;
      allLayers.eachLayer(layer => {
        if (layer.feature && layer.feature.geometry === 'text' && layer.getElement) {
          const el = layer.getElement();
          el.classList.add('text-label-is-editing');
        }
      });
    });

    map.on('click', (e) => {
      if (uiMode === 'pointer') {
        deselectAll(); // Use our new, reliable function
        const existingTooltip = $('.leaflet-draw-tooltip');
        if (existingTooltip) {
          existingTooltip.classList.remove('visible');
        }
      }
    });
  }

  let _gridSessionRecorded = false;

  $('#gridSettingsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const popover = $('#gridSettingsPopover');
    popover.classList.toggle('hidden');
    _gridSessionRecorded = false;
    if (!popover.classList.contains('hidden')) {
      const activeMap = state.maps.find(m => m.id === state.activeMapId);
      if (activeMap) {
        $('#gridEnableChk').checked = activeMap.grid.enabled;
        $('#gridSizeXIn').value = activeMap.grid.sizeX || activeMap.grid.size || 50;
        $('#gridSizeYIn').value = activeMap.grid.sizeY || activeMap.grid.size || 50;
        $('#gridWidthIn').value = activeMap.grid.width || 1;
        $('#gridColorIn').value = activeMap.grid.color;
        $('#gridOpacityIn').value = activeMap.grid.opacity;
        $('#gridOpacityVal').textContent = parseFloat(activeMap.grid.opacity).toFixed(2);
        $('#gridOffsetXIn').value = activeMap.grid.offsetX || 0;
        $('#gridOffsetYIn').value = activeMap.grid.offsetY || 0;
      }
    }
  });

  const updateGridFromUI = () => {
    const activeMap = state.maps.find(m => m.id === state.activeMapId);
    if (!activeMap) return;

    if (!_gridSessionRecorded) { recordState(); _gridSessionRecorded = true; }
    activeMap.grid.enabled = $('#gridEnableChk').checked;
    activeMap.grid.sizeX = parseInt($('#gridSizeXIn').value, 10) || 50;
    activeMap.grid.sizeY = parseInt($('#gridSizeYIn').value, 10) || 50;
    activeMap.grid.width = parseInt($('#gridWidthIn').value, 10) || 1;
    activeMap.grid.color = $('#gridColorIn').value;
    activeMap.grid.opacity = parseFloat($('#gridOpacityIn').value);
    $('#gridOpacityVal').textContent = activeMap.grid.opacity.toFixed(2);
    activeMap.grid.offsetX = parseInt($('#gridOffsetXIn').value, 10) || 0;
    activeMap.grid.offsetY = parseInt($('#gridOffsetYIn').value, 10) || 0;

    markEntityDirty('map', activeMap.id);
    window.updateGridLayer();
    debouncedSave();
  };

  $('#gridEnableChk').addEventListener('change', updateGridFromUI);
  $('#gridSizeXIn').addEventListener('input', debounce(updateGridFromUI, 200));
  $('#gridSizeYIn').addEventListener('input', debounce(updateGridFromUI, 200));
  $('#gridWidthIn').addEventListener('input', debounce(updateGridFromUI, 200));
  $('#gridColorIn').addEventListener('input', debounce(updateGridFromUI, 200));
  $('#gridOpacityIn').addEventListener('input', updateGridFromUI);
  $('#gridOffsetXIn').addEventListener('input', debounce(updateGridFromUI, 200));
  $('#gridOffsetYIn').addEventListener('input', debounce(updateGridFromUI, 200));

  $('#gridResetBtn').addEventListener('click', () => {
    const activeMap = state.maps.find(m => m.id === state.activeMapId);
    if (!activeMap) return;
    recordState();
    _gridSessionRecorded = true;
    activeMap.grid = { enabled: false, size: 50, sizeX: 50, sizeY: 50, color: '#ffffff', opacity: 0.5, width: 1, offsetX: 0, offsetY: 0 };
    $('#gridEnableChk').checked = false;
    $('#gridSizeXIn').value = 50;
    $('#gridSizeYIn').value = 50;
    $('#gridWidthIn').value = 1;
    $('#gridColorIn').value = '#ffffff';
    $('#gridOpacityIn').value = 0.5;
    $('#gridOpacityVal').textContent = '0.50';
    $('#gridOffsetXIn').value = 0;
    $('#gridOffsetYIn').value = 0;
    markEntityDirty('map', activeMap.id);
    window.updateGridLayer();
    debouncedSave();
  });

  $('#gridSetOriginBtn').addEventListener('click', () => {
    $('#gridSettingsPopover').classList.add('hidden');
    document.querySelector('.map-wrap').classList.add('cursor-set-origin');
    map.once('click', (e) => {
      document.querySelector('.map-wrap').classList.remove('cursor-set-origin');
      const activeMap = state.maps.find(m => m.id === state.activeMapId);
      if (!activeMap) return;
      const origin = map.getPixelOrigin();
      const pt = map.latLngToContainerPoint(e.latlng);
      const wx = origin.x + pt.x;
      const wy = origin.y + pt.y;
      const sx = activeMap.grid.sizeX || activeMap.grid.size || 50;
      const sy = activeMap.grid.sizeY || activeMap.grid.size || 50;
      recordState();
      activeMap.grid.offsetX = ((wx % sx) + sx) % sx;
      activeMap.grid.offsetY = ((wy % sy) + sy) % sy;
      markEntityDirty('map', activeMap.id);
      if (window.updateGridLayer) window.updateGridLayer();
      debouncedSave();
    });
  });

  $('#gridAlignBtn').addEventListener('click', () => {
    $('#gridSettingsPopover').classList.add('hidden');
    gridAlignPhase = 1;
    gridAlignFirstWorldPt = null;
    const hint = $('#gridAlignHint');
    hint.classList.remove('hidden');
    $('#gridAlignHintText').textContent = 'Click the first corner of a grid cell';
    document.querySelector('.map-wrap').classList.add('cursor-set-origin');
    map.on('click', gridAlignClickHandler);
  });

  $('#gridAlignCancelBtn').addEventListener('click', cancelGridAlign);

  $('#timelineBtn').addEventListener('click', showGlobalTimeline);

  $('#relationalGraphBtn').addEventListener('click', () => window.openRelationalGraph?.());
  $('#familyTreeBtn').addEventListener('click', () => window.openFamilyTree?.());

  $('#installPwaBtn')?.addEventListener('click', async () => {
    if (!_pwaInstallPrompt) return;
    await _pwaInstallPrompt.prompt();
    const { outcome } = await _pwaInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      _pwaInstallPrompt = null;
      $('#installPwaBtn')?.classList.add('hidden');
    }
  });

  const bugReportModal = $('#bugReportModal');
  $('#bugReportBtn')?.addEventListener('click', () => {
    if (bugReportModal?.classList.contains('is-open')) {
      if (window.closeSideSheet) window.closeSideSheet(bugReportModal);
    } else {
      if (window.openBugReporter) window.openBugReporter();
    }
  });

  const helpModal = $('#helpModal');
  $('#helpBtn').addEventListener('click', () => {
    if (helpModal.classList.contains('is-open')) {
      if (window.closeSideSheet) window.closeSideSheet(helpModal);
      else helpModal.classList.add('hidden');
    } else {
      if (window.openSideSheet) window.openSideSheet(helpModal);
      else helpModal.classList.remove('hidden');
    }
  });

  $('#helpTourBtn')?.addEventListener('click', () => {
    if (window.closeSideSheet) window.closeSideSheet(helpModal);
    else helpModal.classList.add('hidden');
    startTutorial();
  });
  const fullscreenBtn = $('#fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      fullscreenBtn.classList.toggle('is-fullscreen', isFs);
      fullscreenBtn.setAttribute('aria-pressed', String(isFs));
    });
  }

  // Overlay menu popover — auto-close on mouseleave (wired once after init)
  let _overlayHideTimer = null;
  function _overlayStartHide() { _overlayHideTimer = setTimeout(hideOverlayMenuPopover, 400); }
  function _overlayCancelHide() { clearTimeout(_overlayHideTimer); }
  const addImageModal = $('#addImageModal');
  if (addImageModal) {
    const closeModal = () => addImageModal.classList.add('hidden');
    addImageModal.querySelector('.modal-close').onclick = closeModal;
    addImageModal.addEventListener('click', (e) => { if (e.target === addImageModal) closeModal(); });

    $('#uploadImageBtn').addEventListener('click', () => {
      $('#imageUploadFile').click();
      closeModal();
    });
    const imageUrlModal = $('#imageUrlModal');
    if (imageUrlModal) {
      const closeUrlModal = () => imageUrlModal.classList.add('hidden');
      const imageUrlInput = imageUrlModal.querySelector('#imageUrlInput');

      imageUrlModal.querySelector('.modal-close').onclick = closeUrlModal;
      $('#cancelImageUrlBtn').addEventListener('click', closeUrlModal);

      imageUrlModal.addEventListener('click', (e) => {
        if (e.target === imageUrlModal) closeUrlModal();
      });

      const submitUrl = () => {
        const url = imageUrlInput.value;
        if (url && url.trim()) {
          const f = state.features.find(x => x.id === selectedId);
          if (f) {
            recordState();
            f.images = f.images || [];
            f.images.push(url.trim());
            render();
            debouncedSave();
          }
        }
        closeUrlModal();
      };

      $('#submitImageUrlBtn').addEventListener('click', submitUrl);
      imageUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitUrl();
        }
      });
    }
    $('#addImageFromUrlBtn').addEventListener('click', () => {
      addImageModal.classList.add('hidden');
      const urlModal = $('#imageUrlModal');
      urlModal.classList.remove('hidden');
      urlModal.querySelector('#imageUrlInput').focus();
      urlModal.querySelector('#imageUrlInput').value = '';
    });
  }
  const imageUploadInput = $('#imageUploadFile');
  if (imageUploadInput) {
    imageUploadInput.addEventListener('change', async (e) => {
      let file = e.target.files[0];
      if (!file || !selectedId) return;

      const f = state.features.find(x => x.id === selectedId);
      if (!f) return;

      try {
        const originalName = file.name;
        file = await processImageUpload(file);
        const imageKey = 'img-' + uid();

        await idbSet(imageKey, file);
        state.assetNames = state.assetNames || {};
        state.assetNames[imageKey] = originalName;
        markEntityDirty('meta');
        recordState();
        f.images = f.images || [];
        f.images.push(imageKey);
      } catch (err) {
        console.error("Failed to upload image:", err);
        showAlertModal('Upload Failed', 'Image upload failed. The file may be corrupted or in an unsupported format.');
      }
      e.target.value = null;
    });
  }

  document.body.addEventListener('dblclick', e => {
    if (e.target.closest('#projectNameBreadcrumb')) {
      e.preventDefault();
      e.stopPropagation();
      const projectNameEl = document.getElementById('projectNameBreadcrumb');
      const nameSpan = projectNameEl.querySelector('.breadcrumb-world-name');
      const currentName = nameSpan ? nameSpan.textContent : projectNameEl.textContent;
      const inputEl = el('input', { type: 'text', value: currentName, class: 'project-name-input' });
      projectNameEl.style.display = 'none';
      projectNameEl.parentNode.insertBefore(inputEl, projectNameEl);
      inputEl.focus();
      inputEl.select();
      const saveAndSwitch = () => {
        const newName = inputEl.value.trim();
        if (newName && newName !== currentName) {
          recordState();
          settings.projectName = newName;
          render();
          debouncedSave();
        }
        inputEl.remove();
        projectNameEl.style.display = '';
      };
      inputEl.addEventListener('blur', saveAndSwitch);
      inputEl.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Enter') saveAndSwitch();
        else if (keyEvent.key === 'Escape') { inputEl.remove(); projectNameEl.style.display = ''; }
      });
      return;
    }

    const mapItemDiv = e.target.closest('.map-row');
    const featureItemDiv = e.target.closest('.feature-row');
    const encyclopediaItemDiv = e.target.closest('.encyclopedia-item');

    if (e.target.closest('button')) {
      return;
    }

    if (mapItemDiv) {
      e.preventDefault();
      e.stopPropagation();

      const mapNameSpan = mapItemDiv.querySelector('.tree-label');
      if (!mapNameSpan) return;

      const mapId = mapItemDiv.parentNode.dataset.mapId;
      const currentName = mapNameSpan.textContent;

      const inputEl = el('input', {
        type: 'text',
        value: currentName,
        class: 'inline-edit-input',
        style: 'padding: 0.25rem 0.5rem; font-size: 14px; background: var(--bg); border: 1px solid var(--accent-magenta);'
      });

      mapNameSpan.style.display = 'none';
      mapItemDiv.prepend(inputEl);
      inputEl.focus();
      inputEl.select();

      let hasBeenHandled = false;

      const saveAndSwitch = () => {
        if (hasBeenHandled) return;
        hasBeenHandled = true;

        const newName = inputEl.value.trim();
        if (newName && newName !== currentName) {
          recordState();
          const map = state.maps.find(m => m.id === mapId);
          if (map) {
            map.name = newName;
            render({ full: true });
            debouncedSave();
          }
        } else {
          inputEl.remove();
          mapNameSpan.style.display = '';
        }
      };

      inputEl.addEventListener('blur', saveAndSwitch);

      inputEl.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Enter') {
          inputEl.blur();
        } else if (keyEvent.key === 'Escape') {
          if (hasBeenHandled) return;
          hasBeenHandled = true;
          inputEl.remove();
          mapNameSpan.style.display = '';
        }
      });

    } else if (featureItemDiv) {
      e.preventDefault();
      e.stopPropagation();

      const featureNameSpan = featureItemDiv.querySelector('.tree-label');
      if (!featureNameSpan) return;

      const featureId = featureItemDiv.dataset.fid;
      if (!featureId) return;

      const feature = state.features.find(f => f.id === featureId);
      if (!feature) return;

      const currentName = feature.title || '';

      const inputEl = el('input', {
        type: 'text',
        value: currentName,
        class: 'inline-edit-input',
        style: 'padding: 0.25rem 0.5rem; font-size: 14px; background: var(--bg); border: 1px solid var(--accent-orange);'
      });

      featureNameSpan.style.display = 'none';
      featureItemDiv.prepend(inputEl);
      inputEl.focus();
      inputEl.select();

      let hasBeenHandled = false;

      const saveAndSwitch = () => {
        if (hasBeenHandled) return;
        hasBeenHandled = true;

        const newName = inputEl.value.trim();
        if (newName && newName !== currentName) {
          recordState();
          feature.title = newName;
          if (feature.geometry === 'text') {
            feature.text = newName;
          }
          render({ full: true });
          debouncedSave();
        } else {
          inputEl.remove();
          featureNameSpan.style.display = '';
        }
      };

      inputEl.addEventListener('blur', saveAndSwitch);

      inputEl.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Enter') {
          inputEl.blur();
        } else if (keyEvent.key === 'Escape') {
          if (hasBeenHandled) return;
          hasBeenHandled = true;
          inputEl.remove();
          featureNameSpan.style.display = '';
        }
      });
    } else if (encyclopediaItemDiv) {
      e.preventDefault();
      e.stopPropagation();

      const entryNameSpan = encyclopediaItemDiv.querySelector('.entry-name');
      if (!entryNameSpan) return;

      const entryId = encyclopediaItemDiv.dataset.entryId;
      if (!entryId) return;

      const entry = state.encyclopedia.find(en => en.id === entryId);
      if (!entry) return;

      const currentName = entry.name || '';

      const inputEl = el('input', {
        type: 'text',
        value: currentName,
        class: 'inline-edit-input',
        style: 'padding: 0.25rem 0.5rem; font-size: 14px; background: var(--bg); border: 1px solid var(--accent-cyan);'
      });

      entryNameSpan.style.display = 'none';
      encyclopediaItemDiv.prepend(inputEl);
      inputEl.focus();
      inputEl.select();

      let hasBeenHandled = false;

      const saveAndSwitch = () => {
        if (hasBeenHandled) return;
        hasBeenHandled = true;

        const newName = inputEl.value.trim();
        inputEl.remove();
        entryNameSpan.style.display = '';

        if (newName && newName !== currentName) {
          recordState();
          entry.name  = newName;
          entry.title = newName;
          markEntityDirty('article', entryId);
          debouncedSave();
          entryNameSpan.textContent = newName;
          // Also update the peek/article panel nameSpan if it's showing this entry
          const peekNameSpan = document.querySelector(`#infoPanel h3 [contenteditable]`);
          if (peekNameSpan && (selectedEncyclopediaEntryId === entryId)) {
            peekNameSpan.textContent = newName;
          }
        }
      };

      inputEl.addEventListener('blur', saveAndSwitch);

      inputEl.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Enter') {
          inputEl.blur();
        } else if (keyEvent.key === 'Escape') {
          if (hasBeenHandled) return;
          hasBeenHandled = true;
          inputEl.remove();
          entryNameSpan.style.display = '';
        }
      });
    }
  });

  const projectModal = document.getElementById('projectActionsModal');
  if (projectModal) {

    const themeToggle = projectModal.querySelector('#themeToggleInMenu');
    const catToggle = projectModal.querySelector('#catToggleInMenu');
    const closeModal = () => {
      projectModal.classList.add('hidden');
    };    if (themeToggle) themeToggle.checked = siteTheme === 'dark';
    if (catToggle) catToggle.checked = showCats;

    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        closeModal();
        return;
      }

      if (e.target.closest('.switch')) return;

      const actionItem = e.target.closest('[data-action]');
      if (actionItem) {
        const action = actionItem.dataset.action;
        if (action === 'new') { handleNewProject(); closeModal(); }
        else if (action === 'save' || action === 'export') { handleSaveProject(); closeModal(); }
        else if (action === 'load') { $('#importFile').click(); closeModal(); }
        else if (action === 'export-player') { handleExportPlayer(); closeModal(); }
        else if (action === 'generalSettings') window.openSettingsHub('general');
        else if (action === 'calendarSettings') window.openSettingsHub('calendar');
        else if (action === 'diceSettings') window.openSettingsHub('dice');
        else if (action === 'themeSettings') window.openSettingsHub('theme');
        else if (action === 'aboutSettings') window.openSettingsHub('about');
        else if (action === 'drive-signin')  { window.googleDrive?.signIn(); }
        else if (action === 'drive-signout') { window.googleDrive?.signOut(); }
        else if (action === 'drive-save')    { handleDriveSave(); }
        else if (action === 'drive-open')      { window.openDriveFilePicker(); }
        else if (action === 'obsidian-import') { window.openObsidianImportModal(); }
      }
    });

    window.addEventListener('keydown', (e) => { 
      if (e.key === 'Escape' && !projectModal.classList.contains('hidden')) {
        closeModal(); 
      }
    });
  }






  $('#overlayImageFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => showAlertModal('Read Error', 'Could not read the overlay image file.');
    reader.onload = () => setOverlayImage(reader.result);
    reader.readAsDataURL(file);
  });

  $('#overlayOpacity').addEventListener('mousedown', () => recordState());
  $('#overlayOpacity').addEventListener('input', e => {
    const activeMap = state.maps.find(m => m.id === state.activeMapId) || state.maps[0];
    setOverlayOpacity(parseFloat(e.target.value), activeMap);
  });

  $('#fitBtn').addEventListener('click', () => {
    const activeMap = state.maps.find(m => m.id === state.activeMapId) || state.maps[0];
    if (map) map.fitBounds([[0, 0], [activeMap.height, activeMap.width]]);
  });

  function openOverlayMenuPopover(triggerBtn) {
    const popover = $('#overlayMenuPopover');
    const isHidden = popover.classList.toggle('hidden');
    ['#overlayMenuBtn', '#overlayMenuBtnFullscreen'].forEach(id => {
      const b = $(id);
      if (b) b.setAttribute('aria-expanded', String(!isHidden));
    });
    if (!isHidden) {
      _overlayCancelHide();
      const btnRect = triggerBtn.getBoundingClientRect();
      const wrapRect = $('.map-wrap').getBoundingClientRect();
      const popoverHalfWidth = 100;
      const edgePad = 8;
      const rawCenter = btnRect.left - wrapRect.left + btnRect.width / 2;
      const maxLeft = wrapRect.width - popoverHalfWidth * 2 - edgePad;
      popover.style.left = `${Math.min(rawCenter, maxLeft)}px`;
      popover.style.transform = 'translateX(-50%)';
      const spaceBelow = window.innerHeight - btnRect.bottom;
      if (spaceBelow > 160) {
        popover.style.top = `${btnRect.bottom - wrapRect.top + 8}px`;
        popover.style.bottom = '';
      } else {
        popover.style.top = 'auto';
        popover.style.bottom = `${wrapRect.bottom - btnRect.top + 8}px`;
      }
    }
  }

  ['#overlayMenuBtn', '#overlayMenuBtnFullscreen'].forEach(id => {
    const btn = $(id);
    if (!btn) return;
    btn.addEventListener('click', (e) => { e.stopPropagation(); openOverlayMenuPopover(btn); });
    btn.addEventListener('mouseenter', _overlayCancelHide);
    btn.addEventListener('mouseleave', _overlayStartHide);
  });

  const _overlayPopover = $('#overlayMenuPopover');
  _overlayPopover.addEventListener('mouseenter', _overlayCancelHide);
  _overlayPopover.addEventListener('mouseleave', _overlayStartHide);

  $('#centerOnSelectionBtn').addEventListener('click', () => { if (selectedId) navigateToFeature(selectedId) });

  ['toggleFogBtn', 'toggleFogBtnFullscreen'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const activeMap = state.maps.find(m => m.id === state.activeMapId);
      const popover = $('#fogControlsPopover');
      if (activeMap?.fog?.enabled && popover && popover.classList.contains('hidden')) {
        // Fog is on but popover was dismissed — reopen it
        showFogPopover(btn);
      } else {
        toggleFog();
      }
    });
  });

  $('#togglePinsBtnFullscreen')?.addEventListener('click', (e) => {
    if (!window.map || !window.allLayers) return;
    const btn = e.currentTarget;
    const willShow = !window.map.hasLayer(window.allLayers);
    if (willShow) {
      window.map.addLayer(window.allLayers);
      if (window.labelLayer && !window.map.hasLayer(window.labelLayer)) window.map.addLayer(window.labelLayer);
    } else {
      if (window.map.hasLayer(window.allLayers)) window.map.removeLayer(window.allLayers);
      if (window.labelLayer && window.map.hasLayer(window.labelLayer)) window.map.removeLayer(window.labelLayer);
    }
    btn.classList.toggle('active-toggle', willShow);
    btn.setAttribute('aria-pressed', String(willShow));
    btn.setAttribute('data-tooltip', willShow ? 'Hide Pins' : 'Show Pins');
    btn.setAttribute('aria-label', willShow ? 'Hide Pins' : 'Show Pins');
  });
    $('#toggleLabelsBtn').addEventListener('click', (e) => {
      settings.labelsVisible = !settings.labelsVisible;
      const btn = e.currentTarget;
      btn.classList.toggle('active-toggle', settings.labelsVisible);
      btn.setAttribute('aria-pressed', String(settings.labelsVisible));
      btn.setAttribute('data-tooltip', settings.labelsVisible ? 'Hide Name Labels' : 'Show Name Labels');
      btn.setAttribute('aria-label', settings.labelsVisible ? 'Hide Name Labels' : 'Show Name Labels');
      markEntityDirty('meta');
      debouncedSave();
      syncAllLayers();
    });
  [
    { id: '#filterPinBtn',  key: 'pins',  label: 'Pins' },
    { id: '#filterAreaBtn', key: 'areas', label: 'Areas' },
    { id: '#filterLineBtn', key: 'lines', label: 'Lines' },
    { id: '#filterTextBtn', key: 'text',  label: 'Text Labels' },
  ].forEach(({ id, key, label }) => {
    $(id)?.addEventListener('click', (e) => {
      window.filterState[key] = !window.filterState[key];
      const btn = e.currentTarget;
      btn.classList.toggle('active-toggle', window.filterState[key]);
      btn.setAttribute('aria-pressed', String(window.filterState[key]));
      const tooltip = window.filterState[key] ? `Hide ${label}` : `Show ${label}`;
      btn.setAttribute('data-tooltip', tooltip);
      btn.setAttribute('aria-label', tooltip);
      syncAllLayers();
    });
  });

  $('#fogOpacitySlider').addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    const activeMap = state.maps.find(m => m.id === state.activeMapId);
    if (activeMap && activeMap.fog) {
      activeMap.fog.opacity = val;
      const fl = window.getFogLayer();
      if (fl) fl.setOpacity(val);
      debouncedSave();
    }
  });

  const updateBrushSize = (val) => {
    const size = parseInt(val, 10);
    const activeMap = state.maps.find(m => m.id === state.activeMapId);
    if (activeMap && activeMap.fog) {
      activeMap.fog.brushSize = size;
      $('#fogBrushSizeSlider').value = size;
      $('#fogBrushSizeInput').value = size;
      const fl = window.getFogLayer();
      if (fl) fl.setBrushSize(size);
      updateFogBrushCursorSize(size);
      debouncedSave();
    }
  };

  $('#fogBrushSizeSlider').addEventListener('input', e => updateBrushSize(e.target.value));
  $('#fogBrushSizeInput').addEventListener('change', e => updateBrushSize(e.target.value));

  // Fog brush cursor — follow mouse over the map
  const _mapEl = $('#map');
  if (_mapEl) {
    _mapEl.addEventListener('mousemove', (e) => {
      if (window.uiMode !== 'fog') return;
      const fogCursor = $('#fogBrushCursor');
      if (!fogCursor) return;
      const rect = _mapEl.getBoundingClientRect();
      fogCursor.style.left = `${e.clientX - rect.left}px`;
      fogCursor.style.top = `${e.clientY - rect.top}px`;
    });
  }
  $('#toggleOverlayBtn').addEventListener('click', () => {
    settings.overlayVisible = !settings.overlayVisible;
    const btn = $('#toggleOverlayBtn');
    if (btn) btn.setAttribute('aria-pressed', String(!settings.overlayVisible));
    const label = $('#toggleOverlayLabel');
    if (label) label.textContent = settings.overlayVisible ? 'Hide Overlay' : 'Show Overlay';
    markEntityDirty('meta');
    debouncedSave();
    updateOverlayVisibility();
  });
  if ($('#toolbarPosBtn')) $('#toolbarPosBtn').addEventListener('click', () => {
    toolbarPos = toolbarPos === 'bottom' ? 'top' : 'bottom';
    saveLS('toolbarPos', toolbarPos);
    applyToolbarPos();
  });

  $('#roleToggle').addEventListener('change', e => {
    role = e.target.checked ? 'player' : 'gm';
    saveLS('role', role);

    document.body.classList.toggle('player-view', role === 'player');
    if (role === 'player') debouncedSetMode('pointer'); // cancel any active draw tool
    if (selectedId) {
      showInfoPanel(selectedId);
    }

    render({ full: true });
    selectFeature(null);
  });

  $('#themeRailBtn')?.addEventListener('click', () => {
    if (window.openSettingsHub) window.openSettingsHub('theme');
  });

  $('#catToggleInHub')?.addEventListener('change', e => {
    if (window.setShowCats) window.setShowCats(e.target.checked);
  });

  function validateBundle(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj))
      throw new Error('Invalid project: root must be an object');
    if (!obj.state || typeof obj.state !== 'object' || Array.isArray(obj.state))
      throw new Error('Invalid project: missing or invalid state');
    if (!obj.settings || typeof obj.settings !== 'object' || Array.isArray(obj.settings))
      throw new Error('Invalid project: missing or invalid settings');

    const s = obj.state;
    const requiredArrays = ['features', 'maps', 'encyclopedia', 'folders', 'encyclopediaFolders', 'templates'];
    for (const key of requiredArrays) {
      if (s[key] !== undefined && !Array.isArray(s[key]))
        throw new Error(`Invalid project: state.${key} must be an array`);
    }
    if (!Array.isArray(s.maps) || s.maps.length === 0)
      throw new Error('Invalid project: state.maps must be a non-empty array');
    if (s.activeMapId !== undefined && typeof s.activeMapId !== 'string')
      throw new Error('Invalid project: state.activeMapId must be a string');
    if (obj.settings.projectName !== undefined && typeof obj.settings.projectName !== 'string')
      throw new Error('Invalid project: settings.projectName must be a string');

    // Validate individual entity shape — catch prototype pollution and bad IDB keys
    const CSS_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]{0,80}\)|[a-zA-Z]{1,30})$/;
    const validateEntity = (entity, label) => {
      if (!entity || typeof entity !== 'object' || Array.isArray(entity))
        throw new Error(`Invalid project: ${label} entry must be an object`);
      if (typeof entity.id !== 'string' || !entity.id)
        throw new Error(`Invalid project: ${label} entry missing id`);
      if (entity.color !== undefined && typeof entity.color === 'string' && !CSS_COLOR_RE.test(entity.color.trim()))
        throw new Error(`Invalid project: ${label} ${entity.id} has malformed color`);
      if (entity.blocks !== undefined && !Array.isArray(entity.blocks))
        throw new Error(`Invalid project: ${label} ${entity.id} blocks must be an array`);
      if (Array.isArray(entity.blocks)) {
        entity.blocks.forEach((b, i) => {
          if (!b || typeof b !== 'object') throw new Error(`Invalid project: ${label} ${entity.id} block[${i}] must be an object`);
          if (typeof b.type !== 'string') throw new Error(`Invalid project: ${label} ${entity.id} block[${i}] missing type`);
        });
      }
    };
    (s.features || []).forEach(f => validateEntity(f, 'feature'));
    (s.encyclopedia || []).forEach(e => validateEntity(e, 'encyclopedia'));
    (s.articles || []).forEach(a => validateEntity(a, 'article'));
    (s.maps || []).forEach(m => {
      if (!m || typeof m.id !== 'string') throw new Error('Invalid project: map entry missing id');
    });
  }

  async function handleImportFile(file) {
    if (!file) return;
    if (typeof JSZip === 'undefined') {
      showAlertModal('Dependency Missing', 'Cannot import project: JSZip library not loaded');
      return;
    }
    try {
      setLoadingState(true, "Reading Project...");
      let buffer = await file.arrayBuffer();
      const view = new Uint8Array(buffer);
      const magic = new TextDecoder().decode(view.slice(0, 4));

      if (magic === "TENC" || magic === "TEN2") {
        // Handle encrypted project
        setLoadingState(false);
        const attemptDecrypt = (password) => {
          setLoadingState(true, "Decrypting Project...");
          decryptData(view, password).then(decryptedBuffer => {
            processZip(decryptedBuffer);
          }).catch(err => {
            setLoadingState(false);
            showPasswordModal('Invalid Password', 'Enter password...', attemptDecrypt, 'Decryption failed. Please try again:');
          });
        };
        showPasswordModal('Encrypted Project', 'Enter password...', attemptDecrypt, 'This project is password protected. Please enter the password to unlock it:');
      } else {
        // Plain ZIP project
        processZip(buffer);
      }
    } catch (err) {
      setLoadingState(false);
      showAlertModal('Import Failed', 'Failed to read project: ' + err.message);
    }

    async function processZip(data) {
      // Stage 1: open ZIP archive
      setLoadingState(true, 'Opening project…');
      let zip;
      try {
        zip = await JSZip.loadAsync(data);
      } catch (err) {
        setLoadingState(false);
        showAlertModal('Invalid File', 'Could not open the project archive. The file may be corrupted or is not a valid .trv file.');
        console.error('[import] ZIP load failed:', err);
        return;
      }

      // Stage 2: read and parse world.json
      setLoadingState(true, 'Reading world data…');
      let obj;
      try {
        const worldEntry = zip.file('world.json');
        if (!worldEntry) {
          setLoadingState(false);
          showAlertModal('Invalid Project', 'This doesn\'t appear to be a valid TaleTrove project — world.json is missing. Make sure you\'re opening a .trv file.');
          return;
        }
        const jsonText = await worldEntry.async('string');
        obj = JSON.parse(jsonText);
      } catch (err) {
        setLoadingState(false);
        if (err instanceof SyntaxError) {
          showAlertModal('Corrupted Project', 'The project data could not be read — the world.json file contains invalid data. The file may be corrupted.');
        } else {
          showAlertModal('Import Failed', 'Failed to read project data: ' + err.message);
        }
        console.error('[import] world.json read failed:', err);
        return;
      }

      // Stage 3: validate before touching anything — existing data stays safe on failure
      setLoadingState(true, 'Validating…');
      try {
        validateBundle(obj);
      } catch (err) {
        setLoadingState(false);
        showAlertModal('Invalid Project', 'Project validation failed: ' + err.message + '\n\nYour existing world was not modified.');
        console.error('[import] validateBundle failed:', err);
        return;
      }

      // Stage 4: commit — snapshot outgoing world, flush, clear, import assets
      setLoadingState(true, 'Importing…');
      try {
        // Snapshot fires in background — idbClear() is serialized by IDB and waits for it
        saveFullSnapshot(settings.worldId).catch(e => console.warn('[processZip] Snapshot failed:', e));
        await saveRecentProject();

        // Flush and cancel any pending debounced saves before clearing IDB.
        // Without this, a debouncedSave firing mid-import sets _isSaving=true,
        // causing the post-import save() to return immediately → empty world on reload.
        await window.flushSave();

        // idbClear preserves recent-snapshot-* keys
        await idbClear();

        const imageSavePromises = [];
        for (const filename of Object.keys(zip.files)) {
          if (filename.startsWith('img-') || filename.startsWith('ci-') || filename.startsWith('banner-') || filename.startsWith('bg-img-')) {
            const fileData = await zip.file(filename).async('blob');
            imageSavePromises.push(idbSet(filename, fileData));
          }
        }
        await Promise.all(imageSavePromises);

        settings = obj.settings || { projectName: 'Imported World' };
        state = obj.state || {};
        // Backfill arrays that may be absent in older .wbundle files
        if (!Array.isArray(state.maps)) state.maps = [{ id: 'map-default', name: 'World Map', parentId: null, imageKey: null, width: 2000, height: 1200, overlayKey: null, overlayOpacity: 0.4 }];
        if (!state.activeMapId) state.activeMapId = state.maps[0]?.id || 'map-default';

        // Build unified articles array from whatever the bundle contains
        if (!Array.isArray(state.articles) || state.articles.length === 0) {
          const legacyFeatures     = (state.features    || []).map(f => ({ ...f, _silo: f._silo || 'atlas' }));
          const legacyEncyclopedia = (state.encyclopedia|| []).map(e => ({ ...e, _silo: e._silo || 'lore'  }));
          state.articles = [...legacyFeatures, ...legacyEncyclopedia];
        } else {
          // Bundle already has articles (Phase-A export) — just ensure _silo is set
          state.articles.forEach(a => { if (!a._silo) a._silo = (a.geojson?.geometry) ? 'atlas' : 'lore'; });
        }
        syncArticleViews();

        // Mark everything dirty for the post-import save
        markEntityDirty('meta');
        state.articles.forEach(a => markEntityDirty('article', a.id));
        state.maps.forEach(m => markEntityDirty('map', m.id));

        // flushSave guarantees all import data is committed before reload
        await window.flushSave();
        setLoadingState(false);
        window.location.reload();

      } catch (err) {
        setLoadingState(false);
        showAlertModal('Import Failed', 'An error occurred while saving the imported project: ' + err.message + '\n\nIf this keeps happening, try refreshing the page and importing again.');
        console.error('[import] commit stage failed:', err);
      }
    }

  }

  window._handleImportFile = handleImportFile;

  $('#importFile').addEventListener('change', e => {
    handleImportFile(e.target.files[0]);
    e.target.value = null; // Clear input so the same file can be re-selected
  });

  // Hub drop zone — drag-and-drop project import
  const hubDropZone = $('#hubDropZone');
  if (hubDropZone) {
    const hubModal = $('#projectActionsModal');
    hubModal.addEventListener('dragover', e => {
      if ([...e.dataTransfer.types].includes('Files')) {
        e.preventDefault();
        hubDropZone.classList.add('drag-over');
      }
    });
    hubModal.addEventListener('dragleave', e => {
      if (!hubModal.contains(e.relatedTarget)) {
        hubDropZone.classList.remove('drag-over');
      }
    });
    hubModal.addEventListener('drop', e => {
      e.preventDefault();
      hubDropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleImportFile(file);
    });
  }

  $('#loadMapBtn').addEventListener('click', () => promptAndSetMapImage(state.activeMapId));
  $('#loadOverlayBtn').addEventListener('click', () => $('#overlayImageFile').click());
  $('#toggleAsideBtn').addEventListener('click', () => toggleAsidePanel());
  $('#propertiesSheetClose')?.addEventListener('click', () => window.closePropertiesSheet?.());
  $('#undoBtn').addEventListener('click', () => undo());
  $('#redoBtn').addEventListener('click', () => redo());
  $('#mapExpandBtn').addEventListener('click', () => toggleMapFullscreen());
  $('#mapExitFullscreenBtn').addEventListener('click', () => toggleMapFullscreen());
  $('#fsMinimizeBtn')?.addEventListener('click', () => {
    $('#mapFullscreenControls').classList.add('fs-toolbar-collapsed');
    $('#mapFullscreenControls').classList.remove('fs-toolbar-idle');
    $('#fsToolbarHandle').classList.add('visible');
    clearTimeout(_fsIdleTimer);
  });
  $('#fsToolbarHandle').addEventListener('click', () => {
    $('#mapFullscreenControls').classList.remove('fs-toolbar-collapsed');
    $('#fsToolbarHandle').classList.remove('visible');
    _fsResetIdle();
  });
  $('#fsToolbarHandle').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      $('#fsToolbarHandle').click();
    }
  });
  $('#rotateMapBtn').addEventListener('click', () => toggleMapRotation());
  $('#rhdPlaceSeatBtn')?.addEventListener('click', () => rhdPlacePlayerSeat());

  window.addEventListener('beforeunload', () => {
    // Flush any debounced-but-unfired dirty writes. save() is a no-op when
    // nothing is dirty, so the guard is unnecessary.
    save();
  });

  document.addEventListener('mousedown', (e) => {
    // Only handle if in pointer mode
    if (window.uiMode !== 'pointer') return;

    // Close properties sheet when clicking outside it
    const propertiesSheet = document.getElementById('propertiesSheet');
    if (propertiesSheet?.classList.contains('is-open') && !e.target.closest('#propertiesSheet, .row-more-btn')) {
      window.closePropertiesSheet?.();
    }

    const infoPanel = $('#infoPanel');
    if (!infoPanel || !infoPanel.classList.contains('is-visible')) return;

    // If the click is on a "protected" UI element, don't deselect.
    // This list covers sidebars, toolbars, modals, and interactive map features.
    // We use .closest() to check if the click was INSIDE one of these.
    const protectedArea = e.target.closest('#infoPanel, #atlasPanel, #mainHeader, .toolbar, .modal-overlay, .leaflet-marker-icon, .leaflet-popup, .leaflet-control, .radial-menu-container, .context-popover, #projectActionsModal, #helpModal, #newsModal, #calendarModal, #confirmModal, #blockChooserModal, #generatorContextMenu, .dropdown-content, .searchable-select, #ttLightbox');

    // Also protect clicks on actual input fields or specific interactive elements
    // that might be dynamically rendered and not strictly inside the containers above.
    const isInteractive = e.target.closest('input, textarea, select, button, a, [role="button"]');

    if (!protectedArea && !isInteractive) {
      deselectAll();
    }
  });

  window.addEventListener('keydown', (e) => {
    // Close palette first — highest-priority Escape target when focus left the input
    if (e.key === 'Escape' && _cpActive) {
      closeCommandPalette();
      return;
    }
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable)) {
      return;
    }

    const isCtrlCmd = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (isCtrlCmd && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if ((isCtrlCmd && key === 'y') || (isCtrlCmd && e.shiftKey && key === 'z')) {
      e.preventDefault();
      redo();
      return;
    }
    if (isCtrlCmd && key === 's') {
      e.preventDefault();
      handleSaveProject();
      return;
    }
    if (isCtrlCmd && key === 'k') {
      e.preventDefault();
      openCommandPalette();
      return;
    }
    if (isCtrlCmd && key === 'f') {
      e.preventDefault();
      const searchEl = $('#globalSearchInput');
      searchEl?.focus();
      searchEl?.select();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (key) {
      case 'p': debouncedSetMode('pointer'); break;
      case 'm': debouncedSetMode('move'); break;
      case 'n': debouncedSetMode('add-marker'); break;
      case 'c': if (selectedId) navigateToFeature(selectedId); break;
      case '+':
      case '=':
        map.zoomIn();
        break;
      case '-':
        map.zoomOut();
        break;
      case '1':
        $('#atlasTabBtn')?.click();
        break;
      case '3':
        $('#assetsTabBtn')?.click();
        break;
      case 'delete':
      case 'backspace': {
        const _t = e.target;
        if (_t.isContentEditable || _t.tagName === 'INPUT' || _t.tagName === 'TEXTAREA' || _t.tagName === 'SELECT') break;
        if (selectedId) {
          const feature = state.features.find(f => f.id === selectedId);
          if (feature) {
            showConfirmationModal(`Delete Feature "${feature.title || feature.name || 'this feature'}"?`, '', 'Delete', () => {
              deleteFeature(selectedId);
            });
          }
        } else if (selectedEncyclopediaEntryId) {
          const entry = state.encyclopedia.find(e => e.id === selectedEncyclopediaEntryId);
          if (entry) {
            showConfirmationModal(`Delete Entry "${entry.name}"?`, '', 'Delete', () => {
              deleteEncyclopediaEntry(selectedEncyclopediaEntryId);
            });
          }
        }
        break;
      }
      case 'escape': {
        const overlayMenu = $('#overlayMenuPopover');
        if (overlayMenu && !overlayMenu.classList.contains('hidden')) {
          hideOverlayMenuPopover();
        } else if (document.body.classList.contains('properties-sheet-open')) {
          window.closePropertiesSheet?.();
        } else if (document.body.classList.contains('peek-pinned')) {
          window.closeBesidePanel?.();
        } else if (document.body.classList.contains('article-mode') && window.exitArticleMode) {
          window.exitArticleMode();
        } else {
          deselectAll();
          hideInfoPanel();
        }
        break;
      }
      case 'l':
        $('#toggleLabelsBtn')?.click();
        break;
      case 'o':
        const toggleOverlayBtn = $('#toggleOverlayBtn');
        if (toggleOverlayBtn && !toggleOverlayBtn.disabled) {
          toggleOverlayBtn.click();
        }
        break;
      case 'i':
        const infoPanel = $('#infoPanel');
        if (infoPanel && infoPanel.classList.contains('is-visible')) {
          hideInfoPanel();
        } else if (selectedId) {
          map.closePopup();
          showInfoPanel(selectedId);
        }
        break;
      case 'tab':
        e.preventDefault();
        toggleAsidePanel();
        break;
      case '?':
        $('#helpBtn')?.click();
        break;
    }
  });
}

function deselectAll() {
  selectedId = null;
  multiSelectedIds.clear();
  selectedEncyclopediaEntryId = null;
  window.exitPeekMode?.();
  window.hideInfoPanel();
  render();
}

if (typeof window !== 'undefined') {
  window.updateBlockData = updateBlockData;
  window.TAXONOMY = TAXONOMY;
  window.getDomainsForGeometry = getDomainsForGeometry;
  window.getCategoriesByDomain = getCategoriesByDomain;
  window.getTypesByCategory = getTypesByCategory;
  window.getTaxonomyItem = getTaxonomyItem;
  window.navigateToFeature = navigateToFeature;
  window.navigateAndPeek = navigateAndPeek;
  window.openPinContent = openPinContent;
  window.duplicateFeature = duplicateFeature;
  window.deleteMapWithConfirmation = deleteMapWithConfirmation;
  window.addTimelineEvent = addTimelineEvent;
  window.removeTimelineEvent = removeTimelineEvent;
  window.updateTimelineEvent = updateTimelineEvent;
  window.performGlobalSearch = performGlobalSearch;
  window.handleAtlasDrop = handleAtlasDrop;
  window.handleBulkUpdate = handleBulkUpdate;
  window.createNewFolder = createNewFolder;
  window.deleteFolder = deleteFolder;
  window.renameFolder = renameFolder;
  window.selectFeatureLight = selectFeatureLight;
  window.createNewEncyclopediaEntry = createNewEncyclopediaEntry;
  window.createNewSession = createNewSession;
  window.duplicateEncyclopediaEntry = duplicateEncyclopediaEntry;
  window.selectEncyclopediaEntry = selectEncyclopediaEntry;
  window.deleteEncyclopediaEntry = deleteEncyclopediaEntry;
  window.addBlock = addBlock;
  window.deselectEncyclopediaEntry = deselectEncyclopediaEntry;
  window.toggleContentEditMode = toggleContentEditMode;
  window.createNewEncyclopediaFolder = createNewEncyclopediaFolder;
  window.handleEncyclopediaDrop = handleEncyclopediaDrop;
  window.handleEncyclopediaFolderDrop = handleEncyclopediaFolderDrop;
  window.toggleEncyclopediaFolderCollapsed = toggleEncyclopediaFolderCollapsed;
  window.renameEncyclopediaFolder = renameEncyclopediaFolder;
  window.deleteEncyclopediaFolder = deleteEncyclopediaFolder;
  window.deselectAll = deselectAll;
  window.handleCustomThemeUpload = handleCustomThemeUpload;
  window.removeCustomTheme = removeCustomTheme;
  window.toggleFeatureVisibility = toggleFeatureVisibility;
  window.toggleEncyclopediaEntryVisibility = toggleEncyclopediaEntryVisibility;
  window.toggleFreeMove = toggleFreeMove;
  window.updateToolbarForRole = updateToolbarForRole;
  window.syncOverlayButtons = syncOverlayButtons;
  window.navigateToEncyclopediaEntry = navigateToEncyclopediaEntry;
  window.navigateToPinForEntry = navigateToPinForEntry;
  window.createLinkedPinFromEntry = createLinkedPinFromEntry;
  window.handleDropOnInfoPanel = handleDropOnInfoPanel;
  window.createEventFromDonjonNote = createEventFromDonjonNote;
  window.handleAddAssetToInfoPanel = handleAddAssetToInfoPanel;

  _initDocumentClickDelegate();
}

// Single delegated handler for all permanent document-level click logic.
// Replaces four separate document.addEventListener('click') calls.
function _initDocumentClickDelegate() {
  document.addEventListener('click', (e) => {

    const viewBtn = e.target.closest('#timelineViewSeg button[data-view]');
    if (viewBtn) {
      timelineViewMode = viewBtn.dataset.view;
      document.querySelectorAll('#timelineViewSeg button').forEach(b => b.classList.remove('active'));
      viewBtn.classList.add('active');
      const zoomControls = document.getElementById('timelineZoomControls');
      if (zoomControls) zoomControls.classList.toggle('hidden', timelineViewMode !== 'gantt');
      showGlobalTimeline();
      return;
    }

    if (e.target.closest('#projectNameBreadcrumb')) {
      e.preventDefault();
      e.stopPropagation();
      const mainMap = state.maps.find(m => m.parentId === null);
      if (mainMap) navigateToMap(mainMap.id, { skipInfoPanel: true });
      return;
    }

    const editBtn = e.target.closest('[data-action="edit"]');
    if (editBtn) {
      e.preventDefault();
      const fid = editBtn.getAttribute('data-fid');
      if (fid) selectFeature(fid);
      return;
    }

    const generateBtn = e.target.closest('.generate-btn');
    if (generateBtn) {
      recordState();
      const type = generateBtn.dataset.generatorType;
      const generatedName = generateName(type);
      if (!generatedName) return;
      const inputField = generateBtn.previousElementSibling;
      if (inputField && inputField.tagName === 'INPUT') {
        inputField.value = generatedName;
        inputField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    const fogPopover = $('#fogControlsPopover');
    if (fogPopover && !fogPopover.classList.contains('hidden')) {
      if (!fogPopover.contains(e.target) && !e.target.closest('#toggleFogBtn, #toggleFogBtnFullscreen')) {
        hideFogPopover();
      }
    }
  });
}

function _onDriveStatusChange(isConnected, userInfo) {
  renderDriveHub(isConnected, userInfo);
}

const _GDRIVE_LOGO_SVG = `<svg viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;flex-shrink:0">
  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#ea4335"/>
  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
</svg>`;

function renderDriveHub(isConnected, userInfo) {
  const configured = window.googleDrive?.isConfigured?.();

  // Project card: button + divider always visible when Drive is configured.
  // Clicking "Backup to Google Drive" connects automatically if needed —
  // no separate connect step required.
  const driveSaveBtn = $('#hubDriveSaveBtn');
  const driveDivider = $('#hubDriveDivider');
  if (driveSaveBtn) {
    driveSaveBtn.classList.toggle('hidden', !configured);
    if (driveDivider) driveDivider.classList.toggle('hidden', !configured);
    if (configured) {
      driveSaveBtn.innerHTML = `${_GDRIVE_LOGO_SVG}<span>Backup to Google Drive</span>`;
    }
  }

  // Open World card: "From Google Drive" button — connect-on-demand, same as backup button.
  const driveOpenBtn = $('#hubDriveOpenBtn');
  const openDriveDivider = $('#hubOpenDriveDivider');
  if (driveOpenBtn) {
    driveOpenBtn.classList.toggle('hidden', !configured);
    if (openDriveDivider) openDriveDivider.classList.toggle('hidden', !configured);
    if (configured) {
      driveOpenBtn.innerHTML = `${_GDRIVE_LOGO_SVG}<span>Open from Google Drive</span>`;
    }
  }

  // Project card: Drive status line — shown when connected, with disconnect button
  const driveStatus = $('#hubDriveStatus');
  const driveStatusEmail = $('#hubDriveStatusEmail');
  if (driveStatus) {
    if (configured && isConnected) {
      driveStatus.classList.remove('hidden');
      if (driveStatusEmail) driveStatusEmail.textContent = userInfo?.email || 'Connected to Google Drive';
    } else {
      driveStatus.classList.add('hidden');
    }
  }

  // User chip popover: Drive status + disconnect — only shown when a live token exists
  const driveSection = $('#userPopoverDriveSection');
  if (driveSection) {
    driveSection.innerHTML = '';
    const hasActiveToken = window.googleDrive?.isConnected?.() ?? false;
    if (configured && isConnected && hasActiveToken) {
      const label = escapeHtml(userInfo?.email || 'Google Drive');
      driveSection.innerHTML = `
        <div class="user-popover-drive">
          <div class="user-popover-drive__status">${_GDRIVE_LOGO_SVG}<span>${label}</span></div>
          <button class="user-popover-drive__disconnect">Disconnect</button>
        </div>`;
      driveSection.querySelector('.user-popover-drive__disconnect')
        .addEventListener('click', () => {
          window.googleDrive?.signOut();
          $('#userChipPopover')?.classList.add('hidden');
        });
      driveSection.classList.remove('hidden');
    } else {
      driveSection.classList.add('hidden');
    }
  }
}

async function buildWorldBlob() {
  if (typeof JSZip === 'undefined') throw new Error('JSZip not loaded');
  const zip  = new JSZip();
  const clone = { settings, state };

  const allKeysToExport = new Set();
  const allIdbKeys = await idbGetAllKeys('files');
  allIdbKeys.filter(k => k.startsWith('img-')).forEach(k => allKeysToExport.add(k));
  (clone.state.maps || []).forEach(m => {
    if (m.imageKey)    allKeysToExport.add(m.imageKey);
    if (m.overlayKey)  allKeysToExport.add(m.overlayKey);
    if (m.id)          allKeysToExport.add(`banner-${m.id}`);
  });
  [...(clone.state.features || []), ...(clone.state.encyclopedia || [])].forEach(e => {
    if (e.heroImageKey)   allKeysToExport.add(e.heroImageKey);
    if (e.coatOfArmsKey)  allKeysToExport.add(e.coatOfArmsKey);
    if (e.imageKey)       allKeysToExport.add(e.imageKey);
    (e.blocks || []).forEach(b => {
      if (b.type === 'Image' && b.data?.src?.startsWith('img-')) allKeysToExport.add(b.data.src);
    });
  });
  if (clone.settings.customTheme?.backgroundImageKey)
    allKeysToExport.add(clone.settings.customTheme.backgroundImageKey);
  CUSTOM_ICON_MANIFEST.forEach(k => allKeysToExport.add(k));

  await Promise.all(Array.from(allKeysToExport).map(async key => {
    if (!key) return;
    const blob = await idbGet(key);
    if (blob) zip.file(key, blob);
  }));

  zip.file('world.json', JSON.stringify(clone, null, 2));
  return zip.generateAsync({ type: 'blob', streamFiles: true });
}

async function handleDriveSave() {
  const worldName = (settings.projectName || state.maps[0]?.name || 'My World').replace(/[^a-z0-9_\- ]/gi, '_');
  try {
    setLoadingState(true, 'Preparing for Drive…');
    const blob = await buildWorldBlob();
    // Don't clear — googleDrive.save owns the overlay from here through completion
    setLoadingState(true, 'Saving to Google Drive…');
    await window.googleDrive.save(worldName, blob);
  } catch (e) {
    setLoadingState(false);
    showAlertModal('Drive Save Error', e.message);
  }
}

async function openDriveFilePicker() {
  const modal = $('#projectActionsModal');
  if (!modal) return;

  // Show the hub if it isn't already open
  modal.classList.remove('hidden');

  // Transition: Overview → Drive picker (same animation as Overview → Settings)
  const overview = $('#hubViewOverview');
  const driveView = $('#hubViewDriveOpen');
  if (!overview || !driveView) return;

  const container = $('#hubDriveFileListContainer');
  if (!container) return;

  // Show a spinner while fetching
  container.innerHTML = '<p class="muted" style="padding: 0.5rem 0;">Loading worlds from Google Drive…</p>';

  if (!overview.classList.contains('hidden')) {
    overview.classList.add('hub-view-exit-left');
    driveView.classList.remove('hidden');
    driveView.classList.add('hub-view-enter-right');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      driveView.classList.remove('hub-view-enter-right');
    }));
    setTimeout(() => {
      overview.classList.add('hidden');
      overview.classList.remove('hub-view-exit-left');
    }, 600);
  }

  $('#hubTitle').textContent = 'Open from Google Drive';
  $('#hubMainLogo').classList.add('hidden');
  $('#hubBackBtn').classList.remove('hidden');

  // Fetch file list (triggers auth if needed via _requireAuth)
  const files = await window.googleDrive?.list();
  if (!files) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '';

  if (files.length === 0) {
    container.appendChild(el('p', { class: 'muted', style: 'margin-top: 2rem;', text: 'No TaleTrove worlds found in your Google Drive.' }));
    return;
  }

  const list = el('ul', { class: 'hub-drive-file-list' });
  files.forEach(f => {
    const date = new Date(f.modifiedTime).toLocaleDateString(undefined, { dateStyle: 'medium' });
    const size = f.size ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : '';
    const meta = [date, size].filter(Boolean).join(' · ');

    const openBtn = el('button', { class: 'hub-primary-btn hub-primary-btn--ghost hub-drive-file-open', text: 'Open' });

    const iconEl = el('div', { class: 'icon-container', style: "-webkit-mask-image:url('ui-icons/map-trifold.svg');mask-image:url('ui-icons/map-trifold.svg');" });

    const item = el('li', { class: 'hub-drive-file-item', tabindex: '0' }, [
      el('div', { class: 'hub-drive-file-item__info' }, [
        iconEl,
        el('div', { class: 'hub-drive-file-item__text' }, [
          el('span', { class: 'hub-drive-file-name', text: f.name }),
          el('span', { class: 'hub-drive-file-meta muted', text: meta }),
        ]),
      ]),
      openBtn,
    ]);

    const load = async () => {
      setLoadingState(true, 'Downloading from Google Drive…');
      try {
        const blob = await window.googleDrive.load(f.id);
        if (blob) {
          const file = new File([blob], f.name);
          setLoadingState(true, 'Importing World…');
          await window._handleImportFile(file);
          setLoadingState(false);
          modal.classList.add('hidden');
        } else {
          setLoadingState(false);
        }
      } catch (e) {
        setLoadingState(false);
        showAlertModal('Drive Open Failed', e.message);
      }
    };

    item.addEventListener('click', load);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') load(); });
    openBtn.addEventListener('click', e => { e.stopPropagation(); load(); });
    list.appendChild(item);
  });

  container.appendChild(list);
}

const CP_COMMANDS = [
  // Create
  { id: 'cmd-new-article',  label: 'New Article',             icon: 'plus',               group: 'Create',   shortcut: null },
  { id: 'cmd-new-map',      label: 'New Map',                 icon: 'map-trifold',        group: 'Create',   shortcut: null },
  // Navigate
  { id: 'cmd-timeline',     label: 'Open Timeline',           icon: 'hourglass',          group: 'Navigate', shortcut: null },
  { id: 'cmd-calendar',     label: 'Open Calendar',           icon: 'calendar-dots',      group: 'Navigate', shortcut: null },
  { id: 'cmd-graph',        label: 'Relational Graph',        icon: 'graph',              group: 'Navigate', shortcut: null },
  { id: 'cmd-family-tree',  label: 'Family Tree',             icon: 'tree-structure',     group: 'Navigate', shortcut: null },
  { id: 'cmd-hub',          label: 'Project Hub',             icon: 'stack-simple',       group: 'Navigate', shortcut: null },
  // Actions
  { id: 'cmd-toggle-role',  label: 'Toggle GM / Player Role', icon: 'eye',                group: 'Actions',  shortcut: null },
  { id: 'cmd-undo',         label: 'Undo',                    icon: 'arrow-u-down-left',  group: 'Actions',  shortcut: ['Ctrl', 'Z'] },
  { id: 'cmd-redo',         label: 'Redo',                    icon: 'arrow-bend-up-right',group: 'Actions',  shortcut: ['Ctrl', 'Y'] },
  // Tools (keyboard shortcut reference)
  { id: 'cmd-pointer',      label: 'Pointer Tool',            icon: 'cursor',             group: 'Tools',    shortcut: ['P'] },
  { id: 'cmd-move',         label: 'Move Tool',               icon: 'arrows-out-cardinal',group: 'Tools',    shortcut: ['M'] },
  { id: 'cmd-new-pin',      label: 'New Pin Tool',            icon: 'map-pin',            group: 'Tools',    shortcut: ['N'] },
  { id: 'cmd-center',       label: 'Center on Selection',     icon: 'crosshair',          group: 'Tools',    shortcut: ['C'] },
];

let _cpActive = false;
let _cpActiveIndex = -1;
let _cpItems = [];

function openCommandPalette() {
  const palette = document.getElementById('commandPalette');
  if (!palette) return;
  _cpActive = true;
  _cpActiveIndex = -1;
  palette.classList.remove('hidden');
  const input = document.getElementById('cpInput');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 30);
  }
  renderCpResults('');
}

function closeCommandPalette() {
  const palette = document.getElementById('commandPalette');
  if (!palette) return;
  _cpActive = false;
  _cpActiveIndex = -1;
  palette.classList.add('hidden');
}

function renderCpResults(query) {
  const container = document.getElementById('cpResults');
  if (!container) return;
  const q = query.trim().toLowerCase();
  _cpItems = [];
  let html = '';

  if (!q) {
    const groups = ['Create', 'Navigate', 'Actions', 'Tools'];
    for (const group of groups) {
      const cmds = CP_COMMANDS.filter(c => c.group === group);
      if (!cmds.length) continue;
      html += `<div class="cp-group-label">${group}</div>`;
      for (const cmd of cmds) {
        const idx = _cpItems.length;
        _cpItems.push({ kind: 'cmd', cmd });
        html += buildCpItemHtml({ kind: 'cmd', cmd, index: idx });
      }
    }
  } else {
    const matchingCmds = CP_COMMANDS.filter(c => c.label.toLowerCase().includes(q));
    if (matchingCmds.length) {
      html += `<div class="cp-group-label">Commands</div>`;
      for (const cmd of matchingCmds) {
        const idx = _cpItems.length;
        _cpItems.push({ kind: 'cmd', cmd });
        html += buildCpItemHtml({ kind: 'cmd', cmd, index: idx });
      }
    }

    const searchResults = performGlobalSearch(q);
    if (searchResults.length) {
      if (matchingCmds.length) html += `<div class="cp-divider"></div>`;
      html += `<div class="cp-group-label">Articles &amp; Maps</div>`;
      for (const result of searchResults.slice(0, 20)) {
        const idx = _cpItems.length;
        _cpItems.push({ kind: 'result', result });
        html += buildCpItemHtml({ kind: 'result', result, index: idx });
      }
    }

    if (!matchingCmds.length && !searchResults.length) {
      html += `<div class="cp-empty">No results found</div>`;
    }
  }

  container.innerHTML = html;

  // Render icons into placeholder containers after setting innerHTML
  container.querySelectorAll('.cp-item-icon[data-icon]').forEach(iconEl => {
    iconEl.innerHTML = getIconHTMLSync(iconEl.dataset.icon, 'currentColor');
  });

  // Wire event listeners
  container.querySelectorAll('.cp-item[data-cp-index]').forEach(itemEl => {
    const idx = parseInt(itemEl.dataset.cpIndex, 10);
    itemEl.addEventListener('click', () => executeCpItem(_cpItems[idx]));
    itemEl.addEventListener('mouseenter', () => {
      _cpActiveIndex = idx;
      updateCpActiveHighlight();
    });
  });

  _cpActiveIndex = _cpItems.length > 0 ? 0 : -1;
  updateCpActiveHighlight();
}

function buildCpItemHtml({ kind, cmd, result, index }) {
  let iconName, labelText, contextText, shortcutKeys;
  if (kind === 'cmd') {
    iconName     = cmd.icon;
    labelText    = cmd.label;
    contextText  = null;
    shortcutKeys = cmd.shortcut;
  } else {
    iconName     = result.type === 'map' ? 'map-trifold' : 'book-open-text';
    labelText    = result.title;
    contextText  = result.context;
    shortcutKeys = null;
  }

  const shortcutHtml = shortcutKeys && shortcutKeys.length
    ? `<span class="cp-item-shortcut">${shortcutKeys.map(k => `<kbd>${escapeHtml(k)}</kbd>`).join('')}</span>`
    : '';
  const contextHtml = contextText
    ? `<span class="cp-item-context">${escapeHtml(contextText)}</span>`
    : '';

  return `<div class="cp-item" role="option" tabindex="-1" data-cp-index="${index}">
    <div class="cp-item-icon icon-container" data-icon="${escapeHtml(iconName)}"></div>
    <span class="cp-item-label">${escapeHtml(labelText)}</span>
    ${contextHtml}${shortcutHtml}
  </div>`;
}

function updateCpActiveHighlight() {
  document.querySelectorAll('#cpResults .cp-item').forEach((item, i) => {
    item.classList.toggle('is-active', i === _cpActiveIndex);
  });
}

function scrollCpActiveIntoView() {
  const active = document.querySelector('#cpResults .cp-item.is-active');
  active?.scrollIntoView({ block: 'nearest' });
}

function executeCpItem(item) {
  if (!item) return;
  closeCommandPalette();

  if (item.kind === 'result') {
    const { type, id } = item.result;
    if (type === 'map') {
      window.navigateToMap?.(id);
    } else {
      const entityType = type === 'feature' ? 'feature' : 'encyclopedia';
      window.navigateAndPeek?.(id, entityType);
    }
    return;
  }

  switch (item.cmd.id) {
    case 'cmd-new-article':
      createNewEncyclopediaEntry();
      break;
    case 'cmd-new-map':
      showInputModal('New Map', 'Map name', 'New Map', (name) => {
        if (name && name.trim()) createNewMap(name.trim());
      });
      break;
    case 'cmd-timeline':
      document.getElementById('timelineBtn')?.click();
      break;
    case 'cmd-calendar':
      document.getElementById('calendarBtn')?.click();
      break;
    case 'cmd-graph':
      window.openRelationalGraph?.();
      break;
    case 'cmd-family-tree':
      window.openFamilyTree?.();
      break;
    case 'cmd-hub':
      document.getElementById('brandLogo')?.click();
      break;
    case 'cmd-toggle-role': {
      const toggle = document.getElementById('roleToggle');
      if (toggle) {
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event('change'));
      }
      break;
    }
    case 'cmd-undo':
      undo();
      break;
    case 'cmd-redo':
      redo();
      break;
    case 'cmd-pointer':
      debouncedSetMode('pointer');
      break;
    case 'cmd-move':
      debouncedSetMode('move');
      break;
    case 'cmd-new-pin':
      debouncedSetMode('add-marker');
      break;
    case 'cmd-center':
      if (selectedId) navigateToFeature(selectedId);
      break;
  }
}

function initCommandPalette() {
  const palette = document.getElementById('commandPalette');
  if (!palette) return;

  // Close on backdrop click
  palette.addEventListener('click', (e) => {
    if (e.target === palette) closeCommandPalette();
  });

  const input = document.getElementById('cpInput');
  if (input) {
    input.addEventListener('input', () => renderCpResults(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeCommandPalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        _cpActiveIndex = Math.min(_cpActiveIndex + 1, _cpItems.length - 1);
        updateCpActiveHighlight();
        scrollCpActiveIntoView();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _cpActiveIndex = Math.max(_cpActiveIndex - 1, 0);
        updateCpActiveHighlight();
        scrollCpActiveIntoView();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_cpActiveIndex >= 0 && _cpItems[_cpActiveIndex]) {
          executeCpItem(_cpItems[_cpActiveIndex]);
        }
      }
    });
  }

  // Render search icon
  const searchIcon = palette.querySelector('.cp-search-icon');
  if (searchIcon) {
    searchIcon.innerHTML = getIconHTMLSync('magnifying-glass', 'currentColor');
  }

  // Populate and wire the shortcut hint chip in the header search bar
  const hint = document.getElementById('cpShortcutHint');
  if (hint) {
    const isMac = /mac/i.test(navigator.platform);
    const modKey = isMac ? '⌘' : 'Ctrl';
    hint.innerHTML = `<kbd>${escapeHtml(modKey)}</kbd><kbd>K</kbd>`;
    hint.addEventListener('click', () => openCommandPalette());
  }
}

window.openCommandPalette = openCommandPalette;
window.closeCommandPalette = closeCommandPalette;

window.openDriveFilePicker = openDriveFilePicker;
window.renderDriveHub = renderDriveHub;