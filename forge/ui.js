// Validate a CSS color value to prevent injection via imported data.
// Allows: hex colors, rgb/rgba/hsl/hsla functional notations, CSS named keywords,
// and CSS custom property references (var(--token-name)).
const safeCssColor = (color) => {
  if (typeof color !== 'string') return 'transparent';
  const s = color.trim();
  if (/^#([0-9a-fA-F]{3,8})$/.test(s)) return s;
  if (/^(rgb|rgba|hsl|hsla)\([\d.,/%\s]+\)$/.test(s)) return s;
  if (/^[a-zA-Z]{1,30}$/.test(s)) return s;           // CSS named colors, 'transparent', etc.
  if (/^var\(--[\w-]+\)$/.test(s)) return s;           // CSS custom properties, e.g. var(--text)
  return 'transparent';
};
window.safeCssColor = safeCssColor;




/**
 * Revokes a cached custom-icon blob URL and removes it from the cache.
 * Safe to call when the entry doesn't exist.
 */
function evictCustomIconUrl(iconKey) {
  if (window.revokeBlobUrl) window.revokeBlobUrl(iconKey);
}
window.evictCustomIconUrl = evictCustomIconUrl;

let asideHidden, rightPanelHidden, siteTheme, showCats, toolbarPos, infoPanelFeatureId;
let cropper = null;
let infoPanelSortable = null;
let timelineZoomLevel = 1.0;
const TIMELINE_NODE_BASE_WIDTH = 250;
let atlasSortable = [];
let encyclopediaSortable = [];
const debouncedRefreshEncyclopediaView = debounce(() => refreshEncyclopediaView(), 500);
let loadingTimeout;


function initUI() {
  asideHidden = loadLS('asideHidden', true);
  rightPanelHidden = loadLS('rightPanelHidden', true);
  siteTheme = loadLS('siteTheme', 'dark');
  showCats = loadLS('showCats', true);
  toolbarPos = loadLS('toolbarPos', 'center');
  infoPanelFeatureId = null;

  setupCollapsibles();
  initModals();
  setupPrimaryPanelTabs();
  populateShortcutsModal();
  applyToolbarPos();
  window.updateToolbarForRole();
  _syncToolbarOffset(asideHidden);

  document.body.classList.remove('theme-dark', 'theme-light');
  const isLight = siteTheme === 'light';
  document.body.classList.add(isLight ? 'theme-light' : 'theme-dark');
  document.body.classList.toggle('no-cats', !showCats);

  document.querySelectorAll('.logo, .hub-logo, .about-pane-logo, .welcome-logo').forEach(img => {
    img.src = isLight ? 'TaleTrove_Light.svg' : 'TaleTrove.svg';
  });

  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = isLight ? 'TaleTrove_Light.svg' : 'TaleTrove.svg';

  const searchIconContainer = $('#globalSearchIcon');
  if (searchIconContainer) {
    getIconHTML('magnifying-glass', 'var(--muted)').then(html => {
      searchIconContainer.innerHTML = html;
    });
  }

  const searchInput = $('#globalSearchInput');
  const searchResultsContainer = $('#globalSearchResults');

  if (searchInput && searchResultsContainer) {
    const renderSearchResults = (results) => {
      searchResultsContainer.innerHTML = '';
      if (results.length === 0) {
        searchResultsContainer.classList.add('hidden');
        return;
      }

      results.forEach(result => {
        const item = el('div', { class: 'search-result-item' }, [
          el('div', { class: 'search-result-title', text: result.title }),
          el('div', { class: 'search-result-context', text: result.context })
        ]);

        item.addEventListener('click', () => {
          if (result.type === 'map') {
            navigateToMap(result.id);
          } else {
            navigateToFeature(result.id);
          }
          searchInput.value = '';
          searchResultsContainer.classList.add('hidden');
        });

        searchResultsContainer.appendChild(item);
      });

      searchResultsContainer.classList.remove('hidden');
    };

    const debouncedSearch = debounce(async () => {
      const results = await performGlobalSearch(searchInput.value);
      renderSearchResults(results);
    }, 250); // A small delay to prevent searching on every single keystroke

    searchInput.addEventListener('input', debouncedSearch);

    // Hide results when the input loses focus
    searchInput.addEventListener('blur', () => {
      // A small delay allows a click on a result item to register before the dropdown disappears
      setTimeout(() => {
        searchResultsContainer.classList.add('hidden');
      }, 150);
    });

    // Show results when the input gains focus again (if there's text)
    searchInput.addEventListener('focus', debouncedSearch);
  }

  if (asideHidden) {
    toggleAsidePanel(true);
  }
  const roleToggle = $('#roleToggle');
  if (roleToggle) {
    roleToggle.checked = role === 'player';
  }
}

let _uiIconSet = null; // lazy Set for O(1) lookups — populated on first call

function getIconHTMLSync(iconName = 'pin', color = '#ffffff') {
  if (!iconName) return '';
  if (isEmoji(iconName)) return `<span class="emoji-pin-icon">${iconName}</span>`;

  let iconUrl;

  // Only cache the Set once UI_ICON_MANIFEST is populated (loadAllData may not have run yet)
  if (UI_ICON_MANIFEST.length > 0) _uiIconSet ??= new Set(UI_ICON_MANIFEST);
  if (_uiIconSet?.has(iconName)) {
    iconUrl = `./ui-icons/${iconName}.svg`;
  } else if (iconName.startsWith('ci-')) {
    // Custom icons must be handled asynchronously
    return null; 
  } else {
    // Handles all standard game-icons.net icons
    if (iconName.startsWith('gi-')) {
      iconName = iconName.substring(3);
    }
    iconUrl = `./icons/${iconName}.svg`;
  }

  return `<div class="icon-container" style="background-color: ${safeCssColor(color)}; -webkit-mask-image: url('${iconUrl}'); mask-image: url('${iconUrl}');"></div>`;
}

async function getIconHTML(iconName = 'pin', color = '#ffffff') {
  const syncHtml = getIconHTMLSync(iconName, color);
  if (syncHtml !== null) return syncHtml;

  // If syncHtml is null, it's a custom icon
  let iconUrl = './ui-icons/warning-circle.svg'; // Fallback
  
  const resolved = await resolveImageUrl(iconName);
  if (resolved) {
    iconUrl = resolved;
  }

  return `<div class="icon-container" style="background-color: ${safeCssColor(color)}; -webkit-mask-image: url('${iconUrl}'); -webkit-mask-repeat: no-repeat; mask-image: url('${iconUrl}'); mask-repeat: no-repeat;"></div>`;
}

function setLoadingState(isLoading, text = "Processing...") {
  const overlay = $('#loadingOverlay');
  const textEl = $('#loadingOverlayText');
  if (!overlay || !textEl) return;

  if (isLoading) {
    textEl.textContent = text;
    overlay.classList.remove('hidden');
    // Safety: Auto-hide after 30 seconds in case an operation hangs (increased from 15 for large projects)
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => setLoadingState(false), 30000);
  } else {
    // Small delay to prevent flickering on fast operations
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 300);
  }
}

function highlightItemInAtlas(id) {
  if (!id) return;

  // Find and highlight new item
  const findAndScroll = () => {
    // Check features
    let row = document.querySelector(`.feature-row[data-fid="${id}"]`);
    // Check maps
    if (!row) row = document.querySelector(`.map-node[data-map-id="${id}"] > .map-row`);
    // Check folders
    if (!row) row = document.querySelector(`.folder-row[data-folder-id="${id}"]`);

    if (row) {
      // Remove existing highlights
      document.querySelectorAll('#atlasView .tree-row.selected').forEach(el => {
        el.classList.remove('selected');
      });
      row.classList.add('selected');
      // Scroll into view nicely
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return true;
    }
    return false;
  };

  // Try immediately, then retry after a short delay to allow for expansion/re-render
  if (!findAndScroll()) {
    setTimeout(findAndScroll, 100);
  }
}

function highlightItemInEncyclopedia(id) {
  if (!id) return;

  const findAndScroll = () => {
    let item = document.querySelector(`.encyclopedia-item[data-entry-id="${id}"]`);
    
    if (item) {
      // Remove existing highlights across all panels
      document.querySelectorAll('.encyclopedia-item.selected').forEach(el => {
        el.classList.remove('selected');
      });
      item.classList.add('selected');
      // Scroll into view nicely
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return true;
    }
    return false;
  };

  if (!findAndScroll()) {
    setTimeout(findAndScroll, 100);
  }
}

function parseSpotifyUrl(url) {
  if (!url) return null;
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (match && match[1] && match[2]) {
    const embedType = match[1];
    const embedId = match[2];

    // Set a taller height for albums and playlists
    const height = (embedType === 'album' || embedType === 'playlist') ? 352 : 152;

    return {
      url: `https://open.spotify.com/embed/${embedType}/${embedId}`,
      height: height
    };
  }
  return null;
}

function getYoutubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const id = match && match[2];
  return (id && id.length === 11 && /^[A-Za-z0-9_-]+$/.test(id)) ? id : null;
}

function openHeroCropper(file, feature) {
  const modal = $('#cropperModal');
  const image = $('#cropperImage');
  const setBtn = $('#cropperSetBtn');
  const cancelBtn = $('#cropperCancelBtn');
  const closeBtn = $('#cropperCloseBtn');

  const reader = new FileReader();
  reader.onerror = () => showAlertModal('Read Error', 'Could not read the image file. It may be in use or inaccessible.');
  reader.onload = (e) => {
    image.src = e.target.result;
    modal.classList.remove('hidden');

    if (cropper) {
      cropper.destroy();
    }

    cropper = new Cropper(image, {
      aspectRatio: 720 / 250, // Aspect ratio of the hero image area
      viewMode: 1,
      dragMode: 'move',
      background: false,
      autoCropArea: 1,
      zoomOnWheel: true,
      guides: false,
    });
  };
  reader.readAsDataURL(file);

  const closeModal = () => {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    modal.classList.add('hidden');
  };

  setBtn.onclick = () => {
    if (!cropper) return;

    // Get the cropped image as a high-quality canvas
    const canvas = cropper.getCroppedCanvas({
      width: 1440, // A good resolution for hero images
      height: 500,
      imageSmoothingQuality: 'high',
    });

    // Convert the canvas to a blob and save it
    canvas.toBlob(async (blob) => {
      const processedBlob = await processImageUpload(blob);
      const imageKey = 'img-' + uid();
      await idbSet(imageKey, processedBlob);

      // Register display name so the Assets panel shows something readable
      state.assetNames = state.assetNames || {};
      const entityName = feature.title || feature.name || 'Entity';
      state.assetNames[imageKey] = `${entityName} · Hero`;
      markEntityDirty('meta');

      recordState();
      feature.heroImageKey = imageKey;

      render();
      showInfoPanel(feature.id);
      if (typeof window.refreshAssetsView === 'function') window.refreshAssetsView(true);
      debouncedSave();
      closeModal();
    });
  };

  cancelBtn.onclick = closeModal;
  closeBtn.onclick = closeModal;
}

function updateModeButtons() {
  const modes = ['pointer', 'move', 'add-marker', 'add-polygon', 'add-polyline', 'add-text'];
  modes.forEach(m => {
    const id = m === 'pointer' ? 'modePointerBtn' : (m === 'move' ? 'modeMoveBtn' : (m === 'add-marker' ? 'modePinBtn' : (m === 'add-polygon' ? 'modeAreaBtn' : (m === 'add-polyline' ? 'modeLineBtn' : 'modeTextBtn'))));
    const b = document.getElementById(id);
    if (b) {
      const isActive = uiMode === m;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    }
  });
}

const commonFonts = [
  { name: 'Sans-Serif (Default)', stack: 'sans-serif' },
  { name: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { name: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { name: 'Serif', stack: 'serif' },
  { name: 'Georgia', stack: 'Georgia, serif' },
  { name: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
  { name: 'Monospace', stack: 'monospace' },
  { name: 'Courier New', stack: '"Courier New", Courier, monospace' },
  { name: 'Cursive', stack: 'cursive' },
  { name: 'Fantasy', stack: 'fantasy' },
];

function setupCollapsibles() {
  const sections = document.querySelectorAll('aside .section.collapsible');
  sections.forEach(sec => {
    const h3 = sec.querySelector('h3');
    if (!h3) return;
    const key = 'collapse:' + (h3.innerText.trim() || 'section');
    const isCollapsed = loadLS(key, false);
    if (isCollapsed) sec.classList.add('collapsed');
    h3.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      sec.classList.toggle('collapsed');
      saveLS(key, sec.classList.contains('collapsed'));
    });
  });
}

function updateLoadMapButtonState() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  const loadMapBtn = $('#loadMapBtn');

  if (!loadMapBtn || !activeMap) return;

  if (!activeMap.imageKey) {
    loadMapBtn.classList.add('attention-glow');
  } else {
    loadMapBtn.classList.remove('attention-glow');
  }
}

function _syncToolbarOffset(panelHidden) {
  const panel = $('#atlasPanel');
  const railWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-rail-width')) || 44;
  const offset = (panelHidden || !panel) ? '0px' : `${(panel.offsetWidth + railWidth) / 2}px`;
  document.documentElement.style.setProperty('--toolbar-canvas-offset', offset);
}
window._syncToolbarOffset = _syncToolbarOffset;

function _syncBothPanelsClass() {
  const atlasClosed = $('#atlasPanel')?.classList.contains('is-hidden');
  const infoPanelOpen = $('#infoPanel')?.classList.contains('is-visible');
  document.body.classList.toggle('both-panels-open', !atlasClosed && infoPanelOpen);
}
window._syncBothPanelsClass = _syncBothPanelsClass;

function toggleAsidePanel(hide) {
  const panel = $('#atlasPanel'); // CORRECTED: Changed ID from #inspectorPanel to #atlasPanel
  if (!panel) return;

  const shouldHide = (hide === undefined) ? !panel.classList.contains('is-hidden') : hide;

  asideHidden = shouldHide;
  saveLS('asideHidden', asideHidden);
  panel.classList.toggle('is-hidden', shouldHide);
  $('#navRail')?.classList.toggle('is-hidden', shouldHide);

  const btn = $('#toggleAsideBtn');
  if (btn) {
    btn.title = shouldHide ? 'Show Atlas Panel' : 'Hide Atlas Panel';
    btn.setAttribute('aria-label', shouldHide ? 'Show Atlas Panel' : 'Hide Atlas Panel');
    btn.setAttribute('aria-expanded', String(!shouldHide));
  }

  _syncToolbarOffset(shouldHide);
  _syncBothPanelsClass();
  if (map) setTimeout(() => map.invalidateSize({ pan: false }), 350);
}


/**
 * Creates a custom, searchable select/dropdown component.
 * @param {Array<Object>} options - Array of options, e.g., [{value: 'id1', text: 'Name 1'}].
 * @param {string} selectedValue - The value of the currently selected option.
 * @param {Function} onchange - Callback function to execute when a new option is selected.
 * @returns {HTMLElement} The fully constructed searchable select element.
 */
function createSearchableSelect(options, selectedValue, onchange, placeholder = 'Select...') {
  // Use the placeholder if no matching option is found, rather than defaulting to the first item.
  let selectedOption = options.find(opt => opt.value === selectedValue);
  if (!selectedOption) {
    selectedOption = { text: placeholder, value: '' };
  }

  const container = el('div', { class: 'searchable-select' });
  const selectedValueDiv = el('div', { class: 'selected-value' }, [
    el('span', { text: selectedOption.text }),
    el('span', { class: 'caret', innerHTML: '▾' })
  ]);
  container.appendChild(selectedValueDiv);

  const dropdownContent = el('div', { class: 'dropdown-content' });
  const searchInput = el('input', { type: 'text', class: 'search-input', placeholder: 'Search...' });
  const optionsList = el('ul', { class: 'options-list' });
  dropdownContent.append(searchInput, optionsList);

  const closeDropdown = () => {
    if (dropdownContent.parentNode) {
      dropdownContent.parentNode.removeChild(dropdownContent);
    }
    document.removeEventListener('click', closeDropdown);
    window.removeEventListener('blur', closeDropdown);
  };

  const openDropdown = () => {
    document.querySelectorAll('.dropdown-content').forEach(d => d.remove());
    optionsList.innerHTML = '';
    options.forEach(opt => {
      const li = el('li', { 'data-value': opt.value, text: opt.text });
      if (opt.value === selectedValue) li.classList.add('is-selected');
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent document mousedown from triggering deselectAll
        onchange(opt.value);
        selectedValueDiv.querySelector('span').textContent = opt.text;
        closeDropdown();
      });
      optionsList.appendChild(li);
    });

    // Prevent mousedown on the dropdown container itself from propagating to document
    dropdownContent.addEventListener('mousedown', (e) => e.stopPropagation());

    const selectFirstVisible = () => {
      const first = optionsList.querySelector('li:not([style*="display: none"])');
      if (first) first.dispatchEvent(new MouseEvent('mousedown', { bubbles: false }));
    };

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); selectFirstVisible(); }
      if (e.key === 'Escape') { e.stopPropagation(); closeDropdown(); }
    });

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      optionsList.querySelectorAll('li').forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    });

    const rect = selectedValueDiv.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 250; // The max-height of our dropdown

    // If there isn't enough space below, open upwards
    if (spaceBelow < dropdownHeight) {
      dropdownContent.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    } else {
      dropdownContent.style.top = `${rect.bottom + 4}px`;
    }

    dropdownContent.style.left = `${rect.left}px`;
    dropdownContent.style.width = `${rect.width}px`;
    dropdownContent.style.display = 'flex';

    document.body.appendChild(dropdownContent);
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus();

    setTimeout(() => {
      document.addEventListener('click', closeDropdown, { once: true });
      window.addEventListener('blur', closeDropdown, { once: true });
    }, 0);
  };

  selectedValueDiv.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdownContent.parentNode) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  return container;
}

function showMapNotice(msg) {
  const container = $('#noticeContainer');
  if (!container || !msg) return;
  const noticeEl = el('div', { class: 'notice', text: msg });
  container.appendChild(noticeEl);
  setTimeout(() => {
    noticeEl.style.transition = 'opacity 0.5s ease';
    noticeEl.style.opacity = '0';
    setTimeout(() => noticeEl.remove(), 500);
  }, 7000);
}

function setSiteTheme(next) {
  siteTheme = next;
  saveLS('siteTheme', siteTheme);
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(siteTheme === 'light' ? 'theme-light' : 'theme-dark');

  document.querySelectorAll('.logo, .hub-logo, .about-pane-logo, .welcome-logo').forEach(img => {
    img.src = next === 'light' ? 'TaleTrove_Light.svg' : 'TaleTrove.svg';
  });

  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = next === 'light' ? 'TaleTrove_Light.svg' : 'TaleTrove.svg';

  syncAllLayers();
}

function setShowCats(next) {
  showCats = next;
  saveLS('showCats', showCats);
  document.body.classList.toggle('no-cats', !showCats);
}

const PRESET_THEMES = [
  // Dark — ordered darkest → lightest background
  { id: 'default',      label: 'Nocturne',    mode: 'dark',  bg: '#0f0f12', card: '#242429', panel: '#1c1c21', accent: '#ff7a1a', defaultBodyFont: 'inter',        defaultHeadingFont: 'cormorant'  },
  { id: 'torchlight',   label: 'Torchlight',  mode: 'dark',  bg: '#110e09', card: '#1f1910', panel: '#19140f', accent: '#c9a86c', defaultBodyFont: 'inter',         defaultHeadingFont: 'cormorant'  },
  { id: 'summerbreeze', label: 'Summer Breeze', mode: 'light', bg: '#eddcb0', card: '#fffaf0', panel: '#fdf5e2', accent: '#4ba8d4', defaultBodyFont: 'inter',         defaultHeadingFont: 'cormorant'  },
  { id: 'tokyonight',   label: 'Tokyo Night', mode: 'dark',  bg: '#1A1B26', card: '#1E2030', panel: '#16161E', accent: '#7AA2F7', defaultBodyFont: 'inter',         defaultHeadingFont: 'playfair'   },
  { id: 'mocha',        label: 'Mocha',       mode: 'dark',  bg: '#1E1E2E', card: '#313244', panel: '#181825', accent: '#89B4FA', defaultBodyFont: 'inter',         defaultHeadingFont: 'playfair'   },
  { id: 'gruvbox',      label: 'Gruvbox',     mode: 'dark',  bg: '#282828', card: '#3C3836', panel: '#32302F', accent: '#83A598', defaultBodyFont: 'ubuntu',        defaultHeadingFont: 'georgia'    },
  { id: 'dracula',      label: 'Dracula',     mode: 'dark',  bg: '#282A36', card: '#44475A', panel: '#21222C', accent: '#BD93F9', defaultBodyFont: 'spacegrotesk',  defaultHeadingFont: 'cinzel'     },
  { id: 'onedark',      label: 'One Dark',    mode: 'dark',  bg: '#282C34', card: '#2C313A', panel: '#21252B', accent: '#61AFEF', defaultBodyFont: 'system',        defaultHeadingFont: 'inter'      },
  { id: 'nord',         label: 'Nord',        mode: 'dark',  bg: '#2E3440', card: '#3B4252', panel: '#2E3440', accent: '#88C0D0', defaultBodyFont: 'nunito',        defaultHeadingFont: 'nunito'     },
  // Light — ordered darkest → lightest background
  { id: 'nordlight',    label: 'Nord Light',  mode: 'light', bg: '#ECEFF4', card: '#FFFFFF',  panel: '#E5E9F0', accent: '#5E81AC', defaultBodyFont: 'nunito',        defaultHeadingFont: 'nunito'     },
  { id: 'gruvboxlight', label: 'Gruvbox L',   mode: 'light', bg: '#FBF1C7', card: '#F9F5D7', panel: '#F2E5BC', accent: '#076678', defaultBodyFont: 'ubuntu',        defaultHeadingFont: 'georgia'    },
  { id: 'latte',        label: 'Latte',       mode: 'light', bg: '#EFF1F5', card: '#FFFFFF',  panel: '#E6E9EF', accent: '#1E66F5', defaultBodyFont: 'inter',         defaultHeadingFont: 'playfair'   },
  { id: 'rosepinedawn', label: 'Rosé Pine',   mode: 'light', bg: '#FAF4ED', card: '#FFFAF3',  panel: '#F2E9DE', accent: '#D7827A', defaultBodyFont: 'merriweather',  defaultHeadingFont: 'cormorant'  },
  { id: 'solarized',    label: 'Solarized',   mode: 'light', bg: '#FDF6E3', card: '#FDF6E3', panel: '#EEE8D5', accent: '#268BD2', defaultBodyFont: 'merriweather',  defaultHeadingFont: 'merriweather'},
  { id: 'github',       label: 'GitHub',      mode: 'light', bg: '#F6F8FA', card: '#FFFFFF',  panel: '#F6F8FA', accent: '#0969DA', defaultBodyFont: 'inter',         defaultHeadingFont: 'inter'      },
  { id: 'onelight',     label: 'One Light',   mode: 'light', bg: '#FAFAFA', card: '#FFFFFF',  panel: '#EAEAEB', accent: '#4078F2', defaultBodyFont: 'system',        defaultHeadingFont: 'inter'      },
];

const APP_FONTS = [
  { id: 'inter',        label: 'Inter',        css: "Inter, system-ui, sans-serif" },
  { id: 'system',       label: 'System',       css: "system-ui, -apple-system, sans-serif" },
  { id: 'spacegrotesk', label: 'Space Grotesk',css: "'Space Grotesk', system-ui, sans-serif" },
  { id: 'nunito',       label: 'Nunito',       css: "'Nunito', system-ui, sans-serif" },
  { id: 'ubuntu',       label: 'Ubuntu',       css: "'Ubuntu', system-ui, sans-serif" },
  { id: 'merriweather', label: 'Merriweather', css: "'Merriweather', Georgia, serif" },
  { id: 'georgia',      label: 'Georgia',      css: "Georgia, 'Times New Roman', serif" },
  { id: 'cormorant',    label: 'Cormorant',    css: "'Cormorant Garamond', Georgia, serif" },
  { id: 'playfair',     label: 'Playfair',     css: "'Playfair Display', Georgia, serif" },
  { id: 'cinzel',       label: 'Cinzel',       css: "'Cinzel', Georgia, serif" },
  { id: 'mono',         label: 'Mono',         css: "'JetBrains Mono', Consolas, monospace" },
];

// Keep these as aliases so any existing callers don't break
const BODY_FONTS    = APP_FONTS;
const HEADING_FONTS = APP_FONTS;

let _mapBgObjectUrl = null;

async function applyAppearance(appearance = {}) {
  const body = document.body;

  // Color theme — also drives dark/light mode
  const themeId = appearance.colorTheme || 'default';
  const themeDef = PRESET_THEMES.find(t => t.id === themeId) || PRESET_THEMES[0];
  setSiteTheme(themeDef.mode);
  if (themeId === 'default') {
    body.removeAttribute('data-app-theme');
  } else {
    body.setAttribute('data-app-theme', themeId);
  }

  // Body font
  const bodyFont = BODY_FONTS.find(f => f.id === (appearance.bodyFont || 'inter'));
  document.documentElement.style.setProperty('--font-body', bodyFont ? bodyFont.css : '');

  // Heading font
  const headingFont = HEADING_FONTS.find(f => f.id === (appearance.headingFont || 'cormorant'));
  document.documentElement.style.setProperty('--font-heading', headingFont ? headingFont.css : '');

  // Map background image
  if (_mapBgObjectUrl) { URL.revokeObjectURL(_mapBgObjectUrl); _mapBgObjectUrl = null; }
  if (appearance.mapBgKey) {
    const blob = await idbGet(appearance.mapBgKey);
    if (blob) {
      _mapBgObjectUrl = URL.createObjectURL(blob);
      document.documentElement.style.setProperty('--map-bg-url', `url('${_mapBgObjectUrl}')`);
      body.classList.add('has-map-bg');
    } else {
      body.classList.remove('has-map-bg');
    }
  } else {
    document.documentElement.style.removeProperty('--map-bg-url');
    body.classList.remove('has-map-bg');
  }
}
window.applyAppearance = applyAppearance;
window.PRESET_THEMES = PRESET_THEMES;
window.APP_FONTS = APP_FONTS;
window.BODY_FONTS = BODY_FONTS;
window.HEADING_FONTS = HEADING_FONTS;

function applyToolbarPos() {
  const mainTb = $('#mainToolbar');
  const filterTb = $('#filterToolbar');
  
  if (mainTb) {
    mainTb.classList.toggle('bottom', toolbarPos === 'bottom');
    mainTb.classList.toggle('top', toolbarPos !== 'bottom');
  }
  
  if (filterTb) {
    // filterToolbar goes to the opposite position of mainToolbar
    filterTb.classList.toggle('bottom', toolbarPos !== 'bottom');
    filterTb.classList.toggle('top', toolbarPos === 'bottom');
  }
}



async function showPinFlyout(x, y) {
  const existingFlyout = document.getElementById('pinFlyout');
  if (existingFlyout) existingFlyout.remove();

  const options = [
    { id: 'generic-person', name: 'Person', icon: 'person', color: '#ffd166' },
    { id: 'generic-pin', name: 'Place', icon: 'pin', color: '#ff7a1a' },
    { id: 'generic-item', name: 'Thing', icon: 'chest', color: '#ff3ea5' }
  ];

  const listItems = [];
  for (const opt of options) {
    const iconHtml = await getIconHTML(opt.icon, opt.color);
    const li = el('li', {
      style: 'display: flex; align-items: center; gap: 0.75rem;',
      onclick: (e) => {
        e.stopPropagation();
        if (window.activateToolWithTemplate) {
          window.activateToolWithTemplate(opt.id, 'point');
        }
        closeFlyout();
      }
    }, [
      el('div', { innerHTML: iconHtml, style: 'width: 20px; height: 20px;' }),
      el('span', { text: opt.name })
    ]);
    listItems.push(li);
  }

  const flyout = el('div', {
    id: 'pinFlyout',
    class: 'modal-content pin-flyout',
    style: `position: fixed; z-index: 2000; width: 180px; padding: 0.5rem; text-align: left;`
  }, [
    el('ul', { class: 'is-dropdown-menu', style: 'margin:0; padding:0; list-style:none;' }, listItems)
  ]);

  const closeFlyout = () => {
    flyout.remove();
    document.removeEventListener('click', closeFlyout);
  };

  document.body.appendChild(flyout);

  // Position logic
  const anchor = document.elementFromPoint(x, y).closest('button');
  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    if (toolbarPos === 'bottom') {
      flyout.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    } else {
      flyout.style.top = `${rect.bottom + 8}px`;
    }
    flyout.style.left = `${rect.left + (rect.width / 2) - 90}px`; // Center it
  }

  setTimeout(() => {
    document.addEventListener('click', closeFlyout, { once: true, capture: true });
  }, 0);
}

function hideInfoPanel(persist = true) {
  $('#infoPanel').classList.remove('is-visible');
  $('#mainContainer').classList.remove('info-panel-visible');
  _syncBothPanelsClass();
  infoPanelFeatureId = null;
  selectedBlockId = null;
  isContentEditMode = false;
  if (window.resetPropertiesState) window.resetPropertiesState();
  if (persist) {
    rightPanelHidden = true;
    saveLS('rightPanelHidden', true);
  }
}

function setRightPanelHidden(hidden) {
  rightPanelHidden = hidden;
  saveLS('rightPanelHidden', hidden);
}

function showSaving() {
  const status = $('#saveStatus');
  if (status) {
    status.querySelector('.status-icon').classList.add('saving');
    status.querySelector('.status-text').textContent = 'Saving...';
  }
}

function showSaved() {
  const status = $('#saveStatus');
  if (status) {
    status.querySelector('.status-icon').classList.remove('saving');
    const name = (typeof settings !== 'undefined' && settings.projectName) ? settings.projectName : 'Project';
    status.querySelector('.status-text').textContent = `${name} Saved locally`;
  }
}

window.setLoadingState = setLoadingState;
window.highlightItemInAtlas = highlightItemInAtlas;
window.highlightItemInEncyclopedia = highlightItemInEncyclopedia;
window.showPinFlyout = showPinFlyout;
window.hideInfoPanel = hideInfoPanel;
window.setRightPanelHidden = setRightPanelHidden;
window.showSaving = showSaving;
window.showSaved = showSaved;
window.updateLoadMapButtonState = updateLoadMapButtonState;
window.setSiteTheme = setSiteTheme;
window.setShowCats = setShowCats;