// keyboard-shortcuts.js — global keydown shortcuts (WS7: extracted verbatim from worldbuilder.js).
//
// Classic script sharing global scope. Everything the handler touches resolves at fire
// time: _cpActive / open/closeCommandPalette (command-palette.js), handleSaveProject
// (import-export.js), undo/redo/debouncedSetMode/selectedId/deselectAll/... (worldbuilder.js),
// map (map.js), and the popover closers via the window._closeDrawGroupPopover /
// window._closeToolbarOverflowPopover exposures set inside initEventListeners().
// worldbuilder.js calls initGlobalKeyboardShortcuts() from initEventListeners(), which
// runs at DOMContentLoaded — after every deferred script has evaluated.

function initGlobalKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Close palette first — highest-priority Escape target when focus left the input
    if (e.key === 'Escape' && _cpActive) {
      closeCommandPalette();
      return;
    }
    const activeEl = document.activeElement;
    const modeActive = document.body.classList.contains('article-mode') ||
      document.body.classList.contains('peek-mode') ||
      document.body.classList.contains('properties-sheet-open') ||
      document.getElementById('infoPanel')?.classList.contains('content-edit-mode');
    if (!modeActive && activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable)) {
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
        const drawGroupPop = $('#drawGroupPopover');
        const overflowPop = $('#toolbarOverflowPopover');
        const overlayMenu = $('#overlayMenuPopover');
        if (drawGroupPop && !drawGroupPop.classList.contains('hidden')) {
          _closeDrawGroupPopover();
        } else if (overflowPop && !overflowPop.classList.contains('hidden')) {
          _closeToolbarOverflowPopover();
        } else if (overlayMenu && !overlayMenu.classList.contains('hidden')) {
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
