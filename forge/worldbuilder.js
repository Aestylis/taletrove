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
  _applyEncyclopediaMove(idsToMove, newParentFolderId, !!entryId);
}

/**
 * Shared lore-move mutation body — used by the legacy nested-DOM drop path
 * (handleEncyclopediaDrop) and the Phase M flat-row drop path (panels.js).
 * Handles entry and folder moves, incl. the folder-into-own-descendant guard.
 * `draggedIsEntry`: when the dragged item is an entry, every id in a multi-selection is
 * treated as an entry (legacy parity — folders in the set are skipped, not moved).
 */
function _applyEncyclopediaMove(idsToMove, newParentFolderId, draggedIsEntry) {
  let changed = false;

  idsToMove.forEach(id => {
    if (draggedIsEntry || state.encyclopedia.find(e => e.id === id)) {
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
    // WS3: patch the row's eye icon in place when possible; full render only when needed.
    if (!window.updateRowVisibility?.(mapId, 'map')) render({ full: true });
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

function toggleFeatureVisibility(featureId) {
  const feature = state.features.find(f => f.id === featureId);
  if (feature) {
    recordState();
    feature.visibleToPlayers = !feature.visibleToPlayers;
    markEntityDirty('article', feature.id);
    // WS3: patch the row's eye icon in place when possible; full render only when needed.
    if (!window.updateRowVisibility?.(featureId, 'feature')) render({ full: true });
    debouncedSave();
  }
}

function toggleEncyclopediaEntryVisibility(entryId) {
  const entry = state.encyclopedia.find(e => e.id === entryId);
  if (entry) {
    recordState();
    entry.visibleToPlayers = !entry.visibleToPlayers;
    markEntityDirty('article', entry.id);
    // WS3: patch the row's eye icon in place when possible; full render only when needed.
    if (!window.updateRowVisibility?.(entryId, 'encyclopedia')) render({ full: true });
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
  if (state.maps.length <= 1) {
    showAlertModal('Cannot Delete Map', 'This is your only map. Create another map before deleting this one.');
    return;
  }
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

  _applyAtlasMove(idsToMove, newParentMapId, newParentFolderId);
}

/**
 * Shared atlas-move mutation body — used by the legacy nested-DOM drop path (handleAtlasDrop)
 * and the Phase M flat-row drop path (panels.js). Caller is responsible for recordState()
 * and any cycle-guard adjustments to newParentMapId.
 */
function _applyAtlasMove(idsToMove, newParentMapId, newParentFolderId) {
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

async function detectAndWarnMissingImages() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId) || state.maps[0];
  const missing = [];
  if (activeMap?.imageKey && !(await idbHas(activeMap.imageKey))) missing.push('Base map');
  if (activeMap?.overlayKey && !(await idbHas(activeMap.overlayKey))) missing.push('Overlay');
  if (missing.length > 0) {
    showMapNotice(`${missing.join(' & ')} image missing from storage. Re-select the image file to restore.`);
  }
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
window.promptAndSetMapImage = promptAndSetMapImage;

function syncMapEmptyState() {
  const overlay = document.getElementById('mapEmptyState');
  if (!overlay) return;
  if (role !== 'gm') { overlay.classList.add('hidden'); return; }

  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (!activeMap) { overlay.classList.add('hidden'); return; }

  const hasImage = !!activeMap.imageKey;
  const hasPins = state.features.some(f => f.mapId === state.activeMapId);

  if (hasImage && hasPins) { overlay.classList.add('hidden'); return; }
  // "No pins yet" hint only makes sense on the main map — secondary maps start empty by design
  if (hasImage && !hasPins && state.activeMapId !== 'map-default') { overlay.classList.add('hidden'); return; }

  overlay.dataset.state = hasImage ? 'no-pins' : 'no-image';
  overlay.classList.remove('hidden');
  overlay.innerHTML = '';

  const iconUrl = hasImage ? 'ui-icons/map-pin.svg' : 'ui-icons/file-image.svg';
  const heading = hasImage ? 'No pins yet' : 'Start with a base map';
  const subtext = hasImage
    ? 'Press <kbd>N</kbd> or click the pin tool to drop your first location.'
    : 'Upload an image to set the stage for your world.';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'map-empty-icon';
  iconDiv.innerHTML = `<div class="icon-container" style="-webkit-mask-image:url('${iconUrl}');mask-image:url('${iconUrl}');"></div>`;

  const headingEl = document.createElement('div');
  headingEl.className = 'map-empty-heading';
  headingEl.textContent = heading;

  const subtextEl = document.createElement('div');
  subtextEl.className = 'map-empty-subtext';
  subtextEl.innerHTML = subtext;

  overlay.append(iconDiv, headingEl, subtextEl);

  if (!hasImage) {
    const cta = document.createElement('button');
    cta.className = 'map-empty-cta';
    cta.textContent = 'Load Map Image';
    cta.addEventListener('click', () => promptAndSetMapImage(state.activeMapId));
    overlay.appendChild(cta);
  }
}
window.syncMapEmptyState = syncMapEmptyState;

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

  initFileDropListeners();
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


  initUserChipListeners();

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

  initGridListeners();

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

  initModalListeners();

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

  initToolbarPopoverListeners();

  $('#centerOnSelectionBtn').addEventListener('click', () => { if (selectedId) navigateToFeature(selectedId) });

  initFogControlListeners();

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

  // Import pipeline (validateBundle / handleImportFile / window._handleImportFile)
  // lives in import-export.js — handleImportFile resolves as a global at call time.

  $('#importFile').addEventListener('change', e => {
    handleImportFile(e.target.files[0]);
    e.target.value = null; // Clear input so the same file can be re-selected
  });


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

  // Global keyboard shortcuts live in keyboard-shortcuts.js (WS7 extraction); the handler
  // resolves the popover closers through the window._close*Popover exposures above.
  initGlobalKeyboardShortcuts();
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
  // syncOverlayButtons moved to toolbar-popovers.js (evaluates after this file) — its top-level
  // declaration is already a window global, so no evaluate-time re-export here.
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

// Command palette (Ctrl+K) lives in command-palette.js (WS7 extraction). It shares this
// global scope: initCommandPalette() is called from the DOMContentLoaded handler above, and
// the global keydown handlers read _cpActive / call open/closeCommandPalette at runtime.
