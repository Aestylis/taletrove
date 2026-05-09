let map;
let bounds;
let allLayers;
let labelLayer;
let gridLayer = null;
let fogLayer = null;
const layerById = new Map();
window.layerById = layerById;
let baseImageOverlay = null;
let overlayImageOverlay = null;
let mapObjectUrl = null;
let overlayObjectUrl = null;
let filterState = { pins: true, areas: true, lines: true, text: true };
window.filterState = filterState;
let drawOptions;
let mapPopup = null;
let _drawVertexPlaced = false;
let _labelBg = 'rgba(0,0,0,0.7)';
let _labelBorder = 'rgba(255,255,255,0.2)';

// Right-click before starting a draw: cancel and return to pointer.
// Must use capture-phase mousedown on document so we intercept before Leaflet.draw
// processes the event and adds a vertex (which would set _drawVertexPlaced).
const rightClickCancelHandler = function(e) {
  if (e.button !== 2) return;
  const mode = window.uiMode;
  const isDrawMode = mode === 'add-marker' || mode === 'add-text' ||
    mode === 'add-polygon' || mode === 'add-polyline' || mode === 'measure';
  if (!isDrawMode) return;
  const shouldCancel = mode === 'add-marker' || mode === 'add-text' || !_drawVertexPlaced;
  if (shouldCancel) {
    // stopImmediatePropagation ensures no other capture-phase listeners on document 
    // or bubble-phase listeners on map elements see this event.
    e.stopImmediatePropagation();
    debouncedSetMode('pointer');
  }
};
document.addEventListener('mousedown', rightClickCancelHandler, true); // capture: true


function _createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 32 : count < 100 ? 38 : 44;
  return L.divIcon({
    html: `<div class="cluster-icon"><span>${count}</span></div>`,
    className: '',
    iconSize: L.point(size, size)
  });
}

const _PinShapeGroup = L.LayerGroup.extend({
  initialize(clusterGroup, shapeGroup) {
    this._clusterGroup = clusterGroup;
    this._shapeGroup   = shapeGroup;
    this._layers = {};
  },
  onAdd(map) {
    this._clusterGroup.addTo(map);
    this._shapeGroup.addTo(map);
    return this;
  },
  onRemove(map) {
    map.removeLayer(this._clusterGroup);
    map.removeLayer(this._shapeGroup);
    return this;
  },
  addLayer(layer) {
    (layer._isPoint ? this._clusterGroup : this._shapeGroup).addLayer(layer);
    return this;
  },
  removeLayer(layer) {
    (layer._isPoint ? this._clusterGroup : this._shapeGroup).removeLayer(layer);
    return this;
  },
  hasLayer(layer) {
    return this._clusterGroup.hasLayer(layer) || this._shapeGroup.hasLayer(layer);
  },
  eachLayer(fn) {
    this._clusterGroup.eachLayer(fn);
    this._shapeGroup.eachLayer(fn);
    return this;
  },
  getBounds() {
    const b = L.latLngBounds([]);
    try { b.extend(this._clusterGroup.getBounds()); } catch (_) {}
    try { b.extend(this._shapeGroup.getBounds()); } catch (_) {}
    return b;
  },
  clearLayers() {
    this._clusterGroup.clearLayers();
    this._shapeGroup.clearLayers();
    return this;
  }
});

async function initMap(mapObject) {
  if (map) {
    map.remove();
  }
  
  layerById.clear();
  
  bounds = [
    [0, 0],
    [mapObject.height, mapObject.width]
  ];
  map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -5,
    maxZoom: 8,
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0,
    zoomDelta: 0.1,
    wheelPxPerZoomLevel: 60,
    renderer: L.svg({ padding: 0.5 }) // Increase padding to prevent clipping during zoom
  });

  map.createPane('fogPane');
  map.getPane('fogPane').style.zIndex = 450; // Between overlayPane (400) and shadowPane (500)
  map.getPane('fogPane').style.pointerEvents = 'none'; // Initially non-interactive

  map.createPane('labelsPane');
  const _labelsPaneEl = map.getPane('labelsPane');
  _labelsPaneEl.style.position = 'absolute';
  _labelsPaneEl.style.top = '0';
  _labelsPaneEl.style.left = '0';
  _labelsPaneEl.style.zIndex = 550; // Below markers (600)
  _labelsPaneEl.style.pointerEvents = 'none';

  mapPopup = L.popup();

  map.fitBounds(bounds);

  // Save viewport on intentional user interaction only (not on ResizeObserver-triggered moveend).
  // Using dragend + zoomend avoids saving a panel-adjusted viewport that would cause a position
  // shift on F5 refresh when the inspector panel is closed (different container width).
  const saveViewport = () => {
    if (!state?.activeMapId) return;
    saveLS(`mapView-${state.activeMapId}`, { zoom: map.getZoom(), center: map.getCenter() });
  };
  map.on('dragend', saveViewport);
  map.on('zoomend', saveViewport);

  applyFreeMoveState();
  const _pinCluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    animate: false,
    iconCreateFunction: _createClusterIcon
  });
  const _shapeGroup = L.featureGroup();
  allLayers = new _PinShapeGroup(_pinCluster, _shapeGroup).addTo(map);
  labelLayer = L.layerGroup().addTo(map);

  // Re-sync floating name labels after cluster expands/collapses.
  // Labels live on labelLayer (separate from _pinCluster) and need repositioning
  // once pins reach final positions. rAF defers until Leaflet has finished
  // adding/removing marker elements, so getElement() correctly reflects cluster state.
  _pinCluster.on('animationend', () => {
    requestAnimationFrame(() => {
      for (const [id, layer] of layerById.entries()) {
        if (!layer._isPoint) continue;
        if (layer.getElement?.()) {
          updateLabelsFor(id);
        } else if (layer._nameMarker) {
          labelLayer.removeLayer(layer._nameMarker);
          layer._nameMarker = null;
        }
      }
    });
  });

  const defaultPinHtml = `
      <div class="custom-svg-pin">
        <svg viewBox="0 0 256 256" fill="#ff7a1a" stroke="black" stroke-width="16">
          <path d="${PIN_SHAPES['marker']}"></path>
        </svg>
        <div class="pin-icon-inner">${await getIconHTML('pin')}</div>
      </div>
    `;

  drawOptions = {
    polygon: { shapeOptions: DEFAULT_GEOMETRY_STYLES.polygon },
    marker: {
      icon: L.divIcon({
        className: 'custom-marker-wrapper',
        html: defaultPinHtml,
        iconSize: [settings.globalMarkerSize || 40, settings.globalMarkerSize || 40],
        iconAnchor: [(settings.globalMarkerSize || 40) / 2, settings.globalMarkerSize || 40]
      })
    },
    polyline: { shapeOptions: DEFAULT_GEOMETRY_STYLES.polyline }
  };

  map.on(L.Draw.Event.CREATED, function (e) {
    if (window.uiMode === 'measure') return;
    const { layer, layerType: type } = e;
    recordState();
    let geometryType;
    if (type === 'marker') geometryType = 'point';
    else if (type === 'polygon') geometryType = 'polygon';
    else if (type === 'polyline') geometryType = 'polyline';
    const newFeat = addFeatureFromLayer(layer, geometryType, pendingTemplateId);
    pendingTemplateId = null;

    if (newFeat.kind === 'entry') {
      selectEncyclopediaEntry(newFeat.id);
    } else {
      // Open in peek mode — consistent with map pin single-click.
      // enterPeekMode sets selection state, highlights atlas row, and shows
      // the correct read-only peek header; pencil there routes to article edit.
      window.enterPeekMode?.(newFeat.id, 'feature');
    }

    render({ full: true });
    debouncedSave();
    debouncedSetMode('pointer');
  });

  const updateMeasurementText = (e) => {
    if (!activeDraw || !activeDraw._poly || !e.latlng) return;

    const committedPoints = activeDraw._poly.getLatLngs();
    const zoom = map.getMaxZoom();

    let totalCommittedPixelDistance = 0;
    if (committedPoints.length >= 2) {
      for (let i = 0; i < committedPoints.length - 1; i++) {
        const p1 = map.project(committedPoints[i], zoom);
        const p2 = map.project(committedPoints[i + 1], zoom);
        if (p1 && p2) {
          totalCommittedPixelDistance += p1.distanceTo(p2);
        }
      }
    }

    let segmentPixelDistance = 0;
    if (committedPoints.length > 0) {
      const lastPoint = map.project(committedPoints[committedPoints.length - 1], zoom);
      const currentPoint = map.project(e.latlng, zoom);
      if (lastPoint && currentPoint) {
        segmentPixelDistance = lastPoint.distanceTo(currentPoint);
      }
    }

    const totalPixelDistance = totalCommittedPixelDistance + segmentPixelDistance;

    let outputText = `<b>Total: ${totalPixelDistance.toFixed(0)} pixels</b>`;
    const activeMap = state.maps.find(m => m.id === state.activeMapId);

    if (activeMap) {
      const scale = activeMap.scale || { pixels: 100, distance: 5, unit: 'miles' };

      const pixels = parseFloat(scale.pixels);
      const distance = parseFloat(scale.distance);
      const unit = scale.unit || 'units';

      if (pixels > 0 && !isNaN(distance)) {
        const totalRealDistance = (totalPixelDistance / pixels) * distance;
        const segmentRealDistance = (segmentPixelDistance / pixels) * distance;

        let segmentText = `Segment: ${segmentRealDistance.toFixed(2)} ${unit}`;
        let totalText = `Total: ${totalRealDistance.toFixed(2)} ${unit}`;

        outputText = committedPoints.length > 0
          ? `<b>${segmentText}<br>${totalText}</b>`
          : `<b>${totalText}</b>`;
      }
    }

    if (activeDraw._tooltip) {
      activeDraw._tooltip._container.innerHTML = outputText;
      activeDraw._tooltip.updatePosition(e.latlng);
    }
  };

  map.on('draw:drawstart', function (e) {
    _drawVertexPlaced = false;
    if (window.uiMode === 'measure') {
      map.on('mousemove', updateMeasurementText);
    }
  });

  map.on(L.Draw.Event.DRAWVERTEX, function () {
    _drawVertexPlaced = true;
  });

  map.on('draw:drawstop', function () {
    _drawVertexPlaced = false;
    if (window.uiMode === 'measure') {
      map.off('mousemove', updateMeasurementText);
    }
  });

  // Right-click before starting a draw: cancel and return to pointer.
  // Must use capture-phase mousedown so we intercept before Leaflet.draw
  // processes the event and adds a vertex (which would set _drawVertexPlaced).
  map.getContainer().addEventListener('mousedown', function(e) {
    if (e.button !== 2) return;
    const mode = window.uiMode;
    const isDrawMode = mode === 'add-marker' || mode === 'add-text' ||
      mode === 'add-polygon' || mode === 'add-polyline' || mode === 'measure';
    if (!isDrawMode) return;
    const shouldCancel = mode === 'add-marker' || mode === 'add-text' || !_drawVertexPlaced;
    if (shouldCancel) {
      e.stopPropagation();
      debouncedSetMode('pointer');
    }
  }, true); // capture: true — fires before Leaflet's bubble-phase handlers

  // Context menu: suppress browser default during draw; show creation radial otherwise
  map.on('contextmenu', function(e) {
    const mode = window.uiMode;
    e.originalEvent.preventDefault();
    if (mode === 'add-marker' || mode === 'add-text' ||
        mode === 'add-polygon' || mode === 'add-polyline' || mode === 'measure') {
      return; // draw mode — just suppress
    }
    if (mode === 'pointer' && role === 'gm') {
      showMapContextMenu(e.latlng, e.originalEvent.clientX, e.originalEvent.clientY);
    }
  });

  // Dismiss radial/context menus on map move or zoom
  map.on('movestart zoomstart', () => {
    dismissRadialMenu();
  });


  updateOverlayVisibility();

  const zoomSlider = document.getElementById('mapZoomSlider');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const toggleZoomBtn = document.getElementById('toggleZoomBtn');
  const zoomControls = document.getElementById('mapZoomControls');

  if (zoomSlider && zoomInBtn && zoomOutBtn && toggleZoomBtn && zoomControls) {
    // Load persisted visibility state
    const isCollapsed = loadLS('mapZoomCollapsed', false);
    if (isCollapsed) zoomControls.classList.add('is-collapsed');

    toggleZoomBtn.onclick = (e) => {
      e.stopPropagation();
      const newState = zoomControls.classList.toggle('is-collapsed');
      saveLS('mapZoomCollapsed', newState);
    };

    zoomSlider.min = map.getMinZoom();
    zoomSlider.max = map.getMaxZoom();
    zoomSlider.value = map.getZoom();

    zoomInBtn.onclick = (e) => {
      e.stopPropagation();
      map.zoomIn();
    };

    zoomOutBtn.onclick = (e) => {
      e.stopPropagation();
      map.zoomOut();
    };

    zoomSlider.oninput = (e) => {
      map.setZoom(parseFloat(e.target.value));
    };

    map.on('zoomend', () => {
      zoomSlider.value = map.getZoom();
    });
  }

  map.on('zoomend moveend', scheduleCollisionDetection);

window.map = map;
  window.allLayers = allLayers;
  window.labelLayer = labelLayer;
  window.gridLayer = gridLayer;
  window.updateGridLayer = updateGridLayer;
}

function updateGridLayer() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (!map || !activeMap) return;

  const gridSettings = activeMap.grid;
  const isFullscreen = document.body.classList.contains('map-fullscreen-mode');

  const shouldBeVisible = gridSettings.enabled && isFullscreen;

  if (shouldBeVisible) {
    if (!gridLayer) {
      gridLayer = new L.CustomGrid(gridSettings);
      map.addLayer(gridLayer);
    } else {
      gridLayer.updateOptions(gridSettings);
    }
  } else {
    if (gridLayer) {
      map.removeLayer(gridLayer);
      gridLayer = null;
    }
  }
  window.gridLayer = gridLayer;
}

/**
 * Converts a list of LatLngs into an SVG path for Leaflet.Curve using Catmull-Rom interpolation.
 */
function getCurvePath(latlngs) {
  if (latlngs.length < 2) return [];
  const path = ['M', [latlngs[0].lat, latlngs[0].lng]];
  
  for (let i = 0; i < latlngs.length - 1; i++) {
    const p0 = latlngs[i === 0 ? i : i - 1];
    const p1 = latlngs[i];
    const p2 = latlngs[i + 1];
    const p3 = latlngs[i + 2 >= latlngs.length ? latlngs.length - 1 : i + 2];
    
    // Catmull-Rom to Cubic Bezier conversion
    // cp1 = p1 + (p2 - p0) / 6
    const cp1 = [
      p1.lat + (p2.lat - p0.lat) / 6,
      p1.lng + (p2.lng - p0.lng) / 6
    ];
    // cp2 = p2 - (p3 - p1) / 6
    const cp2 = [
      p2.lat - (p3.lat - p1.lat) / 6,
      p2.lng - (p3.lng - p1.lng) / 6
    ];
    
    path.push('C', cp1, cp2, [p2.lat, p2.lng]);
  }
  return path;
}

function applyMapURL(url, width, height) {
  bounds = [[0, 0], [height, width]]; // Update the global bounds variable
  if (baseImageOverlay) map.removeLayer(baseImageOverlay);
  baseImageOverlay = url ? L.imageOverlay(url, bounds).addTo(map) : null;

  applyFreeMoveState();

  map.fitBounds(bounds);
  mapObjectUrl = url;

  _refreshImageRotationObserver();
}

// ─── Base image rotation (fullscreen mode) ───────────────────────────────
// Rotates the imageOverlay img around the viewport center by baking the pivot
// directly into the transform string — no transform-origin needed.
//
// The pattern:  translate(cx,cy) rotate(θ) translate3d(tx-cx, ty-cy, 0) scale(s)
// is equivalent to Leaflet's translate3d(tx,ty,0) scale(s) PLUS a rotation
// around (cx,cy).  Crucially, during Leaflet's CSS zoom transition the prefix
// "translate(cx,cy) rotate(θ)" is identical in both the FROM and TO states, so
// the browser interpolates only translate3d/scale — rotation stays constant and
// there is no rubberband or pivot-jump.
//
// Feedback-loop guard: our transform always contains "rotate("; Leaflet's never
// does. The MutationObserver skips mutations that already have "rotate(".
let _imageRotationDeg = 0;
let _imageRotationObserver = null;
let _leafletTransform = ''; // last transform written by Leaflet (no rotate)

function _enforceImageRotation(fromObserver) {
  const img = baseImageOverlay?.getElement();
  if (!img) return;

  const t = img.style.transform || '';

  if (fromObserver) {
    // The observer fires for both Leaflet writes and our own writes.
    // Ours always contain 'rotate(' — skip to break the feedback loop.
    if (t.includes('rotate(')) return;
    _leafletTransform = t; // capture Leaflet's latest transform
  }

  if (_imageRotationDeg === 0) {
    // Remove any rotation we added and restore Leaflet's plain transform.
    if (img.style.transformOrigin) img.style.transformOrigin = '';
    if (_leafletTransform && img.style.transform !== _leafletTransform) {
      img.style.transform = _leafletTransform;
    }
    return;
  }

  // Parse tx, ty, and optional scale from Leaflet's last known transform.
  const base = _leafletTransform || t;
  const m = base.match(/translate3d\(([^,]+)px,\s*([^,]+)px/);
  const tx = m ? parseFloat(m[1]) : 0;
  const ty = m ? parseFloat(m[2]) : 0;
  const sm = base.match(/scale\(([^)]+)\)/);
  const s = sm ? parseFloat(sm[1]) : 1;

  const container = map.getContainer();
  const cx = container.offsetWidth / 2;
  const cy = container.offsetHeight / 2;

  // Equivalent to Leaflet's transform + rotate around viewport center (cx,cy):
  //   translate(cx,cy) · rotate(θ) · translate(tx-cx, ty-cy) · scale(s)
  // Always include scale() so the CSS transition can interpolate the full string.
  const newT = `translate(${cx}px, ${cy}px) rotate(${_imageRotationDeg}deg) translate3d(${tx - cx}px, ${ty - cy}px, 0) scale(${s})`;

  img.style.transformOrigin = '0px 0px';
  if (img.style.transform !== newT) img.style.transform = newT;
}

function _refreshImageRotationObserver() {
  _imageRotationObserver?.disconnect();
  _imageRotationObserver = null;

  const img = baseImageOverlay?.getElement();
  if (!img || _imageRotationDeg === 0) return;

  _imageRotationObserver = new MutationObserver(() => _enforceImageRotation(true));
  _imageRotationObserver.observe(img, { attributes: true, attributeFilter: ['style'] });
}

function setMapImageRotation(degrees) {
  _imageRotationDeg = degrees;
  _enforceImageRotation(false);
  _refreshImageRotationObserver();
  map.fire('imagerotate', { degrees });
}
window.setMapImageRotation = setMapImageRotation;
window.getMapImageRotationDeg = () => _imageRotationDeg;
function applyOverlayURL(url, activeMap) {
  if (overlayImageOverlay) map.removeLayer(overlayImageOverlay);
  if (url) {
    overlayImageOverlay = L.imageOverlay(url, [[0, 0], [activeMap.height, activeMap.width]], { opacity: activeMap.overlayOpacity }).addTo(map);
  } else {
    overlayImageOverlay = null;
  }
  overlayObjectUrl = url;
  updateOverlayVisibility();
}

/**
 * Helper to generate Leaflet DivIcons for markers.
 * Used by both featureToLayer (creation) and syncSingleLayer (updates).
 */
async function createMarkerIcon(feat) {
  const finalSize = feat.markerSize || settings.globalMarkerSize || DEFAULT_GEOMETRY_STYLES.point.markerSize;

  const isLorePin = feat._silo === 'lore' || feat.id.startsWith('ent-') || feat.id.startsWith('ency-') || feat.kind === 'entry';
  const pinShape = feat.pinShape || (isLorePin ? 'blank' : 'marker');
  const isBlank = pinShape === 'blank';

  const newIconHtml = await getItemIconHTML(feat);

  // Lore-pins: overlay a small territory CoA badge if the entry has a territory link
  let coaBadgeHtml = '';
  if (isLorePin) {
    const entry = state.encyclopedia.find(e => e.id === feat.id);
    const territoryLink = (entry?.links || []).find(l => l.linkType === 'territory');
    if (territoryLink) {
      const polygon = state.features.find(f => f.id === territoryLink.targetId && f.geometry === 'polygon');
      if (polygon && (polygon.coatOfArms || polygon.coatOfArmsKey)) {
        try {
          let coaUrl;
          if (polygon.coatOfArmsKey) {
            coaUrl = await resolveImageUrl(polygon.coatOfArmsKey);
          } else if (window.generateCoatOfArms) {
            const seed = polygon.coatOfArms.seed || polygon.id;
            coaUrl = await window.generateCoatOfArms(seed, { shield: polygon.coatOfArms.shield || 'heater', size: 64 });
          }
          if (coaUrl) {
            coaBadgeHtml = `<div class="lore-pin-coa-badge"><img src="${escapeHtml(coaUrl)}" alt="Coat of Arms"></div>`;
          }
        } catch (_) {
          // Badge is decorative — silently skip on error
        }
      }
    }
  }

  return L.divIcon({
    className: 'custom-marker-wrapper',
    html: newIconHtml + coaBadgeHtml,
    iconSize: [finalSize, finalSize],
    iconAnchor: isBlank ? [finalSize / 2, finalSize / 2] : [finalSize / 2, finalSize]
  });
}

function updateOverlayVisibility() {
  if (overlayImageOverlay) {
    if (settings.overlayVisible && !map.hasLayer(overlayImageOverlay)) {
      map.addLayer(overlayImageOverlay);
    } else if (!settings.overlayVisible && map.hasLayer(overlayImageOverlay)) {
      map.removeLayer(overlayImageOverlay);
    }
  }
  const hasOverlay = !!overlayImageOverlay;
  const toggleBtn = $('#toggleOverlayBtn');
  const settingsBtn = $('#overlaySettingsBtn');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active-toggle', settings.overlayVisible && hasOverlay);
    toggleBtn.disabled = !hasOverlay;
  }
  if (settingsBtn) {
    settingsBtn.disabled = !hasOverlay;
  }
}

async function setMapImage(mapId, imageSource) {
  let tempUrl = null;
  try {
    recordState();

    let mainBlob;
    if (imageSource instanceof File || imageSource instanceof Blob) {
      mainBlob = await processImageUpload(imageSource);
      tempUrl = URL.createObjectURL(mainBlob);
    } else {
      // Fallback for data URLs or remote URLs
      mainBlob = await fetch(imageSource).then(r => r.blob());
      tempUrl = imageSource;
    }

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The selected file could not be loaded as an image.'));
      image.src = tempUrl;
    });

    const { width, height } = img;

    const imageKey = 'img-' + uid();
    await idbSet(imageKey, mainBlob);

    const mapToUpdate = state.maps.find(m => m.id === mapId);
    if (!mapToUpdate) throw new Error(`Map with ID ${mapId} not found.`);
    mapToUpdate.width = width;
    mapToUpdate.height = height;
    mapToUpdate.imageKey = imageKey;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const aspectRatio = 250 / 40;
    canvas.width = 250;
    canvas.height = 40;
    const sourceAspect = width / height;
    let sx, sy, sWidth, sHeight;
    if (sourceAspect > aspectRatio) {
      sHeight = height;
      sWidth = sHeight * aspectRatio;
      sx = (width - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = width;
      sHeight = sWidth / aspectRatio;
      sx = 0;
      sy = (height - sHeight) / 2;
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    const bannerBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (bannerBlob) {
      const processedBanner = await processImageUpload(bannerBlob);
      await idbSet(`banner-${mapId}`, processedBanner);
    }

    if (mapToUpdate.id === state.activeMapId) {
      const displayUrl = await resolveImageUrl(imageKey);
      applyMapURL(displayUrl, width, height);
      $('#loadOverlayBtn').disabled = false;
      updateLoadMapButtonState();
    }

    render({ full: true });
    await save();

  } catch (err) {
    console.error('setMapImage failed:', err);
    showAlertModal('Save Error', 'Could not save map image: ' + (err.message || 'An unknown error occurred.'));
  } finally {
    // Clean up temporary URL if we created one
    if (imageSource instanceof File || imageSource instanceof Blob) {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
    }
  }
}

async function setOverlayImage(imageSource) {
  try {
    recordState();
    let blob;
    if (typeof imageSource === 'string') {
      blob = String(imageSource).startsWith('data:') ? dataUrlToBlob(imageSource) : await (await fetch(imageSource)).blob();
    } else {
      blob = await processImageUpload(imageSource);
    }
    const imageKey = 'img-' + uid();
    await idbSet(imageKey, blob);
    const activeMap = state.maps.find(m => m.id === state.activeMapId) || state.maps[0];
    activeMap.overlayKey = imageKey;
    const url = await resolveImageUrl(imageKey);
    applyOverlayURL(url, activeMap);
    window.syncOverlayButtons?.();
    await save();
  } catch (err) {
    console.error('setOverlayImage failed', err);
    showAlertModal('Save Error', 'Could not save overlay image: ' + err.message);
  }
}

function setOverlayOpacity(op, activeMap) {
  activeMap.overlayOpacity = op;
  if (overlayImageOverlay) overlayImageOverlay.setOpacity(op);
  $('#overlayOpacityVal').textContent = op.toFixed(2);
  markEntityDirty('map', activeMap.id);
  debouncedSave();
}

function addFeatureFromLayer(layer, geometryType, templateId = null) {
  const id = uid();
  // We use high precision (15) because in L.CRS.Simple, small rounding errors in map-pixels 
  // can cause polygons to collapse or shift significantly during zoom.
  const geojson = layer.toGeoJSON(15);
  let template;
  if (templateId && templateId.startsWith('template-')) {
    template = state.templates.find(t => t.templateId === templateId);
  } else {
    const defaultType = templateId || (geometryType === 'point' ? 'generic-pin' : (geometryType === 'polygon' ? 'generic-area' : 'generic-line'));
    template = getTaxonomyItem(defaultType);
  }
  if (!template) {
    console.error(`Taxonomy item not found for ID: ${templateId}`);
    return;
  }
  const feat = {
    id,
    mapId: state.activeMapId,
    geojson,
    kind: template?.kind || 'feature',
    domain: template?.domain || 'Generic',
    category: template?.category || 'Generic',
    geometry: template?.geometry || geometryType,
    featureType: template?.featureType || templateId,
    iconColor: template?.iconColor || '#ffffff',
    linkedMapIds: [],
    markerSize: template?.markerSize || DEFAULT_GEOMETRY_STYLES.point.markerSize,
    blocks: JSON.parse(JSON.stringify(template?.blocks || [])).map(b => {
      b.blockId = 'blk-' + uid();
      return b;
    }),
    tags: [],
    visibleToPlayers: false,
    labelBold: template?.labelBold || false,
    labelColor: template?.labelColor || '#ffffff',
    labelStyle: template?.labelStyle || 'outline',
    images: []
  };

  const baseName = template?.name || (geometryType === 'point' ? 'New Pin' : 'New Area');
  if (feat.kind === 'entry') {
    feat.name = getUniqueName(baseName, state.encyclopedia.map(e => e.name));
    feat.title = feat.name;
  } else {
    feat.title = getUniqueName(baseName, state.features.map(f => f.title || f.name));
    feat.name = feat.title;
  }

  const isPoint = geometryType === 'point' || feat.kind === 'entry';

  if (isPoint) {
    feat.iconColor = template?.iconColor || '#ffffff';
    feat.pinIconColor = template?.pinIconColor || '#ffffff';
    feat.iconClass = template?.icon || template?.iconClass || 'pin';
    feat.pinShape = template?.pinShape || 'marker';
    feat.geometry = 'point'; // Ensure entries always have geometry: 'point'
  } else if (feat.geometry === 'polygon') {
    feat.color = template?.color || DEFAULT_GEOMETRY_STYLES.polygon.color;
    feat.fillOpacity = template?.fillOpacity || DEFAULT_GEOMETRY_STYLES.polygon.fillOpacity;
    feat.showLabel = template?.showLabel !== undefined ? template.showLabel : true;
    feat.showCoatOfArms = true;
  } else if (feat.geometry === 'polyline') {
    feat.color = template?.color || DEFAULT_GEOMETRY_STYLES.polyline.color;
    feat.weight = template?.weight || DEFAULT_GEOMETRY_STYLES.polyline.weight;
    feat.dashArray = template?.dashArray || DEFAULT_GEOMETRY_STYLES.polyline.dashArray;
  }

  if (feat.kind === 'entry') {
    // Add spatial tagging
    const activeMap = state.maps.find(m => m.id === state.activeMapId);
    if (activeMap && activeMap.name) {
      const locationTag = `@${activeMap.name}`;
      if (!feat.tags.includes(locationTag)) {
        feat.tags.push(locationTag);
      }
    }
    feat._silo = 'lore';
    state.articles.push(feat);
    syncArticleViews();
    markEntityDirty('article', feat.id);
  } else {
    feat._silo = 'atlas';
    state.articles.push(feat);
    syncArticleViews();
    markEntityDirty('article', feat.id);
  }

  return feat;
}

function addTextFeature(latlng, text) {
  const id = uid();
  const geojson = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] } };
  const feat = {
    id,
    _silo: 'atlas',
    kind: 'feature',
    domain: 'Utility',
    category: 'GM Tools',
    name: 'Text Label',
    geometry: 'text',
    featureType: 'generic-text',
    title: text,
    text: text,
    mapId: state.activeMapId,
    linkedMapIds: [],
    visibleToPlayers: false,
    fontSize: DEFAULT_GEOMETRY_STYLES.text.fontSize,
    fontColor: DEFAULT_GEOMETRY_STYLES.text.fontColor,
    fontFamily: 'sans-serif',
    bold: false,
    italic: false,
    underline: false,
    labelStyle: DEFAULT_GEOMETRY_STYLES.text.labelStyle,
    angle: 0,
    blocks: [],
    tags: [],
    images: [],
    geojson
  };
  state.articles.push(feat);
  syncArticleViews();
  return feat;
}

// Optimized Sync: Diffs the state vs the map layers
async function syncAllLayers() {
  if (!allLayers) return;

  const _ds = getComputedStyle(document.documentElement);
  _labelBg = _ds.getPropertyValue('--label-bg').trim() || 'rgba(0,0,0,0.7)';
  _labelBorder = _ds.getPropertyValue('--label-border').trim() || 'rgba(255,255,255,0.2)';

  const visibleItemIds = new Set();

  const atlasItems = state.features.filter(f =>
    f.mapId === state.activeMapId &&
    (role === 'gm' || f.visibleToPlayers)
  );

  const loreItems = (state.encyclopedia || []).filter(e =>
    e.mapId === state.activeMapId &&
    (role === 'gm' || e.visibleToPlayers)
  );

  const allVisibleItems = [...atlasItems, ...loreItems].filter(f => {
    if (f.geometry === 'text') return filterState.text;
    if (f.geometry === 'point') return filterState.pins;
    if (f.geometry === 'polygon') return filterState.areas;
    if (f.geometry === 'polyline') return filterState.lines;
    return true;
  });

  for (const item of allVisibleItems) {
    visibleItemIds.add(item.id);
    // Delegate to the single layer sync function
    await syncSingleLayer(item);
  }

  for (const [id, layer] of layerById.entries()) {
    if (!visibleItemIds.has(id)) {
      allLayers.removeLayer(layer);
      if (layer._nameMarker) labelLayer.removeLayer(layer._nameMarker);
      if (layer._coaMarker)  labelLayer.removeLayer(layer._coaMarker);
      layerById.delete(id);
    }
  }

  const labelVisible = !!settings.labelsVisible;
  const toggleBtn = document.getElementById('toggleLabelsBtn');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active-toggle', labelVisible);
    toggleBtn.setAttribute('data-tooltip', labelVisible ? 'Hide Name Labels' : 'Show Name Labels');
  }


  // Update filter buttons to align with Standard behavior (Highlight = Visible)
  const filters = [
    { key: 'pins', name: 'Pins', baseId: 'filterPinBtn' },
    { key: 'areas', name: 'Areas', baseId: 'filterAreaBtn' },
    { key: 'lines', name: 'Lines', baseId: 'filterLineBtn' },
    { key: 'text', name: 'Text Labels', baseId: 'filterTextBtn' }
  ];

  filters.forEach(f => {
    const isVisible = filterState[f.key];
    const btn = document.getElementById(f.baseId);
    if (btn) {
      btn.classList.toggle('active-toggle', isVisible);
      btn.setAttribute('data-tooltip', isVisible ? `Hide ${f.name}` : `Show ${f.name}`);
    }
  });

  scheduleCollisionDetection();
}

// Updates a single layer in place (Smart Patching)
async function syncSingleLayer(feature) {
  let layer = layerById.get(feature.id);

  if (layer) {
    // Text Label Updates
    if (feature.geometry === 'text' && layer.setIcon) {
      let textShadowStyle = '';
      if (feature.labelStyle === 'shadow') {
        textShadowStyle = 'text-shadow: 0 1px 3px rgba(0,0,0,0.8);';
      } else if (feature.labelStyle === 'outline') {
        textShadowStyle = 'text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';
      }
      const _allowedFonts = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'sans-serif', 'serif', 'monospace'];
      const safeFamily = _allowedFonts.includes(feature.fontFamily) ? feature.fontFamily : 'sans-serif';
      const isPlain = feature.labelStyle === 'none';
      const chromeStyle = isPlain
        ? ''
        : `background:${_labelBg}; border:1px solid ${_labelBorder}; padding:0.1rem 0.35rem; border-radius:4px; backdrop-filter:blur(2px);`;
      const textAngleStyle = feature.angle ? `transform: rotate(${feature.angle}deg);` : '';
      const textStyle = `font-size:${feature.fontSize || DEFAULT_GEOMETRY_STYLES.text.fontSize}px; color:${safeCssColor(feature.fontColor) || DEFAULT_GEOMETRY_STYLES.text.fontColor}; font-family:${safeFamily}; font-weight:${feature.bold ? 'bold' : 'normal'}; font-style:${feature.italic ? 'italic' : 'none'}; text-decoration:${feature.underline ? 'underline' : 'none'}; white-space:nowrap; ${chromeStyle} ${textShadowStyle} ${textAngleStyle}`;
      layer.setIcon(L.divIcon({ className: 'text-label-wrapper', html: `<div style="${textStyle}">${escapeHtml(feature.text || '')}</div>`, iconSize: null }));
    }
    // Point/Marker Updates (Atlas Pins and Encyclopedia Lore-Pins)
    const isPoint = feature.geometry === 'point' || feature.id.startsWith('ent-') || feature.id.startsWith('ency-') || feature.kind === 'entry';
    if (isPoint && layer.setIcon) {
      const [lng, lat] = feature.geojson.geometry.coordinates;
      const current = layer.getLatLng();

      // Only update position if moved significantly (prevents jitter)
      if (current.lat !== lat || current.lng !== lng) {
        layer.setLatLng([lat, lng]);
      }

      // Update Icon Visuals
      const newIcon = await createMarkerIcon(feature);
      layer.setIcon(newIcon);
      layer.setOpacity(1);
    }
    // Polygon/Polyline Updates
    else if (layer.setStyle) {
      // If a polyline switched between smooth/linear, we must recreate it
      const isSmooth = !!feature.smooth;
      const wasSmooth = (typeof L.Curve !== 'undefined') && (layer instanceof L.Curve);
      if (feature.geometry === 'polyline' && isSmooth !== wasSmooth) {
        allLayers.removeLayer(layer);
        layerById.delete(feature.id);
        await syncSingleLayer(feature);
        return;
      }

      layer.setStyle({
        color: safeCssColor(feature.color),
        weight: feature.weight || 2,
        fillOpacity: feature.fillOpacity,
        dashArray: feature.dashArray
      });

      if (wasSmooth) {
        const coords = feature.geojson.geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
        layer.setPath(getCurvePath(coords));
      }
    }

    // Update Tooltip Title
    if (layer.getTooltip && layer.getTooltip()) {
      layer.setTooltipContent(feature.title || feature.name || "");
    }

    // Update Label (Floating text)
    updateLabelsFor(feature.id);
    updateCoaMarkerFor(feature.id);

  } else {
    const newLayer = await featureToLayer(feature);
    if (newLayer) {
      newLayer.addTo(allLayers);
      layerById.set(feature.id, newLayer);
      updateLabelsFor(feature.id);
      updateCoaMarkerFor(feature.id);
    }
  }
}

async function featureToLayer(feat) {
  if (!feat?.geojson?.geometry) {
    console.warn(`[featureToLayer] Skipping "${feat?.id}" — missing geojson geometry.`);
    return null;
  }
  let layer;
  const isPoint = feat.geometry === 'point' || feat.id.startsWith('ent-') || feat.id.startsWith('ency-') || feat.kind === 'entry';
  const geometryType = isPoint ? 'point' : feat.geometry;

  if (geometryType === 'point') {
    const [lng, lat] = feat.geojson.geometry.coordinates;
    const icon = await createMarkerIcon(feat);
    layer = L.marker([lat, lng], { icon });
  }
  else if (geometryType === 'polygon') {
    const coords = feat.geojson.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
    layer = L.polygon(coords, {
      color: safeCssColor(feat.color) || DEFAULT_GEOMETRY_STYLES.polygon.color,
      weight: feat.weight || DEFAULT_GEOMETRY_STYLES.polygon.weight,
      fillOpacity: feat.fillOpacity ?? DEFAULT_GEOMETRY_STYLES.polygon.fillOpacity,
      dashArray: feat.dashArray || null
    });
  }
  else if (geometryType === 'polyline') {
    const coords = feat.geojson.geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
    if (feat.smooth) {
      layer = L.curve(getCurvePath(coords), {
        color: feat.color || DEFAULT_GEOMETRY_STYLES.polyline.color,
        weight: feat.weight || DEFAULT_GEOMETRY_STYLES.polyline.weight,
        dashArray: feat.dashArray || DEFAULT_GEOMETRY_STYLES.polyline.dashArray,
        fill: false
      });
    } else {
      layer = L.polyline(coords, {
        color: safeCssColor(feat.color) || DEFAULT_GEOMETRY_STYLES.polyline.color,
        weight: feat.weight || DEFAULT_GEOMETRY_STYLES.polyline.weight,
        dashArray: feat.dashArray || DEFAULT_GEOMETRY_STYLES.polyline.dashArray
      });
    }
  }
  else if (geometryType === 'text') {
    const [lng, lat] = feat.geojson.geometry.coordinates;
    let textShadowStyle = '';
    if (feat.labelStyle === 'shadow') {
      textShadowStyle = 'text-shadow: 0 1px 3px rgba(0,0,0,0.8);';
    } else if (feat.labelStyle === 'outline') {
      textShadowStyle = 'text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';
    }
    const safeFamily = /^[a-zA-Z0-9 ,'"-]+$/.test(feat.fontFamily || '') ? feat.fontFamily : 'sans-serif';
    const isPlain = feat.labelStyle === 'none';
    const chromeStyle = isPlain
      ? ''
      : `background:${_labelBg}; border:1px solid ${_labelBorder}; padding:0.1rem 0.35rem; border-radius:4px; backdrop-filter:blur(2px);`;
    const textAngleStyle = feat.angle ? `transform: rotate(${feat.angle}deg);` : '';
    const textStyle = `font-size:${feat.fontSize || DEFAULT_GEOMETRY_STYLES.text.fontSize}px; color:${safeCssColor(feat.fontColor) || DEFAULT_GEOMETRY_STYLES.text.fontColor}; font-family:${safeFamily}; font-weight:${feat.bold ? 'bold' : 'normal'}; font-style:${feat.italic ? 'italic' : 'none'}; text-decoration:${feat.underline ? 'underline' : 'none'}; white-space:nowrap; ${chromeStyle} ${textShadowStyle} ${textAngleStyle}`;
    const icon = L.divIcon({ className: 'text-label-wrapper', html: `<div style="${textStyle}">${escapeHtml(feat.text || '')}</div>`, iconSize: null });
    layer = L.marker([lat, lng], { icon });
  }

  if (isPoint) layer._isPoint = true;

  const displayName = feat.title || feat.name;
  if (displayName) {
    layer.bindTooltip(displayName, {
      className: 'mouseover-tooltip',
      sticky: true,
      direction: 'top',
      offset: geometryType === 'point' ? [0, -35] : [0, -10]
    });
  }

  if (geometryType !== 'none') {
    // Left-click: peek mode. Debounced so double-click can cancel it before it fires.
    let _clickTimer = null;
    layer.on('click', (ev) => {
      clearTimeout(_clickTimer);
      _clickTimer = setTimeout(() => onFeatureClick(feat, layer, ev), 220);
    });

    // Double-click: open wiki view (article mode). Cancels the pending single-click.
    layer.on('dblclick', (ev) => {
      clearTimeout(_clickTimer);
      L.DomEvent.stopPropagation(ev);
      L.DomEvent.preventDefault(ev);
      map.closePopup();
      const type = (feat.kind === 'entry' || feat._silo === 'lore') ? 'encyclopedia' : 'feature';
      if (window.enterArticleMode) window.enterArticleMode(feat.id, type);
    });

    // Right-click / contextmenu: Open the unified radial menu
    layer.on('contextmenu', (ev) => {
      L.DomEvent.stopPropagation(ev);
      showFeatureRadialMenu(feat, ev.originalEvent.clientX, ev.originalEvent.clientY);
    });
  }

  layer.feature = feat;
  return layer;
}

function applyFreeMoveState() {
  if (!map) return;

  if (settings.freeMoveEnabled) {
    map.setMaxBounds(null);
  } else {
    map.setMaxBounds(bounds);
  }

  // Sync button icon and tooltip with current state
  const btn = $('#toggleFreeMoveBtn');
  if (btn) {
    btn.classList.toggle('active-toggle', settings.freeMoveEnabled);
    btn.dataset.tooltip = settings.freeMoveEnabled ? 'Disable Free Pan' : 'Enable Free Pan';
  }
}

function updateLabelsFor(id, tempLatLng = null) {
  const f = state.features.find(x => x.id === id) || state.encyclopedia.find(x => x.id === id);
  const l = layerById.get(id);
  if (!f || !l) return;
  if (l._nameMarker) {
    labelLayer.removeLayer(l._nameMarker);
    l._nameMarker = null;
  }
  
  const isLorePin = f.id.startsWith('ent-') || f.id.startsWith('ency-') || f.kind === 'entry';
  const effectiveGeometry = (f.geometry === 'point' || isLorePin) ? 'point' : f.geometry;

  if (effectiveGeometry === 'text' || !settings.labelsVisible) return;

  // For polygons and polylines, only show label if explicitly enabled
  if ((effectiveGeometry === 'polygon' || effectiveGeometry === 'polyline') && !f.showLabel) return;

  const name = f.title || f.name || '';
  if (!name) return;

  let pos = tempLatLng;
  if (!pos) {
    if (effectiveGeometry === 'point') pos = l.getLatLng();
    else if (effectiveGeometry === 'polygon') pos = l.getCenter();
    else if (effectiveGeometry === 'polyline') {
      let latlngs = l.getLatLngs();
      // Handle MultiPolyline by taking the first segment
      if (latlngs.length > 0 && Array.isArray(latlngs[0]) && typeof latlngs[0][0] !== 'number') {
        latlngs = latlngs[0];
      }
      if (latlngs && latlngs.length >= 2) {
        const mid = (latlngs.length - 1) / 2;
        const i = Math.floor(mid);
        const t = mid - i;
        const a = latlngs[i], b = latlngs[i + 1];
        if (a && b) {
          pos = L.latLng(a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t);
        }
      } else if (latlngs && latlngs.length === 1) {
        pos = latlngs[0];
      }
    }
  }
  if (!pos) return;
  let labelClassName = `name-label label-style-${f.labelStyle || 'none'}`;
  let labelAnchor = [0, 0];
  let transformStyle = 'transform: translate(-50%, -50%);'; // center area/line labels
  let yOffset = 0;

  if (effectiveGeometry === 'point') {
    const finalSize = f.markerSize || settings.globalMarkerSize || 40;
    const isIconOnly = f.pinShape === 'blank' || (isLorePin && !f.pinShape);

    labelClassName += ' name-label-pin';

    // If icon is centered (blank), offset must clear half the icon height.
    // For bottom-anchored pins, 2px sits just below the pin tip (may overlap selection ring).
    // that appears when a pin is selected (outline: 3px + outline-offset: 4px).
    yOffset = isIconOnly ? -(finalSize / 2 + 2) : -2;

    labelAnchor = [0, yOffset];
    transformStyle = 'transform: translateX(-50%);'; // pin: horizontal-center only
  }
  const taxonomyItem = getTaxonomyItem(f.featureType);
  const labelHtml = escapeHtml(name);
  const fontWeight = f.labelBold ? 'font-weight:bold;' : '';
  const fontSize = f.labelSize || 12;
  
  let backgroundStyle = `background:${_labelBg};border:1px solid ${_labelBorder};`;
  if (f.labelStyle === 'none') {
    backgroundStyle = 'background:transparent;border:none;';
  }

  const labelColor = f.labelColor ? (safeCssColor(f.labelColor) || '#ffffff') : '#ffffff';
  const style = `white-space:nowrap;${backgroundStyle}border-radius:8px;padding:.1rem .35rem;font-size:${fontSize}px;color:${labelColor};${fontWeight}backdrop-filter:blur(2px);${transformStyle}`;
  const m = L.marker(pos, {
    interactive: false,
    opacity: 0.9,
    keyboard: false,
    pane: 'labelsPane',
    icon: L.divIcon({
      className: labelClassName,
      html: `<div class="name-label-inner" style="${style}">${labelHtml}</div>`,
      iconAnchor: labelAnchor,
      iconSize: null
    })
  });
  l._nameMarker = m;
  labelLayer.addLayer(m);
  if (role === 'player' && !f.visibleToPlayers) labelLayer.removeLayer(m);
  // Hide label if pin is inside a cluster (not individually rendered on map).
  if (l._isPoint && !l.getElement?.()) {
    labelLayer.removeLayer(m);
    l._nameMarker = null;
  }
}

// Post-render greedy pass: shift overlapping labels downward so they don't stack.
// Best-effort; resets on every map render/zoom so stale offsets never accumulate.
// HIG: labels should never compete with each other; spatial clarity is paramount.

let _collisionRafId = null;
function scheduleCollisionDetection() {
  if (_collisionRafId) cancelAnimationFrame(_collisionRafId);
  // Double rAF: first ensures Leaflet has finished positioning, second ensures layout is stable.
  _collisionRafId = requestAnimationFrame(() => {
    _collisionRafId = requestAnimationFrame(() => {
      runLabelCollisionDetection();
      _collisionRafId = null;
    });
  });
}

function runLabelCollisionDetection() {
  const pane = document.querySelector('.leaflet-labels-pane');
  if (!pane) return;

  const inners = Array.from(pane.querySelectorAll('.name-label-inner'));
  if (inners.length < 2) return;

  // Reset all offsets so we measure true Leaflet-positioned rects.
  // Pin labels use translateX(-50%) for horizontal centering — preserve it.
  inners.forEach(node => {
    const isPin = node.closest('.name-label-pin') !== null;
    node.style.transform = isPin ? 'translateX(-50%)' : '';
  });

  // Collect rects (after reset, before re-layout — same frame, so layout is stable).
  const infos = inners
    .map(inner => ({
      inner,
      rect: inner.getBoundingClientRect(),
      yOffset: 0,
      isPin: inner.closest('.name-label-pin') !== null
    }))
    .filter(info => info.rect.width > 0);

  // Sort by vertical center so we always push later labels downward.
  infos.sort((a, b) =>
    (a.rect.top + a.rect.bottom) / 2 - (b.rect.top + b.rect.bottom) / 2 ||
    a.rect.left - b.rect.left
  );

  for (let i = 1; i < infos.length; i++) {
    const b = infos[i];
    for (let j = i - 1; j >= 0; j--) {
      const a = infos[j];
      // Skip if no horizontal overlap — labels in different columns can't collide.
      if (b.rect.right <= a.rect.left + 2 || b.rect.left >= a.rect.right - 2) continue;
      const aBottom = a.rect.bottom + a.yOffset;
      const bTop    = b.rect.top    + b.yOffset;
      if (bTop < aBottom + 2) b.yOffset += (aBottom + 2) - bTop;
    }
    if (b.yOffset > 0) {
      const xPart = b.isPin ? 'translateX(-50%) ' : '';
      b.inner.style.transform = `${xPart}translateY(${b.yOffset}px)`;
    }
  }
}

async function updateCoaMarkerFor(id) {
  const f = state.features.find(x => x.id === id);
  const l = layerById.get(id);
  if (!l) return;

  // Always clear existing marker first
  if (l._coaMarker) {
    labelLayer.removeLayer(l._coaMarker);
    l._coaMarker = null;
  }

  if (!f || f.geometry !== 'polygon') return;
  if (!f.showCoatOfArms) return;
  if (!f.coatOfArms && !f.coatOfArmsKey) return;

  const pos = l.getCenter();
  if (!pos) return;

  const size = f.markerSize || settings.globalMarkerSize || 40;

  let innerHtml;
  if (f.coatOfArmsKey) {
    const url = await resolveImageUrl(f.coatOfArmsKey);
    innerHtml = `<img src="${escapeHtml(url)}" alt="Coat of Arms" style="width:${size}px;height:${size}px;object-fit:contain;display:block;">`;
  } else {
    const coaSeed = f.coatOfArms.seed || f.id;
    const coaUrl = await window.generateCoatOfArms(coaSeed, { shield: f.coatOfArms.shield || 'heater', size: 256 });
    innerHtml = `<img src="${coaUrl}" alt="Coat of Arms" style="width:${size}px;height:${size}px;object-fit:contain;display:block;">`;
  }

  const m = L.marker(pos, {
    interactive: false,
    keyboard: false,
    pane: 'labelsPane',
    icon: L.divIcon({
      className: 'coa-marker-wrapper',
      html: `<div class="coa-map-pin">${innerHtml}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size + 11]
    })
  });
  l._coaMarker = m;
  labelLayer.addLayer(m);
  if (role === 'player' && !f.visibleToPlayers) labelLayer.removeLayer(m);
}

async function showMapPopup(feat, layer, ev) {
  const isPoint = feat.geometry === 'point' || feat.id.startsWith('ent-') || feat.id.startsWith('ency-') || feat.kind === 'entry' || feat._silo === 'lore';
  const type = (feat.kind === 'entry' || feat._silo === 'lore') ? 'encyclopedia' : 'feature';

  // Hero image + icon + title
  const hero = await buildPopupHeader(feat);

  // Text snippet (strip markdown)
  const textBlock = (feat.blocks || []).find(b => b.type === 'TextField');
  let descriptionText = '';
  if (textBlock?.data?.content) {
    const raw = textBlock.data.content.replace(/[#*`[\]]/g, '').trim();
    descriptionText = raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
  }

  const bodyChildren = [];
  if (descriptionText) bodyChildren.push(el('p', { class: 'map-popup-description', text: descriptionText }));
  const openBtn = el('button', { class: 'primary', text: 'Open Article →' });
  openBtn.addEventListener('click', () => { map.closePopup(); if (window.enterArticleMode) window.enterArticleMode(feat.id, type); });
  bodyChildren.push(el('div', { class: 'map-popup-actions' }, [openBtn]));

  const container = el('div', { class: 'map-popup-container' }, [
    hero,
    el('div', { class: 'map-popup-body' }, bodyChildren)
  ]);

  L.popup({
    maxWidth: 280,
    minWidth: 240,
    className: 'standardized-map-popup',
    offset: isPoint ? [0, -30] : [0, 0]
  })
  .setLatLng(ev.latlng || layer.getBounds().getCenter())
  .setContent(container)
  .openOn(map);
}

async function onFeatureClick(feat, layer, ev) {
  L.DomEvent.stopPropagation(ev);
  dismissRadialMenu();
  map.closePopup();
  const type = (feat.kind === 'entry' || feat._silo === 'lore') ? 'encyclopedia' : 'feature';
  if (window.enterPeekMode) window.enterPeekMode(feat.id, type);
}

let _radialDismissHandler = null;
let _radialKeyHandler = null;
let _radialFeat = null;
let _radialLayerEl = null; // layer element highlighted during radial menu

function dismissRadialMenu() {
  const menu = document.getElementById('featureRadialMenu');
  if (!menu) return;
  menu.classList.remove('is-open');
  // Remove after transition
  setTimeout(() => {
    if (menu.parentNode) menu.parentNode.removeChild(menu);
  }, 350);
  if (_radialDismissHandler) {
    document.removeEventListener('mousedown', _radialDismissHandler, true);
    _radialDismissHandler = null;
  }
  if (_radialKeyHandler) {
    document.removeEventListener('keydown', _radialKeyHandler);
    _radialKeyHandler = null;
  }
  // Remove selection highlight from the old pin only if it isn't actually selected.
  // If it IS in multiSelectedIds, updateSelectionStyles() will keep/restore the class.
  if (_radialLayerEl && _radialFeat && !multiSelectedIds.has(_radialFeat.id)) {
    _radialLayerEl.classList.remove('leaflet-feature-selected');
  }
  _radialLayerEl = null;
  _radialFeat = null;
}

async function showFeatureRadialMenu(feat, screenX, screenY) {
  dismissRadialMenu();
  if (map) map.closePopup();

  _radialFeat = feat;
  const isGM = (typeof role !== 'undefined' ? role : 'gm') === 'gm';
  if (!isGM) return;

  const isLoreFeat = feat.kind === 'entry' || feat._silo === 'lore';
  const isPoint = feat.geometry === 'point' || isLoreFeat;
  const isText  = feat.geometry === 'text';

  let primaryBtns = [];

  // Pan the map to keep a feature's pin visible after the info panel opens and
  // Leaflet's ResizeObserver fires (which shifts the map to preserve its center).
  const panToFeatAfterPanel = () => {
    setTimeout(() => {
      const lyr = window.layerById?.get(feat.id);
      if (!lyr || !map) return;
      const latlng = lyr.getLatLng ? lyr.getLatLng() : lyr.getBounds?.().getCenter();
      if (latlng && !map.getBounds().contains(latlng)) {
        map.panTo(latlng, { animate: true, duration: 0.25 });
      }
    }, 380); // after panel CSS transition + Leaflet's ResizeObserver
  };

  if (isPoint) {
    primaryBtns = [
      {
        label: 'Properties', icon: 'list',
        action: () => {
          dismissRadialMenu();
          const t = isLoreFeat ? 'encyclopedia' : 'feature';
          window.openPropertiesSheet?.(feat.id, t);
        }
      },
      { label: 'Change Icon',  icon: 'image',             action: () => { dismissRadialMenu(); if (window.openIconPicker)     window.openIconPicker(feat); } },
      { label: 'Icon Color',   icon: 'paintbrush',         action: () => { dismissRadialMenu(); if (window.openColorPicker)   window.openColorPicker(feat, 'pinIconColor'); } },
      { label: 'Pin Color',    icon: 'paint-brush-household', action: () => { dismissRadialMenu(); if (window.openColorPicker)   window.openColorPicker(feat, 'iconColor'); } },
      { label: 'Pin Shape',    icon: 'map-pin',           action: () => { dismissRadialMenu(); if (window.openPinShapePicker) window.openPinShapePicker(feat); } },
    ];

    if (isLoreFeat) {
      // Lore pins: offer non-destructive "Remove from map" + explicit "Delete entry"
      primaryBtns.push({
        label: 'Remove from map', icon: 'minus', cls: 'is-warning',
        action: () => {
          dismissRadialMenu();
          showConfirmationModal(
            'Remove from map?',
            `"${feat.name || feat.title}" will be removed from the map but kept in your encyclopedia.`,
            'Remove',
            () => {
              const entry = state.encyclopedia.find(e => e.id === feat.id);
              if (!entry) return;
              recordState();
              delete entry.mapId;
              delete entry.geojson;
              delete entry.geometry;
              markEntityDirty('article', entry.id);
              window.exitPeekMode?.();
              render({ full: true });
              if (window.refreshEncyclopediaView) window.refreshEncyclopediaView();
              if (window.refreshAtlasTree) window.refreshAtlasTree();
              debouncedSave();
              showToast(`"${entry.name}" removed from map.`);
            }
          );
        }
      });
      primaryBtns.push({
        label: 'Delete entry', icon: 'x', cls: 'is-danger',
        action: () => {
          dismissRadialMenu();
          showConfirmationModal(
            `Delete "${feat.name || feat.title}"?`,
            'This will permanently delete this entry and all its content from your encyclopedia.',
            'Delete',
            () => window.deleteFeature(feat.id)
          );
        }
      });
      primaryBtns.push({
        label: 'Move to Atlas', icon: 'map-pin',
        action: () => { dismissRadialMenu(); window.convertEntryToFeature?.(feat.id); }
      });
    } else {
      primaryBtns.push({ label: 'Delete', icon: 'x', cls: 'is-danger', action: () => { dismissRadialMenu(); showConfirmRadialDelete(feat); } });
      primaryBtns.push({
        label: 'Move to Lore', icon: 'book',
        action: () => { dismissRadialMenu(); window.convertFeatureToEntry?.(feat.id); }
      });
    }
  } else {
    primaryBtns.push({
      label: 'Properties', icon: 'list',
      action: () => {
        dismissRadialMenu();
        window.openPropertiesSheet?.(feat.id, 'feature');
      }
    });
    if (!isText) {
      primaryBtns.push({
        label: 'Change Color', icon: 'tag',
        action: () => { dismissRadialMenu(); if (window.openColorPicker) window.openColorPicker(feat, 'color'); }
      });
    }
    primaryBtns.push({
      label: 'Delete', icon: 'x', cls: 'is-danger',
      action: () => { dismissRadialMenu(); showConfirmRadialDelete(feat); }
    });
  }

  // Build menu element — clamp spawn point so buttons never clip outside the viewport.
  // Margin = radius (80px) + half button size (22px) + tooltip label headroom (32px) = 134px
  const RADIAL_MARGIN = 134;
  const clampedX = Math.max(RADIAL_MARGIN, Math.min(screenX, window.innerWidth  - RADIAL_MARGIN));
  const clampedY = Math.max(RADIAL_MARGIN, Math.min(screenY, window.innerHeight - RADIAL_MARGIN));

  const menu = document.createElement('div');
  menu.id = 'featureRadialMenu';
  menu.style.left = `${clampedX}px`;
  menu.style.top  = `${clampedY}px`;

  const ring = document.createElement('div');
  ring.className = 'radial-ring';

  const layer = window.layerById && window.layerById.get(feat.id);
  if (layer && layer.getTooltip()) layer.closeTooltip();
  _radialLayerEl = (layer && layer.getElement) ? layer.getElement() : null;
  if (_radialLayerEl) _radialLayerEl.classList.add('leaflet-feature-selected');

  const count      = primaryBtns.length;
  const startAngle = -90;
  const step       = 360 / count;
  const buildBtn = async (btnDef, angle, idx) => {
    const btn = document.createElement('button');
    btn.className = ['radial-btn', btnDef.cls || ''].filter(Boolean).join(' ');
    btn.setAttribute('data-label', btnDef.label);
    btn.style.setProperty('--angle', `${angle}deg`);
    btn.style.transitionDelay = `${idx * 45}ms`;

    if (window.getIconHTML) {
      btn.innerHTML = await window.getIconHTML(btnDef.icon, 'var(--text)');
    }

    btn.addEventListener('click', (e) => { e.stopPropagation(); btnDef.action(); });
    return btn;
  };

  const btnPromises = primaryBtns.map((btnDef, i) =>
    buildBtn(btnDef, startAngle + i * step, i)
  );
  const btns = await Promise.all(btnPromises);
  btns.forEach(btn => ring.appendChild(btn));

  const backdrop = document.createElement('div');
  backdrop.className = 'radial-backdrop';
  menu.appendChild(backdrop);
  menu.appendChild(ring);
  document.body.appendChild(menu);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      menu.classList.add('is-open');
    });
  });

  _radialDismissHandler = (e) => {
    if (!menu.contains(e.target)) dismissRadialMenu();
  };
  setTimeout(() => {
    document.addEventListener('mousedown', _radialDismissHandler, true);
  }, 50);

  _radialKeyHandler = (e) => {
    if (e.key === 'Escape') dismissRadialMenu();
  };
  document.addEventListener('keydown', _radialKeyHandler);
}

function showConfirmRadialDelete(feat) {
  showConfirmationModal(
    `Delete "${feat.title || 'this feature'}"?`,
    '',
    'Delete',
    () => window.deleteFeature(feat.id)
  );
}

async function showMapContextMenu(latlng, screenX, screenY) {
  dismissRadialMenu();

  const createAtPoint = (templateId) => {
    recordState();
    const layer = L.marker(latlng);
    const feat = addFeatureFromLayer(layer, 'point', templateId);
    render({ full: true });
    window.enterPeekMode?.(feat.id, 'feature');
    debouncedSave();
  };

  const createLoreAtPoint = () => {
    recordState();
    const layer = L.marker(latlng);
    const feat = addFeatureFromLayer(layer, 'point', 'generic-person');
    render({ full: true });
    if (feat.kind === 'entry') selectEncyclopediaEntry(feat.id);
    else window.enterPeekMode?.(feat.id, 'feature');
    debouncedSave();
  };

  const startDraw = (mode) => {
    debouncedSetMode(mode);
  };

  const buttons = [
    {
      label: 'Add Pin', icon: 'map-pin',
      action: () => createAtPoint(null)
    },
    {
      label: 'Add Area', icon: 'area',
      action: () => startDraw('add-polygon')
    },
    {
      label: 'Add Line', icon: 'line-segments',
      action: () => startDraw('add-polyline')
    },
    {
      label: 'Add Text', icon: 'text-t',
      action: () => {
        recordState();
        const feat = addTextFeature(latlng, 'New Label');
        markEntityDirty('article', feat.id);
        render({ full: true });
        window.enterPeekMode?.(feat.id, 'feature');
        debouncedSave();
      }
    },
    {
      label: 'Add Lore', icon: 'book-open',
      action: () => createLoreAtPoint()
    }
  ];

  const RADIAL_MARGIN = 134;
  const clampedX = Math.max(RADIAL_MARGIN, Math.min(screenX, window.innerWidth  - RADIAL_MARGIN));
  const clampedY = Math.max(RADIAL_MARGIN, Math.min(screenY, window.innerHeight - RADIAL_MARGIN));

  const menu = document.createElement('div');
  menu.id = 'featureRadialMenu';
  menu.style.left = `${clampedX}px`;
  menu.style.top  = `${clampedY}px`;

  const ring = document.createElement('div');
  ring.className = 'radial-ring';

  const count      = buttons.length;
  const startAngle = -90;
  const step       = 360 / count;

  const btnPromises = buttons.map(async (btnDef, i) => {
    const angle = startAngle + i * step;
    const btn = document.createElement('button');
    btn.className = 'radial-btn';
    btn.setAttribute('data-label', btnDef.label);
    btn.style.setProperty('--angle', `${angle}deg`);
    btn.style.transitionDelay = `${i * 45}ms`;
    if (window.getIconHTML) btn.innerHTML = await window.getIconHTML(btnDef.icon, 'var(--text)');
    btn.addEventListener('click', (e) => { e.stopPropagation(); dismissRadialMenu(); btnDef.action(); });
    return btn;
  });

  const btns = await Promise.all(btnPromises);
  btns.forEach(btn => ring.appendChild(btn));

  const backdrop = document.createElement('div');
  backdrop.className = 'radial-backdrop';
  menu.appendChild(backdrop);
  menu.appendChild(ring);
  document.body.appendChild(menu);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => { menu.classList.add('is-open'); });
  });

  _radialDismissHandler = (e) => {
    if (!menu.contains(e.target)) dismissRadialMenu();
  };
  setTimeout(() => document.addEventListener('mousedown', _radialDismissHandler, true), 50);

  _radialKeyHandler = (e) => {
    if (e.key === 'Escape') dismissRadialMenu();
  };
  document.addEventListener('keydown', _radialKeyHandler);
}

// --- Global Exports ---
// Expose map functions needed by other modules.
window.syncAllLayers = syncAllLayers;
window.syncSingleLayer = syncSingleLayer;
window.createMarkerIcon = createMarkerIcon;
window.applyFreeMoveState = applyFreeMoveState;
window.updateCoaMarkerFor = updateCoaMarkerFor;

// ─── Fog of War Layer ────────────────────────────────────────────────────────

L.FogLayer = L.Layer.extend({
  options: {
    opacity: 1.0,
    brushSize: 40,
    mode: 'reveal' // 'reveal' or 'hide'
  },

  initialize: function (options) {
    L.setOptions(this, options);
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d', { willReadFrequently: true });
    
    // Master mask stores REVEALED areas as black pixels on transparent canvas
    this._masterCanvas = document.createElement('canvas');
    this._masterCtx = this._masterCanvas.getContext('2d');
    
    this._isDrawing = false;
  },

  onAdd: function (map) {
    this._map = map;
    
    this._initCanvas();
    // Use the dedicated fogPane to avoid interfering with SVG areas/pins
    const pane = map.getPane('fogPane');
    pane.appendChild(this._canvas);
    
    map.on('moveend zoomend imagerotate', this._reset, this);
    map.on('mousedown', this._onMouseDown, this);
    map.on('mousemove', this._onMouseMove, this);
    map.on('mouseup', this._onMouseUp, this);
    this._loadMasterMask();
    this._reset();
    this._syncPointerEvents();
  },

  onRemove: function (map) {
    const pane = map.getPane('fogPane');
    if (pane && this._canvas.parentNode === pane) {
      pane.removeChild(this._canvas);
    }
    map.off('moveend zoomend imagerotate', this._reset, this);
    map.off('mousedown', this._onMouseDown, this);
    map.off('mousemove', this._onMouseMove, this);
    map.off('mouseup', this._onMouseUp, this);
  },

  _syncPointerEvents: function() {
    // We toggle pointer-events on the canvas and the pane itself
    const isFogMode = window.uiMode === 'fog';
    this._canvas.style.pointerEvents = isFogMode ? 'auto' : 'none';
    const pane = this._map.getPane('fogPane');
    if (pane) pane.style.pointerEvents = isFogMode ? 'auto' : 'none';
  },

  setOpacity: function (opacity) {
    this.options.opacity = opacity;
    if (this._canvas) this._canvas.style.opacity = opacity;
  },

  setBrushSize: function (size) {
    this.options.brushSize = size;
    if (!this._isDrawing) this._redraw();
  },

  _initCanvas: function () {
    this._canvas.style.position = 'absolute';
    this._canvas.style.opacity = this.options.opacity;
    this._canvas.className = 'leaflet-fog-layer';
  },

  _loadMasterMask: function() {
    const mapObj = state.maps.find(m => m.id === state.activeMapId);
    this._masterCanvas.width = mapObj.width;
    this._masterCanvas.height = mapObj.height;
    
    // Clear master (nothing revealed yet)
    this._masterCtx.clearRect(0, 0, mapObj.width, mapObj.height);

    if (mapObj.fog && mapObj.fog.mask) {
      const img = new Image();
      img.onload = () => {
        this._masterCtx.drawImage(img, 0, 0);
        this._redraw();
      };
      img.src = mapObj.fog.mask;
    }
  },

  _reset: function () {
    if (!this._map) return;
    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    
    const pos = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, pos);

    this._redraw();
    this._syncPointerEvents();
  },

  _redraw: function () {
    if (this._isDrawing) return; // Don't redraw while actively painting

    const ctx = this._ctx;
    const size = this._map.getSize();
    const mapObj = state.maps.find(m => m.id === state.activeMapId);
    if (!mapObj) return;

    // Map pixels to screen pixels
    // [height, 0] is Top-Left in Leaflet coordinates, [0, width] is Bottom-Right
    const tl = this._map.latLngToContainerPoint([mapObj.height, 0]);
    const br = this._map.latLngToContainerPoint([0, mapObj.width]);
    const w = br.x - tl.x;
    const h = br.y - tl.y;

    // Clear entire canvas so areas outside the map image stay transparent
    ctx.clearRect(0, 0, size.x, size.y);

    ctx.save();

    // If the map image is rotated, rotate the fog canvas context by the same angle
    // around the viewport center (matching the CSS transform-origin in _enforceImageRotation),
    // so the fog boundary aligns with the visually rotated image.
    const rotDeg = _imageRotationDeg;
    if (rotDeg !== 0) {
      const cx = size.x / 2;
      const cy = size.y / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rotDeg * Math.PI / 180);
      ctx.translate(-cx, -cy);
    }

    // 1. Fill only the map image bounds with black fog
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(tl.x, tl.y, w, h);

    // 2. Punch holes in the fog for revealed areas
    ctx.globalCompositeOperation = 'destination-out';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._masterCanvas, tl.x, tl.y, w, h);

    ctx.restore();

    // Reset state
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'source-over';
  },

  _onMouseDown: function (e) {
    if (window.uiMode !== 'fog' || role !== 'gm') return;
    this._isDrawing = true;
    this._paint(e);
  },

  _onMouseMove: function (e) {
    if (!this._isDrawing) return;
    this._paint(e);
  },

  _onMouseUp: function () {
    if (!this._isDrawing) return;
    this._isDrawing = false;
    this._saveMask();
  },

  _paint: function (e) {
    const point = e.containerPoint;
    const latlng = e.latlng;
    const mapObj = state.maps.find(m => m.id === state.activeMapId);
    if (!mapObj) return;
    
    // Feedback on screen (transient canvas)
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.options.brushSize, 0, Math.PI * 2);
    ctx.globalCompositeOperation = (this.options.mode === 'reveal') ? 'destination-out' : 'source-over';
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Persistence on master (1:1 with map image dimensions)
    const masterX = latlng.lng;
    const masterY = mapObj.height - latlng.lat;
    
    // Calculate radius on the master canvas (image pixels)
    // At zoom 0, 1 map unit = 1 pixel. L.FogLayer brushSize is in screen pixels.
    const zoomScale = this._map.getZoomScale(this._map.getZoom(), 0);
    const masterRadius = this.options.brushSize / zoomScale;
    
    this._masterCtx.beginPath();
    this._masterCtx.arc(masterX, masterY, masterRadius, 0, Math.PI * 2);
    this._masterCtx.globalCompositeOperation = (this.options.mode === 'reveal') ? 'source-over' : 'destination-out';
    this._masterCtx.fillStyle = 'black';
    this._masterCtx.fill();
    
    // Reset composite ops
    ctx.globalCompositeOperation = 'source-over';
    this._masterCtx.globalCompositeOperation = 'source-over';
  },

  _saveMask: function () {
    const mapObj = state.maps.find(m => m.id === state.activeMapId);
    if (!mapObj) return;
    mapObj.fog.mask = this._masterCanvas.toDataURL(); 
    markEntityDirty('map', mapObj.id);
    debouncedSave();
    this._redraw(); // Refresh to clear preview and show final state
    syncAllLayers(); // Update pin visibility after fog changes
  },

  isRevealed: function (latlng) {
    const mapObj = state.maps.find(m => m.id === state.activeMapId);
    if (!mapObj) return true;

    // Map latlng to master canvas pixel coordinates
    const x = Math.round(latlng.lng);
    const y = Math.round(mapObj.height - latlng.lat);

    if (x < 0 || x >= mapObj.width || y < 0 || y >= mapObj.height) return false;

    // Check alpha of pixel on master mask
    const pixel = this._masterCtx.getImageData(x, y, 1, 1).data;
    return pixel[3] > 0; // Alpha > 0 means revealed
  }
});

function updateFogLayer() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (!map || !activeMap) return;

  const fogSettings = activeMap.fog || { enabled: false, opacity: 0.85, brushSize: 40, mask: null };
  
  if (fogLayer) {
    map.removeLayer(fogLayer);
    fogLayer = null;
  }

  if (fogSettings.enabled) {
    // GM sees translucent fog, Players see opaque fog
    let opacity = role === 'gm' ? (fogSettings.opacity || 0.85) : 1.0;

    fogLayer = new L.FogLayer({
      opacity,
      brushSize: fogSettings.brushSize || 40
    });
    map.addLayer(fogLayer);
  }
  
  // Sync Fog toggle buttons (Standard: Highlight = Visible)
  const fogVisible = !!fogSettings.enabled;
  ['toggleFogBtn', 'toggleFogBtnFullscreen'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.classList.toggle('active-toggle', fogVisible);
      btn.setAttribute('data-tooltip', fogVisible ? 'Hide Fog of War' : 'Show Fog of War');
    }
  });
}

function syncFogPointerEvents() {
  if (fogLayer && fogLayer._syncPointerEvents) {
    fogLayer._syncPointerEvents();
  }
}

window.getFogLayer = () => fogLayer;
window.updateFogLayer = updateFogLayer;
window.syncFogPointerEvents = syncFogPointerEvents;

// ─── RHD Initiative Sync ──────────────────────────────────────────────────────
// Companion integration with RHD (Roll Higher, Darling) initiative tracker.
// The entire TaleTrove fullscreen window IS the TV. Player seats are placed on
// the map so TaleTrove knows which screen edge to glow for each combatant.

// ── State ─────────────────────────────────────────────────────────────────────
let _rhdSeatLayers    = [];  // L.marker[] (unused now, kept for cleanup safety)
let _rhdSeats         = [];  // [{ name, lat, lng }]
let _rhdTabEls        = [];  // DOM edge tab elements
let _rhdPollTimer     = null;
let _rhdLastStateStr  = null;
let _rhdFullscreen    = false;
let _rhdPlacingSeat   = false;

// ── Base styles (injected once) ───────────────────────────────────────────────
(function() {
  if (document.getElementById('_rhdBaseStyle')) return;
  const s = document.createElement('style');
  s.id = '_rhdBaseStyle';
  s.textContent = `
    .rhd-seat-marker {
      background: rgba(0,0,0,0.72); color: #fff;
      font-size: 11px; font-family: system-ui, sans-serif;
      padding: 2px 7px; border-radius: 4px;
      white-space: nowrap; border: 1px solid rgba(255,255,255,0.25);
      pointer-events: none;
    }
    #_rhdGlowOverlay { position:fixed; inset:0; pointer-events:none; z-index:9998; }
  `;
  document.head.appendChild(s);
})();

function _rhdGetOverlay() {
  let el = document.getElementById('_rhdGlowOverlay');
  if (!el) { el = document.createElement('div'); el.id = '_rhdGlowOverlay'; document.body.appendChild(el); }
  return el;
}

// ── Player Seats ──────────────────────────────────────────────────────────────
function _rhdLoadSeats() {
  try { _rhdSeats = JSON.parse(localStorage.getItem('rhd-player-seats') || '[]'); }
  catch { _rhdSeats = []; }
}

function _rhdSaveSeats() {
  localStorage.setItem('rhd-player-seats', JSON.stringify(_rhdSeats));
}

function _rhdInjectStyles() {
  if (document.getElementById('_rhdTabBaseStyles')) return;
  const s = document.createElement('style');
  s.id = '_rhdTabBaseStyles';
  s.textContent = `
    .rhd-seat-tab {
      --rhd-radius: clamp(8px, 1.2vmin, 26px);
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      font-family: system-ui, sans-serif;
      font-size: clamp(13px, 2.2vmin, 48px);
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: #fff;
      background: color-mix(in srgb, var(--tab-color, #555) 45%, #111);
      border: clamp(1.5px, 0.2vmin, 4px) solid color-mix(in srgb, var(--tab-color, #555) 80%, #fff);
      padding: clamp(5px, 1vmin, 22px) clamp(12px, 2vmin, 44px);
      white-space: nowrap;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9);
      filter: drop-shadow(0 0 2px var(--tab-color, #555));
    }
    .rhd-seat-tab[data-edge="north"] { top:0;    border-top:none;    border-radius:0 0 var(--rhd-radius) var(--rhd-radius); }
    .rhd-seat-tab[data-edge="south"] { bottom:0; border-bottom:none; border-radius:var(--rhd-radius) var(--rhd-radius) 0 0; }
    .rhd-seat-tab[data-edge="east"]  { right:0;  border-right:none;  border-radius:var(--rhd-radius) 0 0 var(--rhd-radius); }
    .rhd-seat-tab[data-edge="west"]  { left:0;   border-left:none;   border-radius:0 var(--rhd-radius) var(--rhd-radius) 0; }
    .rhd-seat-tab[data-edge="north"] span { display:inline-block; transform:rotate(180deg); }
    .rhd-seat-tab[data-edge="east"]  span { writing-mode:vertical-lr; display:inline-block; transform:rotate(180deg); }
    .rhd-seat-tab[data-edge="west"]  span { writing-mode:vertical-rl; display:inline-block; transform:rotate(180deg); }
    .rhd-seat-tab.is-ondeck span::after { content:'\\00a0▷'; opacity:0.85; }
    .rhd-seat-tab.is-active  { animation: _rhdTabHeartbeat 2.2s ease-in-out infinite; }
    .rhd-seat-tab.is-ondeck  { animation: _rhdTabPulse 2.5s ease-in-out infinite; }
    @keyframes _rhdTabHeartbeat {
      0%        { filter: drop-shadow(0 0 3px var(--tab-color)) drop-shadow(0 0 6px color-mix(in srgb,var(--tab-color) 60%,transparent)); }
      12%       { filter: drop-shadow(0 0 8px var(--tab-color)) drop-shadow(0 0 32px color-mix(in srgb,var(--tab-color) 75%,transparent)) drop-shadow(0 0 58px color-mix(in srgb,var(--tab-color) 35%,transparent)); }
      25%       { filter: drop-shadow(0 0 3px var(--tab-color)) drop-shadow(0 0 6px color-mix(in srgb,var(--tab-color) 60%,transparent)); }
      37%       { filter: drop-shadow(0 0 6px var(--tab-color)) drop-shadow(0 0 22px color-mix(in srgb,var(--tab-color) 70%,transparent)) drop-shadow(0 0 42px color-mix(in srgb,var(--tab-color) 30%,transparent)); }
      55%,100%  { filter: drop-shadow(0 0 3px var(--tab-color)) drop-shadow(0 0 6px color-mix(in srgb,var(--tab-color) 60%,transparent)); }
    }
    @keyframes _rhdTabPulse {
      0%,100% { filter: drop-shadow(0 0 2px var(--tab-color)) drop-shadow(0 0 8px color-mix(in srgb,var(--tab-color) 55%,transparent)); }
      50%     { filter: drop-shadow(0 0 3px var(--tab-color)) drop-shadow(0 0 20px color-mix(in srgb,var(--tab-color) 75%,transparent)); }
    }
  `;
  document.head.appendChild(s);
}

function _rhdDrawSeats() {
  _rhdSeatLayers.forEach(l => l.remove());
  _rhdSeatLayers = [];
  _rhdTabEls.forEach(el => el.remove());
  _rhdTabEls = [];
  if (!map) return;

  const cr = map.getContainer().getBoundingClientRect();
  const mc = map.getCenter();

  _rhdSeats.forEach(seat => {
    const pt   = map.latLngToContainerPoint(L.latLng(seat.lat, seat.lng));
    const sx   = cr.left + pt.x;
    const sy   = cr.top  + pt.y;
    const dx   = seat.lng - mc.lng, dy = seat.lat - mc.lat;
    const edge = seat.edge || (Math.abs(dy) >= Math.abs(dx)
      ? (dy >= 0 ? 'north' : 'south')
      : (dx >= 0 ? 'east'  : 'west'));

    const tab = document.createElement('div');
    tab.className        = 'rhd-seat-tab';
    tab.dataset.seatName = seat.name.toLowerCase();
    tab.dataset.edge     = edge;
    tab.innerHTML        = '<span>' + seat.name + '</span>';

    if (edge === 'north' || edge === 'south') tab.style.cssText = `left:${Math.round(sx)}px; transform:translateX(-50%)`;
    else                                      tab.style.cssText = `top:${Math.round(sy)}px;  transform:translateY(-50%)`;

    document.body.appendChild(tab);
    _rhdTabEls.push(tab);
  });
}

// ── Screen-edge glow ──────────────────────────────────────────────────────────
function _rhdApplyGlow(state) {
  if (!_rhdFullscreen) return;
  document.getElementById('_rhdGlowStyle')?.remove();
  const overlay = _rhdGetOverlay();
  overlay.style.background = '';

  // Reset all tabs to neutral
  _rhdTabEls.forEach(el => {
    el.classList.remove('is-active', 'is-ondeck');
    el.style.removeProperty('--tab-color');
  });

  if (!state?.active) return;

  // Activate the matching tab
  const activeName = state.active.name.toLowerCase();
  const activeTab  = _rhdTabEls.find(el => el.dataset.seatName === activeName);
  if (activeTab) {
    activeTab.style.setProperty('--tab-color', state.active.color);
    activeTab.classList.add('is-active');
  }

  // On-deck tab
  if (state.onDeck) {
    const deckTab = _rhdTabEls.find(el => el.dataset.seatName === state.onDeck.name.toLowerCase());
    if (deckTab) {
      deckTab.style.setProperty('--tab-color', state.onDeck.color);
      deckTab.classList.add('is-ondeck');
    }
  }

  // Subtle ambient gradient behind the active tab
  const seat = _rhdSeats.find(s => s.name.toLowerCase() === activeName);
  if (seat && map) {
    const ac  = state.active.color;
    const cr  = map.getContainer().getBoundingClientRect();
    const pt  = map.latLngToContainerPoint(L.latLng(seat.lat, seat.lng));
    const sx  = cr.left + pt.x, sy = cr.top + pt.y;
    const W   = window.innerWidth, H = window.innerHeight;
    const r   = Math.round(Math.min(W, H) * 0.24);
    const dx  = seat.lng - map.getCenter().lng, dy = seat.lat - map.getCenter().lat;
    const edge = seat.edge || (Math.abs(dy) >= Math.abs(dx) ? (dy >= 0 ? 'north' : 'south') : (dx >= 0 ? 'east' : 'west'));
    const pos  = { north:`${Math.round(sx)}px 0px`, south:`${Math.round(sx)}px ${H}px`, east:`${W}px ${Math.round(sy)}px`, west:`0px ${Math.round(sy)}px` };
    const grad = `radial-gradient(circle ${r}px at ${pos[edge]}, ${ac}55 0%, ${ac}00 100%)`;
    const style = document.createElement('style');
    style.id = '_rhdGlowStyle';
    style.textContent = `
      @keyframes _rhdGlow { 0%,100%{opacity:1} 50%{opacity:0.5} }
      #_rhdGlowOverlay { background:${grad}; animation:_rhdGlow 2.2s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }
}

// ── Poll RHD state relay ───────────────────────────────────────────────────────
const _RHD_RELAY = 'http://localhost:5173/rhd-state';

function _rhdPollState() {
  fetch(_RHD_RELAY)
    .then(r => r.json()).catch(() => null)
    .then(state => {
      const str = JSON.stringify(state);
      if (str !== _rhdLastStateStr) { _rhdLastStateStr = str; _rhdApplyGlow(state); }
    });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
function rhdSyncStart() {
  _rhdFullscreen = true;
  _rhdInjectStyles();
  _rhdLoadSeats();
  _rhdDrawSeats();
  _rhdLastStateStr = null;
  // Only poll the RHD relay if the user has placed at least one seat — otherwise
  // hammering localhost:5173 every 500ms produces console noise for users who don't run RHD.
  if (_rhdSeats.length > 0) {
    _rhdPollState();
    if (!_rhdPollTimer) _rhdPollTimer = setInterval(_rhdPollState, 500);
  }
}

function rhdSyncStop() {
  _rhdFullscreen = false;
  clearInterval(_rhdPollTimer);
  _rhdPollTimer = null;
  _rhdLastStateStr = null;
  document.getElementById('_rhdGlowStyle')?.remove();
  const overlay = document.getElementById('_rhdGlowOverlay');
  if (overlay) { overlay.style.boxShadow = ''; overlay.style.background = ''; }
  _rhdSeatLayers.forEach(l => l.remove());
  _rhdSeatLayers = [];
  _rhdTabEls.forEach(el => el.remove());
  _rhdTabEls = [];
}

// ── Placement tool ────────────────────────────────────────────────────────────
function _rhdStartPlacement(trimmed, edge, edgeRaw) {
  _rhdPlacingSeat = true;
  const btn = document.getElementById('rhdPlaceSeatBtn');
  if (btn) { btn.classList.add('active-toggle'); btn.setAttribute('data-tooltip', `Click map to place "${trimmed}" on ${edgeRaw} edge…`); }

  const ghost = document.createElement('div');
  ghost.className  = 'rhd-seat-tab';
  ghost.dataset.edge = edge;
  ghost.innerHTML  = '<span>' + escapeHtml(trimmed) + '</span>';
  ghost.style.opacity = '0.55';
  ghost.style.transition = 'left 0.05s, top 0.05s';
  try {
    const ls = JSON.parse(_rhdLastStateStr);
    const match = [ls?.active, ls?.onDeck].find(p => p?.name?.toLowerCase() === trimmed.toLowerCase());
    if (match) ghost.style.setProperty('--tab-color', match.color);
  } catch {}
  document.body.appendChild(ghost);

  function _ghostMove(ev) {
    if (edge === 'north' || edge === 'south') {
      ghost.style.left = ev.clientX + 'px';
      ghost.style.transform = 'translateX(-50%)';
    } else {
      ghost.style.top = ev.clientY + 'px';
      ghost.style.transform = 'translateY(-50%)';
    }
  }
  document.addEventListener('mousemove', _ghostMove);

  function _cancel(ev) { if (ev.key === 'Escape') { cleanup(); map.off('click', _place); } }
  function cleanup() {
    document.removeEventListener('mousemove', _ghostMove);
    document.removeEventListener('keydown', _cancel);
    ghost.remove();
    _rhdPlacingSeat = false;
    if (btn) { btn.classList.remove('active-toggle'); btn.setAttribute('data-tooltip', 'Place Player Seat (RHD Sync)'); }
  }
  document.addEventListener('keydown', _cancel);

  function _place(e) {
    cleanup();
    const idx = _rhdSeats.findIndex(s => s.name.toLowerCase() === trimmed.toLowerCase());
    const seat = { name: trimmed, lat: e.latlng.lat, lng: e.latlng.lng, edge };
    if (idx >= 0) _rhdSeats[idx] = seat; else _rhdSeats.push(seat);
    _rhdSaveSeats();
    _rhdDrawSeats();
    _rhdLastStateStr = null;
    _rhdPollState();
    if (!_rhdPollTimer) _rhdPollTimer = setInterval(_rhdPollState, 500);
  }
  map.once('click', _place);
}

function rhdPlacePlayerSeat() {
  if (!map || _rhdPlacingSeat) return;

  const edgeMap = { top:'north', bottom:'south', left:'west', right:'east', north:'north', south:'south', west:'west', east:'east', t:'north', b:'south', l:'west', r:'east' };

  const pickEdge = (trimmed) => {
    showInputModal('Choose Screen Edge', 'top · bottom · left · right', '', (edgeRaw) => {
      const edge = edgeMap[edgeRaw.trim().toLowerCase()];
      if (!edge) { showAlertModal('Invalid Edge', 'Please enter: top, bottom, left, or right.'); return; }
      _rhdStartPlacement(trimmed, edge, edgeRaw.trim());
    });
  };

  showInputModal('Place Combatant Seat', 'Name exactly as it appears in RHD', '', (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    _rhdLoadSeats();
    const existing = _rhdSeats.findIndex(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing >= 0) {
      showConfirmationModal(
        `"${escapeHtml(trimmed)}" Already Has a Seat`,
        'Remove the existing seat, or cancel to reposition it on the map.',
        'Remove Seat',
        () => {
          _rhdSeats.splice(existing, 1);
          _rhdSaveSeats();
          _rhdDrawSeats();
          _rhdLastStateStr = null;
          _rhdPollState();
        },
        () => pickEdge(trimmed)
      );
    } else {
      pickEdge(trimmed);
    }
  });
}

window.rhdSyncStart       = rhdSyncStart;
window.rhdSyncStop        = rhdSyncStop;
window.rhdPlacePlayerSeat = rhdPlacePlayerSeat;
