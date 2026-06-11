// command-palette.js — Ctrl+K command palette (WS7: extracted verbatim from worldbuilder.js).
//
// Classic script sharing global scope. Runtime dependencies (resolved at call time, not load
// time): performGlobalSearch (data.js), getIconHTMLSync (ui.js), escapeHtml (utils.js), and
// worldbuilder.js globals (undo, redo, debouncedSetMode, selectedId, navigateToFeature,
// createNewEncyclopediaEntry, createNewMap, showInputModal). worldbuilder.js calls
// initCommandPalette() from its DOMContentLoaded handler and reads _cpActive / calls
// open/closeCommandPalette from its global keydown handlers — all deferred scripts evaluate
// before DOMContentLoaded, so load order within the deferred group is not timing-critical.

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
