// styles.js - Centralized UI styles, geometry defaults, and icon helpers

const PIN_SHAPES = {
  blank: "",
  marker: "M128,8C64.9,8,16,56.9,16,120c0,28.2,11.2,53.6,29.3,72.4L128,248l82.7-55.6c18.1-18.8,29.3-44.2,29.3-72.4C240,56.9,191.1,8,128,8Z",
  "marker-alt": "M128,8C64.9,8,16,56.9,16,120c0,28.2,11.2,53.6,29.3,72.4L128,248l82.7-55.6c18.1-18.8,29.3-44.2,29.3-72.4C240,56.9,191.1,8,128,8ZM128,208c-48.4,0-88-39.6-88-88s39.6-88,88-88s88,39.6,88,88S176.4,208,128,208Z",
  circle: "M232,128A104,104,0,1,1,128,24,104.13,104.13,0,0,1,232,128Z",
  diamond: "M240,128a15.85,15.85,0,0,1-4.67,11.28l-96.05,96.06a16,16,0,0,1-22.56,0h0l-96-96.06a16,16,0,0,1,0-22.56l96.05-96.06a16,16,0,0,1,22.56,0l96.05,96.06A15.85,15.85,0,0,1,240,128Z",
  door: "M224,254 L32,254 L32,128 A96,96,0,0,1,224,128 Z",
  shield: "M224,56v56c0,52.72-25.52,84.67-46.93,102.19-23.06,18.86-46,25.27-47,25.53a8,8,0,0,1-4.2,0c-1-.26-23.91-6.67-47-25.53C57.52,196.67,32,164.72,32,112V56A16,16,0,0,1,48,40H208A16,16,0,0,1,224,56Z",
  flag: "M232,56V176a8,8,0,0,1-2.76,6c-15.28,13.23-29.89,18-43.82,18-18.91,0-36.57-8.74-53-16.85C105.87,170,82.79,158.61,56,179.77V224a8,8,0,0,1-16,0V56a8,8,0,0,1,2.77-6h0c36-31.18,68.31-15.21,96.79-1.12C167,62.46,190.79,74.2,218.76,50A8,8,0,0,1,232,56Z",
  "banner-1": "M32,2 L224,2 L224,254 L128,192 L32,254 Z",
  "banner-2": "M32,2 L224,2 L224,224 L176,192 L128,224 L80,192 L32,224 Z",
  "banner-3": "M224,2 L224,192 L128,254 L32,192 L32,2 Z"
};

const DEFAULT_GEOMETRY_STYLES = {
  polygon: { color: '#5de3c1', weight: 3, fillOpacity: 0.2 },
  polyline: { color: '#5de3c1', weight: 3, dashArray: null, smooth: false },
  point: { color: '#ff7a1a', markerSize: 40 },
  text: { fontSize: 16, fontColor: '#ffffff', labelStyle: 'outline' }
};

const DASH_STYLE_OPTIONS = [
  { label: 'Solid',    value: null          },
  { label: 'Dashed',   value: '8, 6'        },
  { label: 'Dotted',   value: '2, 4'        },
  { label: 'Dash·Dot', value: '8, 4, 2, 4'  },
];

const LINE_SMOOTH_OPTIONS = [
  { label: 'Linear', value: false },
  { label: 'Curved', value: true  }
];

/**
 * Returns the HTML for an item's associated pin/geometry icon.
 * Consolidated from worldbuilder.js, panels.js, and inspector.js.
 * 
 * @param {Object} item - Feature, Encyclopedia Entry, or Map object
 * @param {Object} options - Override options (size, color, etc)
 * @returns {Promise<string>} HTML string
 */
async function getItemIconHTML(item, options = {}) {
  const type = options.type || (item.id?.startsWith('map-') ? 'map' : (item.kind === 'entry' ? 'encyclopedia' : 'feature'));
  const geometryType = options.geometry || item.geometry || 'point';

  if (type === 'map') {
    const mapIconHtml = await getIconHTML('map-trifold', '#ffffff');
    return `
      <div class="custom-svg-pin ${options.listMode ? 'list-pin-preview' : ''}">
        <svg viewBox="0 0 256 256" fill="var(--accent)" stroke="black" stroke-width="16">
          <path d="${PIN_SHAPES['marker']}"></path>
        </svg>
        <div class="pin-icon-inner">${mapIconHtml}</div>
      </div>
    `;
  }

  let taxonomyItem = {};
  if (item.featureType) {
    taxonomyItem = getTaxonomyItem(item.featureType) || {};
  } else if (item.type) {
    // Search taxonomy for an entry with this type (Encyclopedia)
    for (const key in TAXONOMY) {
      if (TAXONOMY[key].type === item.type) {
        taxonomyItem = TAXONOMY[key];
        break;
      }
    }
  }

  if (geometryType === 'point') {
    const isLorePin = item._silo === 'lore' || item.id?.startsWith('ent-') || item.id?.startsWith('ency-') || item.kind === 'entry';
    const shape = item.pinShape || taxonomyItem.pinShape || (isLorePin ? 'blank' : 'marker');
    const iconName = item.iconClass || taxonomyItem.icon || 'pin';
    const iconColor = options.color || item.iconColor || taxonomyItem.iconColor || '#ff7a1a';
    const pinIconColor = item.pinIconColor || '#ffffff';

    const iconHtml = await getIconHTML(iconName, pinIconColor);
    const isBlank = shape === 'blank';
    const isCustomShape = shape.startsWith('cs-');
    
    let shapeHtml = '';
    if (isBlank) {
      shapeHtml = '';
    } else if (isCustomShape) {
      const shapeUrl = await resolveImageUrl(shape);
      shapeHtml = `<div class="custom-shape-mask" style="-webkit-mask-image: url('${shapeUrl}'); mask-image: url('${shapeUrl}'); background-color: ${safeCssColor(iconColor)};"></div>`;
    } else {
      const pathData = PIN_SHAPES[shape] || PIN_SHAPES['marker'];
      shapeHtml = `
        <svg viewBox="0 0 256 256" fill="${safeCssColor(iconColor)}" stroke="black" stroke-width="16">
          <path d="${pathData}"></path>
        </svg>`;
    }

    return `
      <div class="custom-svg-pin ${isBlank ? 'pin-blank' : ''} ${isCustomShape ? 'pin-custom-shape' : ''} ${options.listMode ? 'list-pin-preview' : ''}">
        ${shapeHtml}
        <div class="pin-icon-inner">${iconHtml}</div>
      </div>
    `;
  } else if (geometryType === 'polyline') {
    const iconHtml = await getIconHTML('line-segments', '#ffffff');
    return `
      <div class="custom-svg-pin ${options.listMode ? 'list-pin-preview' : ''}">
        <svg viewBox="0 0 256 256" fill="var(--accent)" stroke="black" stroke-width="16">
          <path d="${PIN_SHAPES['marker']}"></path>
        </svg>
        <div class="pin-icon-inner">${iconHtml}</div>
      </div>
    `;
  } else if (geometryType === 'text') {
    const iconHtml = await getIconHTML('text-t', '#ffffff');
    return `
      <div class="custom-svg-pin ${options.listMode ? 'list-pin-preview' : ''}">
        <svg viewBox="0 0 256 256" fill="var(--accent)" stroke="black" stroke-width="16">
          <path d="${PIN_SHAPES['marker']}"></path>
        </svg>
        <div class="pin-icon-inner">${iconHtml}</div>
      </div>
    `;
  } else {
    // polygon / other

    // CoA: custom upload takes priority
    if (item.coatOfArmsKey) {
      const url = await resolveImageUrl(item.coatOfArmsKey);
      return `<div class="custom-svg-pin coa-icon ${options.listMode ? 'list-pin-preview' : ''}"><img src="${escapeHtml(url)}" alt="Coat of Arms"></div>`;
    }
    // CoA: auto-generated from feature.id seed (or stored override seed)
    if (item.coatOfArms && window.generateCoatOfArms) {
      const coaSeed = item.coatOfArms.seed || item.id;
      const coaUrl = await window.generateCoatOfArms(coaSeed, { shield: item.coatOfArms.shield || 'heater', size: 256 });
      return `<div class="custom-svg-pin coa-icon ${options.listMode ? 'list-pin-preview' : ''}"><img src="${coaUrl}" alt="Coat of Arms"></div>`;
    }

    // default: taxonomy icon
    const iconName = item.iconClass || taxonomyItem.icon || 'area';
    const iconColor = item.iconColor || taxonomyItem.iconColor || '#ff7a1a';
    const pinColor = item.color || iconColor;
    const iconHtml = await getIconHTML(iconName, '#ffffff');
    return `
      <div class="custom-svg-pin ${options.listMode ? 'list-pin-preview' : ''}">
        <svg viewBox="0 0 256 256" fill="${safeCssColor(pinColor)}" stroke="black" stroke-width="16">
          <path d="${PIN_SHAPES['marker']}"></path>
        </svg>
        <div class="pin-icon-inner">${iconHtml}</div>
      </div>
    `;
  }
}

const LABEL_STYLE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Shadow', value: 'shadow' },
  { label: 'Outline', value: 'outline' }
];

/**
 * Builds a segmented control for choosing a line dash style.
 * 
 * @param {string|null} currentDashArray - The current dashArray value
 * @param {Function} onchange - Callback when a new style is selected
 * @returns {HTMLElement}
 */
function buildDashStyleSeg(currentDashArray, onchange) {
  const container = el('div', { class: 'seg full-width', id: 'lineDashStyleSeg' });
  const normalized = currentDashArray || null;
  const hasMatch = DASH_STYLE_OPTIONS.some(p => p.value === normalized);

  DASH_STYLE_OPTIONS.forEach(opt => {
    const isActive = (!hasMatch && opt.value === null) || normalized === opt.value;
    const btn = el('button', {
      class: isActive ? 'active' : '',
      text: opt.label,
      'data-dash': opt.value || ''
    });
    
    btn.onclick = (e) => {
      e.stopPropagation();
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onchange) onchange(opt.value);
    };
    
    container.appendChild(btn);
  });
  
  return container;
}

/**
 * Builds a segmented control for choosing if a line is smooth.
 * 
 * @param {boolean} currentSmooth - The current smooth value
 * @param {Function} onchange - Callback when a new value is selected
 * @returns {HTMLElement}
 */
function buildSmoothingSeg(currentSmooth, onchange) {
  const container = el('div', { class: 'seg full-width', id: 'lineSmoothingSeg' });
  const normalized = !!currentSmooth;

  LINE_SMOOTH_OPTIONS.forEach(opt => {
    const btn = el('button', {
      class: normalized === opt.value ? 'active' : '',
      text: opt.label,
      'data-smooth': opt.value ? 'true' : 'false'
    });
    
    btn.onclick = (e) => {
      e.stopPropagation();
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onchange) onchange(opt.value);
    };
    
    container.appendChild(btn);
  });
  
  return container;
}

/**
 * Builds a segmented control for choosing a label style.
 * 
 * @param {string} currentStyle - The current labelStyle value
 * @param {Function} onchange - Callback when a new style is selected
 * @returns {HTMLElement}
 */
function buildLabelStyleSeg(currentStyle, onchange) {
  const container = el('div', { class: 'seg', id: 'labelStyleSeg' });
  const normalized = currentStyle || 'outline';

  LABEL_STYLE_OPTIONS.forEach(opt => {
    const btn = el('button', {
      class: normalized === opt.value ? 'active' : '',
      text: opt.label,
      'data-style': opt.value
    });
    
    btn.onclick = (e) => {
      e.stopPropagation();
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onchange) onchange(opt.value);
    };
    
    container.appendChild(btn);
  });
  
  return container;
}

/**
 * Builds a unified header for an entity (Map, Feature, or Encyclopedia Entry).
 * Used by both the main content panel and map popups.
 * 
 * @param {Object} item - The entity object
 * @param {Object} options - Configuration (showMeta: boolean, etc)
 * @returns {Promise<HTMLElement>} The header element
 */
async function buildEntityHeader(item, options = {}) {
  const type = options.type || (item.id?.startsWith('map-') ? 'map' : (item.kind === 'entry' ? 'encyclopedia' : 'feature'));
  
  // 1. Hero Image Container
  const heroContainer = el('div', { class: 'info-panel-hero-image', id: options.showMeta ? 'infoPanelHero' : '' });
  const finalImageKey = item.heroImageKey || (type === 'map' ? item.imageKey : null);
  
  if (finalImageKey) {
    const heroUrl = await resolveImageUrl(finalImageKey);
    heroContainer.style.backgroundImage = `url('${heroUrl}')`;
    const fp = item.heroFocalPoint;
    heroContainer.style.backgroundPosition = fp ? `${fp.x}% ${fp.y}%` : 'center center';
    heroContainer.classList.add('has-image');
    // Click on the image area (not on child buttons/links) opens lightbox
    heroContainer.style.cursor = 'zoom-in';
    heroContainer.addEventListener('click', (e) => {
      if (e.target.closest('button, a, [data-no-lightbox]')) return;
      if (typeof window.showLightbox === 'function') window.showLightbox(heroUrl);
    });
  } else {
    heroContainer.classList.add('no-image');
  }

  // 2. Title & Icon
  const titleText = item.title || item.name || '(untitled)';
  const iconHtml = await getItemIconHTML(item);

  const iconNode = el('span', { innerHTML: iconHtml });

  // Phase D: editable name span (GM only, not for maps)
  const nameSpan = el('span', { text: titleText });
  if (role === 'gm' && type !== 'map' && !options.isPeek) {
    nameSpan.contentEditable = 'true';
    nameSpan.spellcheck = false;
    nameSpan.setAttribute('data-no-lightbox', '');
    nameSpan.addEventListener('focus', () => { if (window.recordState) window.recordState(); });
    nameSpan.addEventListener('input', () => {
      const val = nameSpan.textContent.trim();
      item.name  = val;
      item.title = val;
      if (window.markEntityDirty) window.markEntityDirty('article', item.id);
      if (window.debouncedSave)   window.debouncedSave();
      if (window.syncSingleLayer) window.syncSingleLayer(item);
      // Surgically update the sidebar label without a full panel refresh
      const atlasRow = document.querySelector(`.feature-row[data-fid="${item.id}"] .tree-label`);
      if (atlasRow) atlasRow.textContent = val;
      const loreRow = document.querySelector(`.encyclopedia-item[data-entry-id="${item.id}"] .entry-name`);
      if (loreRow)  loreRow.textContent  = val;
    });
    nameSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); nameSpan.blur(); }
    });
  }
  const titleH3 = el('h3', {}, [iconNode, nameSpan]);

  // 3. Identity row — category chip + visibility chip + overflow menu (Phase D, articles only)
  let identityRow = null;
  if (options.showMeta && !options.isPeek && type !== 'map' && role === 'gm') {
    identityRow = el('div', { class: 'hero-identity-row' });

    // Category chip (display-only — type shown as context label)
    const isLore = type === 'encyclopedia' || item._silo === 'lore';
    const categoryText = isLore
      ? (item.type || 'Entry')
      : (window.getTaxonomyItem?.(item.featureType)?.name || item.featureType || 'Feature');
    identityRow.appendChild(el('span', { class: 'hero-chip hero-category-chip', text: categoryText }));

    // Visibility chip (interactive toggle)
    const _visIcon = () => item.visibleToPlayers ? 'eye' : 'eye-closed';
    const visChipIcon = el('div', { style: `display:inline-block;width:11px;height:11px;flex-shrink:0;background-color:currentColor;-webkit-mask-image:url('./ui-icons/${_visIcon()}.svg');mask-image:url('./ui-icons/${_visIcon()}.svg');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;` });
    const visChipLabel = el('span', { text: item.visibleToPlayers ? 'Player Visible' : 'GM Only' });
    const visChip = el('button', {
      class: `hero-chip hero-visibility-chip${item.visibleToPlayers ? ' is-visible' : ''}`,
      title: 'Toggle player visibility',
      'data-no-lightbox': '',
      style: 'display:inline-flex;align-items:center;gap:4px;'
    }, [visChipIcon, visChipLabel]);
    visChip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.recordState) window.recordState();
      item.visibleToPlayers = !item.visibleToPlayers;
      const icon = _visIcon();
      visChipIcon.style.webkitMaskImage = `url('./ui-icons/${icon}.svg')`;
      visChipIcon.style.maskImage = `url('./ui-icons/${icon}.svg')`;
      visChipLabel.textContent = item.visibleToPlayers ? 'Player Visible' : 'GM Only';
      visChip.classList.toggle('is-visible', !!item.visibleToPlayers);
      if (window.markEntityDirty) window.markEntityDirty('article', item.id);
      if (window.debouncedSave)   window.debouncedSave();
    });
    identityRow.appendChild(visChip);

    // ⋯ overflow menu — templates + convert
    const overflowBtn = el('button', {
      class: 'hero-chip hero-overflow-btn',
      text: '⋯',
      title: 'More options',
      'data-no-lightbox': ''
    });
    overflowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuItems = [];
      const templates = (state.layoutTemplates || []).filter(t => !t.entityType || t.entityType === type);
      menuItems.push({ label: 'Save as Template…', action: () => window.saveLayoutTemplate?.(item.id, type) });
      if (templates.length > 0) {
        menuItems.push({ label: '— Load Template —', action: () => {} });
        templates.forEach(tpl => menuItems.push({
          label: tpl.name,
          sublabel: `${tpl.blocks?.length || 0} blocks`,
          action: () => window.applyLayoutTemplate?.(item.id, type, tpl.id)
        }));
      }
      if (isLore && window.convertEntryToFeature)
        menuItems.push({ label: 'Move to Atlas', action: () => window.convertEntryToFeature(item.id) });
      if (!isLore && item.geometry === 'point' && window.convertFeatureToEntry)
        menuItems.push({ label: 'Move to Lore', action: () => window.convertFeatureToEntry(item.id) });
      if (window.showHeroPopover) window.showHeroPopover(overflowBtn, menuItems);
    });
    identityRow.appendChild(overflowBtn);
  }

  // 4. Meta Strip
  let metaStrip = null;
  if (options.showMeta) {
    metaStrip = await buildEntityMetaStrip(item);
  }

  heroContainer.appendChild(titleH3);
  if (metaStrip) heroContainer.appendChild(metaStrip);

  // Drop zone affordance — only shown to GMs when no hero image
  if (!finalImageKey && options.showMeta && role === 'gm') {
    const dropZone = el('div', { class: 'hero-drop-zone' }, [
      el('div', { class: 'hero-drop-icon' }),
      el('span', { text: 'Drop an image to set the hero' }),
    ]);
    heroContainer.appendChild(dropZone);
  }

  // Wrap hero + identity bar so identityRow sits BELOW the image — not inside it.
  // This fixes: chips hidden under gradient, z-index conflicts, pointer-events issues.
  if (identityRow) {
    const wrapper = el('div', { class: 'entity-header-wrapper' });
    wrapper.appendChild(heroContainer);
    wrapper.appendChild(el('div', { class: 'entity-identity-bar' }, [identityRow]));
    return wrapper;
  }

  return heroContainer;
}

/**
 * Builds the meta chips (Maps, Lore, Locations, Events) for an entity header.
 * Internal helper for buildEntityHeader.
 */
async function buildEntityMetaStrip(item) {
  const linkedMapIds = item.linkedMapIds || [];

  // Separate encyclopedia entries (Lore) from atlas features (Locations)
  const loreItems = [];      // encyclopedia entries
  const locationItems = [];  // atlas features

  (item.links || []).forEach(l => {
    if (l.targetType === 'encyclopedia') loreItems.push({ type: 'entry', id: l.targetId });
    else if (l.targetType === 'feature')  locationItems.push({ type: 'feature', id: l.targetId });
  });

  if (window.getBacklinks) {
    const bl = window.getBacklinks(item.title || item.name, item.id);
    bl.forEach(link => {
      if (link.type === 'encyclopedia' || link.kind === 'entry') {
        if (!loreItems.some(x => x.id === link.id)) loreItems.push(link);
      } else {
        if (!locationItems.some(x => x.id === link.id)) locationItems.push(link);
      }
    });
  }

  const timelineBlocks = (item.blocks || []).filter(b => {
    if (b.type !== 'Timeline') return false;
    if (role === 'player' && !b.visibleToPlayers) return false;
    return (b.data?.events || []).some(e => e.date && e.title);
  });
  const totalEvents = timelineBlocks.reduce((n, b) => n + (b.data?.events || []).filter(e => e.date && e.title).length, 0);

  if (linkedMapIds.length === 0 && loreItems.length === 0 && locationItems.length === 0 && timelineBlocks.length === 0) return null;

  const metaStrip = el('div', { class: 'hero-meta-strip' });

  // Maps chip
  if (linkedMapIds.length > 0) {
    const mapIconHtml = await getIconHTML('map-trifold', 'rgba(255,255,255,0.85)');
    const singleMap = linkedMapIds.length === 1 ? state.maps.find(m => m.id === linkedMapIds[0]) : null;
    const chip = el('button', { class: 'hero-meta-pill', title: 'Linked maps' }, [
      el('span', { innerHTML: mapIconHtml }),
      el('span', { text: singleMap ? singleMap.name : `Maps · ${linkedMapIds.length}` })
    ]);
    chip.onclick = (e) => {
      e.stopPropagation();
      if (singleMap) {
        window.navigateToMap(linkedMapIds[0]);
      } else {
        window.showHeroPopover(chip, linkedMapIds.map(mid => {
          const m = state.maps.find(x => x.id === mid);
          return m ? { label: m.name, action: () => window.navigateToMap(mid) } : null;
        }).filter(Boolean));
      }
    };
    metaStrip.appendChild(chip);
  }

  // Locations chip — atlas features (pins, areas, lines)
  if (locationItems.length > 0) {
    const pinIconHtml = await getIconHTML('map-pin', 'rgba(255,255,255,0.85)');
    const singleLoc = locationItems.length === 1 ? locationItems[0] : null;
    const singleLocName = singleLoc ? (state.features.find(f => f.id === singleLoc.id)?.title || singleLoc.title || singleLoc.name) : null;
    const chip = el('button', { class: 'hero-meta-pill', title: 'Linked locations' }, [
      el('span', { innerHTML: pinIconHtml }),
      el('span', { text: singleLocName || `Locations · ${locationItems.length}` })
    ]);
    chip.onclick = (e) => {
      e.stopPropagation();
      if (singleLoc) {
        window.navigateToFeature(singleLoc.id);
      } else {
        window.showHeroPopover(chip, locationItems.map(l => {
          const feat = state.features.find(f => f.id === l.id);
          return { label: feat?.title || l.title || l.name || 'Location', action: () => window.navigateToFeature(l.id) };
        }));
      }
    };
    metaStrip.appendChild(chip);
  }

  // Lore chip — encyclopedia entries
  if (loreItems.length > 0) {
    const bookIconHtml = await getIconHTML('book-open', 'rgba(255,255,255,0.85)');
    const navigateLore = (l) => {
      $('#atlasTabBtn')?.click();
      window.selectEncyclopediaEntry(l.id);
    };
    const singleLore = loreItems.length === 1 ? loreItems[0] : null;
    const singleLoreName = singleLore ? (state.encyclopedia.find(e => e.id === singleLore.id)?.name || singleLore.name || 'Lore') : null;
    const chip = el('button', { class: 'hero-meta-pill', title: 'Lore connections' }, [
      el('span', { innerHTML: bookIconHtml }),
      el('span', { text: singleLoreName || `Lore · ${loreItems.length}` })
    ]);
    chip.onclick = (e) => {
      e.stopPropagation();
      if (singleLore) {
        navigateLore(singleLore);
      } else {
        window.showHeroPopover(chip, loreItems.map(l => {
          const name = state.encyclopedia.find(e => e.id === l.id)?.name || l.name || 'Entry';
          return { label: name, action: () => navigateLore(l) };
        }));
      }
    };
    metaStrip.appendChild(chip);
  }

  // Events chip
  if (timelineBlocks.length > 0) {
    const clockIconHtml = await getIconHTML('clock', 'rgba(255,255,255,0.85)');
    const scrollTo = (b) => {
      const blockEl = document.querySelector(`[data-block-id="${b.blockId}"]`);
      if (blockEl) blockEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const chip = el('button', { class: 'hero-meta-pill', title: 'Timeline events' }, [
      el('span', { innerHTML: clockIconHtml }),
      el('span', { text: `${totalEvents} event${totalEvents !== 1 ? 's' : ''}` })
    ]);
    chip.onclick = (e) => {
      e.stopPropagation();
      if (timelineBlocks.length === 1) {
        scrollTo(timelineBlocks[0]);
      } else {
        window.showHeroPopover(chip, timelineBlocks.map((b, i) => {
          const count = (b.data?.events || []).filter(e => e.date && e.title).length;
          return { label: `Timeline ${i + 1}`, sublabel: `${count} events`, action: () => scrollTo(b) };
        }));
      }
    };
    metaStrip.appendChild(chip);
  }

  return metaStrip;
}

/**
 * Builds the hero header section for a map popup.
 * Extracted from showMapPopup() to share the pattern with any future popup surfaces.
 *
 * @param {Object} item - Feature or Encyclopedia entry
 * @returns {Promise<HTMLElement>} The hero div element
 */
async function buildPopupHeader(item) {
  const heroUrl = item.heroImageKey ? await resolveImageUrl(item.heroImageKey) : null;
  const iconHtml = await getItemIconHTML(item);
  const titleText = item.title || item.name || '(untitled)';

  const heroContent = el('div', { class: 'map-popup-hero-content' }, [
    el('div', { class: 'map-popup-icon', innerHTML: iconHtml }),
    el('div', { class: 'map-popup-title', text: titleText })
  ]);

  const hero = el('div', {
    class: heroUrl ? 'map-popup-hero has-image' : 'map-popup-hero no-image'
  }, [heroContent]);
  if (heroUrl) hero.style.backgroundImage = `url('${heroUrl}')`;

  return hero;
}

/**
 * Returns lightweight HTML for icons in the sidebar (Atlas/Encyclopedia lists).
 * Specifically uses inline SVGs for non-point geometries as discussed.
 */
async function getSidebarIconHTML(item) {
  const isMap = item.id?.startsWith('map-');
  // isLorePin: encyclopedia entries live in state.encyclopedia and have kind:'entry'.
  // Prefer geometry field (always set by migration) over kind to avoid false positives
  // from old atlas pins that were incorrectly stamped with kind:'entry'.
  const isLorePin = item.id?.startsWith('ent-') || item.id?.startsWith('ency-') ||
                    (item.kind === 'entry' && !item.geometry);
  const geometryType = item.geometry || (isLorePin ? 'point' : 'polygon');

  if (isMap) {
    const iconHtml = await getIconHTML('map-trifold', 'currentColor');
    return `<div class="list-icon-simple">${iconHtml}</div>`;
  }

  if (isLorePin) {
    let taxonomyIcon = null;
    if (item.type && window.TAXONOMY) {
      for (const key in window.TAXONOMY) {
        if (window.TAXONOMY[key].type === item.type) { taxonomyIcon = window.TAXONOMY[key].icon; break; }
      }
    } else if (item.featureType && window.getTaxonomyItem) {
      taxonomyIcon = window.getTaxonomyItem(item.featureType)?.icon;
    }
    const iconName = item.iconClass || taxonomyIcon || 'book';
    return await getIconHTML(iconName, 'currentColor');
  }

  if (geometryType === 'point') {
    return getIconHTMLSync('map-pin', 'currentColor');
  } else if (geometryType === 'polyline') {
    return getIconHTMLSync('map-pin-line', 'currentColor');
  } else if (geometryType === 'text') {
    return getIconHTMLSync('text-t', 'currentColor');
  } else {
    // polygon / area
    return getIconHTMLSync('map-pin-area', 'currentColor');
  }
}

window.DEFAULT_GEOMETRY_STYLES = DEFAULT_GEOMETRY_STYLES;
window.DASH_STYLE_OPTIONS = DASH_STYLE_OPTIONS;
window.LINE_SMOOTH_OPTIONS = LINE_SMOOTH_OPTIONS;
window.LABEL_STYLE_OPTIONS = LABEL_STYLE_OPTIONS;
window.getItemIconHTML = getItemIconHTML;
window.getSidebarIconHTML = getSidebarIconHTML;
window.buildDashStyleSeg = buildDashStyleSeg;
window.buildSmoothingSeg = buildSmoothingSeg;
window.buildLabelStyleSeg = buildLabelStyleSeg;
window.buildEntityHeader = buildEntityHeader;
window.buildPopupHeader = buildPopupHeader;

/**
 * Builds a reusable date picker component.
 * 
 * @param {Object} dateData - { year, era, month, day }
 * @param {Function} onChange - Callback (key, value)
 * @param {Object} options - { label: string, showClear: boolean }
 * @returns {HTMLElement}
 */

/**
 * Populates a day <select> based on the chosen month's length from the calendar.
 * Exposed globally so inspector.js (birth/death date pickers) can call it.
 * @param {HTMLSelectElement} daySelect
 * @param {string} monthName
 * @param {number|string} currentDay
 */
function populateDayDropdown(daySelect, monthName, currentDay) {
  daySelect.innerHTML = '';
  if (!monthName || !settings.donjonCalendar) {
    daySelect.disabled = true;
    daySelect.append(el('option', { text: 'Day' }));
    return;
  }
  daySelect.disabled = false;
  const daysInMonth = settings.donjonCalendar.month_len[monthName] || 30;
  for (let i = 1; i <= daysInMonth; i++) {
    daySelect.append(el('option', { value: i, text: i, selected: parseInt(currentDay) === i }));
  }
}
window.populateDayDropdown = populateDayDropdown;

function buildDatePicker(dateData, onChange, options = {}) {
  const wrapper = el('div', { class: 'date-picker-component' });
  
  if (options.label) {
    wrapper.appendChild(el('div', { class: 'form-label full-width', text: options.label }));
  }

  const eraSelect = el('select');
  const monthSelect = el('select');
  const daySelect = el('select');

  const populateDayDropdownLocal = () => populateDayDropdown(daySelect, monthSelect.value, dateData.day);

  // Eras
  if (settings.donjonCalendar?.eras) {
    const sortedEras = [...settings.donjonCalendar.eras].sort((a, b) => a.startYear - b.startYear);
    sortedEras.forEach(era => {
      eraSelect.append(el('option', { value: era.name, text: era.name, selected: dateData.era === era.name }));
    });
  }

  // Months
  if (settings.donjonCalendar?.months) {
    monthSelect.append(el('option', { value: '', text: 'Month' }));
    settings.donjonCalendar.months.forEach(m => {
      monthSelect.append(el('option', { value: m, text: m, selected: dateData.month === m }));
    });
  }

  const yearInput = el('input', { 
    type: 'number', placeholder: 'Year', value: dateData.year || '',
    onchange: (e) => onChange('year', parseInt(e.target.value, 10))
  });

  eraSelect.onchange = (e) => onChange('era', e.target.value);
  monthSelect.onchange = (e) => {
    onChange('month', e.target.value);
    populateDayDropdownLocal();
  };
  daySelect.onchange = (e) => onChange('day', parseInt(e.target.value, 10));

  populateDayDropdownLocal();

  const group = el('div', { class: 'event-date-group' }, [
    el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Year' }), yearInput]),
    el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Era' }), eraSelect]),
    el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Month' }), monthSelect]),
    el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Day' }), daySelect])
  ]);

  wrapper.appendChild(group);

  if (options.showClear) {
    const clearBtn = el('button', { class: 'ghost small full-width', text: 'Clear Date', style: 'margin-top: 4px;' });
    clearBtn.onclick = () => {
      yearInput.value = '';
      monthSelect.value = '';
      populateDayDropdownLocal();
      onChange('clear', true);
    };
    wrapper.appendChild(clearBtn);
  }

  return wrapper;
}

window.buildDatePicker = buildDatePicker;
