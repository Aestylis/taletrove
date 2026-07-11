/**
 * toolbar-modes.js — map toolbar interaction-mode switching (WS7 #6, extracted from worldbuilder.js).
 *
 * Owns: debouncedSetMode (the mode engine: pointer/move/add-…/measure, draw-tool activation,
 * cursor + button sync), activateToolWithTemplate, setupFeatureButton, and the mode-button wiring.
 *
 * Classic script sharing global scope — evaluates after worldbuilder.js (all deferred scripts
 * run before DOMContentLoaded, so the evaluate-time button wiring below behaves identically).
 * debouncedSetMode is a top-level const: a global lexical binding readable from map.js,
 * keyboard-shortcuts.js, and command-palette.js at call time.
 */

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

