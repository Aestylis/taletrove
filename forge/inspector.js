let _currentPanelId = null;

let articleViewMode = false;
let articleViewId = null;
let articleViewType = 'feature';

// Peek Mode state (map pin single-click → right side-sheet)
let peekViewMode = false;
let peekViewId = null;
let peekViewType = 'feature';

// Reading level memory — tracks the user's last intentional reading level so
// that navigating to a new entity from the nav panel reopens at the same level.
// null = closed, 'peek' = side-sheet, 'article' = full article view
let preferredReadingLevel = null;

function resetPropertiesState() {
  _currentPanelId = null;
}
window.resetPropertiesState = resetPropertiesState;

// Builds the empty-state content for a hero image drop zone
function buildHeroEmptyState() {
  return el('div', { class: 'hero-empty-state' }, [
    el('div', { class: 'hero-drop-icon' }),
    el('span', { class: 'hero-empty-primary', text: 'Drop image or click to upload' }),
    el('span', { class: 'hero-empty-secondary', text: 'or drag from your asset library' })
  ]);
}

/**
 * Builds the hero image section (label + preview with focal-point, drag-drop, upload).
 * Returns the wrapper element — caller places it where needed.
 * @param {object} article  - Feature or encyclopedia entry
 * @param {boolean} isAtlas - True for Atlas features; affects post-change refresh strategy
 */
function buildHeroImageSection(article, isAtlas) {
  const heroImageLabel = el('div', { class: 'form-label', text: 'Hero Image' });
  const heroPreview = el('div', { class: 'hero-image-preview' });

  heroPreview.ondragover  = (e) => { e.preventDefault(); e.stopPropagation(); heroPreview.classList.add('drag-over'); };
  heroPreview.ondragleave = (e) => { e.stopPropagation(); heroPreview.classList.remove('drag-over'); };
  heroPreview.ondrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    heroPreview.classList.remove('drag-over');
    const assetKey = e.dataTransfer.getData('application/x-taleprove-asset');
    if (assetKey) {
      recordState();
      article.heroImageKey = assetKey;
      markEntityDirty('article', article.id);
      if ($('#infoPanel').classList.contains('is-visible'))
        showInfoPanel(article.id, isAtlas ? 'feature' : 'encyclopedia');
      debouncedSave();
    } else if (e.dataTransfer.files.length > 0 && window.handleFileDrop) {
      window.currentTargetForHeroImage = article;
      window.handleFileDrop(e.dataTransfer.files[0], heroPreview);
    }
  };

  if (article.heroImageKey) {
    resolveImageUrl(article.heroImageKey).then(url => {
      if (!url) return;
      const fp = article.heroFocalPoint;
      heroPreview.style.backgroundImage    = `url('${url}')`;
      heroPreview.style.backgroundPosition = fp ? `${fp.x}% ${fp.y}%` : 'center center';
      heroPreview.classList.add('has-image');

      const dot = el('div', { class: 'hero-focal-dot' });
      dot.style.left = fp ? `${fp.x}%` : '50%';
      dot.style.top  = fp ? `${fp.y}%` : '50%';
      heroPreview.appendChild(dot);

      heroPreview.style.cursor = 'crosshair';
      heroPreview.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const rect = heroPreview.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width)  * 100);
        const y = Math.round(((e.clientY - rect.top)  / rect.height) * 100);
        recordState();
        article.heroFocalPoint = { x, y };
        heroPreview.style.backgroundPosition = `${x}% ${y}%`;
        dot.style.left = `${x}%`;
        dot.style.top  = `${y}%`;
        const infoPanelHero = document.getElementById('infoPanelHero');
        if (infoPanelHero) infoPanelHero.style.backgroundPosition = `${x}% ${y}%`;
        markEntityDirty('article', article.id);
        debouncedSave();
      });
    });
    heroPreview.appendChild(el('button', {
      class: 'ghost small danger', text: 'Remove',
      onclick: () => {
        recordState();
        article.heroImageKey   = null;
        article.heroFocalPoint = null;
        markEntityDirty('article', article.id);
        if (isAtlas) render();
        debouncedSave();
      }
    }));
  } else if (role === 'gm') {
    heroPreview.classList.add('is-empty');
    heroPreview.addEventListener('click', () => {
      window.currentTargetForHeroImage = article;
      $('#heroImageFile').click();
    });
    const emptyState = buildHeroEmptyState();
    const searchLink = el('button', {
      class: 'hero-empty-search-link',
      type: 'button',
      title: 'Search free image libraries (Wikimedia Commons)',
      text: 'Search free images',
    });
    searchLink.addEventListener('click', (e) => {
      e.stopPropagation(); // don't trigger the parent click → file picker
      if (typeof window.openImageSearchModal !== 'function') {
        if (typeof showAlertModal === 'function') showAlertModal('Image Search Unavailable', 'The image search module did not load.');
        return;
      }
      window.openImageSearchModal({
        title: 'Search Hero Image',
        onPick: async (blob, meta) => {
          const processed = await processImageUpload(blob);
          const imageKey = 'img-' + uid();
          await idbSet(imageKey, processed);
          state.assetNames = state.assetNames || {};
          state.assetNames[imageKey] = meta.title || 'Untitled';
          state.assetMeta = state.assetMeta || {};
          state.assetMeta[imageKey] = meta;
          recordState();
          article.heroImageKey = imageKey;
          markEntityDirty('article', article.id);
          markEntityDirty('meta');
          if ($('#infoPanel').classList.contains('is-visible'))
            showInfoPanel(article.id, isAtlas ? 'feature' : 'encyclopedia');
          if (typeof refreshAssetsView === 'function') refreshAssetsView(true);
          debouncedSave();
          if (typeof showToast === 'function') showToast(`Hero image set from ${meta.sourceLabel}.`);
        },
      });
    });
    emptyState.appendChild(searchLink);
    heroPreview.appendChild(emptyState);
  }

  return el('div', { class: 'full-width' }, [heroImageLabel, heroPreview]);
}

// Updates the hero h3 (icon + name) for the currently open encyclopedia entry or feature
// without rebuilding the entire content panel.
async function updateHeroTitle(item) {
  const h3 = document.querySelector('#infoPanelHero h3');
  if (!h3) return;
  const nameText = item.name || item.title || '';
  const iconHtml = await getItemIconHTML(item);
  h3.innerHTML = `${iconHtml}<span>${escapeHtml(nameText)}</span>`;
}
window.updateHeroTitle = updateHeroTitle;

/**
 * Builds the "Mentioned In" section for the inspector.
 * @param {string} name - The name of the entity.
 * @param {string} id - The ID of the entity.
 * @param {HTMLElement} parentElement - The container to append to.
 */
function buildBacklinksSection(name, id, parentElement) {
  const backlinks = getBacklinks(name, id);
  if (backlinks.length === 0) return;

  const titleRow = el('div', { class: 'inspector-section-title backlinks-title' }, [
    el('span', { text: 'Mentioned In' }),
    el('span', { class: 'backlinks-count-badge', text: String(backlinks.length) }),
  ]);
  const section = el('div', { class: 'inspector-section backlinks-section' }, [titleRow]);

  const list = el('div', { class: 'backlinks-list' });
  backlinks.forEach(link => {
    const item = el('div', {
      class: 'backlink-item clickable',
      text: link.name,
      title: `Click to navigate to ${link.name}`
    });
    item.onclick = () => {
      if (link.type === 'feature') {
        window.navigateAndPeek?.(link.id, 'feature');
      } else if (link.type === 'map') {
        window.navigateToMap(link.id, { skipInfoPanel: true });
      } else {
        window.navigateAndPeek?.(link.id, 'encyclopedia');
      }
    };
    list.appendChild(item);
  });

  section.appendChild(list);
  parentElement.appendChild(section);
}

// @ tags are excluded — they're auto-managed by map placement and shown in renderRelationshipTags.
function buildTagChipInput(entity, entityType) {
  const getPlain  = () => (entity.tags || []).filter(t => !t.startsWith('@'));
  const getSpatial = () => (entity.tags || []).filter(t => t.startsWith('@'));

  const persist = () => {
    markEntityDirty(entityType, entity.id);
    debouncedSave();
  };

  const container = el('div', { class: 'tag-chip-input' });

  const input = el('input', { type: 'text', class: 'tag-chip-text-input', placeholder: 'Add tag…' });

  const renderChips = () => {
    container.querySelectorAll('.tag-chip').forEach(c => c.remove());
    const plain = getPlain();
    input.placeholder = plain.length === 0 ? 'Add tag…' : '';
    for (const tag of plain) {
      const chip = el('span', { class: 'tag tag-chip' }, [
        el('span', { text: tag }),
        el('button', {
          class: 'tag-chip-remove', type: 'button', title: `Remove "${escapeHtml(tag)}"`,
          onclick: (e) => {
            e.stopPropagation();
            recordState();
            entity.tags = entity.tags.filter(t => t !== tag);
            persist();
            renderChips();
          }
        }, [document.createTextNode('×')])
      ]);
      container.insertBefore(chip, input);
    }
  };

  const addTags = (raw) => {
    const incoming = raw.split(',').map(t => t.trim()).filter(Boolean);
    if (!incoming.length) return;
    recordState();
    if (!entity.tags) entity.tags = [];
    incoming.forEach(t => { if (!entity.tags.includes(t)) entity.tags.push(t); });
    persist();
    renderChips();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.value.trim()) { addTags(input.value); input.value = ''; }
    } else if (e.key === 'Backspace' && input.value === '') {
      const plain = getPlain();
      if (plain.length > 0) {
        recordState();
        entity.tags = entity.tags.filter(t => t !== plain[plain.length - 1]);
        persist();
        renderChips();
      }
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) { addTags(input.value); input.value = ''; }
  });

  container.addEventListener('click', () => input.focus());
  container.appendChild(input);
  renderChips();
  return container;
}

async function buildLinkedMapsSection(article, form) {
  form.appendChild(el('hr', { class: 'form-divider' }));
  const linkedMapsLabel = el('div', { class: 'form-label', text: 'Linked Maps' });
  const linkedMapsContainer = el('div', { class: 'full-width linked-items-list' });

  // Render current links
  const currentMapIds = article.linkedMapIds || [];
  currentMapIds.forEach(mid => {
    const m = state.maps.find(map => map.id === mid);
    if (!m) return;
    const chip = el('div', { class: 'linked-item-chip' }, [
      el('span', { text: m.name }),
      el('button', {
        class: 'remove-btn',
        innerHTML: '&#10005;',
        onclick: () => {
          recordState();
          article.linkedMapIds = article.linkedMapIds.filter(id => id !== mid);
          const _sheetId = propertiesSheetId; const _sheetType = propertiesSheetType; if (_sheetId) window.openPropertiesSheet?.(_sheetId, _sheetType);
          debouncedSave();
        }
      })
    ]);
    linkedMapsContainer.appendChild(chip);
  });

  // Add map dropdown — exclude primary mapId and already-linked maps
  const availableMaps = state.maps.filter(m => m.id !== article.mapId && !currentMapIds.includes(m.id));
  const mapOptions = availableMaps.map(m => ({ value: m.id, text: m.name }));
  mapOptions.unshift({ value: '', text: 'Add a map link...' });

  const addMapSelect = createSearchableSelect(mapOptions, '', (newMapId) => {
    if (!newMapId) return;
    recordState();
    if (!article.linkedMapIds) article.linkedMapIds = [];
    article.linkedMapIds.push(newMapId);
    const _sheetId = propertiesSheetId; const _sheetType = propertiesSheetType; if (_sheetId) window.openPropertiesSheet?.(_sheetId, _sheetType);
    debouncedSave();
  }, 'Add a map link...');

  form.appendChild(el('div', { class: 'full-width' }, [linkedMapsLabel, linkedMapsContainer, addMapSelect]));
}

// onMap=false skips the map-specific controls (size, shape, pin color) so
// off-map encyclopedia entries can still pick their icon.
async function buildPinStyleSection(article, taxonomyItem, form, { onMap = true } = {}) {
  if (onMap) {
    const markerSizeLabel = el('label', { class: 'form-label', for: 'markerSizeIn', text: 'Marker Size (px)' });
    const markerSizeInput = el('input', {
      id: 'markerSizeIn',
      type: 'number',
      placeholder: `Default (${settings.globalMarkerSize || 40})`,
      value: article.markerSize || '',
      onchange: (e) => {
        recordState();
        const val = parseInt(e.target.value, 10);
        article.markerSize = isNaN(val) ? null : val;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });
    form.appendChild(el('div', { class: 'full-width' }, [markerSizeLabel, markerSizeInput]));

    const pinShapeLabel = el('div', { class: 'form-label', text: 'Pin Shape' });
    const pinShapePath = article.pinShape === 'blank' ? '' : (PIN_SHAPES[article.pinShape] || PIN_SHAPES['marker']);
    const pinShapePreview = el('div', { class: 'style-picker-icon', innerHTML: `<svg viewBox="0 0 256 256"><path d="${escapeHtml(pinShapePath)}"></path></svg>` });
    const pinShapeName = el('span', { text: (article.pinShape || 'marker').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) });
    const pinShapeBtn = el('button', { class: 'style-picker-btn', onclick: () => window.openPinShapePicker(article) }, [pinShapePreview, pinShapeName]);
    form.appendChild(el('div', { class: 'full-width' }, [pinShapeLabel, pinShapeBtn]));

    const pinColorValue = article.iconColor || taxonomyItem?.iconColor || taxonomyItem?.color || '#639bff';
    const pinColorSwatch = el('div', { class: 'style-picker-swatch', style: `background-color: ${safeCssColor(pinColorValue)}` });
    const pinColorName = el('span', { text: pinColorValue.toUpperCase() });
    const pinColorBtn = el('button', { class: 'style-picker-btn', onclick: () => window.openColorPicker(article, 'iconColor') }, [pinColorSwatch, pinColorName]);
    form.appendChild(el('div', { class: 'form-label full-width', text: 'Pin Color' }));
    form.appendChild(el('div', { class: 'full-width' }, [pinColorBtn]));
  }

  const iconShapeLabel = el('div', { class: 'form-label', text: 'Icon Shape' });
  const iconShapeContainer = el('div', { class: 'full-width' }, [iconShapeLabel]);
  form.appendChild(iconShapeContainer);

  const iconHtml = await getIconHTML(article.iconClass || taxonomyItem?.icon, 'var(--text)');
  const iconShapePreview = el('div', { class: 'style-picker-icon', innerHTML: iconHtml });
  const iconShapeName = el('span', { text: article.iconClass || taxonomyItem?.icon });
  const iconShapeBtn = el('button', { class: 'style-picker-btn', onclick: () => window.openIconPicker(article) }, [iconShapePreview, iconShapeName]);
  iconShapeContainer.appendChild(iconShapeBtn);

  const iconColorValue = article.pinIconColor || '#ffffff';
  const iconColorSwatch = el('div', { class: 'style-picker-swatch', style: `background-color: ${safeCssColor(iconColorValue) || '#ffffff'}` });
  const iconColorName = el('span', { text: iconColorValue.toUpperCase() });
  const iconColorBtn = el('button', { class: 'style-picker-btn', onclick: () => window.openColorPicker(article, 'pinIconColor') }, [iconColorSwatch, iconColorName]);
  form.appendChild(el('div', { class: 'form-label full-width', text: 'Icon Color' }));
  form.appendChild(el('div', { class: 'full-width' }, [iconColorBtn]));
}


function buildCoaBlock(article, silo, form) {
  const hasCoa     = !!(article.coatOfArms || article.coatOfArmsKey);
  const coaPreview = el('div', { class: `coa-preview${hasCoa ? '' : ''}` });

  if (article.coatOfArmsKey) {
    resolveImageUrl(article.coatOfArmsKey).then(url => {
      if (url && coaPreview.isConnected) {
        coaPreview.style.backgroundImage = `url('${url}')`;
        coaPreview.classList.add('has-image');
      }
    });
  } else if (article.coatOfArms && window.generateCoatOfArms) {
    const coaSeed = article.coatOfArms.seed || article.id;
    window.generateCoatOfArms(coaSeed, { shield: article.coatOfArms.shield || 'heater', size: 256 }).then(coaUrl => {
      if (coaPreview.isConnected) {
        coaPreview.innerHTML = `<img src="${coaUrl}" alt="Coat of Arms Preview">`;
        coaPreview.classList.add('has-svg');
      }
    });
  } else {
    coaPreview.classList.add('is-empty');
  }

  const coaEditBtn = el('button', { class: 'ghost small', text: hasCoa ? 'Edit' : '+ Generate / Upload' });
  coaEditBtn.onclick = () => openCoatOfArmsModal(article);

  const coaBtnRow = el('div', { class: 'coa-btn-row' }, [coaEditBtn]);

  if (hasCoa) {
    const coaRemoveBtn = el('button', { class: 'ghost small danger', text: 'Remove' });
    coaRemoveBtn.onclick = () => {
      recordState();
      article.coatOfArms    = null;
      article.coatOfArmsKey = null;
      markEntityDirty('article', article.id);
      if (window.updateCoaMarkerFor) window.updateCoaMarkerFor(article.id);
      if ($('#infoPanel').classList.contains('is-visible')) showInfoPanel(article.id, silo);
      debouncedSave();
    };
    coaBtnRow.appendChild(coaRemoveBtn);
  }

  form.appendChild(el('div', { class: 'full-width' }, [
    el('div', { class: 'form-label', text: 'Coat of Arms' }),
    coaPreview,
    coaBtnRow,
  ]));

  if (hasCoa) {
    const showCoaSwitch = createSwitch('showCoaMapChk', !!article.showCoatOfArms, (e) => {
      recordState();
      article.showCoatOfArms = e.target.checked;
      markEntityDirty('article', article.id);
      if (window.updateCoaMarkerFor) window.updateCoaMarkerFor(article.id);
      debouncedSave();
    });
    form.appendChild(
      el('div', { class: 'has-control full-width' }, [
        el('div', { class: 'form-label', text: 'Show on Map' }),
        showCoaSwitch,
      ])
    );
  }
}

async function buildArticlePropertiesInspector(article, container, silo) {
  const form = el('div', { class: 'form' });
  container.appendChild(form);

  const geometryType = article.geometry || null;
  const taxonomyItem = getTaxonomyItem(article.featureType) || {};
  // A point entity: atlas point feature OR encyclopedia entry placed on a map
  const isPoint = (silo === 'feature' && geometryType === 'point') ||
                  (silo === 'encyclopedia' && !!article.mapId);

  if (silo === 'encyclopedia') {
    form.append(
      el('label', { class: 'form-label', for: 'enc-type-input', text: 'Type' }),
      el('input', {
        id: 'enc-type-input',
        type: 'text', value: article.type,
        placeholder: 'e.g., Character, Item, Event...',
        list: 'encyclopediaTypes',
        onfocus: (e) => {
          recordState();
          e.target.select();
        },
        oninput: async (e) => {
          const oldType = (article.type || '').toLowerCase();
          const newType = e.target.value;
          article.type = newType;

          const wasSpecial = oldType === 'event' || oldType === 'character' || oldType === 'session';
          const isSpecial = newType.toLowerCase() === 'event' || newType.toLowerCase() === 'character' || newType.toLowerCase() === 'session';

          if (wasSpecial !== isSpecial || (isSpecial && oldType !== newType.toLowerCase())) {
            const _sheetId = propertiesSheetId; const _sheetType = propertiesSheetType; if (_sheetId) window.openPropertiesSheet?.(_sheetId, _sheetType);
          }
          markEntityDirty('article', article.id);
          debouncedRefreshEncyclopediaView();
          await updateHeroTitle(article);
          debouncedSave();
        },
        onchange: async (e) => {
          article.type = e.target.value.trim();
          markEntityDirty('article', article.id);
          debouncedRefreshEncyclopediaView();
          await updateHeroTitle(article);
          debouncedSave();
        }
      })
    );
  }

  form.append(
    el('div', { class: 'form-label', text: 'Tags' }),
    buildTagChipInput(article, silo),
    el('div', { id: 'relationshipTagsContainer', class: 'tag-display-area' })
  );

  if (article.heroImageKey || role === 'gm') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    form.appendChild(buildHeroImageSection(article, silo === 'feature'));
  }

  if (silo === 'encyclopedia' && article.mapId && role === 'gm') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    const mapPinLabel = el('div', { class: 'form-label', text: 'Map Pin' });
    const removeFromMapBtn = el('button', {
      class: 'ghost small danger',
      text: 'Remove from map',
      title: 'Remove the map pin without deleting this entry',
      onclick: () => {
        showConfirmationModal(
          'Remove from map?',
          `This will remove the map pin for "${escapeHtml(article.name)}" but keep the encyclopedia entry.`,
          'Remove',
          () => {
            recordState();
            delete article.mapId;
            delete article.geojson;
            delete article.geometry;
            markEntityDirty('article', article.id);
            window.exitPeekMode?.();
            render({ full: true });
            debouncedSave();
            refreshEncyclopediaView?.();
            refreshAtlasTree?.();
            showToast(`Pin for "${article.name}" removed.`);
          }
        );
      }
    });
    form.appendChild(el('div', { class: 'full-width' }, [mapPinLabel, removeFromMapBtn]));
  }

  if (silo === 'feature' && geometryType === 'text') {
    form.append(
      el('label', { class: 'form-label', for: 'textContentIn', text: 'Text Label' }),
      el('input', {
        id: 'textContentIn',
        type: 'text',
        value: article.text || '',
        onchange: (e) => {
          recordState();
          article.text = e.target.value;
          article.title = article.text;
          markEntityDirty('article', article.id);
          updateSingleFeatureUI(article);
          debouncedSave();
        }
      })
    );
  }

  // Always shown for encyclopedia (icon picker used in list view even off-map).
  // Map-specific controls (size, shape, pin color) only shown when on a map.
  if (isPoint || silo === 'encyclopedia') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    await buildPinStyleSection(article, taxonomyItem, form, { onMap: isPoint });
  }

  if (isPoint) {
    await buildLinkedMapsSection(article, form);
  }

  if (silo === 'feature' && geometryType === 'polygon') {
    form.appendChild(el('hr', { class: 'form-divider' }));

    const opacitySlider = el('input', {
      id: 'areaOpacityIn',
      type: 'range',
      min: 0,
      max: 1,
      step: 0.05,
      value: article.fillOpacity ?? taxonomyItem.fillOpacity ?? DEFAULT_GEOMETRY_STYLES.polygon.fillOpacity
    });

    opacitySlider.oninput = (e) => {
      const newOpacity = parseFloat(e.target.value);
      article.fillOpacity = newOpacity;
      const layer = layerById.get(article.id);
      if (layer && layer.setStyle) {
        layer.setStyle({ fillOpacity: newOpacity });
      }
    };

    opacitySlider.onchange = (e) => {
      recordState();
      article.fillOpacity = parseFloat(e.target.value);
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    };

    opacitySlider.onfocus = () => recordState();

    const areaColorInput = el('input', {
      id: 'areaColorIn',
      type: 'color',
      value: article.color || taxonomyItem.color || '#3388ff',
      onfocus: () => recordState(),
      onchange: (e) => {
        article.color = e.target.value;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });

    const lineWidthInput = el('input', {
      id: 'lineWidthIn',
      type: 'number', min: 1, max: 20,
      value: article.weight || taxonomyItem.weight || 2,
      onfocus: () => recordState(),
      onchange: (e) => {
        article.weight = parseFloat(e.target.value) || 2;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });

    const showLabelSwitch = createSwitch('showLabelChk', !!article.showLabel, (e) => {
      recordState();
      article.showLabel = e.target.checked;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    });

    form.append(
      el('label', { class: 'form-label', for: 'areaColorIn', text: 'Fill Color' }),
      areaColorInput,
      el('div', { class: 'form-label', text: 'Fill Opacity' }),
      opacitySlider,
      el('label', { class: 'form-label', for: 'lineWidthIn', text: 'Border Width' }),
      lineWidthInput,
      el('div', { class: 'form-label', text: 'Border Style' }),
      buildDashStyleSeg(article.dashArray, (val) => {
        recordState();
        article.dashArray = val || null;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }),
      el('label', { class: 'form-label', for: 'showLabelChk', text: 'Show Label' }),
      showLabelSwitch
    );

    buildCoaBlock(article, 'feature', form);
  }

  if (silo === 'encyclopedia') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    buildCoaBlock(article, 'encyclopedia', form);

    const linkedPolygon = state.features.find(f =>
      (f.links || []).some(l => l.targetId === article.id && l.linkType === 'territory') &&
      f.geometry === 'polygon' && (f.coatOfArms || f.coatOfArmsKey)
    );
    if (linkedPolygon) {
      form.appendChild(el('hr', { class: 'form-divider' }));
      const coaPreview = el('div', { class: 'coa-preview is-inherited' });

      if (linkedPolygon.coatOfArmsKey) {
        resolveImageUrl(linkedPolygon.coatOfArmsKey).then(url => {
          if (url && coaPreview.isConnected) {
            coaPreview.style.backgroundImage = `url('${url}')`;
            coaPreview.classList.add('has-image');
          }
        });
      } else if (linkedPolygon.coatOfArms && window.generateCoatOfArms) {
        const coaSeed = linkedPolygon.coatOfArms.seed || linkedPolygon.id;
        window.generateCoatOfArms(coaSeed, { shield: linkedPolygon.coatOfArms.shield || 'heater', size: 256 }).then(coaUrl => {
          coaPreview.innerHTML = `<img src="${coaUrl}" alt="Coat of Arms Preview">`;
          coaPreview.classList.add('has-svg');
        });
      }

      const editOnTerritoryBtn = el('button', { class: 'ghost small', text: 'Edit on Territory' });
      editOnTerritoryBtn.onclick = () => window.navigateAndPeek?.(linkedPolygon.id, 'feature');

      form.append(
        el('div', { class: 'form-label', text: 'Territory Coat of Arms' }),
        coaPreview,
        el('div', { class: 'coa-btn-row' }, [
          editOnTerritoryBtn,
          el('span', { class: 'coa-inherited-label muted', text: `From ${linkedPolygon.title || 'linked territory'}` })
        ])
      );
    }
  }

  if (silo === 'feature' && geometryType === 'polyline') {
    form.appendChild(el('hr', { class: 'form-divider' }));

    const lineColorInput = el('input', {
      id: 'lineColorIn',
      type: 'color',
      value: article.color || taxonomyItem.color || '#3388ff',
      onfocus: () => recordState(),
      onchange: (e) => {
        article.color = e.target.value;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });

    const lineWidthInput = el('input', {
      id: 'lineWidthIn',
      type: 'number', min: 1, max: 20,
      value: article.weight || taxonomyItem.weight || 3,
      onfocus: () => recordState(),
      onchange: (e) => {
        article.weight = parseFloat(e.target.value);
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });

    const showLabelSwitch = createSwitch('showLabelChk', !!article.showLabel, (e) => {
      recordState();
      article.showLabel = e.target.checked;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    });

    form.append(
      el('label', { class: 'form-label', for: 'lineColorIn', text: 'Line Color' }),
      lineColorInput,
      el('label', { class: 'form-label', for: 'lineWidthIn', text: 'Line Width' }),
      lineWidthInput,
      el('div', { class: 'form-label', text: 'Smoothing' }),
      buildSmoothingSeg(article.smooth, (val) => {
        recordState();
        article.smooth = val;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }),
      el('div', { class: 'form-label', text: 'Line Style' }),
      buildDashStyleSeg(article.dashArray, (val) => {
        recordState();
        article.dashArray = val || null;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }),
      el('label', { class: 'form-label', for: 'showLabelChk', text: 'Show Label' }),
      showLabelSwitch
    );
  }

  if (silo === 'feature' && geometryType === 'text') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    const fontOptions = commonFonts.map(font => el('option', { value: font.stack, text: font.name, ...(article.fontFamily === font.stack ? { selected: true } : {}) }));

    const fontSizeInput = el('input', {
      id: 'fontSizeIn', type: 'number', min: 8, max: 128,
      value: article.fontSize || 16,
      onfocus: () => recordState(),
      onchange: (e) => {
        article.fontSize = parseInt(e.target.value, 10) || 16;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });

    const fontColorInput = el('input', {
      id: 'fontColorIn', type: 'color',
      value: article.fontColor || '#ffffff',
      onfocus: () => recordState(),
      onchange: (e) => {
        article.fontColor = e.target.value;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });

    const fontFamilySel = el('select', { id: 'fontFamilySel' }, fontOptions);
    fontFamilySel.onfocus = () => recordState();
    fontFamilySel.onchange = (e) => {
      article.fontFamily = e.target.value;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    };

    const boldChk = el('input', { id: 'boldChk', type: 'checkbox', ...(article.bold ? { checked: true } : {}) });
    boldChk.onchange = (e) => {
      recordState();
      article.bold = e.target.checked;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    };

    const italicChk = el('input', { id: 'italicChk', type: 'checkbox', ...(article.italic ? { checked: true } : {}) });
    italicChk.onchange = (e) => {
      recordState();
      article.italic = e.target.checked;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    };

    const underlineChk = el('input', { id: 'underlineChk', type: 'checkbox', ...(article.underline ? { checked: true } : {}) });
    underlineChk.onchange = (e) => {
      recordState();
      article.underline = e.target.checked;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    };

    const textLabelStyleSeg = buildLabelStyleSeg(article.labelStyle, (val) => {
      recordState();
      article.labelStyle = val;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    });

    form.append(
      el('label', { class: 'form-label', for: 'fontSizeIn', text: 'Font Size' }),
      fontSizeInput,
      el('label', { class: 'form-label', for: 'fontColorIn', text: 'Font Color' }),
      fontColorInput,
      el('label', { class: 'form-label', for: 'fontFamilySel', text: 'Font Family' }),
      fontFamilySel,
      el('div', { class: 'form-label', text: 'Font Style' }),
      el('div', { class: 'inline' }, [
        el('label', { class: 'inline' }, [boldChk, el('span', { text: 'Bold' })]),
        el('label', { class: 'inline' }, [italicChk, el('span', { text: 'Italic' })]),
        el('label', { class: 'inline' }, [underlineChk, el('span', { text: 'Underline' })])
      ]),
      el('div', { class: 'form-label', text: 'Label Style' }),
      textLabelStyleSeg
    );
  }

  if (silo === 'feature' && geometryType !== null && geometryType !== 'text') {
    form.appendChild(el('hr', { class: 'form-divider' }));

    const labelColorInput = el('input', {
      id: 'labelColorIn', type: 'color',
      value: article.labelColor || '#ffffff',
      onfocus: () => recordState(),
      onchange: (e) => {
        article.labelColor = e.target.value;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });

    const labelBoldChk = el('input', {
      id: 'labelBoldChk', type: 'checkbox',
      ...(article.labelBold ? { checked: true } : {})
    });
    labelBoldChk.onchange = (e) => {
      recordState();
      article.labelBold = e.target.checked;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    };

    const labelSizeInput = el('input', {
      id: 'labelSizeIn', type: 'number', min: 8, max: 72,
      value: article.labelSize || 12,
      style: 'width: 60px;',
      onfocus: () => recordState(),
      onchange: (e) => {
        article.labelSize = parseInt(e.target.value, 10) || 12;
        markEntityDirty('article', article.id);
        updateSingleFeatureUI(article);
        debouncedSave();
      }
    });

    const labelStyleSeg = buildLabelStyleSeg(article.labelStyle, (val) => {
      recordState();
      article.labelStyle = val;
      markEntityDirty('article', article.id);
      updateSingleFeatureUI(article);
      debouncedSave();
    });

    form.append(
      el('div', { class: 'form-label', text: 'Label Style' }),
      el('div', { class: 'inline' }, [
        labelColorInput,
        el('label', { class: 'inline' }, [labelBoldChk, el('span', { text: 'Bold' })]),
        el('span', { text: 'Size', class: 'muted', style: 'margin-left: 0.5rem;' }),
        labelSizeInput,
        labelStyleSeg
      ])
    );
  }

  if (silo === 'encyclopedia' && (article.type || '').toLowerCase() === 'event') {
    article.eventData = article.eventData || {};
    const colorValue = article.eventData?.color || '#ff3ea5';
    const colorSwatch = el('div', { class: 'style-picker-swatch', style: `background-color: ${safeCssColor(colorValue)}` });
    const colorName = el('span', { text: 'Event Color' });
    const colorBtn = el('button', { class: 'style-picker-btn', onclick: () => { openColorPicker(null, null, (hexColor) => { recordState(); article.eventData.color = hexColor; markEntityDirty('article', article.id); const _sid = propertiesSheetId; const _stype = propertiesSheetType; if (_sid) window.openPropertiesSheet?.(_sid, _stype); debouncedSave(); }); } }, [colorSwatch, colorName]);
    const textColorValue = article.eventData?.textColor || '#e8e9eb';
    const textColorSwatch = el('div', { class: 'style-picker-swatch', style: `background-color: ${safeCssColor(textColorValue)}` });
    const textColorName = el('span', { text: 'Text Color' });
    const textColorBtn = el('button', { class: 'style-picker-btn', onclick: () => { openColorPicker(null, null, (hexColor) => { recordState(); article.eventData.textColor = hexColor; markEntityDirty('article', article.id); const _sid = propertiesSheetId; const _stype = propertiesSheetType; if (_sid) window.openPropertiesSheet?.(_sid, _stype); debouncedSave(); }); } }, [textColorSwatch, textColorName]);
    form.appendChild(el('div', { class: 'full-width two' }, [colorBtn, textColorBtn]));

    form.appendChild(el('hr', { class: 'form-divider' }));

    const startPicker = buildDatePicker(article.eventData, (key, val) => {
      recordState();
      article.eventData[key] = val;
      markEntityDirty('article', article.id);
      debouncedSave();
    }, { label: 'Event Date' });

    const endData = {
      year: article.eventData.endYear,
      era: article.eventData.endEra,
      month: article.eventData.endMonth,
      day: article.eventData.endDay
    };
    const endPicker = buildDatePicker(endData, (key, val) => {
      recordState();
      if (key === 'clear') {
        article.eventData.endYear = article.eventData.endEra = article.eventData.endMonth = article.eventData.endDay = null;
      } else {
        const map = { year: 'endYear', era: 'endEra', month: 'endMonth', day: 'endDay' };
        article.eventData[map[key]] = val;
      }
      markEntityDirty('article', article.id);
      debouncedSave();
    }, { label: 'End Date (Optional)', showClear: true });

    form.append(startPicker, endPicker);

    const recurrenceControls = el('div', { class: 'recurrence-controls' });
    const updateRecurrenceUI = () => {
      recurrenceControls.innerHTML = '';
      const rec = article.eventData.recurrence;
      if (!rec) return;

      if (rec.type === 'annual_relative') {
        const weekSelect = el('select', {}, [
          el('option', { value: '1', text: '1st' }),
          el('option', { value: '2', text: '2nd' }),
          el('option', { value: '3', text: '3rd' }),
          el('option', { value: '4', text: '4th' }),
          el('option', { value: 'last', text: 'Last' })
        ]);
        weekSelect.value = rec.week || '1';

        const weekdaySelect = el('select');
        if (settings.donjonCalendar?.weekdays) {
          settings.donjonCalendar.weekdays.forEach(wd => {
            weekdaySelect.append(el('option', { value: wd, text: wd }));
          });
        }
        weekdaySelect.value = rec.weekday || (settings.donjonCalendar?.weekdays?.[0] || '');

        weekSelect.onchange = weekdaySelect.onchange = () => {
          recordState();
          rec.week = weekSelect.value === 'last' ? -1 : parseInt(weekSelect.value, 10);
          rec.weekday = weekdaySelect.value;
          debouncedSave();
        };

        recurrenceControls.append(
          el('div', { class: 'form-label', text: 'On the...' }),
          el('div', { class: 'recurrence-grid' }, [weekSelect, weekdaySelect])
        );
      } else if (rec.type === 'lunar') {
        const moonSelect = el('select');
        if (settings.donjonCalendar?.moons) {
          settings.donjonCalendar.moons.forEach(m => {
            moonSelect.append(el('option', { value: m, text: m }));
          });
        }
        moonSelect.value = rec.moon || (settings.donjonCalendar?.moons?.[0] || '');

        const phaseSelect = el('select', {}, [
          el('option', { value: '0', text: 'New Moon' }),
          el('option', { value: '0.25', text: 'First Quarter' }),
          el('option', { value: '0.5', text: 'Full Moon' }),
          el('option', { value: '0.75', text: 'Last Quarter' })
        ]);
        phaseSelect.value = rec.phase !== undefined ? rec.phase.toString() : '0.5';

        moonSelect.onchange = phaseSelect.onchange = () => {
          recordState();
          rec.moon = moonSelect.value;
          rec.phase = parseFloat(phaseSelect.value);
          debouncedSave();
        };

        recurrenceControls.append(
          el('div', { class: 'form-label', text: 'Based on...' }),
          el('div', { class: 'recurrence-grid' }, [moonSelect, phaseSelect])
        );
      }
    };

    const recTypeSelect = el('select', { class: 'recurrence-type-select' }, [
      el('option', { value: '', text: 'No Recurrence' }),
      el('option', { value: 'annual_date', text: 'Repeats Annually (Same Date)' }),
      el('option', { value: 'annual_relative', text: 'Repeats Annually (Relative)' }),
      el('option', { value: 'lunar', text: 'Repeats Every Lunar Cycle' })
    ]);
    recTypeSelect.value = article.eventData.recurrence?.type || '';
    recTypeSelect.onchange = () => {
      recordState();
      const type = recTypeSelect.value;
      if (!type) {
        delete article.eventData.recurrence;
      } else {
        article.eventData.recurrence = { type };
        if (type === 'annual_relative') {
          article.eventData.recurrence.week = 1;
          article.eventData.recurrence.weekday = settings.donjonCalendar?.weekdays?.[0] || '';
        } else if (type === 'lunar') {
          article.eventData.recurrence.moon = settings.donjonCalendar?.moons?.[0] || '';
          article.eventData.recurrence.phase = 0.5;
        }
      }
      updateRecurrenceUI();
      debouncedSave();
    };

    updateRecurrenceUI();
    form.append(el('div', { class: 'form-label form-label--mt', text: 'Recurrence' }), recTypeSelect, recurrenceControls);

    // Participants
    form.appendChild(el('hr', { class: 'form-divider' }));
    await buildParticipantsSection(article, form);
  }

  if (silo === 'encyclopedia' && (article.type || '').toLowerCase() === 'character') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    article.birthData = article.birthData || {};
    const birthLabel = el('div', { class: 'form-label full-width', text: 'Birthday' });

    const birthYearInput = el('input', { type: 'number', placeholder: 'Year', value: article.birthData.year || '' });
    const birthEraSelect = el('select');
    const birthMonthSelect = el('select');
    const birthDaySelect = el('select');

    if (settings.donjonCalendar?.eras) {
      const sortedEras = [...settings.donjonCalendar.eras].sort((a, b) => a.startYear - b.startYear);
      sortedEras.forEach(era => birthEraSelect.append(el('option', { value: era.name, text: era.name })));
      if (article.birthData.era) birthEraSelect.value = article.birthData.era;
    }
    if (settings.donjonCalendar?.months) {
      birthMonthSelect.append(el('option', { value: '', text: 'Month' }), ...settings.donjonCalendar.months.map(m => el('option', { value: m, text: m, title: m })));
      if (article.birthData.month) birthMonthSelect.value = article.birthData.month;
    }
    populateDayDropdown(birthDaySelect, article.birthData.month, article.birthData.day);

    const birthDateGroup = el('div', { class: 'event-date-group event-date-group--char' });
    birthDateGroup.append(
      el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Year' }), birthYearInput]),
      el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Era' }), birthEraSelect]),
      el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Month' }), birthMonthSelect]),
      el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Day' }), birthDaySelect])
    );

    const updateBirthData = () => {
      recordState();
      article.birthData.year = parseInt(birthYearInput.value, 10) || null;
      article.birthData.era = birthEraSelect.value || null;
      article.birthData.month = birthMonthSelect.value || null;
      article.birthData.day = parseInt(birthDaySelect.value, 10) || null;
      debouncedSave();
      const _sheetId = propertiesSheetId; const _sheetType = propertiesSheetType; if (_sheetId) window.openPropertiesSheet?.(_sheetId, _sheetType);
    };
    [birthYearInput, birthEraSelect, birthDaySelect].forEach(el => el.onchange = updateBirthData);
    birthMonthSelect.onchange = () => { populateDayDropdown(birthDaySelect, birthMonthSelect.value, article.birthData.day); updateBirthData(); };
    form.append(birthLabel, birthDateGroup);

    article.deathData = article.deathData || {};
    const deathLabel = el('div', { class: 'form-label form-label--mt full-width', text: 'Date of Death' });

    const deathYearInput = el('input', { type: 'number', placeholder: 'Year', value: article.deathData.year || '' });
    const deathEraSelect = el('select');
    const deathMonthSelect = el('select');
    const deathDaySelect = el('select');

    if (settings.donjonCalendar?.eras) {
      const sortedEras = [...settings.donjonCalendar.eras].sort((a, b) => a.startYear - b.startYear);
      sortedEras.forEach(era => deathEraSelect.append(el('option', { value: era.name, text: era.name })));
      if (article.deathData.era) deathEraSelect.value = article.deathData.era;
    }
    if (settings.donjonCalendar?.months) {
      deathMonthSelect.append(el('option', { value: '', text: 'Month' }), ...settings.donjonCalendar.months.map(m => el('option', { value: m, text: m, title: m })));
      if (article.deathData.month) deathMonthSelect.value = article.deathData.month;
    }
    populateDayDropdown(deathDaySelect, article.deathData.month, article.deathData.day);

    const deathDateGroup = el('div', { class: 'event-date-group event-date-group--char' });
    deathDateGroup.append(
      el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Year' }), deathYearInput]),
      el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Era' }), deathEraSelect]),
      el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Month' }), deathMonthSelect]),
      el('div', { class: 'event-date-group-item' }, [el('span', { text: 'Day' }), deathDaySelect])
    );

    const updateDeathData = () => {
      recordState();
      article.deathData.year = parseInt(deathYearInput.value, 10) || null;
      article.deathData.era = deathEraSelect.value || null;
      article.deathData.month = deathMonthSelect.value || null;
      article.deathData.day = parseInt(deathDaySelect.value, 10) || null;
      debouncedSave();
      const _sheetId = propertiesSheetId; const _sheetType = propertiesSheetType; if (_sheetId) window.openPropertiesSheet?.(_sheetId, _sheetType);
    };
    [deathYearInput, deathEraSelect, deathDaySelect].forEach(el => el.onchange = updateDeathData);
    deathMonthSelect.onchange = () => { populateDayDropdown(deathDaySelect, deathMonthSelect.value, article.deathData.day); updateDeathData(); };
    form.append(deathLabel, deathDateGroup);

    if (article.birthData.year) {
      let age;
      let ageLabelText = 'Current Age';
      const birthYear = article.birthData.year;
      const deathYear = article.deathData?.year;
      const currentYear = settings.currentDate?.year;
      if (deathYear) {
        ageLabelText = 'Age at Death';
        age = deathYear - birthYear;
        if (article.birthData.month && article.deathData.month) {
          const birthMonthIndex = settings.donjonCalendar.months.indexOf(article.birthData.month);
          const deathMonthIndex = settings.donjonCalendar.months.indexOf(article.deathData.month);
          if (deathMonthIndex < birthMonthIndex || (deathMonthIndex === birthMonthIndex && article.deathData.day < article.birthData.day)) {
            age--;
          }
        }
      } else if (currentYear) {
        age = currentYear - birthYear;
        if (article.birthData.month && settings.currentDate.month) {
          const currentMonthIndex = settings.donjonCalendar.months.indexOf(settings.currentDate.month);
          const birthMonthIndex = settings.donjonCalendar.months.indexOf(article.birthData.month);
          if (currentMonthIndex < birthMonthIndex || (currentMonthIndex === birthMonthIndex && settings.currentDate.day < article.birthData.day)) {
            age--;
          }
        }
      }
      if (age !== undefined && age >= 0) {
        const ageDisplay = el('div', { class: 'infobox-row' }, [
          el('span', { class: 'infobox-label', text: ageLabelText }),
          el('span', { class: 'infobox-value', text: `${age}` })
        ]);
        form.appendChild(ageDisplay);
      }
    }

    // Family tree button
    const hasFamilyLinks = (article.links || []).some(l => l.linkType === 'family');
    if (hasFamilyLinks) {
      form.appendChild(el('hr', { class: 'form-divider' }));
      const ftBtn = el('button', { class: 'ghost small full-width', text: 'View Family Tree' });
      ftBtn.addEventListener('click', () => window.openFamilyTree?.(article.id));
      form.appendChild(ftBtn);
    }
  }

  if (silo === 'encyclopedia' && (article.type || '').toLowerCase() === 'session') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    article.sessionData = article.sessionData || {};

    // Session number
    const sessionNumInput = el('input', {
      type: 'number', min: '1', placeholder: 'e.g. 1',
      value: article.sessionData.number != null ? article.sessionData.number : '',
      onfocus: () => recordState(),
      onchange: (e) => {
        article.sessionData.number = parseInt(e.target.value, 10) || null;
        markEntityDirty('article', article.id);
        window.refreshSessionsView?.();
        debouncedSave();
      }
    });
    form.append(el('label', { class: 'form-label', text: 'Session #' }), sessionNumInput);

    // Real-world date
    const realDateInput = el('input', {
      type: 'date',
      value: article.sessionData.realDate || '',
      onfocus: () => recordState(),
      onchange: (e) => {
        article.sessionData.realDate = e.target.value;
        markEntityDirty('article', article.id);
        window.refreshSessionsView?.();
        debouncedSave();
      }
    });
    form.append(el('label', { class: 'form-label form-label--mt', text: 'Date Played' }), realDateInput);

    // Players / participants
    const playersInput = el('input', {
      type: 'text', placeholder: 'e.g. Alice, Bob, Carol',
      value: article.sessionData.participants || '',
      onfocus: () => recordState(),
      onchange: (e) => {
        article.sessionData.participants = e.target.value.trim();
        markEntityDirty('article', article.id);
        debouncedSave();
      }
    });
    form.append(el('label', { class: 'form-label form-label--mt', text: 'Players' }), playersInput);

    // In-world date (reuse eventData so sessions appear in the timeline)
    form.appendChild(el('hr', { class: 'form-divider' }));
    article.eventData = article.eventData || {};
    const inWorldPicker = buildDatePicker(article.eventData, (key, val) => {
      recordState();
      article.eventData[key] = val;
      markEntityDirty('article', article.id);
      debouncedSave();
    }, { label: 'In-World Date' });
    form.appendChild(inWorldPicker);
  }

  form.appendChild(el('hr', { class: 'form-divider' }));
  await buildLinksSection(article, silo, form);

  if (silo === 'feature' && geometryType === 'point') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    form.appendChild(el('button', {
      class: 'ghost convert-silo-btn full-width',
      title: 'Move this pin to the Encyclopedia',
      text: 'Move to Encyclopedia',
      onclick: () => window.convertFeatureToEntry(article.id)
    }));
  }

  if (silo === 'encyclopedia') {
    form.appendChild(el('hr', { class: 'form-divider' }));
    form.appendChild(el('button', {
      class: 'ghost convert-silo-btn full-width',
      title: 'Move this entry to the Atlas as a pin',
      text: 'Move to Atlas',
      onclick: () => window.convertEntryToFeature(article.id)
    }));
    const deleteBtn = el('button', {
      class: 'danger full-width',
      text: 'Delete Entry',
      onclick: () => deleteEncyclopediaEntry(article.id)
    });
    form.appendChild(deleteBtn);
  }

  // Individual field handlers above write directly to article.* and call markEntityDirty.
  // This catch-all handles any remaining inputs (e.g. from helpers) that don't have direct handlers.
  form.querySelectorAll('input, select, textarea').forEach(inputEl => {
    inputEl.addEventListener('focus', () => recordState());
  });

  const relTagsContainer = form.querySelector('#relationshipTagsContainer');
  if (relTagsContainer) {
    await renderRelationshipTags(article, relTagsContainer);
  }

  const displayName = article.title || article.name || '';
  buildBacklinksSection(displayName, article.id, container);
}

async function updateSingleFeatureUI(feature) {
  const atlasRow = document.querySelector(`.feature-row[data-fid="${feature.id}"]`);
  if (atlasRow) {
    const treeLabel = atlasRow.querySelector('.tree-label');
    if (treeLabel) {
      const newTitle = feature.title || '(untitled)';
      if (treeLabel.textContent !== newTitle) {
        treeLabel.textContent = newTitle;
      }
    }
    const iconContainer = atlasRow.querySelector('.item-icon');
    if (iconContainer && window.getSidebarIconHTML) {
      const iconHtml = await getSidebarIconHTML(feature);
      iconContainer.innerHTML = iconHtml;
    }
  }

  const entryRow = document.querySelector(`.encyclopedia-item[data-entry-id="${feature.id}"]`);
  if (entryRow) {
    const entryLabel = entryRow.querySelector('.entry-name');
    if (entryLabel) {
      const newName = feature.name || '(untitled)';
      if (entryLabel.textContent !== newName) {
        entryLabel.textContent = newName;
      }
    }
    const iconContainer = entryRow.querySelector('.item-icon');
    if (iconContainer && window.getSidebarIconHTML) {
      const iconHtml = await getSidebarIconHTML(feature);
      iconContainer.innerHTML = iconHtml;
    }
  }

  if (window.syncSingleLayer) {
    window.syncSingleLayer(feature);
  }

  if (feature.id === infoPanelFeatureId || feature.id === selectedEncyclopediaEntryId) {
    await updateHeroTitle(feature);
  }
}
window.updateSingleFeatureUI = updateSingleFeatureUI;



function showHeroPopover(anchorEl, items) {
  const existing = document.querySelector('.hero-chip-popover');
  if (existing) existing.remove();

  const popover = el('div', { class: 'hero-chip-popover' });
  for (const item of items) {
    const row = el('div', { class: 'hero-chip-popover-item' }, [
      el('span', { class: 'item-label', text: item.label }),
      ...(item.sublabel ? [el('span', { class: 'item-sublabel', text: item.sublabel })] : [])
    ]);
    row.onclick = (e) => {
      e.stopPropagation();
      popover.remove();
      item.action();
    };
    popover.appendChild(row);
  }

  const rect = anchorEl.getBoundingClientRect();
  popover.style.top = `${rect.bottom + 6}px`;
  popover.style.left = `${rect.left}px`;
  document.body.appendChild(popover);

  // Clamp to viewport edges
  requestAnimationFrame(() => {
    const pr = popover.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) {
      popover.style.left = `${window.innerWidth - pr.width - 8}px`;
    }
    if (pr.bottom > window.innerHeight - 8) {
      popover.style.top = `${rect.top - pr.height - 6}px`;
    }
  });

  // Delay so this click doesn't immediately self-dismiss
  setTimeout(() => {
    document.addEventListener('click', () => popover.remove(), { once: true, capture: true });
  }, 0);
}

function buildMapPropertiesInspector(map, parentElement) {
  const form = el('div', { class: 'form' });

  form.append(
    el('label', { class: 'form-label', for: 'map-name-input', text: 'Map Name' }),
    el('input', {
      id: 'map-name-input',
      type: 'text',
      value: map.name || '',
      onfocus: () => recordState(),
      onchange: (e) => {
        map.name = e.target.value.trim();
        markEntityDirty('map', map.id);
        render({ full: true }); // Full render to update Atlas and breadcrumbs
        debouncedSave();
      }
    })
  );

  const mapImageBtn = el('button', { class: 'ghost full-width', text: 'Load Map Image...' });
  mapImageBtn.onclick = () => {
    targetMapIdForUpload = map.id;
    $('#mapImageFile').click();
  };
  form.appendChild(el('div', { class: 'full-width' }, [mapImageBtn]));

  form.appendChild(el('hr', { class: 'form-divider' }));

  const scaleLabel = el('div', { class: 'form-label full-width', text: 'Map Scale' });
  const scaleGroup = el('div', { class: 'scale-input-group' });

  const scalePixelsIn = el('input', { type: 'number', value: map.scale?.pixels || 100 });
  const scaleDistIn = el('input', { type: 'number', value: map.scale?.distance || 5 });
  const scaleUnitIn = el('input', { type: 'text', value: map.scale?.unit || 'miles' });

  scaleGroup.append(
    scalePixelsIn,
    el('span', { text: 'px' }),
    el('span', { text: '=' }),
    scaleDistIn,
    scaleUnitIn
  );

  const updateScale = () => {
    map.scale = map.scale || {};
    map.scale.pixels = parseInt(scalePixelsIn.value, 10) || 100;
    map.scale.distance = parseFloat(scaleDistIn.value) || 5;
    map.scale.unit = scaleUnitIn.value.trim() || 'miles';
    markEntityDirty('map', map.id);
    debouncedSave();
  };

  // Add event listeners to save changes
  scalePixelsIn.onfocus = recordState;
  scalePixelsIn.onchange = updateScale;
  scaleDistIn.onfocus = recordState;
  scaleDistIn.onchange = updateScale;
  scaleUnitIn.onfocus = recordState;
  scaleUnitIn.onchange = updateScale;

  form.append(scaleLabel, el('div', { class: 'full-width' }, [scaleGroup]));

  parentElement.appendChild(form);
  
  buildBacklinksSection(map.name, map.id, parentElement);
}

function buildBlockInspector(feature, block) {
  const body = $('#inspectorContent');
  const header = $('#inspectorHeader');
  body.innerHTML = '';

  function updateStateFromBlockInspector() {
    const f = state.features.find(x => x.id === selectedId);
    const b = f?.blocks.find(bl => bl.blockId === selectedBlockId);
    if (!b) return;
    const inspBody = document.querySelector('#inspectorContent');
    switch (b.type) {
      case 'TextField': { const ci = inspBody?.querySelector('#blockContentIn'); if (ci) b.data.content = ci.value; break; }
      case 'Image': { const si = inspBody?.querySelector('#blockSrcIn'); const ci2 = inspBody?.querySelector('#blockCaptionIn'); if (si) b.data.src = si.value; if (ci2) b.data.caption = ci2.value; break; }
      case 'YouTube': { const ui = inspBody?.querySelector('#blockUrlIn'); if (ui) b.data.url = ui.value; break; }
      case 'Tags': { const ti = inspBody?.querySelector('#blockTagsIn'); if (ti) b.data.tags = (ti.value || '').split(',').map(s => s.trim()).filter(Boolean); break; }
    }
    showInfoPanel(selectedId);
    debouncedSave();
  }

  const blockDef = BLOCK_DEFINITIONS[block.type];
  header.innerHTML = `<h3>${blockDef.name} Block</h3>`;

  const form = el('div', { class: 'form' });

  // Use a switch to create the correct inputs for each block type
  switch (block.type) {
    case 'TextField':
      form.appendChild(el('div', { class: 'full-width' }, [
        el('textarea', {
          id: 'blockContentIn',
          onfocus: () => recordState(),
          oninput: () => updateStateFromBlockInspector(), // This is a new function we'll create next
          text: block.data.content || ''
        })
      ]));
      break;

    case 'Image':
      form.append(
        el('label', { class: 'form-label', for: 'blockSrcIn', text: 'Image Source' }),
        el('input', {
          id: 'blockSrcIn', type: 'text', placeholder: 'img-key or https://...',
          value: block.data.src || '',
          onfocus: () => recordState(),
          onchange: () => updateStateFromBlockInspector()
        }),
        el('label', { class: 'form-label', for: 'blockCaptionIn', text: 'Caption' }),
        el('input', {
          id: 'blockCaptionIn', type: 'text',
          value: block.data.caption || '',
          onfocus: () => recordState(),
          onchange: () => updateStateFromBlockInspector()
        })
      );
      break;

    case 'YouTube':
      form.append(
        el('label', { class: 'form-label', for: 'blockUrlIn', text: 'YouTube URL' }),
        el('input', {
          id: 'blockUrlIn', type: 'url', placeholder: 'https://www.youtube.com/watch?v=...',
          value: block.data.url || '',
          onfocus: () => recordState(),
          onchange: () => updateStateFromBlockInspector()
        })
      );
      break;

    case 'Tags':
      form.append(
        el('label', { class: 'form-label', for: 'blockTagsIn', text: 'Tags' }),
        el('input', {
          id: 'blockTagsIn', type: 'text', placeholder: 'Comma, separated, tags',
          value: (block.data.tags || []).join(', '),
          onfocus: () => recordState(),
          onchange: () => updateStateFromBlockInspector()
        })
      );
      break;

    case 'FeatureLink':
      const targetIds = block.data.targetIds || [];
      let linkInspectorContent;

      if (targetIds.length > 0) {
        const details = el('details', { class: 'link-list-details' });
        const summary = el('summary', {
          class: 'link-list-summary',
          text: `${targetIds.length} Linked Feature(s)`
        });

        const linkList = el('ul', { class: 'link-list' });
        for (const targetId of targetIds) {
          const targetFeature = state.features.find(f => f.id === targetId);
          if (targetFeature) {
            const link = el('a', {
              href: `#${targetFeature.id}`,
              text: targetFeature.title || '(untitled)'
            });
            link.onclick = (e) => { e.preventDefault(); navigateToFeature(targetFeature.id); };
            linkList.appendChild(el('li', {}, [link]));
          }
        }
        details.append(summary, linkList);
        linkInspectorContent = details;
      } else {
        linkInspectorContent = el('p', { class: 'muted', text: 'No features linked. Add links using the editor in the main panel.' });
      }
      form.appendChild(el('div', { class: 'full-width' }, [linkInspectorContent]));
      break;
  }

  body.appendChild(form);
}

function createSwitch(id, checked, onchange) {
  const input = el('input', { type: 'checkbox', id, checked });
  if (onchange) input.addEventListener('change', onchange);
  return el('label', { class: 'switch' }, [
    input,
    el('span', { class: 'slider' })
  ]);
}

const LINK_TYPES = [
  { value: 'located-in',  label: 'Located in' },
  { value: 'territory',   label: 'Territory' },
  { value: 'family',      label: 'Family' },
  { value: 'member',      label: 'Member' },
  { value: 'participant', label: 'Participant' },
  { value: 'ally',        label: 'Ally' },
  { value: 'enemy',       label: 'Enemy' },
  { value: 'rival',       label: 'Rival' },
  { value: 'contains',    label: 'Contains' },
  { value: 'related',     label: 'Related' },
  { value: 'custom',      label: 'Custom' },
];

// Ray-casting point-in-polygon. coords are GeoJSON [x, y] pairs.
function pointInPolygon([px, py], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

async function buildParticipantsSection(entry, parentElement) {
  const container = el('div', { class: 'entity-participants-section full-width' });
  container.appendChild(el('div', { class: 'form-label', text: 'Participants' }));

  const chipsList = el('div', { class: 'entity-links-list' });

  const rebuildChips = async () => {
    chipsList.innerHTML = '';
    entry.eventData.participantIds = entry.eventData.participantIds || [];

    // Auto-clean stale links
    const before = entry.eventData.participantIds.length;
    entry.eventData.participantIds = entry.eventData.participantIds.filter(pId => {
      return !!state.encyclopedia.find(e => e.id === pId) || !!state.features.find(f => f.id === pId);
    });
    if (entry.eventData.participantIds.length !== before) {
      markEntityDirty('article', entry.id);
      debouncedSave();
    }

    if (entry.eventData.participantIds.length === 0) {
      chipsList.appendChild(el('span', { class: 'entity-links-empty muted', text: 'No participants yet' }));
    }

    for (const pId of entry.eventData.participantIds) {
      const target = state.encyclopedia.find(e => e.id === pId) || state.features.find(f => f.id === pId);
      const name = target ? (target.title || target.name || '(untitled)') : '(untitled)';
      const iconHtml = target ? (await getSidebarIconHTML(target)) : '';

      const chip = el('div', { class: 'entity-link-chip' });
      const iconWrap = el('div', { class: 'item-icon' });
      iconWrap.innerHTML = iconHtml;
      chip.appendChild(iconWrap);

      const nameSpan = el('span', { class: 'entity-link-name entity-link-navigate', text: name });
      nameSpan.onclick = () => {
        const pType = state.encyclopedia.find(e => e.id === pId) ? 'encyclopedia' : 'feature';
        window.navigateAndPeek?.(pId, pType);
      };
      chip.appendChild(nameSpan);

      if (role === 'gm') {
        const removeBtn = el('button', { class: 'entity-link-remove', title: 'Remove participant', text: '×' });
        removeBtn.onclick = () => {
          recordState();
          entry.eventData.participantIds = entry.eventData.participantIds.filter(id => id !== pId);
          markEntityDirty('article', entry.id);
          rebuildChips();
          debouncedSave();
        };
        chip.appendChild(removeBtn);
      }
      chipsList.appendChild(chip);
    }
  };

  await rebuildChips();
  container.appendChild(chipsList);

  if (role === 'gm') {
    let pendingTarget = null;
    const options = [
      { value: '', text: 'Search participant...' },
      ...state.features.map(f => ({ value: f.id, text: f.title || '(untitled)' })),
      ...state.encyclopedia.filter(e => e.id !== entry.id).map(e => ({ value: e.id, text: e.name || '(untitled)' }))
    ];

    const targetSelect = createSearchableSelect(options, '', (val) => {
      pendingTarget = val;
    }, 'Search participant...');

    const addBtn = el('button', { class: 'ghost small', text: '+ Add' });
    addBtn.onclick = async () => {
      if (!pendingTarget) return;
      if (entry.eventData.participantIds.includes(pendingTarget)) {
        showToast('Already a participant.');
        return;
      }
      recordState();
      entry.eventData.participantIds.push(pendingTarget);
      markEntityDirty('article', entry.id);
      await rebuildChips();
      debouncedSave();
    };

    container.appendChild(el('div', { class: 'entity-link-add-row' }, [targetSelect, addBtn]));
  }

  parentElement.appendChild(container);
}

async function buildLinksSection(entity, entityType, parentElement) {
  const container = el('div', { class: 'entity-links-section full-width' });
  container.appendChild(el('div', { class: 'form-label', text: 'Links' }));

  const chipsList = el('div', { class: 'entity-links-list' });

  const rebuildChips = async () => {
    chipsList.innerHTML = '';

    // Auto-clean stale links pointing to deleted entities.
    // Links missing targetType are kept (migration may not have run yet for this session).
    const before = (entity.links || []).length;
    entity.links = (entity.links || []).filter(link => {
      if (!link.targetId) return false;
      if (link.targetType === 'encyclopedia') return !!state.encyclopedia.find(e => e.id === link.targetId);
      if (link.targetType === 'feature')      return !!state.features.find(f => f.id === link.targetId);
      if (link.targetType === 'map')          return !!(state.maps || []).find(m => m.id === link.targetId);
      // Unknown/missing targetType — keep rather than silently destroy
      return true;
    });
    if (entity.links.length !== before) {
      markEntityDirty(entityType, entity.id);
      debouncedSave();
    }

    const currentLinks = entity.links || [];
    if (currentLinks.length === 0) {
      chipsList.appendChild(el('span', { class: 'entity-links-empty muted', text: 'No links yet' }));
    }
    for (const link of currentLinks) {
      let target = null;
      if (link.targetType === 'encyclopedia') target = state.encyclopedia.find(e => e.id === link.targetId);
      else if (link.targetType === 'feature')  target = state.features.find(f => f.id === link.targetId);
      else if (link.targetType === 'map')      target = (state.maps || []).find(m => m.id === link.targetId);
      else if (link.targetId) {
        // targetType missing — search all silos and repair in-place
        target = state.encyclopedia.find(e => e.id === link.targetId)
              || state.features.find(f => f.id === link.targetId)
              || (state.maps || []).find(m => m.id === link.targetId);
        if (target) {
          link.targetType = state.encyclopedia.some(e => e.id === link.targetId) ? 'encyclopedia'
                          : state.features.some(f => f.id === link.targetId)     ? 'feature'
                          : 'map';
        }
      }

      const name = target ? (target.title || target.name || '(untitled)') : '(untitled)';
      const iconHtml = target ? (await getSidebarIconHTML(target)) : '';

      const chip = el('div', { class: 'entity-link-chip' });
      const iconWrap = el('div', { class: 'item-icon' });
      iconWrap.innerHTML = iconHtml;
      chip.appendChild(iconWrap);

      const nameSpan = el('span', { class: 'entity-link-name', text: name });
      if (target) {
        nameSpan.classList.add('entity-link-navigate');
        nameSpan.onclick = () => {
          if (link.targetType === 'encyclopedia') window.navigateAndPeek?.(link.targetId, 'encyclopedia');
          else if (link.targetType === 'feature') window.navigateAndPeek?.(link.targetId, 'feature');
          else if (link.targetType === 'map')     window.navigateToMap(link.targetId, { skipInfoPanel: true });
        };
      }
      chip.appendChild(nameSpan);

      if (link.label) chip.appendChild(el('span', { class: 'entity-link-sublabel muted', text: link.label }));
      chip.appendChild(el('span', { class: 'entity-link-type-badge', text: link.linkType }));

      if (role === 'gm') {
        const removeBtn = el('button', { class: 'entity-link-remove', title: 'Remove link', text: '×' });
        removeBtn.onclick = () => {
          recordState();
          entity.links = (entity.links || []).filter(l => l.id !== link.id);
          markEntityDirty(entityType, entity.id);
          rebuildChips();
          debouncedSave();
        };
        chip.appendChild(removeBtn);
      }
      chipsList.appendChild(chip);
    }
  };

  await rebuildChips();
  container.appendChild(chipsList);

  // --- Linked by (incoming links from other entities) ---
  const buildLinkedBy = async () => {
    const existing = container.querySelector('.entity-linked-by-section');
    if (existing) existing.remove();

    const incoming = [];
    const scan = (items, type) => items.forEach(item => {
      if (item.id === entity.id) return;
      (item.links || []).forEach(link => {
        if (link.targetId === entity.id) incoming.push({ source: item, sourceType: type, link });
      });
      // Also scan event participants
      if (item.type === 'event' && item.eventData?.participantIds) {
        if (item.eventData.participantIds.includes(entity.id)) {
          incoming.push({ source: item, sourceType: type, link: { linkType: 'participant' } });
        }
      }
    });
    scan(state.features, 'feature');
    scan(state.encyclopedia, 'encyclopedia');

    if (incoming.length === 0) return;

    const section = el('div', { class: 'entity-linked-by-section' });
    section.appendChild(el('div', { class: 'form-label muted', style: 'font-size:0.75rem;margin-top:0.5rem', text: 'Linked by' }));
    const linkedByList = el('div', { class: 'entity-linked-by-list' });

    for (const { source, sourceType, link } of incoming) {
      const iconHtml = await getSidebarIconHTML(source);
      const chip = el('div', { class: 'entity-link-chip entity-link-incoming' });
      const iconWrap = el('div', { class: 'item-icon' });
      iconWrap.innerHTML = iconHtml;
      chip.appendChild(iconWrap);
      const nameSpan = el('span', { class: 'entity-link-name entity-link-navigate', text: source.title || source.name || '(untitled)' });
      nameSpan.onclick = () => {
        window.navigateAndPeek?.(source.id, sourceType);
      };
      chip.appendChild(nameSpan);
      chip.appendChild(el('span', { class: 'entity-link-type-badge', text: link.linkType }));
      linkedByList.appendChild(chip);
    }

    section.appendChild(linkedByList);
    container.insertBefore(section, container.querySelector('.entity-link-add-row'));
  };
  await buildLinkedBy();

  // Add link row
  let pendingTarget = null;

  const allEntityOptions = [
    { value: '', text: 'Search entity...' },
    ...state.features.filter(f => f.id !== entity.id)
      .map(f => ({ value: `feature:${f.id}`, text: f.title || '(untitled)' })),
    ...state.encyclopedia.filter(e => e.id !== entity.id)
      .map(e => ({ value: `encyclopedia:${e.id}`, text: e.name || '(untitled)' })),
    ...(state.maps || [])
      .map(m => ({ value: `map:${m.id}`, text: m.name || '(untitled)' })),
  ];

  const targetSelect = createSearchableSelect(allEntityOptions, '', (val) => {
    if (!val) { pendingTarget = null; return; }
    const sep = val.indexOf(':');
    pendingTarget = { type: val.slice(0, sep), id: val.slice(sep + 1) };
  }, 'Search entity...');

  const typeSelect = el('select', { class: 'entity-link-type-select' },
    LINK_TYPES.map(t => el('option', { value: t.value, text: t.label }))
  );

  const labelInput = el('input', {
    type: 'text', class: 'entity-link-label-input',
    placeholder: 'e.g. Father, Spouse...'
  });
  labelInput.hidden = true;

  typeSelect.onchange = () => {
    labelInput.hidden = typeSelect.value !== 'family' && typeSelect.value !== 'custom';
  };

  const addBtn = el('button', { class: 'ghost small', text: '+ Add' });
  addBtn.onclick = async () => {
    if (!pendingTarget) return;
    if ((entity.links || []).some(l => l.targetId === pendingTarget.id && l.linkType === typeSelect.value)) {
      showToast('This link already exists.');
      return;
    }
    recordState();
    entity.links = entity.links || [];
    const newLink = { id: 'lnk-' + uid(), targetId: pendingTarget.id, targetType: pendingTarget.type, linkType: typeSelect.value };
    if (labelInput.value.trim()) newLink.label = labelInput.value.trim();
    entity.links.push(newLink);
    markEntityDirty(entityType, entity.id);
    await rebuildChips();
    pendingTarget = null;
    labelInput.value = '';
    debouncedSave();
  };

  if (role === 'gm') {
    container.appendChild(el('div', { class: 'entity-link-add-row' }, [targetSelect, typeSelect, labelInput, addBtn]));
  }

  // --- Spatial containment suggestions (point features only, GM only) ---
  if (role === 'gm' && entityType === 'feature' && entity.geometry === 'point') {
    const ptCoords = entity.geojson?.geometry?.coordinates;
    if (ptCoords) {
      const suggestionsEl = el('div', { class: 'entity-links-suggestions' });
      const dismissedIds = new Set();

      const rebuildSuggestions = () => {
        suggestionsEl.innerHTML = '';
        const hits = state.features.filter(f => {
          if (f.id === entity.id) return false;
          if (f.geometry !== 'polygon') return false;
          if (f.mapId !== entity.mapId) return false;
          if (dismissedIds.has(f.id)) return false;
          if ((entity.links || []).some(l => l.targetId === f.id)) return false;
          const ring = f.geojson?.geometry?.coordinates?.[0];
          return ring && pointInPolygon(ptCoords, ring);
        });

        if (hits.length === 0) return;

        suggestionsEl.appendChild(el('div', { class: 'form-label muted', style: 'font-size:0.75rem;margin-top:0.4rem', text: 'Spatial suggestions' }));
        const suggestionsList = el('div', { class: 'entity-suggestions-list' });

        for (const polygon of hits) {
          const chip = el('div', { class: 'entity-link-chip entity-link-suggestion' });
          chip.appendChild(el('span', { class: 'entity-link-name', text: `Within "${polygon.title || 'Unnamed territory'}"` }));
          chip.appendChild(el('span', { class: 'entity-link-type-badge', text: 'territory' }));

          const confirmBtn = el('button', { class: 'ghost small', text: 'Confirm' });
          confirmBtn.onclick = async () => {
            recordState();
            entity.links = entity.links || [];
            entity.links.push({ id: 'lnk-' + uid(), targetId: polygon.id, targetType: 'feature', linkType: 'territory' });
            markEntityDirty(entityType, entity.id);
            await rebuildChips();
            rebuildSuggestions();
            debouncedSave();
          };

          const dismissBtn = el('button', { class: 'entity-link-remove', title: 'Dismiss suggestion', text: '×' });
          dismissBtn.onclick = () => { dismissedIds.add(polygon.id); rebuildSuggestions(); };

          chip.appendChild(confirmBtn);
          chip.appendChild(dismissBtn);
          suggestionsList.appendChild(chip);
        }
        suggestionsEl.appendChild(suggestionsList);
      };

      rebuildSuggestions();
      container.appendChild(suggestionsEl);
    }
  }

  parentElement.appendChild(container);
}


async function renderCanvasBlocks(wrapper, blocksToRender) {
  if (blocksToRender.length > 0) {
    for (const block of blocksToRender) {
      const blockElement = await renderBlock(block);
      wrapper.appendChild(blockElement);
    }
  } else {
    const feature = state.features.find(f => f.id === infoPanelFeatureId);
    const hasBlocks = feature && feature.blocks && feature.blocks.length > 0;
    if (!hasBlocks) {
      wrapper.appendChild(el('div', { class: 'inspector-empty-state' }, [
        el('div', { class: 'inspector-empty-icon inspector-empty-icon--note' }),
        el('p', { class: 'inspector-empty-heading', text: 'No content yet' }),
        el('p', { class: 'inspector-empty-sub', text: 'Right-click on the map to add a block.' }),
      ]));
    }
  }
}

// Shown when nothing is selected but the panel was already open.
// Aligned with M3 "Persistent panels show placeholder content" +
// HIG "Preserve Mental Models" — panel stays visible, content changes.
const EMPTY_INSPECTOR_TIPS = [
  { key: 'P', label: 'Pointer tool' },
  { key: 'N', label: 'Place new pin' },
  { key: '⌘K', label: 'Global search' },
  { key: '⌘Z', label: 'Undo' },
];

function showEmptyInspectorState() {
  const panel = $('#infoPanel');
  if (!panel) return;

  // Keep panel open, clear selection state
  panel.classList.remove('content-edit-mode');
  infoPanelFeatureId = null;
  selectedBlockId    = null;
  isContentEditMode  = false;
  if (window.resetPropertiesState) window.resetPropertiesState();

  // Ensure panel is visible (it stays open)
  panel.classList.add('is-visible');
  $('#mainContainer')?.classList.add('info-panel-visible');

  // Clear content areas
  const controls    = $('#infoPanelControls');
  const content     = $('#contentContainer');
  if (controls)   controls.innerHTML   = '';
  if (content)    content.innerHTML    = '';

  // Build empty state
  const tips = el('div', { class: 'inspector-empty-tips' });
  EMPTY_INSPECTOR_TIPS.forEach(({ key, label }) => {
    tips.appendChild(el('div', { class: 'inspector-empty-tip' }, [
      el('kbd', { class: 'inspector-empty-kbd', text: key }),
      el('span', { text: label }),
    ]));
  });

  const emptyState = el('div', { class: 'inspector-empty-state' }, [
    el('div', { class: 'inspector-empty-icon' }),
    el('p',   { class: 'inspector-empty-heading', text: 'Nothing selected' }),
    el('p',   { class: 'inspector-empty-sub',     text: 'Click a pin, area, or encyclopedia entry to inspect it.' }),
    tips,
  ]);

  // Render empty state in the content area (fills the panel when properties collapsed)
  if (content) content.appendChild(emptyState);
}
window.showEmptyInspectorState = showEmptyInspectorState;

// Request ID: each call gets a unique ID. If a newer call starts while this one
// is awaiting, the older one checks and bails — preventing stale content races.
let _infoPanelReqId = 0;

async function showInfoPanel(id, type = 'feature') {
  const myReqId = ++_infoPanelReqId;

  const panel = $('#infoPanel');
  panel.classList.toggle('content-edit-mode', isContentEditMode);

  const scrollContainer = panel.querySelector('#infoPanelBody');
  const oldScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
  infoPanelFeatureId = (type === 'feature' || type === 'map') ? id : null;

  let item;
  if (type === 'feature') {
    item = state.features.find(x => x.id === id);
  } else if (type === 'encyclopedia') {
    item = state.encyclopedia.find(x => x.id === id);
  } else if (type === 'map') {
    item = state.maps.find(x => x.id === id);
  }

  if (!item) {
    hideInfoPanel();
    return;
  }

  setRightPanelHidden(false);

  panel.classList.toggle('is-rearranging', isRearrangeMode);
  panel.classList.add('is-visible');
  $('#mainContainer').classList.add('info-panel-visible');
  window._syncBothPanelsClass?.();

  const contentEl = $('#contentContainer');
  contentEl.innerHTML = '';

  contentEl.classList.remove('panel-entering');
  void contentEl.offsetWidth; // force reflow so animation re-fires
  contentEl.classList.add('panel-entering');

  // Show hero skeleton immediately while the async header builds
  const _heroSkeleton = el('div', { class: 'skeleton skeleton-hero' });
  contentEl.appendChild(_heroSkeleton);

  const infoPanelControls = $('#infoPanelControls');

  if (infoPanelControls) {
    infoPanelControls.innerHTML = '';
  }

  if (infoPanelControls) {
    if (peekViewMode) {
      // Peek mode: expand-to-full | edit | properties | [spacer] | × close
      const expandIconHtml = await getIconHTML('book-open-text', 'var(--text)');
      if (myReqId !== _infoPanelReqId) return;
      const expandBtn = el('button', { class: 'panel-icon-btn', title: 'Open full article', innerHTML: expandIconHtml });
      expandBtn.onclick = () => { exitPeekMode(); enterArticleMode(id, type); };
      infoPanelControls.appendChild(expandBtn);

      if (role === 'gm') {
        const peekEditIconHtml = await getIconHTML('pencil', 'var(--text)');
        if (myReqId !== _infoPanelReqId) return;
        const peekEditBtn = el('button', { class: 'panel-icon-btn', title: 'Edit article', innerHTML: peekEditIconHtml });
        peekEditBtn.onclick = async () => {
          await enterArticleMode(id, type);
          isContentEditMode = true;
          showInfoPanel(id, type);
        };
        infoPanelControls.appendChild(peekEditBtn);
      }

      const propsIconHtml = await getIconHTML('list', 'var(--text)');
      if (myReqId !== _infoPanelReqId) return;
      const propsBtn = el('button', { class: 'panel-icon-btn', title: 'Properties', innerHTML: propsIconHtml });
      propsBtn.onclick = () => window.openPropertiesSheet?.(id, type);
      infoPanelControls.appendChild(propsBtn);

      infoPanelControls.appendChild(el('span', { style: 'flex: 1;' }));

      const closeIconHtml = await getIconHTML('x', 'var(--text)');
      if (myReqId !== _infoPanelReqId) return;
      const closeBtn = el('button', { class: 'panel-icon-btn', title: 'Close', innerHTML: closeIconHtml });
      closeBtn.onclick = exitPeekMode;
      infoPanelControls.appendChild(closeBtn);
    } else if (articleViewMode) {
      // Article mode: ← back | map name | (edit btn at right)
      const backIconHtml = await getIconHTML('arrow-left', 'var(--text)');
      if (myReqId !== _infoPanelReqId) return;
      const backBtn = el('button', { class: 'panel-icon-btn', title: 'Back to Map', innerHTML: backIconHtml });
      backBtn.onclick = exitArticleMode;
      infoPanelControls.appendChild(backBtn);

      const activeMap = state.maps.find(m => m.id === state.activeMapId);
      if (activeMap) {
        infoPanelControls.appendChild(el('span', { class: 'article-map-label', text: activeMap.name }));
      }

      // Spacer pushes right-side buttons to far right
      infoPanelControls.appendChild(el('span', { style: 'flex: 1;' }));

      if (role === 'gm') {
        _currentPanelId = id;
        if (isContentEditMode) {
          const indicator = el('div', { class: 'edit-mode-indicator panel-indicator' }, [
            el('span', { class: 'indicator-dot' }),
            el('span', { text: 'Editing' })
          ]);
          infoPanelControls.appendChild(indicator);
        }
        const editModeIconName = isContentEditMode ? 'article' : 'pencil';
        const editIconHtml = await getIconHTML(editModeIconName, 'var(--text)');
        if (myReqId !== _infoPanelReqId) return;
        const editModeBtn = el('button', {
          class: 'panel-icon-btn',
          title: isContentEditMode ? 'Switch to View Mode' : 'Enter Edit Mode',
          innerHTML: editIconHtml
        });
        editModeBtn.onclick = () => toggleContentEditMode(id, type);
        infoPanelControls.appendChild(editModeBtn);

        const propsIconHtml = await getIconHTML('list', 'var(--text)');
        if (myReqId !== _infoPanelReqId) return;
        const propsBtn = el('button', { class: 'panel-icon-btn', title: 'Properties', innerHTML: propsIconHtml });
        propsBtn.onclick = () => window.openPropertiesSheet?.(id, type);
        infoPanelControls.appendChild(propsBtn);
      }

    } else {
      // Panel mode: edit btn + close btn
      if (role === 'gm') {
        _currentPanelId = id;

        if (isContentEditMode) {
          const indicator = el('div', {
            class: 'edit-mode-indicator panel-indicator',
            style: 'margin-right: auto;'
          }, [
            el('span', { class: 'indicator-dot' }),
            el('span', { text: 'Editing Content' })
          ]);
          infoPanelControls.appendChild(indicator);
        }

        const editModeIconName = isContentEditMode ? 'article' : 'pencil';
        const editModeTooltip = isContentEditMode ? 'Switch to View Mode' : 'Enter Edit Mode';
        const editIconHtml = await getIconHTML(editModeIconName, 'var(--text)');
        if (myReqId !== _infoPanelReqId) return;

        const editModeBtn = el('button', {
          class: 'panel-icon-btn',
          title: editModeTooltip,
          innerHTML: editIconHtml
        });
        editModeBtn.onclick = () => toggleContentEditMode(id, type);
        infoPanelControls.appendChild(editModeBtn);
      }

      const closeIconHtml = await getIconHTML('x', 'var(--text)');
      if (myReqId !== _infoPanelReqId) return;

      const closeBtn = el('button', {
        class: 'panel-icon-btn close-btn',
        title: 'Close Panel',
        innerHTML: closeIconHtml
      });
      closeBtn.onclick = hideInfoPanel;
      infoPanelControls.appendChild(closeBtn);
    }
  }

  // Bail if a newer showInfoPanel call has started while we were building controls
  if (myReqId !== _infoPanelReqId) return;

  // CONTAINERS
  const bodyContainer = el('div', { id: 'infoPanelBody' });
  const canvasWrapper = el('div', { class: 'canvas-wrapper' });

  const headerElement = await buildEntityHeader(item, { showMeta: true, isPeek: peekViewMode });
  
  // FINAL CHECK: Bail if a newer request has taken over while we were building the header
  if (myReqId !== _infoPanelReqId) return;

  _heroSkeleton.remove();
  contentEl.appendChild(headerElement);

  // Hero Image Drag and Drop
  // buildEntityHeader may return a wrapper div (entity-header-wrapper) when an identity bar is present
  const heroContainer = headerElement.querySelector('.info-panel-hero-image') || headerElement;
  if (!peekViewMode) {
    heroContainer.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      heroContainer.classList.add('drag-over');
    };
    heroContainer.ondragleave = (e) => {
      e.stopPropagation();
      heroContainer.classList.remove('drag-over');
    };
    heroContainer.ondrop = (e) => {
      e.preventDefault();
      heroContainer.classList.remove('drag-over');
      e.stopPropagation();
      const assetKey = e.dataTransfer.getData("application/x-taleprove-asset");
      if (assetKey) {
        recordState();
        item.heroImageKey = assetKey;
        markEntityDirty(type, id);
        if (type === 'feature' || type === 'map') render();
        showInfoPanel(id, type);
        debouncedSave();
      } else if (e.dataTransfer.files.length > 0 && window.handleFileDrop) {
        window.currentTargetForHeroImage = item;
        window.handleFileDrop(e.dataTransfer.files[0], heroContainer);
      }
    };
  }

  bodyContainer.appendChild(canvasWrapper);
  contentEl.append(bodyContainer);

  // Bail if superseded while loading header
  if (myReqId !== _infoPanelReqId) return;

  // RENDERING BLOCKS
  const blocksContainer = el('div', { id: 'blocksContainer' });
  canvasWrapper.appendChild(blocksContainer);

  let blocks = item.blocks || [];
  if (role === 'player') {
    blocks = blocks.filter(b => b.visibleToPlayers);
  }

  const hasHero = !!(item.heroImageKey || (type === 'map' ? item.imageKey : null));

  // Show skeleton blocks while each block renders asynchronously
  const _skeletonCount = Math.min(blocks.length || 2, 3);
  for (let i = 0; i < _skeletonCount; i++) {
    blocksContainer.appendChild(el('div', { class: 'skeleton skeleton-block' }));
  }

  if (blocks.length > 0) {
    blocksContainer.innerHTML = ''; // clear skeletons
    for (const block of blocks) {
      const blockElement = await renderBlock(block);
      blocksContainer.appendChild(blockElement);
    }
  } else {
    blocksContainer.innerHTML = ''; // clear skeletons
    if (!hasHero && role === 'gm' && !peekViewMode) {
      const relevantTemplates = (state.layoutTemplates || []).filter(t => !t.entityType || t.entityType === type);

      const emptyState = el('div', { class: 'inspector-empty-state' }, [
        el('div', { class: 'inspector-empty-icon inspector-empty-icon--note' }),
        el('p', { class: 'inspector-empty-heading', text: 'No content yet' }),
        el('p', { class: 'inspector-empty-sub', text: 'Click the pencil icon to add blocks.' }),
      ]);

      if (relevantTemplates.length > 0) {
        const templateBtn = el('button', { class: 'btn-secondary empty-state-template-btn', text: 'Start from a template' });
        templateBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const options = relevantTemplates.map(tpl => ({
            label: tpl.name,
            sublabel: `${tpl.blocks.length} blocks`,
            action: () => {
              isContentEditMode = true;
              window.applyLayoutTemplate(id, type, tpl.id);
            }
          }));
          window.showHeroPopover(templateBtn, options);
        });
        emptyState.appendChild(templateBtn);
      }

      canvasWrapper.appendChild(emptyState);
    }
  }

  // DND HANDLERS — disabled in peek mode (read-only)
  if (!peekViewMode) {
    panel.ondragover = (e) => {
      e.preventDefault();
      const types = Array.from(e.dataTransfer.types);
      if (types.includes("application/x-taleprove-entry")) {
        e.dataTransfer.dropEffect = "link";
        panel.classList.add('drag-over-link');
      } else if (types.includes("Files")) {
        e.dataTransfer.dropEffect = "copy";
        panel.classList.add('drag-over');
      }
    };
    panel.ondragleave = () => panel.classList.remove('drag-over', 'drag-over-link');
    panel.ondrop = (e) => {
      e.preventDefault();
      panel.classList.remove('drag-over', 'drag-over-link');
      const entryId = e.dataTransfer.getData("application/x-taleprove-entry");
      const assetKey = e.dataTransfer.getData("application/x-taleprove-asset");
      if (entryId && window.handleDropOnInfoPanel) window.handleDropOnInfoPanel(entryId);
      else if (assetKey && window.handleAddAssetToInfoPanel) window.handleAddAssetToInfoPanel(assetKey);
      else if (e.dataTransfer.files.length > 0 && window.handleFileDrop) window.handleFileDrop(e.dataTransfer.files[0], panel);
    };
  } else {
    panel.ondragover = null;
    panel.ondragleave = null;
    panel.ondrop = null;
  }

  // SORTABLE & SCROLLING
  if (window.infoPanelSortable) {
    window.infoPanelSortable.destroy();
    window.infoPanelSortable = null;
  }
    if (isContentEditMode && role === 'gm' && typeof Sortable !== 'undefined') {
      window.infoPanelSortable = new Sortable(blocksContainer, {
        animation: 150,
        ghostClass: 'canvas-block-ghost',
        handle: '.block-drag-handle',
        onEnd: (evt) => { 
          let currentItem;
          if (type === 'feature') currentItem = state.features.find(f => f.id === id);
          else if (type === 'encyclopedia') currentItem = state.encyclopedia.find(e => e.id === id);
          else if (type === 'map') currentItem = state.maps.find(m => m.id === id);
          
          if (!currentItem) return; 
          recordState(); 
          const [movedBlock] = currentItem.blocks.splice(evt.oldIndex, 1); 
          currentItem.blocks.splice(evt.newIndex, 0, movedBlock); 
          debouncedSave(); 
        }
      });
    }

  // Sticky "Add Block" button — appended to canvasWrapper so it sticks to the
  // bottom of the visible scroll area when the block list is long.
  if (isContentEditMode && role === 'gm') {
    const addBtnIconHtml = await getIconHTML('plus', 'var(--text)');
    if (myReqId !== _infoPanelReqId) return;
    const stickyAddBtn = el('button', { class: 'add-block-btn', title: 'Add Block', innerHTML: addBtnIconHtml });
    stickyAddBtn.onclick = () => {
      const rect = stickyAddBtn.getBoundingClientRect();
      showBlockChooserModal(rect.left, rect.bottom + 8, id, type);
    };
    canvasWrapper.appendChild(stickyAddBtn);
  }

  // Backlinks — shown in read mode only (not edit, not map type which has its own call)
  if (!isContentEditMode && type !== 'map') {
    const displayName = item.title || item.name || '';
    buildBacklinksSection(displayName, item.id, canvasWrapper);
  }

  const newScrollContainer = panel.querySelector('#infoPanelBody');
  if (newScrollContainer) {
    if (window.shouldScrollToSelectedBlock && window.selectedBlockId) {
      const newBlockElement = blocksContainer.querySelector(`[data-block-id="${window.selectedBlockId}"]`);
      if (newBlockElement) {
        setTimeout(() => { newBlockElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
      }
      window.shouldScrollToSelectedBlock = false;
    } else {
      newScrollContainer.scrollTop = oldScrollTop;
    }

    // M3 Elevation-on-scroll: controls bar raises when content scrolls beneath it
    const controlsBar = $('#infoPanelControls');
    if (controlsBar) {
      newScrollContainer.addEventListener('scroll', () => {
        controlsBar.classList.toggle('is-elevated', newScrollContainer.scrollTop > 4);
      }, { passive: true });
    }
  }

}


async function enterArticleMode(id, type = 'feature') {
  preferredReadingLevel = 'article';
  // Exit peek mode if active
  if (peekViewMode) {
    peekViewMode = false;
    peekViewId = null;
    document.body.classList.remove('peek-mode');
  }

  articleViewMode = true;
  articleViewId = id;
  articleViewType = type;
  isContentEditMode = false; // always start in read mode

  // Sync selection state
  if (type === 'encyclopedia') {
    selectedEncyclopediaEntryId = id;
    selectedId = null;
  } else if (type === 'feature') {
    selectedId = id;
    selectedEncyclopediaEntryId = null;
  }

  document.body.classList.add('article-mode');
  document.body.classList.remove('article-unconstrained');

  // Update minimap card
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  const minimapMapName = document.getElementById('minimapMapName');
  if (minimapMapName) minimapMapName.textContent = activeMap?.name || 'Map';
  const minimapContainer = document.getElementById('minimapContainer');
  if (minimapContainer) minimapContainer.onclick = exitArticleMode;

  // Ensure the panel is open
  const panel = $('#infoPanel');
  if (panel) panel.classList.add('is-visible');

  await showInfoPanel(id, type);
}

function exitArticleMode() {
  if (!articleViewMode) return;
  const id = articleViewId;
  const type = articleViewType;

  preferredReadingLevel = null;
  articleViewMode = false;
  articleViewId = null;
  articleViewType = 'feature';
  isContentEditMode = false;

  document.body.classList.remove('article-mode');

  window.hideInfoPanel();
}

async function enterPeekMode(id, type = 'feature') {
  preferredReadingLevel = 'peek';
  // Exit full article mode if active
  if (articleViewMode) {
    articleViewMode = false;
    articleViewId = null;
    document.body.classList.remove('article-mode');
  }

  peekViewMode = true;
  peekViewId = id;
  peekViewType = type;
  isContentEditMode = false;

  if (type === 'encyclopedia') {
    selectedEncyclopediaEntryId = id;
    selectedId = null;
    multiSelectedIds.clear();
    multiSelectedIds.add(id);
    window.expandToEncyclopediaItem?.(id);
    window.highlightItemInEncyclopedia?.(id);
  } else {
    selectedId = id;
    selectedEncyclopediaEntryId = null;
    multiSelectedIds.clear();
    multiSelectedIds.add(id);
    window.expandToItem?.(id);
    window.highlightItemInAtlas?.(id);
  }
  updateSelectionStyles();

  document.body.classList.add('peek-mode');

  const panel = $('#infoPanel');
  if (panel) panel.classList.add('is-visible');

  await showInfoPanel(id, type);
}

function exitPeekMode() {
  if (!peekViewMode) return;
  const id = peekViewId;
  const type = peekViewType;

  preferredReadingLevel = null;
  peekViewMode = false;
  peekViewId = null;
  peekViewType = 'feature';
  isContentEditMode = false;

  document.body.classList.remove('peek-mode');
  window.hideInfoPanel();
}

let propertiesSheetId = null;
let propertiesSheetType = 'feature';

async function openPropertiesSheet(id, type) {
  // Capture peek context before exiting (used for back button)
  const fromPeekId   = peekViewMode ? peekViewId   : null;
  const fromPeekType = peekViewMode ? peekViewType  : null;

  if (peekViewMode) exitPeekMode();

  propertiesSheetId = id;
  propertiesSheetType = type;

  // Set selection state so form controls resolve correctly
  if (type === 'encyclopedia') {
    selectedEncyclopediaEntryId = id;
    selectedId = null;
  } else {
    selectedId = id;
    selectedEncyclopediaEntryId = null;
  }

  const sheet = document.getElementById('propertiesSheet');
  const content = document.getElementById('propertiesSheetContent');
  const titleEl = document.getElementById('propertiesSheetTitle');
  if (!sheet || !content) return;

  // Back-to-peek button — shown only when opened from peek mode
  const existingBack = sheet.querySelector('#propertiesSheetBack');
  if (existingBack) existingBack.remove();
  if (fromPeekId) {
    const backBtn = el('button', {
      id: 'propertiesSheetBack',
      class: 'panel-icon-btn',
      title: 'Back to peek'
    });
    getIconHTML('arrow-u-down-left', 'var(--text)').then(html => { backBtn.innerHTML = html; });
    backBtn.onclick = () => {
      closePropertiesSheet();
      enterPeekMode(fromPeekId, fromPeekType);
    };
    const header = document.getElementById('propertiesSheetHeader');
    if (header) header.insertBefore(backBtn, header.firstChild);
  }

  content.innerHTML = '';

  if (type === 'feature') {
    const feature = state.features.find(f => f.id === id);
    if (!feature) return;
    if (titleEl) titleEl.textContent = feature.title || 'Untitled';
    await buildArticlePropertiesInspector(feature, content, 'feature');
  } else if (type === 'encyclopedia') {
    const entry = state.encyclopedia.find(e => e.id === id);
    if (!entry) return;
    if (titleEl) titleEl.textContent = entry.name || 'Untitled';
    await buildArticlePropertiesInspector(entry, content, 'encyclopedia');
  } else if (type === 'map') {
    const map = state.maps.find(m => m.id === id);
    if (!map) return;
    if (titleEl) titleEl.textContent = map.name || 'Untitled Map';
    buildMapPropertiesInspector(map, content);
  }

  sheet.classList.add('is-open');
  document.body.classList.add('properties-sheet-open');
}

function closePropertiesSheet() {
  const sheet = document.getElementById('propertiesSheet');
  if (sheet) sheet.classList.remove('is-open');
  document.body.classList.remove('properties-sheet-open');
  propertiesSheetId = null;
  propertiesSheetType = 'feature';
}

window.buildBlockInspector = buildBlockInspector;
window.updateSingleFeatureUI = updateSingleFeatureUI;
window.enterArticleMode = enterArticleMode;
window.exitArticleMode = exitArticleMode;
window.enterPeekMode = enterPeekMode;
window.exitPeekMode = exitPeekMode;
Object.defineProperty(window, 'preferredReadingLevel', { get: () => preferredReadingLevel });
window.openPropertiesSheet = openPropertiesSheet;
window.closePropertiesSheet = closePropertiesSheet;

async function renderRelationshipTags(item, container) {
  if (!container) return;
  container.innerHTML = '';
  
  const tagList = el('div', { class: 'tag-list', style: 'display: flex; flex-wrap: wrap; gap: 0.35rem;' });
  let hasTags = false;

  // 1. Process Spatial Tags (e.g., @Location) from the standard tags array
  if (item.tags && item.tags.length > 0) {
    for (const tag of item.tags) {
      if (tag.startsWith('@')) {
        const locationName = tag.substring(1);
        // Find map or feature by name
        const target = state.maps.find(m => m.name === locationName) || state.features.find(f => (f.title || f.name) === locationName);
        
        if (target) {
          hasTags = true;
          const chip = el('button', {
            class: 'tag spatial-tag',
            style: 'border-color: var(--accent-orange); cursor: pointer; display: flex; align-items: center; gap: 4px;',
            onclick: (e) => {
              e.preventDefault();
              if (state.maps.some(m => m.id === target.id)) navigateToMap(target.id, { skipInfoPanel: true });
              else navigateToFeature(target.id);
            }
          }, [
            el('span', { text: '📍', style: 'font-size: 10px;' }),
            el('span', { text: locationName, style: 'font-weight: bold;' })
          ]);
          tagList.appendChild(chip);
        }
      }
    }
  }

  // 2. Process Relationship Links from blocks
  if (item.blocks) {
    const relBlocks = item.blocks.filter(b => b.type === 'Relationships');
    const allLinks = relBlocks.flatMap(b => b.data.links || []).filter(l => l.targetId);
    
    for (const link of allLinks) {
      const target = state.features.find(f => f.id === link.targetId) || state.encyclopedia.find(e => e.id === link.targetId);
      if (target) {
        hasTags = true;
        const typeLabel = link.type ? `${link.type}: ` : '';
        const chip = el('button', {
          class: 'tag relationship-tag',
          style: 'border-color: var(--accent-magenta); cursor: pointer;',
          onclick: (e) => {
            e.preventDefault();
            const targetType = state.features.some(f => f.id === link.targetId) ? 'feature' : 'encyclopedia';
            if (targetType === 'feature') navigateToFeature(target.id);
            else navigateToEncyclopediaEntry(target.id);
          }
        }, [
          el('span', { text: typeLabel }),
          el('span', { text: target.title || target.name || '(untitled)', style: 'font-weight: bold;' })
        ]);
        tagList.appendChild(chip);
      }
    }
  }
  
  if (hasTags) {
    container.appendChild(tagList);
  }
}