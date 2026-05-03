// panels.js - Left sidebar panel views: Atlas tree, Encyclopedia, Assets, panel tabs, and context menus
// Depends on: utils.js, state.js, data.js, ui.js

// --- Drag-scroll + drop-target tracking ---
// forceFallback:true uses pointer events (not HTML5 drag), so wheel events are not
// blocked. We also fix a SortableJS bug: with forceFallback, onEnd's evt.to reports
// the source container instead of the nested drop target. onMove's evt.to IS correct
// (it's what drives the visual placeholder), so we capture the last onMove target and
// use it in handleAtlasDrop instead.

function _dragWheelHandler(e) {
  const panel = document.getElementById('atlasPanel');
  if (panel) panel.scrollTop += e.deltaY;
}

function _atlasDragOnMove(evt) {
  // Capture the correct drop container as SortableJS tracks it during drag.
  // onEnd.evt.to is bugged for cross-nested-container drops with forceFallback;
  // onMove.evt.to is correct because it's what positions the visual placeholder.
  window._atlasDragLastTo = evt.to;
}

function _attachDragScroll() {
  window._atlasDragLastTo = null;
  const panel = document.getElementById('atlasPanel');
  if (panel) {
    panel.addEventListener('wheel', _dragWheelHandler, { passive: true });
    panel.classList.add('is-dragging');
  }
}

function _detachDragScroll() {
  const panel = document.getElementById('atlasPanel');
  if (panel) {
    panel.removeEventListener('wheel', _dragWheelHandler);
    panel.classList.remove('is-dragging');
  }
}

// --- Shared Helpers ---
function buildPanelEmptyState(iconName, heading, sub, cta = null) {
  const children = [
    el('div', { class: 'panel-empty-icon', style: `-webkit-mask-image: url('ui-icons/${iconName}.svg'); mask-image: url('ui-icons/${iconName}.svg');` }),
    el('span', { class: 'panel-empty-heading', text: heading }),
    el('span', { class: 'panel-empty-sub', text: sub }),
  ];
  if (cta) {
    const btn = el('button', { class: 'primary panel-empty-cta', text: cta.text });
    btn.addEventListener('click', cta.action);
    children.push(btn);
  }
  return el('div', { class: 'panel-empty-state' }, children);
}

// --- Selection Highlighting ---
function updateSelectionStyles() {
  if (!window.allLayers) return; // Prevents error if map isn't loaded yet

  document.querySelectorAll('.tree-row.active, .tree-row.selected, .encyclopedia-item.selected').forEach(el => {
    el.classList.remove('active', 'selected');
    if (typeof Sortable !== 'undefined' && Sortable.utils) {
      Sortable.utils.deselect(el);
    }
  });
  document.querySelector('.world-home-row')?.classList.remove('active');

  // Build the set of map elements that should remain selected so we can
  // skip the remove→re-add cycle for them (preserves running CSS animations).
  const keepSelectedEls = new Set();
  multiSelectedIds.forEach(id => {
    const layer = layerById.get(id);
    if (layer && layer.getElement) {
      const el = layer.getElement();
      if (el) keepSelectedEls.add(el);
    }
  });

  allLayers.eachLayer(layer => {
    if (layer.getElement) {
      const element = layer.getElement();
      if (element && !keepSelectedEls.has(element)) {
        element.classList.remove('leaflet-feature-selected');
      }
    }
  });

  const activeMapRow = document.querySelector(`.map-node[data-map-id="${state.activeMapId}"] > .map-row`);
  if (activeMapRow) {
    activeMapRow.classList.add('active');
  }
  // Also highlight the home row if the root map is active
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (activeMap && activeMap.parentId === null) {
    document.querySelector('.world-home-row')?.classList.add('active');
  }

  if (selectedId) {
    const selectedFolderRow = document.querySelector(`.folder-row[data-folder-id="${selectedId}"]`);
    if (selectedFolderRow) {
      selectedFolderRow.classList.add('selected');
      if (typeof Sortable !== 'undefined' && Sortable.utils) {
        Sortable.utils.select(selectedFolderRow);
      }
    }
  }

  multiSelectedIds.forEach(id => {
    // Highlight in the Atlas tree
    const featureRow = document.querySelector(`.feature-row[data-fid="${id}"]`);
    if (featureRow) {
      featureRow.classList.add('selected');
      if (typeof Sortable !== 'undefined' && Sortable.utils) {
        Sortable.utils.select(featureRow);
      }
    }
    // Add map highlight only if not already present (avoids restarting animations)
    const layer = layerById.get(id);
    if (layer && layer.getElement) {
      const element = layer.getElement();
      if (element && !element.classList.contains('leaflet-feature-selected')) {
        element.classList.add('leaflet-feature-selected');
      }
    }
  });

  document.querySelectorAll('#encyclopediaView .encyclopedia-item').forEach(item => {
    const entryId = item.dataset.entryId;
    const isSelected = (selectedEncyclopediaEntryId === entryId) || multiSelectedIds.has(entryId);
    item.classList.toggle('selected', isSelected);
    if (isSelected && typeof Sortable !== 'undefined' && Sortable.utils) {
      Sortable.utils.select(item);
    }
  });
}

// --- Atlas Tree ---
let isAtlasRefreshing = false;
let _atlasScrollHandler = null;
let activeTags = new Set();  // currently selected tag filters
let tagMatchMode = 'any';    // 'any' | 'all'
let filterBarExpanded = false;   // world tab search bar visibility
let assetsFilterExpanded = false; // assets tab search bar visibility
let _openSectionPopover = null;
let _atlasFilterDebounce = null;

function syncPanelSearchBtn() {
  const searchBtn = $('#panelSearchBtn');
  if (!searchBtn) return;
  const onAssets = activePrimaryTab === 'assets';
  const expanded = onAssets ? assetsFilterExpanded : filterBarExpanded;
  searchBtn.classList.toggle('active', expanded);
}
let mapsSectionCollapsed = false;
let loreSectionCollapsed = false;
let sessionsSectionCollapsed = false;
function _closeSectionPopover() {
  if (_openSectionPopover) {
    _openSectionPopover.classList.remove('open');
    _openSectionPopover.remove();
    _openSectionPopover = null;
  }
}
document.addEventListener('click', _closeSectionPopover);
async function refreshAtlasTree() {
  if (isAtlasRefreshing) return;
  isAtlasRefreshing = true;

  // Safety: clean up any scroll listeners that may have leaked if a drag was
  // interrupted by navigation (onEnd never fires when the tree is rebuilt mid-drag).
  _detachDragScroll();

  try {
    atlasSortable.forEach(s => s.destroy());
    atlasSortable = [];

    const container = $('#atlasView');
    if (!container) return;

    const oldFilterInput = $('#atlasFilterInput');
    const wasFilterFocused = oldFilterInput && document.activeElement === oldFilterInput;
    const oldQuery = oldFilterInput ? oldFilterInput.value : '';
    const cursorPosition = oldFilterInput ? oldFilterInput.selectionStart : 0;
    // Keep bar expanded if there is an active query
    if (oldQuery) filterBarExpanded = true;
    container.innerHTML = '';

    const treeContainer = el('div', { id: 'atlasTreeContainer', style: 'padding: 0.75rem 1rem;' });
  const query = normalizeForSearch(oldQuery.trim());
  const categoryFilter = (featureFilter !== 'all' && featureFilter !== 'on-map') ? featureFilter : null;

  // --- Filtering Logic ---
  let itemsToShow = new Set();
  let ancestorsToShow = new Set();

  if (query) {
    state.features.forEach(f => {
      if (normalizeForSearch(f.title).includes(query)) itemsToShow.add(f.id);
    });
    state.maps.forEach(m => {
      if (normalizeForSearch(m.name).includes(query)) itemsToShow.add(m.id);
    });
    state.folders.forEach(f => {
      if (normalizeForSearch(f.name).includes(query)) itemsToShow.add(f.id);
    });
    // Lore pins — include in search and bubble mapId into ancestorsToShow
    (state.encyclopedia || []).filter(e => e.mapId && (e.type || '').toLowerCase() !== 'session').forEach(e => {
      if (
        normalizeForSearch(e.name).includes(query) ||
        normalizeForSearch(e.type).includes(query) ||
        normalizeForSearch((e.tags || []).join(' ')).includes(query)
      ) {
        itemsToShow.add(e.id);
        ancestorsToShow.add(e.mapId);
      }
    });

    const allMaps = new Map(state.maps.map(m => [m.id, m]));
    const allFolders = new Map(state.folders.map(f => [f.id, f]));
    const allFeatures = new Map(state.features.map(f => [f.id, f]));
    const allLoreIds = new Set((state.encyclopedia || []).map(e => e.id));

    // Walk up the tree to show parents of matches
    for (const itemId of itemsToShow) {
      // Lore pin ancestry already handled above
      if (allLoreIds.has(itemId)) continue;
      let currentId = itemId;
      let currentType = allFeatures.has(itemId) ? 'feature' : (allFolders.has(itemId) ? 'folder' : 'map');

      if (currentType === 'feature') {
        const f = allFeatures.get(currentId);
        if (f.folderId) {
          ancestorsToShow.add(f.folderId);
          currentId = f.folderId;
          currentType = 'folder';
        } else {
          currentId = f.mapId;
          currentType = 'map';
        }
      }

      while (currentType === 'folder') {
        const folder = allFolders.get(currentId);
        if (!folder) break;
        if (folder.parentFolderId) {
          ancestorsToShow.add(folder.parentFolderId);
          currentId = folder.parentFolderId;
        } else {
          // Reached root folder, jump to Map
          currentId = folder.mapId;
          currentType = 'map';
        }
      }

      while (currentType === 'map' && currentId) {
        ancestorsToShow.add(currentId);
        const parentMap = allMaps.get(currentId);
        if (!parentMap) break;

        if (parentMap.folderId) {
          // This map is inside a folder, switch logic back to folder walking
          currentId = parentMap.folderId;
          currentType = 'folder';
          ancestorsToShow.add(currentId);
          // Resume folder walking logic immediately
          while (currentType === 'folder') {
            const folder = allFolders.get(currentId);
            if (!folder) break;
            if (folder.parentFolderId) {
              ancestorsToShow.add(folder.parentFolderId);
              currentId = folder.parentFolderId;
            } else {
              currentId = folder.mapId;
              currentType = 'map';
            }
          }
        } else {
          currentId = parentMap.parentId;
        }
      }
    }
  }

  const toggleFolderCollapsed = (folderId) => {
    if (collapsedFolderNodes.has(folderId)) collapsedFolderNodes.delete(folderId);
    else collapsedFolderNodes.add(folderId);
    saveCollapsedState();
    refreshAtlasTree();
  };

  const renderFeatures = async (features, parentElement) => {
    const featuresToRender = query ? features.filter(f => itemsToShow.has(f.id)) : features;
    for (const f of featuresToRender) {
      const iconHtml = await getSidebarIconHTML(f);
      const itemIcon = el('div', { class: 'item-icon', innerHTML: iconHtml });

      const featureRow = el('div', { class: `tree-row feature-row`, 'data-fid': f.id, tabindex: '0' });
      const featureDetails = [itemIcon, el('span', { class: 'tree-label', text: f.title || '(untitled)' })];

      if (role === 'gm') {
        const rowActions = el('div', { class: 'row-actions' });

        const visBtn = el('button', { class: `row-vis-btn ${f.visibleToPlayers ? 'is-player' : 'is-gm'}`, title: f.visibleToPlayers ? 'Visible to Players — click for GM-only' : 'GM Only — click to show players', 'aria-label': f.visibleToPlayers ? 'Visible to players — click for GM-only' : 'GM only — click to show players', 'aria-pressed': f.visibleToPlayers ? 'true' : 'false' });
        visBtn.innerHTML = getIconHTMLSync(f.visibleToPlayers ? 'eye' : 'eye-closed', 'currentColor');
        visBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFeatureVisibility(f.id); });

        const moreBtn = el('button', { class: 'row-more-btn', title: 'Edit properties', 'aria-label': `Edit properties for ${escapeHtml(f.name || 'this item')}` });
        moreBtn.innerHTML = getIconHTMLSync('dots-three-outline', 'currentColor');
        moreBtn.addEventListener('click', (e) => { e.stopPropagation(); window.openPropertiesSheet?.(f.id, 'feature'); });

        rowActions.append(visBtn, moreBtn);
        featureDetails.push(rowActions);
        featureRow.addEventListener('contextmenu', (e) => showAtlasContextMenu(e, 'feature', f.id, f.title));
      }

      featureRow.append(...featureDetails);
      featureRow.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          // If transitioning from a single-feature selection into multi-select,
          // carry the previous selection over. Guard against folder/map IDs.
          if (selectedId && multiSelectedIds.size === 0 && state.features.find(feat => feat.id === selectedId)) {
            multiSelectedIds.add(selectedId);
          }
          if (multiSelectedIds.has(f.id)) multiSelectedIds.delete(f.id);
          else multiSelectedIds.add(f.id);
          selectedId = null;
          render();
        } else {
          if (window.navigateAndPeek) window.navigateAndPeek(f.id, 'feature');
        }
      });
      parentElement.appendChild(featureRow);
    }
  };

  // --- RECURSIVE FOLDER RENDERER ---
  const renderFolderNode = async (folder, parentElement) => {
    const isFolderCollapsed = collapsedFolderNodes.has(folder.id);
    const folderNode = el('div', { class: `tree-node folder-node ${isFolderCollapsed ? 'collapsed' : ''}`, 'data-folder-id': folder.id });

    const folderLabel = el('span', { class: 'tree-label', text: folder.name });

    const folderIconWrap = el('div', { class: 'folder-icon-wrap item-icon' });
    folderIconWrap.innerHTML =
      `<div class="folder-icon-default">${getIconHTMLSync('folder', 'currentColor')}</div>` +
      `<div class="folder-icon-caret">${getIconHTMLSync(isFolderCollapsed ? 'caret-right' : 'caret-down', 'currentColor')}</div>`;

    const folderRow = el('div', { class: 'tree-row folder-row', 'data-folder-id': folder.id, onclick: (e) => { e.stopPropagation(); toggleFolderCollapsed(folder.id); } });
    if (query && !itemsToShow.has(folder.id)) folderRow.classList.add('ghost');
    if (role === 'gm') folderRow.addEventListener('contextmenu', (e) => showAtlasContextMenu(e, 'folder', folder.id, folder.name));

    folderRow.append(folderIconWrap, folderLabel);
    const folderChildrenContainer = el('div', { class: 'tree-children' });
    folderNode.append(folderRow, folderChildrenContainer);

    // OPTIMIZATION: Only render children if folder is expanded OR search is active
    if (!isFolderCollapsed || query) {
      const subFolders = state.folders.filter(f => f.parentFolderId === folder.id);
      subFolders.sort((a, b) => a.name.localeCompare(b.name));
      for (const sub of subFolders) {
        if (query && !itemsToShow.has(sub.id) && !ancestorsToShow.has(sub.id)) continue;
        await renderFolderNode(sub, folderChildrenContainer);
      }

      let featuresInFolder = state.features.filter(f => f.folderId === folder.id && f.mapId === folder.mapId);
      if (role === 'player') featuresInFolder = featuresInFolder.filter(f => f.visibleToPlayers);
      if (categoryFilter) featuresInFolder = featuresInFolder.filter(f => (f.category || '').toLowerCase() === categoryFilter);
      await renderFeatures(featuresInFolder, folderChildrenContainer);

      const mapsInFolder = state.maps.filter(m => m.folderId === folder.id && m.parentId === folder.mapId);
      for (const mapData of mapsInFolder) {
        await renderMapNode(mapData, folderChildrenContainer);
      }

      if (role === 'gm') {
        atlasSortable.push(new Sortable(folderChildrenContainer, { group: 'atlas', animation: 150, delay: 150, delayOnTouchOnly: false, ghostClass: 'sortable-ghost', multiDrag: true, selectedClass: 'selected', fallbackOnBody: true, forceFallback: true, scroll: document.getElementById('atlasPanel'), scrollSensitivity: 60, scrollSpeed: 8, onStart: _attachDragScroll, onMove: _atlasDragOnMove, onEnd: (e) => { _detachDragScroll(); handleAtlasDrop(e); } }));
      }
    }

    parentElement.appendChild(folderNode);
  };

  // --- MAP RENDERER ---
  const renderMapNode = async (mapData, parentElement) => {
    const isCollapsed = collapsedNodes.has(mapData.id);
    const mapNode = el('div', { class: `tree-node map-node ${isCollapsed ? 'collapsed' : ''}`, 'data-map-id': mapData.id });

    const mapIconWrap = el('div', { class: 'folder-icon-wrap item-icon' });
    mapIconWrap.innerHTML =
      `<div class="folder-icon-default">${getIconHTMLSync('map-trifold', 'currentColor')}</div>` +
      `<div class="folder-icon-caret">${getIconHTMLSync(isCollapsed ? 'caret-right' : 'caret-down', 'currentColor')}</div>`;
    mapIconWrap.addEventListener('click', (e) => { e.stopPropagation(); toggleNodeCollapsed(mapData.id); });

    const mapLabel = el('span', { class: 'tree-label', text: mapData.name });

    const mapRow = el('div', { class: `tree-row map-row`, onclick: () => navigateToMap(mapData.id, { skipInfoPanel: true }) });
    if (query && !itemsToShow.has(mapData.id)) mapRow.classList.add('ghost');

    let bannerUrl = await resolveImageUrl(`banner-${mapData.id}`);
    // Fallback: if no banner exists (e.g. imported from an older bundle), regenerate it from imageKey
    if (!bannerUrl && mapData.imageKey) {
      const sourceUrl = await resolveImageUrl(mapData.imageKey);
      if (sourceUrl) {
        bannerUrl = sourceUrl; // use full image immediately for display
        // Regenerate and store the proper banner thumbnail in the background
        try {
          const img = await new Promise((resolve, reject) => {
            const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = sourceUrl;
          });
          const canvas = document.createElement('canvas');
          canvas.width = 250; canvas.height = 40;
          const ctx = canvas.getContext('2d');
          const aspectRatio = 250 / 40;
          const sourceAspect = img.width / img.height;
          let sx, sy, sWidth, sHeight;
          if (sourceAspect > aspectRatio) {
            sHeight = img.height; sWidth = sHeight * aspectRatio;
            sx = (img.width - sWidth) / 2; sy = 0;
          } else {
            sWidth = img.width; sHeight = sWidth / aspectRatio;
            sx = 0; sy = (img.height - sHeight) / 2;
          }
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 250, 40);
          canvas.toBlob(async blob => {
            if (blob) await idbSet(`banner-${mapData.id}`, blob);
          }, 'image/jpeg', 0.85);
        } catch (_) { /* best-effort */ }
      }
    }
    if (bannerUrl) {
      mapRow.classList.add('has-banner');
      mapRow.style.background = `linear-gradient(rgba(34, 34, 38, 0.5), rgba(34, 34, 38, 0.5)), url('${bannerUrl}')`;
      mapRow.style.backgroundSize = 'cover';
      mapRow.style.backgroundPosition = 'center';
    } else {
      mapRow.style.background = `linear-gradient(135deg, var(--card), var(--bg))`;
    }

    const mapDetails = [mapIconWrap, mapLabel];
    if (mapData.parentId === null) mapDetails.push(el('span', { class: 'chip main', text: 'Main' }));
    mapDetails.push(el('div', { style: 'flex-grow: 1;' }));

    if (role === 'gm' && mapData.parentId !== null) {
      const mapRowActions = el('div', { class: 'row-actions' });

      const mapVisBtn = el('button', { class: `row-vis-btn ${mapData.visibleToPlayers ? 'is-player' : 'is-gm'}`, title: mapData.visibleToPlayers ? 'Visible to Players — click for GM-only' : 'GM Only — click to show players', 'aria-label': mapData.visibleToPlayers ? 'Visible to players — click for GM-only' : 'GM only — click to show players', 'aria-pressed': mapData.visibleToPlayers ? 'true' : 'false' });
      mapVisBtn.innerHTML = getIconHTMLSync(mapData.visibleToPlayers ? 'eye' : 'eye-closed', 'currentColor');
      mapVisBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMapVisibility(mapData.id); });

      const mapMoreBtn = el('button', { class: 'row-more-btn', title: 'Edit properties', 'aria-label': `Edit properties for ${escapeHtml(mapData.name || 'this map')}` });
      mapMoreBtn.innerHTML = getIconHTMLSync('dots-three-outline', 'currentColor');
      mapMoreBtn.addEventListener('click', (e) => { e.stopPropagation(); window.openPropertiesSheet?.(mapData.id, 'map'); });

      mapRowActions.append(mapVisBtn, mapMoreBtn);
      mapDetails.push(mapRowActions);
    }
    mapRow.append(...mapDetails);
    if (role === 'gm' && mapData.parentId !== null) {
      mapRow.addEventListener('contextmenu', (e) => showAtlasContextMenu(e, 'map', mapData.id, mapData.name));
    }

    const mapChildrenContainer = el('div', { class: 'tree-children' });
    mapNode.append(mapRow, mapChildrenContainer);
    parentElement.appendChild(mapNode);

    // OPTIMIZATION: Only render children if map is expanded OR search is active
    if (!isCollapsed || query) {
      // Recursive Build for Children of this Map
      await buildNode(mapData.id, mapChildrenContainer);

      if (role === 'gm') {
        atlasSortable.push(new Sortable(mapChildrenContainer, { group: 'atlas', animation: 150, delay: 150, delayOnTouchOnly: false, ghostClass: 'sortable-ghost', multiDrag: true, selectedClass: 'selected', fallbackOnBody: true, forceFallback: true, scroll: document.getElementById('atlasPanel'), scrollSensitivity: 60, scrollSpeed: 8, onStart: _attachDragScroll, onMove: _atlasDragOnMove, onEnd: (e) => { _detachDragScroll(); handleAtlasDrop(e); } }));
      }
    }
  };

  const buildNode = async (parentId, parentElement) => {
    // Get all direct children of the current map (parentId)

    // Exclude lore folders (mapId === null) — those render in #encyclopediaView below.
    let rootFolders = state.folders.filter(f => f.mapId === parentId && !f.parentFolderId && f.mapId !== null);
    if (query) {
      rootFolders = rootFolders.filter(f => itemsToShow.has(f.id) || ancestorsToShow.has(f.id));
    }
    rootFolders.sort((a, b) => a.name.localeCompare(b.name));
    for (const folder of rootFolders) {
      await renderFolderNode(folder, parentElement);
    }

    let rootFeatures = state.features.filter(f => f.mapId === parentId && !f.folderId && (role === 'gm' || f.visibleToPlayers));
    if (categoryFilter) rootFeatures = rootFeatures.filter(f => (f.category || '').toLowerCase() === categoryFilter);
    await renderFeatures(rootFeatures, parentElement);

    // Phase L — render lore pins under their map in a collapsible subsection
    if (parentId !== null) {
      let lorePins = (state.encyclopedia || [])
        .filter(e => e.mapId === parentId && (e.type || '').toLowerCase() !== 'session')
        .filter(e => role === 'gm' || e.visibleToPlayers);
      if (query) lorePins = lorePins.filter(e => itemsToShow.has(e.id));
      if (categoryFilter) lorePins = lorePins.filter(e => (e.type || '').toLowerCase() === categoryFilter);

      if (lorePins.length > 0) {
        const isLoreCollapsed = collapsedMapLoreNodes.has(parentId);
        const loreSubContainer = el('div', { class: `lore-in-map-container${isLoreCollapsed ? ' collapsed' : ''}`, 'data-lore-map-id': parentId });

        const caretWrap = el('div', { class: 'lore-subheader-caret' });
        caretWrap.innerHTML = getIconHTMLSync(isLoreCollapsed ? 'caret-right' : 'caret-down', 'currentColor');
        const loreSubheader = el('div', { class: 'lore-in-map-subheader tree-row' });
        loreSubheader.append(caretWrap, el('span', { text: 'Lore' }));
        loreSubheader.addEventListener('click', (e) => {
          e.stopPropagation();
          if (collapsedMapLoreNodes.has(parentId)) collapsedMapLoreNodes.delete(parentId);
          else collapsedMapLoreNodes.add(parentId);
          saveCollapsedState();
          refreshAtlasTree();
        });

        const loreItemsContainer = el('div', { class: 'lore-in-map-items tree-children' });
        loreSubContainer.append(loreSubheader, loreItemsContainer);

        if (!isLoreCollapsed || query) {
          lorePins.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          for (const entry of lorePins) {
            loreItemsContainer.appendChild(await buildEncyclopediaEntryItem(entry));
          }
        }
        parentElement.appendChild(loreSubContainer);
      }
    }

    let rootMaps = state.maps.filter(m => m.parentId === parentId && !m.folderId);
    if (role === 'player') rootMaps = rootMaps.filter(m => m.visibleToPlayers);
    if (query) rootMaps = rootMaps.filter(m => itemsToShow.has(m.id) || ancestorsToShow.has(m.id));
    if (sidebarFilterMode === 'local' && !query && parentId === null) rootMaps = rootMaps.filter(m => _activeMapAncestors.has(m.id));

    for (const mapData of rootMaps) {
      await renderMapNode(mapData, parentElement);
    }
  };

  // Build ancestor chain for local filter mode
  const _activeMapAncestors = new Set();
  if (sidebarFilterMode === 'local') {
    let curr = state.maps.find(m => m.id === state.activeMapId);
    while (curr) {
      _activeMapAncestors.add(curr.id);
      curr = curr.parentId ? state.maps.find(m => m.id === curr.parentId) : null;
    }
  }

  // Start building from the root (null parent)
  await buildNode(null, treeContainer);

  if (role === 'gm') {
    atlasSortable.push(new Sortable(treeContainer, { group: 'atlas', animation: 150, delay: 150, delayOnTouchOnly: false, ghostClass: 'sortable-ghost', multiDrag: true, selectedClass: 'selected', fallbackOnBody: true, forceFallback: true, scroll: document.getElementById('atlasPanel'), scrollSensitivity: 60, scrollSpeed: 8, onStart: _attachDragScroll, onMove: _atlasDragOnMove, onEnd: (e) => { _detachDragScroll(); handleAtlasDrop(e); } }));
  }

  const encView = el('div', { id: 'encyclopediaView' });

  // --- Filter Bar (sticky, top of panel — NN/g: filters above content) ---
  _atlasFilterDebounce?.cancel();
  const debouncedFilter = debounce(() => render({ full: true }), 250);
  _atlasFilterDebounce = debouncedFilter;

  const filterInputField = el('input', {
    type: 'text',
    id: 'atlasFilterInput',
    class: 'panel-filter-input',
    placeholder: 'Search world...',
    autocomplete: 'off',
    value: oldQuery,
  });
  filterInputField.addEventListener('input', () => {
    clearBtn.style.display = filterInputField.value ? '' : 'none';
    $('#panelSearchBtn')?.classList.toggle('active', !!filterInputField.value);
    debouncedFilter();
  });

  const clearBtn = el('button', {
    class: 'panel-filter-clear',
    title: 'Clear filter',
    style: oldQuery ? '' : 'display:none',
    innerHTML: getIconHTMLSync('x', 'currentColor'),
  });
  clearBtn.onclick = () => {
    filterInputField.value = '';
    clearBtn.style.display = 'none';
    render({ full: true });
  };

  // --- Tag Filter Dropdown ---
  // Collect all unique tags from encyclopedia entries
  const allTagsSorted = [...new Set(
    (state.encyclopedia || []).flatMap(e => e.tags || [])
  )].sort((a, b) => a.localeCompare(b));

  const tagDropdown = el('div', { class: `panel-tag-dropdown${activeTags.size > 0 ? ' has-active' : ''}` });
  let tagDropdownVisible = false;

  const renderTagDropdown = () => {
    tagDropdown.innerHTML = '';

    const matchRow = el('div', { class: 'tag-dropdown-match-row' });
    const matchLabel = el('span', { class: 'tag-dropdown-match-label', text: 'Match:' });
    const anyBtn = el('button', { class: `tag-match-btn${tagMatchMode === 'any' ? ' active' : ''}`, text: 'Any' });
    anyBtn.addEventListener('click', () => { tagMatchMode = 'any'; render({ full: true }); });
    const allBtn = el('button', { class: `tag-match-btn${tagMatchMode === 'all' ? ' active' : ''}`, text: 'All' });
    allBtn.addEventListener('click', () => { tagMatchMode = 'all'; render({ full: true }); });
    matchRow.append(matchLabel, anyBtn, allBtn);

    if (activeTags.size > 0) {
      const clearTagsBtn = el('button', { class: 'tag-dropdown-clear', text: 'Clear' });
      clearTagsBtn.addEventListener('click', () => { activeTags.clear(); render({ full: true }); });
      matchRow.append(clearTagsBtn);
    }

    const list = el('div', { class: 'tag-dropdown-list' });
    allTagsSorted.forEach(tag => {
      const isChecked = activeTags.has(tag);
      const row = el('label', { class: `tag-dropdown-item${isChecked ? ' checked' : ''}` });
      const cb = el('input', { type: 'checkbox' });
      cb.checked = isChecked;
      cb.addEventListener('change', () => {
        if (cb.checked) activeTags.add(tag); else activeTags.delete(tag);
        render({ full: true });
      });
      row.append(cb, el('span', { class: 'tag-dropdown-item-label', text: tag }));
      list.appendChild(row);
    });

    if (allTagsSorted.length === 0) {
      list.appendChild(el('div', { class: 'tag-dropdown-empty', text: 'No tags found' }));
    }

    tagDropdown.append(matchRow, list);
  };

  const tagFilterBtn = el('button', {
    class: `panel-tag-filter-btn${activeTags.size > 0 ? ' has-active' : ''}`,
    title: activeTags.size > 0 ? `Tag filter active (${activeTags.size})` : 'Filter by tags',
  });
  tagFilterBtn.innerHTML = getIconHTMLSync('tag', 'currentColor');
  if (activeTags.size > 0) {
    tagFilterBtn.appendChild(el('span', { class: 'tag-filter-count', text: String(activeTags.size) }));
  }

  const toggleTagDropdown = (show) => {
    tagDropdownVisible = show ?? !tagDropdownVisible;
    tagDropdown.classList.toggle('open', tagDropdownVisible);
    if (tagDropdownVisible) {
      renderTagDropdown();
    }
  };

  tagFilterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTagDropdown();
  });

  // Close on outside click
  const tagOutsideHandler = (e) => {
    if (!tagDropdown.contains(e.target) && !tagFilterBtn.contains(e.target)) {
      toggleTagDropdown(false);
    }
  };
  document.addEventListener('click', tagOutsideHandler);
  // Clean up when panel rebuilds
  const origDestroy = container.__tagOutsideHandler;
  if (origDestroy) document.removeEventListener('click', origDestroy);
  container.__tagOutsideHandler = tagOutsideHandler;

  // Auto-generate category chips from all articles — normalize to Title Case and deduplicate
  const normalizedCategoryMap = new Map(); // lowercase key → display label
  state.articles.forEach(a => {
    const raw = a.category || a.type || null;
    if (!raw) return;
    const trimmed = raw.trim();
    const key = trimmed.toLowerCase();
    if (!normalizedCategoryMap.has(key)) {
      const label = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      normalizedCategoryMap.set(key, label);
    }
  });
  // Sort by display label; use lowercase key as filter value for case-insensitive matching
  const sortedCategories = [...normalizedCategoryMap.entries()].sort((a, b) => a[1].localeCompare(b[1]));

  const makeChip = (filter, label, title) => {
    const btn = el('button', {
      class: `panel-type-btn${featureFilter === filter ? ' active' : ''}`,
      title: title || label,
    });
    btn.textContent = label;
    btn.addEventListener('click', () => {
      featureFilter = featureFilter === filter ? 'all' : filter;
      render({ full: true });
    });
    return btn;
  };

  const typeRow = el('div', { class: 'panel-filter-types' }, [
    makeChip('all', 'All', 'Show all entities'),
    makeChip('on-map', 'On Map', 'Show only map features'),
    ...sortedCategories.map(([key, label]) => makeChip(key, label, `Filter by ${label}`)),
  ]);

  const filterRowWrapper = el('div', { class: 'panel-filter-row-wrapper' }, [
    el('div', { class: 'panel-filter-row' }, [filterInputField, clearBtn, tagFilterBtn]),
    tagDropdown,
  ]);

  const filterBar = el('div', { class: 'panel-filter-bar' }, [
    filterRowWrapper,
    typeRow,
  ]);

  if (wasFilterFocused) {
    setTimeout(() => {
      filterInputField.focus();
      filterInputField.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  }

  // --- Section header helpers ---
  const makeSectionHeader = (label, isCollapsed, contentEl, items) => {
    const header = el('div', { class: `panel-section-header${isCollapsed ? ' is-collapsed' : ''}` });
    const caretWrap = el('div', { class: 'panel-section-caret' });
    caretWrap.innerHTML = getIconHTMLSync(isCollapsed ? 'caret-right' : 'caret-down', 'currentColor');
    const title = el('span', { class: 'panel-section-title', text: label });
    const toggleArea = el('div', { class: 'panel-section-toggle' });
    toggleArea.append(caretWrap, title);
    toggleArea.addEventListener('click', () => {
      const nowCollapsed = !header.classList.contains('is-collapsed');
      header.classList.toggle('is-collapsed', nowCollapsed);
      caretWrap.innerHTML = getIconHTMLSync(nowCollapsed ? 'caret-right' : 'caret-down', 'currentColor');
      contentEl.classList.toggle('section-hidden', nowCollapsed);
      if (label === 'Atlas') mapsSectionCollapsed = nowCollapsed;
      else if (label === 'Sessions') sessionsSectionCollapsed = nowCollapsed;
      else if (label === 'Lore') loreSectionCollapsed = nowCollapsed;
    });

    header.append(toggleArea);

    if (items && items.length) {
      const addBtn = el('button', { class: 'panel-section-add-btn', title: `Add to ${label}`, 'aria-label': `Add to ${label}` });
      addBtn.innerHTML = getIconHTMLSync('plus', 'currentColor') || '+';
      const popover = el('div', { class: 'panel-section-popover' });
      items.forEach(({ text, action }) => {
        const item = el('button', { class: 'panel-section-popover-item', text });
        item.addEventListener('click', (e) => { e.stopPropagation(); _closeSectionPopover(); action(); });
        popover.appendChild(item);
      });
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = _openSectionPopover === popover;
        _closeSectionPopover();
        if (!isOpen) {
          const rect = addBtn.getBoundingClientRect();
          popover.style.top   = (rect.bottom + 4) + 'px';
          popover.style.right = (window.innerWidth - rect.right) + 'px';
          popover.classList.add('open');
          document.body.appendChild(popover);
          _openSectionPopover = popover;
        }
      });
      header.append(addBtn);
    }

    return header;
  };

  if (mapsSectionCollapsed) treeContainer.classList.add('section-hidden');
  if (loreSectionCollapsed) encView.classList.add('section-hidden');

  const mapsHeader = makeSectionHeader('Atlas', mapsSectionCollapsed, treeContainer, role !== 'player' ? [
    { text: 'New Map',    action: () => showInputModal('New Map', 'Map name', 'New Map', (name) => createNewMap(name)) },
    { text: 'New Folder', action: () => window.createNewFolder(state.activeMapId) },
  ] : null);

  const loreHeader = makeSectionHeader('Lore', loreSectionCollapsed, encView, role !== 'player' ? [
    { text: 'New Entry',  action: () => window.createNewEncyclopediaEntry?.() },
    { text: 'New Folder', action: () => window.createNewFolder(null) },
  ] : null);
  loreHeader.classList.add('panel-section-header--lore');

  const sessionNodes = [mapsHeader, treeContainer, loreHeader, encView];
  let sessionsViewEl = null;
  if (role === 'gm') {
    sessionsViewEl = el('div', { id: 'sessionsView' });
    if (sessionsSectionCollapsed) sessionsViewEl.classList.add('section-hidden');
    const sessionsHeader = makeSectionHeader('Sessions', sessionsSectionCollapsed, sessionsViewEl, [
      { text: 'New Session', action: () => window.createNewSession?.() },
    ]);
    sessionsHeader.classList.add('panel-section-header--sessions');
    sessionNodes.push(sessionsHeader, sessionsViewEl);
  }

  if (!filterBarExpanded) filterBar.classList.add('filter-bar-hidden');
  container.append(filterBar, ...sessionNodes);
  if (_atlasScrollHandler) container.removeEventListener('scroll', _atlasScrollHandler);
  _atlasScrollHandler = () => filterBar.classList.toggle('is-elevated', container.scrollTop > 4);
  container.addEventListener('scroll', _atlasScrollHandler, { passive: true });
  updateSelectionStyles();
  updateCollapseExpandAllBtn();

  // Sync search button active state (onclick is owned by setupPrimaryPanelTabs)
  syncPanelSearchBtn();

  isAtlasRefreshing = false;
  await refreshEncyclopediaView(); // populate the inline lore section
  await refreshSessionsView();    // populate the GM-only sessions section
} catch (e) {
  console.error("Atlas Refresh failed", e);
  isAtlasRefreshing = false;
}
}

// --- Assets View ---
const ASSETS_PER_PAGE = 24;
let _assetPage = 0;
let _cachedAssetKeys = null;
let _assetRenderPending = false;

function getAssetDisplayName(key) {
  if (key.startsWith('banner-')) {
    const id = key.slice('banner-'.length);
    const map = (state.maps || []).find(m => m.id === id);
    return map ? `Banner · ${map.name}` : 'Banner';
  }
  if (key.startsWith('bg-img-')) {
    const id = key.slice('bg-img-'.length);
    const map = (state.maps || []).find(m => m.id === id);
    return map ? `Map BG · ${map.name}` : 'Map BG';
  }
  if (key.startsWith('img-')) {
    if (state.assetNames?.[key]) return state.assetNames[key];
    // Check if this blob is used as a custom CoA upload
    const all = [...(state.features || []), ...(state.encyclopedia || [])];
    const owner = all.find(e => e.coatOfArmsKey === key);
    if (owner) return `CoA · ${owner.title || owner.name || 'Untitled'}`;
  }
  return key;
}

let isAssetsRefreshing = false;
async function refreshAssetsView(resetPage = true) {
  if (isAssetsRefreshing) return;
  isAssetsRefreshing = true;
  if (resetPage) _assetPage = 0;

  try {
    const container = $('#assetsGrid');
    if (!container) return;

    // Re-fetch from IDB on page reset or when cache is stale
    if (!_cachedAssetKeys || resetPage) {
      _cachedAssetKeys = await idbGetAllKeys('files');
    }

    const query = normalizeForSearch(($('#assetsFilterInput')?.value || '').trim());

    const imageKeys = _cachedAssetKeys.filter(k =>
      (k.startsWith('img-') || k.startsWith('banner-') || k.startsWith('bg-img-')) &&
      (!query || normalizeForSearch(k).includes(query) || normalizeForSearch(getAssetDisplayName(k)).includes(query))
    );

    container.innerHTML = '';

    if (imageKeys.length === 0) {
      container.appendChild(buildPanelEmptyState(
        'image',
        query ? 'No assets match your filter' : 'No assets uploaded',
        query ? 'Try a different search term.' : 'Upload images via entity hero panels or drag files onto the app.'
      ));
      _renderAssetPagination(0, 0, 0);
      return;
    }

    const totalPages = Math.ceil(imageKeys.length / ASSETS_PER_PAGE);
    // Clamp before snapshotting — prevents out-of-range reads after async work
    if (_assetPage >= totalPages) _assetPage = Math.max(0, totalPages - 1);
    const page = _assetPage; // snapshot: immune to further clicks during async

    const start = page * ASSETS_PER_PAGE;
    const slice = imageKeys.slice(start, start + ASSETS_PER_PAGE);

    const assetData = await Promise.all(slice.map(async key => {
      const url = await resolveImageUrl(key);
      return { key, url };
    }));

    const fragment = document.createDocumentFragment();

    for (const { key, url } of assetData) {
      if (!url) continue;

      const meta = state.assetMeta?.[key];
      const cardAttrs = { class: 'asset-card', draggable: role === 'gm', 'data-key': key };
      if (meta) {
        cardAttrs.class += ' has-attribution';
        cardAttrs['data-license'] = meta.licenseLabel || meta.license || '';
        cardAttrs.title = `${meta.title || 'Untitled'} — by ${meta.author || 'Unknown'} (${meta.licenseLabel || meta.license || 'unknown license'}) · ${meta.sourceLabel || 'External source'}`;
      }
      const card = el('div', cardAttrs);
      const img  = el('img', { src: url, loading: 'lazy' });

      const actions   = el('div', { class: 'asset-actions' });
      const nameLabel = el('span', { class: 'asset-name-label', text: getAssetDisplayName(key) });

      let delBtn = null;
      if (role === 'gm') {
        delBtn = el('button', { class: 'asset-delete-btn', title: 'Delete Asset' }, [
          el('div', { class: 'icon-container', style: '-webkit-mask-image: url("ui-icons/x-circle.svg"); mask-image: url("ui-icons/x-circle.svg");' })
        ]);
        delBtn.onclick = (e) => {
          e.stopPropagation();
          showConfirmationModal('Delete Asset?', 'Delete this asset? This will break any features using it.', 'Delete', () => {
            idbDelete(key).then(() => {
              _cachedAssetKeys = null;
              let metaDirty = false;
              if (state.assetNames?.[key])  { delete state.assetNames[key];  metaDirty = true; }
              if (state.assetMeta?.[key])   { delete state.assetMeta[key];   metaDirty = true; }
              if (metaDirty) { markEntityDirty('meta'); debouncedSave(); }
              refreshAssetsView(true);
            });
          });
        };
      }

      card.ondragstart = (e) => {
        e.dataTransfer.setData('application/x-taleprove-asset', key);
        e.dataTransfer.setData('text/plain', key);
        e.dataTransfer.effectAllowed = 'copy';
      };
      card.onclick = () => {
        navigator.clipboard.writeText(key);
        showToast('Asset key copied to clipboard');
      };

      if (delBtn) actions.append(nameLabel, delBtn);
      else actions.appendChild(nameLabel);
      card.append(img, actions);
      fragment.appendChild(card);
    }

    if (!_assetRenderPending) {
      _assetRenderPending = true;
      requestAnimationFrame(() => {
        container.appendChild(fragment);
        _renderAssetPagination(page, totalPages, imageKeys.length); // use snapshot, not _assetPage
        _assetRenderPending = false;
      });
    }
  } finally {
    isAssetsRefreshing = false;
  }
}

function _renderAssetPagination(page, totalPages, totalCount) {
  const pag = document.getElementById('assetsPagination');
  if (!pag) return;
  pag.innerHTML = '';
  if (totalPages <= 1) {
    if (totalCount > 0) pag.appendChild(el('span', { class: 'assets-count', text: `${totalCount} asset${totalCount !== 1 ? 's' : ''}` }));
    return;
  }
  const showEdge = totalPages > 2;
  const first = showEdge ? el('button', { class: 'assets-page-btn assets-page-btn--edge', 'aria-label': 'First page' }) : null;
  if (first) first.textContent = '«';
  const prev = el('button', { class: 'assets-page-btn', 'aria-label': 'Previous page' });
  prev.textContent = '‹';
  const next = el('button', { class: 'assets-page-btn', 'aria-label': 'Next page' });
  next.textContent = '›';
  const last = showEdge ? el('button', { class: 'assets-page-btn assets-page-btn--edge', 'aria-label': 'Last page' }) : null;
  if (last) last.textContent = '»';
  const info = el('span', { class: 'assets-page-info', text: `${page + 1} / ${totalPages}` });

  if (page === 0) {
    prev.disabled = true;
    if (first) first.disabled = true;
  }
  if (page >= totalPages - 1) {
    next.disabled = true;
    if (last) last.disabled = true;
  }

  if (first) first.onclick = () => { _assetPage = 0; refreshAssetsView(false); };
  prev.onclick = () => { _assetPage = Math.max(0, _assetPage - 1); refreshAssetsView(false); };
  next.onclick = () => { _assetPage = Math.min(totalPages - 1, _assetPage + 1); refreshAssetsView(false); };
  if (last) last.onclick = () => { _assetPage = totalPages - 1; refreshAssetsView(false); };

  pag.append(...[first, prev, info, next, last].filter(Boolean));
}

// Only invalidate cache on visibility change, don't trigger a heavy re-render.
// This prevents the "5-second lag" caused by wiping the UI on refocus.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    _cachedAssetKeys = null; // Forces fresh check on NEXT manual refresh or tab switch
  }
});

// --- Encyclopedia Entry Item Builder ---
async function buildEncyclopediaEntryItem(entry) {
  const iconHtml = await getSidebarIconHTML(entry);

  const item = el('div', {
    class: 'encyclopedia-item tree-row',
    'data-entry-id': entry.id,
    'data-first-letter': (entry.name || '').charAt(0).toUpperCase() || '#',
    tabindex: '0',
    draggable: role === 'gm',
    title: role === 'gm' && !entry.mapId ? 'Drag onto the map to place a pin' : '',
    onclick: (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Carry a single selection into multi-select when transitioning
        if (selectedEncyclopediaEntryId && multiSelectedIds.size === 0) {
          multiSelectedIds.add(selectedEncyclopediaEntryId);
        }
        if (multiSelectedIds.has(entry.id)) multiSelectedIds.delete(entry.id);
        else multiSelectedIds.add(entry.id);
        selectedEncyclopediaEntryId = null;
      } else {
        multiSelectedIds.clear();
        if (window.navigateAndPeek) window.navigateAndPeek(entry.id, 'encyclopedia');
      }
    },
    oncontextmenu: role === 'gm' ? (e) => showAtlasContextMenu(e, 'encyclopedia', entry.id, entry.name) : null,
    ondragstart: (e) => {
      e.dataTransfer.setData('text/plain', `[[${entry.name || 'Untitled'}]]`);
      e.dataTransfer.setData('application/x-taleprove-entry', entry.id);
      // Don't override effectAllowed — SortableJS sets it to 'move' and the
      // map's dragover handler uses 'move' for encyclopedia entry drops.
    }
  }, [
    el('div', { class: 'item-icon', innerHTML: iconHtml }),
    el('span', { class: 'entry-name tree-label', text: entry.name || '(untitled)' }),
    el('div', { style: 'flex-grow: 1;' }),
    (() => {
      const encRowActions = el('div', { class: 'row-actions' });

      // Type label — shown on hover as muted chip (not always-visible to reduce noise)
      const typeChip = el('span', { class: 'chip chip--type', text: entry.type || 'Untyped' });
      encRowActions.append(typeChip);

      // Backlinks badge — always visible when entry has inbound wiki-links
      const blCount = window.getBacklinks ? window.getBacklinks(entry.name, entry.id).length : 0;
      if (blCount > 0) {
        encRowActions.append(el('span', {
          class: 'backlinks-row-badge',
          text: `#${blCount}`,
          title: `Referenced by ${blCount} article${blCount !== 1 ? 's' : ''}`,
        }));
      }

      // "On map" chip — shown for GM only when the entry has a placed pin
      if (role === 'gm' && entry.mapId) {
        const mapName = (state.maps || []).find(m => m.id === entry.mapId)?.name || 'Map';
        const mapChip = el('span', { class: 'chip chip--map', title: `Placed on ${escapeHtml(mapName)}`, text: mapName });
        encRowActions.append(mapChip);
      }

      if (role === 'gm') {
        const encVisBtn = el('button', { class: `row-vis-btn ${entry.visibleToPlayers ? 'is-player' : 'is-gm'}`, title: entry.visibleToPlayers ? 'Visible to Players — click for GM-only' : 'GM Only — click to show players', 'aria-label': entry.visibleToPlayers ? 'Visible to players — click for GM-only' : 'GM only — click to show players', 'aria-pressed': entry.visibleToPlayers ? 'true' : 'false' });
        encVisBtn.innerHTML = getIconHTMLSync(entry.visibleToPlayers ? 'eye' : 'eye-closed', 'currentColor');
        encVisBtn.addEventListener('click', (e) => { e.stopPropagation(); window.toggleEncyclopediaEntryVisibility(entry.id); });

        const encMoreBtn = el('button', { class: 'row-more-btn', title: 'Edit properties', 'aria-label': `Edit properties for ${escapeHtml(entry.name || 'this entry')}` });
        encMoreBtn.innerHTML = getIconHTMLSync('dots-three-outline', 'currentColor');
        encMoreBtn.addEventListener('click', (e) => { e.stopPropagation(); window.openPropertiesSheet?.(entry.id, 'encyclopedia'); });

        encRowActions.append(encVisBtn, encMoreBtn);
      }

      return encRowActions;
    })()
  ]);
  if (multiSelectedIds.has(entry.id) || selectedEncyclopediaEntryId === entry.id) {
    item.classList.add('selected');
  }
  return item;
}

// --- Encyclopedia View ---
let isEncyclopediaRefreshing = false;
async function refreshEncyclopediaView() {
  if (isEncyclopediaRefreshing) return;
  isEncyclopediaRefreshing = true;

  try {
    encyclopediaSortable.forEach(s => s.destroy());
    encyclopediaSortable = [];

    const container = $('#encyclopediaView');
    if (!container) { isEncyclopediaRefreshing = false; return; }

    const atlasInput = $('#atlasFilterInput');
    const oldQuery = atlasInput ? atlasInput.value : '';

    container.innerHTML = '';

    const query = normalizeForSearch(oldQuery.trim());
  // Exclude sessions — rendered in the Sessions section.
  // All lore (placed and unplaced) lives here. The Lore section is the organisational home;
  // the Atlas tree's lore subsection is a read-only navigation view of placed entries.
  const allEntries = (state.encyclopedia || [])
    .filter(e => (e.type || '').toLowerCase() !== 'session')
    .filter(e => sidebarFilterMode === 'local' ? e.mapId === state.activeMapId : true);
  // Phase B.2: lore folders live in state.folders with mapId == null
  const allFolders = state.folders.filter(f => f.mapId == null);
  let entriesToShow = new Set();
  let foldersToShow = new Set();

  const encCategoryFilter = (featureFilter !== 'all' && featureFilter !== 'on-map') ? featureFilter : null;
  const hasTagFilter = activeTags.size > 0;
  const hasFilter = query || encCategoryFilter || hasTagFilter;
  if (hasFilter) {
    allEntries.forEach(e => {
      const nameMatch = query ? normalizeForSearch(e.name).includes(query) : true;
      const typeMatch = query ? normalizeForSearch(e.type).includes(query) : true;
      const tagsMatch = query ? normalizeForSearch((e.tags || []).join(' ')).includes(query) : true;
      const textMatch = nameMatch || typeMatch || tagsMatch;
      const categoryMatch = encCategoryFilter ? (e.type || '').toLowerCase() === encCategoryFilter : true;
      const entryTags = e.tags || [];
      const tagMatch = !hasTagFilter || (tagMatchMode === 'any'
        ? [...activeTags].some(t => entryTags.includes(t))
        : [...activeTags].every(t => entryTags.includes(t)));
      if (textMatch && categoryMatch && tagMatch) {
        entriesToShow.add(e.id);
        // Bubble up the full folder ancestry so parent folders stay visible
        let fid = e.folderId;
        while (fid) {
          foldersToShow.add(fid);
          const pf = allFolders.find(f => f.id === fid);
          fid = pf ? pf.parentFolderId : null;
        }
      }
    });
    // Folder name match only applies to text search, not letter filter
    if (query) {
      allFolders.forEach(f => {
        if (normalizeForSearch(f.name).includes(query)) foldersToShow.add(f.id);
      });
    }
  }

  const listContainer = el('div', {
    class: 'encyclopedia-list',
    style: 'padding: 0.75rem 1rem;'
  });

  let entriesToRender = hasFilter ? allEntries.filter(e => entriesToShow.has(e.id)) : allEntries;
  if (encCategoryFilter) entriesToRender = entriesToRender.filter(e => (e.type || '').toLowerCase() === encCategoryFilter);
  // "On Map" chip filter — show only entries that have a placed pin
  if (featureFilter === 'on-map') entriesToRender = entriesToRender.filter(e => !!e.mapId);
  // tag filter (applied outside hasFilter path too, when no text/letter/category filter is active)
  if (hasTagFilter && !hasFilter) {
    entriesToRender = entriesToRender.filter(e => {
      const entryTags = e.tags || [];
      return tagMatchMode === 'any'
        ? [...activeTags].some(t => entryTags.includes(t))
        : [...activeTags].every(t => entryTags.includes(t));
    });
  }

  // --- RECURSIVE FOLDER RENDERER ---
  const renderEncFolderNode = async (folder, parentElement) => {
    const subFolders = allFolders
      .filter(f => f.parentFolderId === folder.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    // When a text query matches a folder name, show all entries in that folder.
    const entriesInFolder = (query && folder.name.toLowerCase().includes(query)
      ? allEntries
      : entriesToRender
    ).filter(e => e.folderId === folder.id);

    // During any filter, skip folders with nothing to show
    if (hasFilter && !foldersToShow.has(folder.id) && entriesInFolder.length === 0 && subFolders.length === 0) return;

    const isCollapsed = collapsedEncyclopediaFolderNodes.has(folder.id);
    const folderNode = el('div', { class: `tree-node folder-node ${isCollapsed ? 'collapsed' : ''}`, 'data-folder-id': folder.id });
    const folderLabel = el('span', { class: 'tree-label', text: folder.name });
    const folderIconWrap = el('div', { class: 'folder-icon-wrap item-icon' });
    folderIconWrap.innerHTML =
      `<div class="folder-icon-default">${getIconHTMLSync('folder', 'currentColor')}</div>` +
      `<div class="folder-icon-caret">${getIconHTMLSync(isCollapsed ? 'caret-right' : 'caret-down', 'currentColor')}</div>`;
    const folderRow = el('div', {
      class: 'tree-row folder-row',
      oncontextmenu: role === 'gm' ? (e) => showAtlasContextMenu(e, 'encyclopedia-folder', folder.id, folder.name) : null
    });
    folderRow.addEventListener('click', (e) => { e.stopPropagation(); toggleEncyclopediaFolderCollapsed(folder.id); });
    if (role === 'gm') {
      folderRow.addEventListener('dragover', (e) => {
        if (!e.dataTransfer.types.includes('application/x-taleprove-entry')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        folderRow.classList.add('drag-over');
      });
      folderRow.addEventListener('dragleave', () => folderRow.classList.remove('drag-over'));
      folderRow.addEventListener('drop', (e) => {
        e.preventDefault();
        folderRow.classList.remove('drag-over');
        const entryId = e.dataTransfer.getData('application/x-taleprove-entry');
        if (!entryId) return;
        handleEncyclopediaFolderDrop(entryId, folder.id);
      });
    }
    folderRow.append(folderIconWrap, folderLabel);
    const folderChildrenContainer = el('div', { class: 'tree-children' });
    folderNode.append(folderRow, folderChildrenContainer);

    // OPTIMIZATION: Only render children if expanded OR search is active
    if (!isCollapsed || hasFilter) {
      for (const sub of subFolders) {
        await renderEncFolderNode(sub, folderChildrenContainer);
      }
      entriesInFolder.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      for (const entry of entriesInFolder) {
        folderChildrenContainer.appendChild(await buildEncyclopediaEntryItem(entry));
      }
      if (role === 'gm') {
        encyclopediaSortable.push(new Sortable(folderChildrenContainer, { group: 'encyclopedia', animation: 150, delay: 150, delayOnTouchOnly: false, ghostClass: 'sortable-ghost', multiDrag: true, selectedClass: 'selected', fallbackOnBody: true, forceFallback: true, onStart: _attachDragScroll, onEnd: (e) => { _detachDragScroll(); handleEncyclopediaDrop(e); } }));
      }
    }
    parentElement.appendChild(folderNode);
  };

  // Root folders (no parent)
  const rootFolders = allFolders.filter(f => !f.parentFolderId).sort((a, b) => a.name.localeCompare(b.name));
  for (const folder of rootFolders) {
    await renderEncFolderNode(folder, listContainer);
  }

  // Unfiled entries
  const entriesWithoutFolder = entriesToRender.filter(e => !e.folderId);
  entriesWithoutFolder.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  for (const entry of entriesWithoutFolder) {
    listContainer.appendChild(await buildEncyclopediaEntryItem(entry));
  }

  // Empty state
  if (!query && !encCategoryFilter && !hasTagFilter && listContainer.children.length === 0) {
    listContainer.appendChild(buildPanelEmptyState(
      'book-open',
      'No lore entries yet',
      'Characters, items, and locations for your world.',
      role === 'gm' ? { text: 'Create First Entry', action: () => window.createNewEncyclopediaEntry?.() } : null
    ));
  }

  if (role === 'gm') encyclopediaSortable.push(new Sortable(listContainer, { group: 'encyclopedia', animation: 150, delay: 150, delayOnTouchOnly: false, ghostClass: 'sortable-ghost', multiDrag: true, selectedClass: 'selected', fallbackOnBody: true, forceFallback: true, onStart: _attachDragScroll, onEnd: (e) => { _detachDragScroll(); handleEncyclopediaDrop(e); } }));

  container.append(listContainer);
  updateCollapseExpandAllBtn();

  isEncyclopediaRefreshing = false;
} catch (e) {
  console.error("Encyclopedia refresh failed", e);
  isEncyclopediaRefreshing = false;
}
}

// --- Sessions View ---
let isSessionsRefreshing = false;

async function refreshSessionsView() {
  if (isSessionsRefreshing) return;
  isSessionsRefreshing = true;

  try {
    const container = $('#sessionsView');
    if (!container || role !== 'gm') { isSessionsRefreshing = false; return; }

    container.innerHTML = '';

    const sessions = (state.encyclopedia || [])
      .filter(e => (e.type || '').toLowerCase() === 'session')
      .sort((a, b) => (b.sessionData?.number || 0) - (a.sessionData?.number || 0));

    const listContainer = el('div', { class: 'encyclopedia-list', style: 'padding: 0.75rem 1rem;' });

    if (sessions.length === 0) {
      listContainer.appendChild(buildPanelEmptyState(
        'note',
        'No sessions yet',
        'Record your play sessions here.',
        { text: 'Create First Session', action: () => window.createNewSession?.() }
      ));
    } else {
      for (const session of sessions) {
        const numBadge = el('span', {
          class: 'session-num-badge',
          text: session.sessionData?.number != null ? `#${session.sessionData.number}` : '#?'
        });
        const nameSpan = el('span', { class: 'entry-name tree-label', text: session.name || '(untitled)' });
        const dateSpan = session.sessionData?.realDate
          ? el('span', { class: 'session-real-date', text: session.sessionData.realDate })
          : null;

        const rowActions = el('div', { class: 'row-actions' });
        const moreBtn = el('button', { class: 'row-more-btn', title: 'Edit properties', 'aria-label': `Edit properties for ${escapeHtml(session.name || 'session')}` });
        moreBtn.innerHTML = getIconHTMLSync('dots-three-outline', 'currentColor');
        moreBtn.addEventListener('click', (e) => { e.stopPropagation(); window.openPropertiesSheet?.(session.id, 'encyclopedia'); });
        rowActions.append(moreBtn);

        const item = el('div', {
          class: `session-item encyclopedia-item tree-row${selectedEncyclopediaEntryId === session.id ? ' selected' : ''}`,
          'data-entry-id': session.id,
          tabindex: '0',
          onclick: () => { if (window.navigateAndPeek) window.navigateAndPeek(session.id, 'encyclopedia'); },
          oncontextmenu: (e) => showAtlasContextMenu(e, 'encyclopedia', session.id, session.name)
        }, [numBadge, nameSpan, el('div', { style: 'flex-grow:1' }), dateSpan, rowActions].filter(Boolean));

        listContainer.appendChild(item);
      }
    }

    container.appendChild(listContainer);
  } catch (e) {
    console.error('Sessions refresh failed', e);
  } finally {
    isSessionsRefreshing = false;
  }
}

// --- Breadcrumbs ---
function refreshBreadcrumbs() {
  const container = $('#breadcrumbContainer');
  if (!container) return;

  container.innerHTML = '';

  const trail = [];
  let currentMapId = state.activeMapId;
  while (currentMapId) {
    const map = state.maps.find(m => m.id === currentMapId);
    if (map) {
      trail.unshift(map);
      currentMapId = map.parentId;
    } else {
      break;
    }
  }

  const mainMap = state.maps.find(m => m.parentId === null);
  const iconHtml = mainMap ? (getIconHTMLSync('house', 'currentColor') || '') : '';

  const projectLink = el('a', {
    class: 'breadcrumb-link breadcrumb-world-root',
    id: 'projectNameBreadcrumb',
    href: '#',
    title: 'Click to go home · Double-click to rename',
  });
  projectLink.innerHTML = iconHtml + `<span class="breadcrumb-world-name">${escapeHtml(settings.projectName)}</span>`;
  document.title = settings.projectName ? `${settings.projectName} — TaleTrove` : 'TaleTrove';

  if (settings.projectName === 'Untitled World') {
    projectLink.classList.add('attention-glow');
  }
  container.appendChild(projectLink);

  // If there are maps in the trail, add the spacer and the rest of the breadcrumbs
  if (trail.length > 0) {
    // Add a flexible spacer to push right-aligned controls to the end.
    container.appendChild(el('div', { class: 'breadcrumb-spacer' }));

    container.appendChild(el('span', { class: 'breadcrumb-main-separator', text: '|' }));

    trail.forEach((map, index) => {
      const isFirst = index === 0;
      const isLast = index === trail.length - 1;
      const isMiddle = !isFirst && !isLast;

      // Collapse intermediate crumbs to a single '…' when trail has >2 maps
      if (trail.length > 2 && isMiddle) {
        if (index === 1) {
          // Add ellipsis once, with full path in title for hover/a11y
          container.appendChild(el('span', { class: 'breadcrumb-separator', text: '›' }));
          container.appendChild(el('span', {
            class: 'breadcrumb-ellipsis',
            text: '…',
            title: trail.slice(1, -1).map(m => m.name).join(' › ')
          }));
        }
        return;
      }

      if (!isFirst) container.appendChild(el('span', { class: 'breadcrumb-separator', text: '›' }));

      if (isLast) {
        container.appendChild(el('span', { class: 'breadcrumb-current', text: map.name }));
      } else {
        container.appendChild(el('a', { class: 'breadcrumb-link', href: '#', text: map.name, onclick: () => navigateToMap(map.id, { skipInfoPanel: true }) }));
      }
    });
  }
}

// --- Compact Mode ---
let panelCompact = loadLS('panelCompact') === true;

// --- Sidebar Filter Mode ---
let sidebarFilterMode = loadLS('sidebarFilterMode', 'global'); // 'global' | 'local'

function updateSidebarFilterBtn() {
  const btn = $('#sidebarFilterBtn');
  if (!btn) return;
  btn.innerHTML = getIconHTMLSync('map-trifold', 'currentColor');
  const isLocal = sidebarFilterMode === 'local';
  btn.classList.toggle('active', isLocal);
  btn.setAttribute('aria-pressed', isLocal ? 'true' : 'false');
  btn.title = isLocal ? 'Show all entries' : 'This map only';
}

function applyCompactMode() {
  const panel = document.getElementById('atlasPanel');
  if (!panel) return;
  panel.classList.toggle('panel-compact', panelCompact);
}

function updateCompactModeBtn() {
  const btn = $('#compactModeBtn');
  if (!btn) return;
  if (activePrimaryTab === 'assets') {
    btn.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  btn.classList.toggle('active', panelCompact);
  btn.title = panelCompact ? 'Comfortable View' : 'Compact View';
  btn.innerHTML = getIconHTMLSync('list', 'currentColor');
}

// --- Collapse/Expand All ---
let activePrimaryTab = 'atlas';

function updateCollapseExpandAllBtn() {
  const btn = $('#collapseExpandAllBtn');
  if (!btn) return;

  if (activePrimaryTab === 'assets') {
    btn.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');

  // Unified world panel — atlas and lore are one view
  const hasSomeCollapsed = collapsedNodes.size > 0 || collapsedFolderNodes.size > 0 || collapsedEncyclopediaFolderNodes.size > 0 || collapsedMapLoreNodes.size > 0;

  btn.innerHTML = getIconHTMLSync('folder', 'currentColor');
  btn.title = hasSomeCollapsed ? 'Expand All' : 'Collapse All';
}

// --- Primary Panel Tabs (Atlas / Encyclopedia / Assets) ---
function setupPrimaryPanelTabs() {
  const atlasTab = $('#atlasTabBtn');
  const encyclopediaTab = $('#encyclopediaTabBtn');
  const assetsTab = $('#assetsTabBtn'); // NEW
  const atlasView = $('#atlasView');
  const encyclopediaView = $('#encyclopediaView');
  const assetsView = $('#assetsView'); // NEW

  if (!atlasTab || !assetsTab) return;

  const collapseExpandAllBtn = $('#collapseExpandAllBtn');

  const switchTab = (target) => {
    // Remove active from all visible tabs
    [atlasTab, assetsTab].forEach(t => t.classList.remove('active'));
    [atlasView, assetsView].forEach(v => v.classList.remove('active'));

    activePrimaryTab = target;

    // Add active to target — encyclopedia redirects to the unified world view
    if (target === 'atlas' || target === 'encyclopedia') {
      atlasTab.classList.add('active');
      atlasView.classList.add('active');
      if (target === 'encyclopedia') refreshEncyclopediaView(); // refresh lore section
    } else if (target === 'assets') {
      assetsTab.classList.add('active');
      assetsView.classList.add('active');
      window.refreshAssetsView();
    }

    // Sync search button state to the active tab's filter bar
    syncPanelSearchBtn();

    updateCollapseExpandAllBtn();
    updateCompactModeBtn();
  };

  if (collapseExpandAllBtn) {
    collapseExpandAllBtn.addEventListener('click', () => {
      if (activePrimaryTab === 'atlas' || activePrimaryTab === 'encyclopedia') {
        // Unified world panel: collapse/expand all atlas nodes, lore folders, and map lore subsections together
        const hasSomeCollapsed = collapsedNodes.size > 0 || collapsedFolderNodes.size > 0 || collapsedEncyclopediaFolderNodes.size > 0 || collapsedMapLoreNodes.size > 0;
        if (hasSomeCollapsed) {
          collapsedNodes.clear();
          collapsedFolderNodes.clear();
          collapsedEncyclopediaFolderNodes.clear();
          collapsedMapLoreNodes.clear();
        } else {
          state.maps.forEach(m => collapsedNodes.add(m.id));
          state.folders.forEach(f => collapsedFolderNodes.add(f.id));
          state.folders.filter(f => f.mapId == null).forEach(f => collapsedEncyclopediaFolderNodes.add(f.id));
          state.maps.forEach(m => collapsedMapLoreNodes.add(m.id));
        }
        saveCollapsedState();
        refreshAtlasTree(); // also calls refreshEncyclopediaView() internally
      }
    });
  }

  const compactModeBtn = $('#compactModeBtn');
  if (compactModeBtn) {
    compactModeBtn.addEventListener('click', () => {
      panelCompact = !panelCompact;
      saveLS('panelCompact', panelCompact);
      applyCompactMode();
      updateCompactModeBtn();
    });
  }

  // Apply persisted compact mode on startup
  applyCompactMode();
  updateCompactModeBtn();

  const sidebarFilterBtn = $('#sidebarFilterBtn');
  if (sidebarFilterBtn) {
    updateSidebarFilterBtn();
    sidebarFilterBtn.addEventListener('click', () => {
      sidebarFilterMode = sidebarFilterMode === 'global' ? 'local' : 'global';
      saveLS('sidebarFilterMode', sidebarFilterMode);
      updateSidebarFilterBtn();
      render({ full: true });
    });
  }

  atlasTab.addEventListener('click', () => switchTab('atlas'));
  // encyclopediaTabBtn is hidden in HTML — handler removed (dead code, Phase B.1 Fix 3)
  assetsTab.addEventListener('click', () => switchTab('assets')); // NEW

  const assetsFilterInput = $('#assetsFilterInput');
  const assetsFilterBar = $('#assetsFilterControls');

  // Hide assets filter bar by default — toggled by panelSearchBtn
  if (assetsFilterBar) assetsFilterBar.classList.add('filter-bar-hidden');

  if (assetsFilterInput) {
    assetsFilterInput.addEventListener('input', debounce(() => refreshAssetsView(), 250));
  }

  // Wire panelSearchBtn to handle both tabs
  const searchBtn = $('#panelSearchBtn');
  if (searchBtn) {
    searchBtn.onclick = () => {
      if (activePrimaryTab === 'assets') {
        const hasQuery = assetsFilterInput?.value.trim();
        if (assetsFilterExpanded && !hasQuery) {
          assetsFilterExpanded = false;
          assetsFilterBar?.classList.add('filter-bar-hidden');
          searchBtn.classList.remove('active');
        } else if (!assetsFilterExpanded) {
          assetsFilterExpanded = true;
          assetsFilterBar?.classList.remove('filter-bar-hidden');
          searchBtn.classList.add('active');
          setTimeout(() => assetsFilterInput?.focus(), 30);
        }
      } else {
        // World tab — delegate to the existing handler wired in refreshAtlasTree
        // Re-fire against the live filterInput
        const filterInput = $('#atlasFilterInput');
        const filterBar = filterInput?.closest('.panel-filter-bar');
        if (!filterBar) return;
        const hasQuery = filterInput?.value.trim();
        if (filterBarExpanded && !hasQuery) {
          filterBarExpanded = false;
          filterBar.classList.add('filter-bar-hidden');
          searchBtn.classList.remove('active');
        } else if (!filterBarExpanded) {
          filterBarExpanded = true;
          filterBar.classList.remove('filter-bar-hidden');
          searchBtn.classList.add('active');
          setTimeout(() => filterInput?.focus(), 30);
        }
      }
    };
  }

  // M3 elevation-on-scroll: mirror the atlas/encyclopedia sticky-bar behaviour.
  const assetsGrid = $('#assetsGrid');
  if (assetsGrid && assetsFilterBar) {
    assetsGrid.addEventListener('scroll', () => {
      assetsFilterBar.classList.toggle('is-elevated', assetsGrid.scrollTop > 4);
    }, { passive: true });
  }
}

// --- Atlas Context Menu ---
function showAtlasContextMenu(e, type, id, name) {
  e.preventDefault();
  e.stopPropagation();

  const closeMenu = () => {
    const existingMenu = document.getElementById('atlasContextMenu');
    if (existingMenu) existingMenu.remove();
    document.body.removeEventListener('click', closeMenu, { capture: true });
  };
  closeMenu();

  const menuItems = [];

  if (type === 'feature') {
    const f = state.features.find(x => x.id === id);
    const renameItem = el('li', { text: 'Rename' });
    renameItem.onclick = () => {
      closeMenu();
      const feature = state.features.find(x => x.id === id);
      showInputModal('Rename Feature', 'Feature name', feature.title || '', (newName) => {
        if (!newName || !newName.trim()) return;
        recordState();
        feature.title = newName.trim();
        markEntityDirty('article', id);
        debouncedSave();
        refreshAtlasTree();
      });
    };
    const visibilityLabel = f && f.visibleToPlayers ? 'Set GM Only' : 'Set Player Visible';
    const visibilityItem = el('li', { text: visibilityLabel });
    visibilityItem.onclick = () => {
      closeMenu();
      const feature = state.features.find(x => x.id === id);
      if (!feature) return;
      recordState();
      feature.visibleToPlayers = !feature.visibleToPlayers;
      markEntityDirty('article', id);
      debouncedSave();
      render();
    };
    const divider = el('li', { class: 'divider' });
    const duplicateItem = el('li', { text: 'Duplicate' });
    duplicateItem.onclick = () => { closeMenu(); window.duplicateFeature(id); };
    const templateItem = el('li', { text: 'Save As Template' });
    templateItem.onclick = () => { closeMenu(); window.saveFeatureAsTemplate(id); };
    const removeItem = el('li', { text: multiSelectedIds.has(id) ? `Remove ${multiSelectedIds.size} Features` : 'Remove' });
    removeItem.onclick = () => {
      closeMenu();
      if (multiSelectedIds.has(id)) {
        showConfirmationModal(
          `Delete ${multiSelectedIds.size} features?`,
          'This action cannot be undone.',
          'Delete Features',
          () => window.handleBulkUpdate(null, true)
        );
      } else {
        const feature = state.features.find(f => f.id === id);
        window.deleteFeature(id);
        showToast(`Feature "${feature.title || '(untitled)'}" removed.`, () => undo());
      }
    };
    const items = [renameItem, visibilityItem, divider, duplicateItem, templateItem, removeItem];
    if (f && f.geometry === 'point') {
      const toEncyItem = el('li', { text: 'Move to Lore' });
      toEncyItem.onclick = () => { closeMenu(); window.convertFeatureToEntry(id); };
      items.push(el('li', { class: 'divider' }), toEncyItem);
    }
    menuItems.push(...items);
  }

  if (type === 'map') {
    const propertiesItem = el('li', { text: 'Properties' });
    propertiesItem.onclick = () => { closeMenu(); window.openPropertiesSheet?.(id, 'map'); };
    const createFolderItem = el('li', { text: 'Create New Folder' });
    createFolderItem.onclick = () => { closeMenu(); window.createNewFolder(id); };
    menuItems.push(propertiesItem, createFolderItem);
    const mapData = state.maps.find(m => m.id === id);
    if (mapData && mapData.parentId !== null) {
      const removeItem = el('li', { text: 'Remove' });
      removeItem.onclick = () => { closeMenu(); window.deleteMapWithConfirmation(id, name); };
      menuItems.push(removeItem);
    }
  }

  if (type === 'folder') {
    const renameItem = el('li', { text: 'Rename' });
    renameItem.onclick = () => { closeMenu(); renameFolder(id); };
    const removeItem = el('li', { text: 'Remove' });
    removeItem.onclick = () => { closeMenu(); deleteFolder(id); };
    menuItems.push(renameItem, removeItem);
  }

  if (type === 'encyclopedia-folder') {
    const renameItem = el('li', { text: 'Rename' });
    renameItem.onclick = () => { closeMenu(); renameEncyclopediaFolder(id); };
    const removeItem = el('li', { text: 'Remove' });
    removeItem.onclick = () => { closeMenu(); deleteEncyclopediaFolder(id); };
    menuItems.push(renameItem, removeItem);
  }


  if (type === 'encyclopedia') {
    const e = state.encyclopedia.find(x => x.id === id);
    const renameItem = el('li', { text: 'Rename' });
    renameItem.onclick = () => {
      closeMenu();
      const entry = state.encyclopedia.find(x => x.id === id);
      showInputModal('Rename Entry', 'Entry name', entry.name || '', (newName) => {
        if (!newName || !newName.trim()) return;
        recordState();
        entry.name = newName.trim();
        markEntityDirty('article', id);
        debouncedSave();
        refreshEncyclopediaView();
      });
    };
    const visibilityLabel = e && e.visibleToPlayers ? 'Set GM Only' : 'Set Player Visible';
    const visibilityItem = el('li', { text: visibilityLabel });
    visibilityItem.onclick = () => {
      closeMenu();
      const entry = state.encyclopedia.find(x => x.id === id);
      if (!entry) return;
      recordState();
      entry.visibleToPlayers = !entry.visibleToPlayers;
      markEntityDirty('article', id);
      debouncedSave();
      refreshEncyclopediaView();
    };
    const divider = el('li', { class: 'divider' });
    const duplicateItem = el('li', { text: 'Duplicate' });
    duplicateItem.onclick = () => {
      closeMenu();
      duplicateEncyclopediaEntry(id);
    };
    const templateItem = el('li', { text: 'Save As Template' });
    templateItem.onclick = () => {
      closeMenu();
      window.saveLayoutTemplate(id, 'encyclopedia');
    };
    const removeItem = el('li', { text: multiSelectedIds.has(id) ? `Delete ${multiSelectedIds.size} Entries` : 'Delete' });
    removeItem.onclick = () => {
      closeMenu();
      if (multiSelectedIds.has(id)) {
        showConfirmationModal(
          `Delete ${multiSelectedIds.size} items?`,
          'This action cannot be undone and will remove items from the world permanently.',
          'Delete All',
          () => window.handleBulkUpdate(null, true)
        );
      } else {
        deleteEncyclopediaEntry(id);
      }
    };
    const toAtlasItem = el('li', { text: 'Move to Atlas' });
    toAtlasItem.onclick = () => { closeMenu(); window.convertEntryToFeature(id); };
    menuItems.push(renameItem, visibilityItem, divider, duplicateItem, templateItem, removeItem, el('li', { class: 'divider' }), toAtlasItem);
  }


  if (menuItems.length === 0) return;

  const menu = el('div', { id: 'atlasContextMenu' }, [
    el('ul', { class: 'is-dropdown-menu' }, menuItems)
  ]);
  menu.style.top = `${e.clientY}px`;
  menu.style.left = `${e.clientX}px`;
  document.body.appendChild(menu);

  // Clamp to viewport after the browser has rendered and we can measure the menu's real size
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) menu.style.top  = `${e.clientY - rect.height}px`;
    if (rect.right  > window.innerWidth  - 8) menu.style.left = `${e.clientX - rect.width}px`;
  });

  setTimeout(() => {
    document.body.addEventListener('click', closeMenu, { once: true, capture: true });
  }, 0);
}

/**
 * Ensures that the parent nodes of a given item are expanded in the Atlas tree.
 * @param {string} id - The ID of the item (feature, folder, or map).
 */
function expandToItem(id) {
  if (!id) return;

  const allMaps = new Map(state.maps.map(m => [m.id, m]));
  const allFolders = new Map(state.folders.map(f => [f.id, f]));
  const allFeatures = new Map(state.features.map(f => [f.id, f]));

  let currentId = id;
  let currentType = allFeatures.has(id) ? 'feature' : (allFolders.has(id) ? 'folder' : (allMaps.has(id) ? 'map' : null));

  if (!currentType) return;

  let changed = false;

  if (currentType === 'feature') {
    const f = allFeatures.get(id);
    if (f.folderId) {
      currentId = f.folderId;
      currentType = 'folder';
    } else {
      currentId = f.mapId;
      currentType = 'map';
    }
  }

  while (currentType === 'folder') {
    if (collapsedFolderNodes.has(currentId)) {
      collapsedFolderNodes.delete(currentId);
      changed = true;
    }
    const folder = allFolders.get(currentId);
    if (!folder) break;

    if (folder.parentFolderId) {
      currentId = folder.parentFolderId;
    } else {
      // Reached root folder, jump to Map
      currentId = folder.mapId;
      currentType = 'map';
    }
  }

  while (currentType === 'map' && currentId) {
    if (collapsedNodes.has(currentId)) {
      collapsedNodes.delete(currentId);
      changed = true;
    }
    const mapData = allMaps.get(currentId);
    if (!mapData) break;

    if (mapData.folderId) {
      currentId = mapData.folderId;
      currentType = 'folder';
      // Resume folder walking logic
      while (currentType === 'folder') {
        if (collapsedFolderNodes.has(currentId)) {
          collapsedFolderNodes.delete(currentId);
          changed = true;
        }
        const fld = allFolders.get(currentId);
        if (!fld) break;
        if (fld.parentFolderId) {
          currentId = fld.parentFolderId;
        } else {
          currentId = fld.mapId;
          currentType = 'map';
        }
      }
    } else {
      currentId = mapData.parentId;
    }
  }

  if (changed) {
    refreshAtlasTree();
  }
}

// --- Window Exports ---
window.refreshAtlasTree = refreshAtlasTree;
window.expandToItem = expandToItem;

/**
 * Ensures that the parent folders of a given encyclopedia entry are expanded.
 * @param {string} id - The ID of the entry or folder.
 */
function expandToEncyclopediaItem(id) {
  if (!id) return;

  // Phase B.2: lore folders live in state.folders with mapId == null
  const allFolders = new Map(state.folders.filter(f => f.mapId == null).map(f => [f.id, f]));
  const allEntries = new Map((state.encyclopedia || []).map(e => [e.id, e]));

  let currentId = id;
  let isEntry = allEntries.has(id);
  
  if (isEntry) {
    const entry = allEntries.get(id);
    currentId = entry.folderId;
  }

  let changed = false;
  while (currentId) {
    if (collapsedEncyclopediaFolderNodes.has(currentId)) {
      collapsedEncyclopediaFolderNodes.delete(currentId);
      changed = true;
    }
    const folder = allFolders.get(currentId);
    currentId = folder ? folder.parentFolderId : null;
  }

  if (changed) {
    refreshEncyclopediaView();
  }
}

window.expandToEncyclopediaItem = expandToEncyclopediaItem;
window.refreshEncyclopediaView = refreshEncyclopediaView;
window.refreshSessionsView = refreshSessionsView;
window.refreshAssetsView = refreshAssetsView;
window.refreshBreadcrumbs = refreshBreadcrumbs;
window.updateSelectionStyles = updateSelectionStyles;
window.refreshWorldPanel = refreshAtlasTree;