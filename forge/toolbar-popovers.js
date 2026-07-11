/**
 * toolbar-popovers.js — map toolbar popovers & fog/overlay controls (WS7 #5, extracted from worldbuilder.js).
 *
 * Owns: overlay menu popover (open/close + hover auto-hide), fog controls popover,
 * fog enable/disable + brush cursor sizing, draw-group popover, toolbar-overflow popover,
 * and the overlay-button visibility sync.
 *
 * Classic script sharing global scope — no module system. initToolbarPopoverListeners()
 * is called from initEventListeners() (worldbuilder.js) at DOMContentLoaded, so all
 * cross-file globals it touches are defined by call time.
 */

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

function updateFogBrushCursorSize(size) {
  const cursor = $('#fogBrushCursor');
  if (!cursor) return;
  cursor.style.width = `${size * 2}px`;
  cursor.style.height = `${size * 2}px`;
  const label = $('#fogBrushCursorLabel');
  if (label) label.textContent = `${size}px`;
}

/** Wires the overlay-menu, draw-group, and toolbar-overflow popovers. Called from initEventListeners(). */
function initToolbarPopoverListeners() {
  // Overlay menu popover — auto-close on mouseleave (wired once after init)
  let _overlayHideTimer = null;
  function _overlayStartHide() { _overlayHideTimer = setTimeout(hideOverlayMenuPopover, 400); }
  function _overlayCancelHide() { clearTimeout(_overlayHideTimer); }

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

  // --- DRAW GROUP POPOVER ---
  function _closeDrawGroupPopover() {
    const pop = $('#drawGroupPopover');
    if (pop) pop.classList.add('hidden');
    const btn = $('#drawGroupBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  window._closeDrawGroupPopover = _closeDrawGroupPopover; // read by keyboard-shortcuts.js (Escape)
  function openDrawGroupPopover(triggerBtn) {
    const popover = $('#drawGroupPopover');
    // Close the overflow popover if open
    const overflow = $('#toolbarOverflowPopover');
    if (overflow && !overflow.classList.contains('hidden')) {
      overflow.classList.add('hidden');
      $('#toolbarOverflowBtn')?.setAttribute('aria-expanded', 'false');
    }
    const isHidden = popover.classList.toggle('hidden');
    triggerBtn.setAttribute('aria-expanded', String(!isHidden));
    if (!isHidden) {
      const btnRect = triggerBtn.getBoundingClientRect();
      const wrapRect = $('.map-wrap').getBoundingClientRect();
      popover.style.left = `${btnRect.left - wrapRect.left + btnRect.width / 2}px`;
      popover.style.transform = 'translateX(-50%)';
      const spaceBelow = window.innerHeight - btnRect.bottom;
      if (spaceBelow > 80) {
        popover.style.top = `${btnRect.bottom - wrapRect.top + 8}px`;
        popover.style.bottom = '';
      } else {
        popover.style.top = 'auto';
        popover.style.bottom = `${wrapRect.bottom - btnRect.top + 8}px`;
      }
    }
  }
  $('#drawGroupBtn').addEventListener('click', (e) => { e.stopPropagation(); openDrawGroupPopover(e.currentTarget); });
  // Close draw popover when a tool inside it is selected
  $('#drawGroupPopover').addEventListener('click', (e) => {
    if (e.target.closest('button')) _closeDrawGroupPopover();
  });

  // --- TOOLBAR OVERFLOW POPOVER ---
  function _closeToolbarOverflowPopover() {
    const pop = $('#toolbarOverflowPopover');
    if (pop) pop.classList.add('hidden');
    const btn = $('#toolbarOverflowBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  window._closeToolbarOverflowPopover = _closeToolbarOverflowPopover; // read by keyboard-shortcuts.js (Escape)
  function openToolbarOverflowPopover(triggerBtn) {
    const popover = $('#toolbarOverflowPopover');
    // Close the draw group popover if open
    const drawPop = $('#drawGroupPopover');
    if (drawPop && !drawPop.classList.contains('hidden')) _closeDrawGroupPopover();
    const isHidden = popover.classList.toggle('hidden');
    triggerBtn.setAttribute('aria-expanded', String(!isHidden));
    if (!isHidden) {
      const btnRect = triggerBtn.getBoundingClientRect();
      const wrapRect = $('.map-wrap').getBoundingClientRect();
      const popoverHalfWidth = 100;
      const edgePad = 8;
      const rawCenter = btnRect.left - wrapRect.left + btnRect.width / 2;
      const maxLeft = wrapRect.width - popoverHalfWidth * 2 - edgePad;
      popover.style.left = `${Math.min(rawCenter, maxLeft)}px`;
      popover.style.transform = 'translateX(-50%)';
      const spaceBelow = window.innerHeight - btnRect.bottom;
      if (spaceBelow > 220) {
        popover.style.top = `${btnRect.bottom - wrapRect.top + 8}px`;
        popover.style.bottom = '';
      } else {
        popover.style.top = 'auto';
        popover.style.bottom = `${wrapRect.bottom - btnRect.top + 8}px`;
      }
    }
  }
  $('#toolbarOverflowBtn').addEventListener('click', (e) => { e.stopPropagation(); openToolbarOverflowPopover(e.currentTarget); });
  // Close overflow popover when an action inside it is activated
  $('#toolbarOverflowPopover').addEventListener('click', (e) => {
    if (e.target.closest('button')) _closeToolbarOverflowPopover();
  });

  // Close both new popovers on click-outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#drawGroupPopover, #drawGroupBtn')) _closeDrawGroupPopover();
    if (!e.target.closest('#toolbarOverflowPopover, #toolbarOverflowBtn')) _closeToolbarOverflowPopover();
  });
}

/**
 * Fog-control wiring (WS7 #11, extracted from worldbuilder.js initEventListeners).
 * Owns: the fog toggle buttons (toolbar + fullscreen), fog opacity slider, brush-size
 * slider/input, and the brush cursor that follows the mouse over the map.
 * Called from initEventListeners() at DOMContentLoaded.
 */
function initFogControlListeners() {
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
}
