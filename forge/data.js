async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function loadAllData() {
  try {
    const taxonomyData = await fetchJson(`data/taxonomy.json?v=${APP_VERSION}`);
    Object.assign(TAXONOMY, taxonomyData);
    ICON_MANIFEST    = await fetchJson(`data/icon-manifest.json?v=${APP_VERSION}`);
    UI_ICON_MANIFEST = await fetchJson(`data/ui-icon-manifest.json?v=${APP_VERSION}`);
    GENERATOR_DATA = await fetchJson(`data/generators.json?v=${APP_VERSION}`);
    // Synonyms are optional — failing to load them just means substring-only icon search.
    try { ICON_SYNONYMS = await fetchJson(`data/icon-synonyms.json?v=${APP_VERSION}`); } catch { ICON_SYNONYMS = {}; }
  } catch (e) {
    console.error("Failed to load core data:", e);
    showAlertModal('Critical Error', 'Could not load core application data. The app cannot run.');
  }
}

async function loadCustomAssets() {
  const allKeys = await idbGetAllKeys('files');
  CUSTOM_ICON_MANIFEST = allKeys.filter(key => key.startsWith('ci-')).sort();
  CUSTOM_SHAPE_MANIFEST = allKeys.filter(key => key.startsWith('cs-')).sort();
}

const getTaxonomyItem = (type) => TAXONOMY[type];

const getDomainsForGeometry = (geometryType) => {
  const domains = new Set();
  for (const key in TAXONOMY) {
    if (TAXONOMY[key].geometry === geometryType) domains.add(TAXONOMY[key].domain);
  }
  return ['Other', ...Array.from(domains).sort()];
};

const getCategoriesByDomain = (domain, geometryType) => {
  const categories = new Set();
  for (const key in TAXONOMY) {
    if (TAXONOMY[key].domain === domain && TAXONOMY[key].geometry === geometryType) {
      categories.add(TAXONOMY[key].category);
    }
  }
  return [...Array.from(categories).sort()];
};

const getTypesByCategory = (domain, category, geometryType) => {
  const types = {};
  for (const key in TAXONOMY) {
    const item = TAXONOMY[key];
    if (item.domain === domain && item.category === category && item.geometry === geometryType) {
      types[key] = { ...item, key };
    }
  }
  return types;
};

function performGlobalSearch(query) {
  const results = [];
  if (!query || query.trim().length < 2) return results;

  const q = normalizeForSearch(query);
  const foundIds = new Set();

  for (const map of state.maps) {
    if (normalizeForSearch(map.name).includes(q)) {
      results.push({ type: 'map', id: map.id, title: map.name, context: 'Map' });
      foundIds.add(map.id);
      continue;
    }
    if (map.blocks) {
      for (const block of map.blocks) {
        let content = '';
        if (block.type === 'TextField') content = block.data.content || '';
        else if (block.type === 'Image') content = block.data.caption || '';
        if (normalizeForSearch(content).includes(q)) {
          results.push({ type: 'map', id: map.id, title: map.name, context: 'Map (Content)' });
          foundIds.add(map.id);
          break;
        }
      }
    }
  }

  for (const article of getAllArticles()) {
    if (foundIds.has(article.id)) continue;

    const isAtlas = article._silo === 'atlas';
    const name = article.name || article.title || '';
    const siloLabel = isAtlas ? 'Atlas' : 'Encyclopedia';
    const resultType = isAtlas ? 'feature' : 'entry';

    if (normalizeForSearch(name).includes(q)) {
      results.push({ type: resultType, id: article.id, title: name, context: siloLabel });
      foundIds.add(article.id);
      continue;
    }
    if (article.tags && article.tags.some(tag => normalizeForSearch(tag).includes(q))) {
      results.push({ type: resultType, id: article.id, title: name, context: `${siloLabel} (Tags)` });
      foundIds.add(article.id);
      continue;
    }
    if (article.blocks) {
      for (const block of article.blocks) {
        let content = '';
        if (block.type === 'TextField') content = block.data.content || '';
        else if (block.type === 'Image') content = block.data.caption || '';
        if (normalizeForSearch(content).includes(q)) {
          results.push({ type: resultType, id: article.id, title: name, context: `${siloLabel} (Content)` });
          foundIds.add(article.id);
          break;
        }
      }
    }
  }

  return results;
}

// Seeds built-in layout templates once. Templates already present (by id) are
// skipped, so user deletions are respected and new starters added in future
// versions appear automatically.

async function seedStarterTemplates() {
  let starters;
  try {
    starters = await fetchJson(`data/starter-templates.json?v=${APP_VERSION}`);
  } catch (e) {
    console.warn('[seedStarterTemplates] Could not load starter-templates.json:', e);
    return false;
  }

  state.layoutTemplates = state.layoutTemplates || [];
  const existingIds = new Set(state.layoutTemplates.map(t => t.id));

  const toAdd = starters.filter(t => !existingIds.has(t.id));
  if (toAdd.length === 0) return false;

  // Regenerate block IDs to avoid any future collisions
  toAdd.forEach(template => {
    template.blocks = (template.blocks || []).map(b => ({
      ...b,
      blockId: 'blk-' + uid()
    }));
  });

  // Prepend so starters appear at the top of the layout template list
  state.layoutTemplates.unshift(...toAdd);
  return true;
}
window.seedStarterTemplates = seedStarterTemplates;

// Runs once at startup to bring saved data up to the current schema.
// Returns true if any changes were made (so the caller can trigger a save).

function migrateStatsBlock(block, onMigrated) {
  if (block.type !== 'Stats') return;
  const rows = block.data.rows || [];
  let markdown = '';
  if (block.data.label) markdown += `### ${block.data.label}\n\n`;
  if (rows.length > 0) {
    markdown += '| Stat | Value |\n| :--- | :--- |\n';
    rows.forEach(row => {
      markdown += `| ${row.label || ''} | ${row.value || ''} |\n`;
    });
  }
  block.type = 'TextField';
  block.data = { content: markdown };
  onMigrated();
}

function migrateState() {
  let needsSave = false;

  if (state.appVersion === undefined) {
    state.appVersion = '0.0.0';
    needsSave = true;
  }

  const activeMapTrail = [];
  let currentId = state.activeMapId;
  while (currentId) {
    const m = state.maps.find(m => m.id === currentId);
    if (m) { activeMapTrail.push(m.id); currentId = m.parentId; }
    else break;
  }
  state.maps.forEach(m => { if (!activeMapTrail.includes(m.id)) collapsedNodes.add(m.id); });

  state.maps.forEach(m => {
    if (m.folderId === undefined) { m.folderId = null; needsSave = true; }
  });

  state.maps.forEach(m => {
    if (m.grid === undefined) {
      m.grid = { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 };
      needsSave = true;
    } else if (m.grid.width === undefined) {
      m.grid.width = 1;
      needsSave = true;
    }
  });

  // Convert old customData fields to blocks format
  state.features.forEach(f => {
    const taxonomyItem = getTaxonomyItem(f.featureType);
    if (taxonomyItem?.schema && f.customData && (!f.blocks || f.blocks.length === 0)) {
      f.blocks = [];
      taxonomyItem.schema.forEach(field => {
        if (f.customData[field.name]) {
          f.blocks.push({
            blockId: 'blk-' + uid(),
            type: 'TextField',
            data: { content: `## ${field.name}\n\n${f.customData[field.name]}` }
          });
        }
      });
      needsSave = true;
    }
  });

  state.maps.forEach(m => {
    if (m.visibleToPlayers === undefined) { m.visibleToPlayers = true; needsSave = true; }
  });

  // Backfill stable world identity (used for recent projects history)
  if (!settings.worldId) { settings.worldId = uid(); needsSave = true; }

  if (settings.diceColor === undefined) { settings.diceColor = '#ff7a1a'; needsSave = true; }
  if (settings.diceTheme === undefined) { settings.diceTheme = 'default'; needsSave = true; }

  // Migrate old top-level map/overlay settings
  if (settings.map) {
    const defaultMap = state.maps[0] || {};
    defaultMap.id = defaultMap.id || 'map-default';
    defaultMap.imageKey = settings.map.imageKey;
    defaultMap.width = settings.map.width;
    defaultMap.height = settings.map.height;
    if (settings.overlay) {
      defaultMap.overlayKey = settings.overlay.imageKey;
      defaultMap.overlayOpacity = settings.overlay.opacity;
    }
    state.maps = [defaultMap];
    state.activeMapId = defaultMap.id;
    delete settings.map;
    delete settings.overlay;
    needsSave = true;
  }

  state.features.forEach(f => {
    if (!f.mapId) { f.mapId = state.activeMapId; needsSave = true; }
    if (!f.customData) { f.customData = {}; needsSave = true; }
    if (f.linkToMapId === undefined) { f.linkToMapId = null; needsSave = true; }
    if (f.linkedMapIds === undefined) {
      f.linkedMapIds = f.linkToMapId ? [f.linkToMapId] : [];
      f.linkToMapId = null; 
      needsSave = true;
    }

    if (f.geometry === undefined) {
      if (f.type === 'marker') f.geometry = 'point';
      else if (f.type === 'polygon') f.geometry = 'polygon';
      else if (f.type === 'text') f.geometry = 'text';
      else f.geometry = 'point';
      needsSave = true;
      delete f.type;
    }

    const taxonomyItem = getTaxonomyItem(f.featureType);
    if (taxonomyItem) {
      // Atlas features always live in state.features, so kind is always 'feature'.
      // Do NOT copy taxonomyItem.kind — generic-person/item have kind:'entry' which
      // would incorrectly flag atlas pins as lore-pins in getSidebarIconHTML/map.js.
      f.kind = 'feature';
      f.domain = taxonomyItem.domain;
      f.category = taxonomyItem.category;
      if (f.geometry !== 'text') f.geometry = taxonomyItem.geometry;
    } else {
      if (f.geometry === 'point') f.featureType = 'generic-pin';
      if (f.geometry === 'polygon') f.featureType = 'generic-area';
      if (f.geometry === 'polyline') f.featureType = 'generic-line';
    }

    if (f.realm) { delete f.realm; needsSave = true; }
    if (f.appliesTo) { delete f.appliesTo; needsSave = true; }
    if (f.coatOfArms      === undefined) { f.coatOfArms      = null;  needsSave = true; }
    if (f.coatOfArmsKey   === undefined) { f.coatOfArmsKey   = null;  needsSave = true; }
    if (f.showCoatOfArms  === undefined) { f.showCoatOfArms  = true; needsSave = true; }
    if (f.showLabel === undefined && f.geometry === 'polygon') { f.showLabel = true; needsSave = true; }
    // Sync stale name field — title is the source of truth for atlas features.
    // Older saves only updated title on rename, leaving name as the template default.
    if (f.title && f.name !== f.title) { f.name = f.title; needsSave = true; }
    // Migrate scalar linkedEntryId → universal links[]
    if (f.links === undefined) { f.links = []; needsSave = true; }
    if (f.linkedEntryId !== undefined) {
      if (f.linkedEntryId) {
        f.links.unshift({ id: 'lnk-' + uid(), targetId: f.linkedEntryId, targetType: 'encyclopedia', linkType: 'territory' });
      }
      delete f.linkedEntryId;
      needsSave = true;
    }
    // Migrate old isReciprocal links (pre-universal-links relationship system).
    // These have targetId but no targetType — detect the type and convert them
    // before the stale-link cleanup deletes them silently.
    f.links = f.links.map(link => {
      if (link.targetType) return link; // already migrated
      if (!link.targetId) return link;
      let detectedType = null;
      if (state.features.some(x => x.id === link.targetId)) detectedType = 'feature';
      else if ((state.encyclopedia || []).some(x => x.id === link.targetId)) detectedType = 'encyclopedia';
      else if ((state.maps || []).some(x => x.id === link.targetId)) detectedType = 'map';
      if (!detectedType) return link; // target gone — stale cleanup will remove it
      const migrated = { id: 'lnk-' + uid(), targetId: link.targetId, targetType: detectedType, linkType: link.linkType || 'related' };
      needsSave = true;
      return migrated;
    });
  });

  state.maps.forEach(m => {
    if (m.parentId === undefined) { m.parentId = null; needsSave = true; }
    if (m.blocks === undefined) { m.blocks = []; needsSave = true; }
    if (m.heroImageKey === undefined) { m.heroImageKey = null; needsSave = true; }

    if (m.blocks) {
      m.blocks.forEach(block => migrateStatsBlock(block, () => { needsSave = true; }));
    }
  });

  // Migrate encyclopedia entries from content string to blocks array
  if (state.encyclopedia) {
    state.encyclopedia.forEach(entry => {
      if (entry.content && !entry.blocks) {
        entry.blocks = [{
          blockId: 'blk-' + uid(),
          type: 'TextField',
          visibleToPlayers: true,
          data: { label: '', content: entry.content }
        }];
        delete entry.content;
        needsSave = true;
      }
      // Migrate existing entries that pre-date the visibleToPlayers toggle — default to
      // visible so existing player bundles continue to behave the same way.
      if (entry.visibleToPlayers === undefined) {
        entry.visibleToPlayers = true;
        needsSave = true;
      }
      if (entry.linkedMapIds === undefined) {
        entry.linkedMapIds = entry.linkToMapId ? [entry.linkToMapId] : [];
        entry.linkToMapId = null;
        needsSave = true;
      }
      if (entry.coatOfArms    === undefined) { entry.coatOfArms    = null; needsSave = true; }
      if (entry.coatOfArmsKey === undefined) { entry.coatOfArmsKey = null; needsSave = true; }
      if (entry.links         === undefined) { entry.links         = [];   needsSave = true; }

      // Migrate old links that have targetId but no targetType (same as feature migration above)
      entry.links = entry.links.map(link => {
        if (link.targetType) return link;
        if (!link.targetId)  return link;
        let detectedType = null;
        if (state.features.some(x => x.id === link.targetId))             detectedType = 'feature';
        else if ((state.encyclopedia || []).some(x => x.id === link.targetId)) detectedType = 'encyclopedia';
        else if ((state.maps || []).some(x => x.id === link.targetId))    detectedType = 'map';
        if (!detectedType) return link; // target gone — stale cleanup will remove it
        needsSave = true;
        return { id: link.id || ('lnk-' + uid()), targetId: link.targetId, targetType: detectedType, linkType: link.linkType || 'related', ...(link.label ? { label: link.label } : {}) };
      });

      if (entry.blocks) {
        entry.blocks.forEach(block => migrateStatsBlock(block, () => { needsSave = true; }));
      }
    });
  }

  state.features.forEach(f => {
    if (f.blocks) {
      f.blocks.forEach(block => migrateStatsBlock(block, () => { needsSave = true; }));
    }
  });

  // Init asset names map (no original filenames existed before this)
  if (!state.assetNames) { state.assetNames = {}; needsSave = true; }

  if (state.appVersion !== APP_VERSION) {
    state.appVersion = APP_VERSION;
    needsSave = true;
  }

  // Purge Atlas features that are missing geojson geometry — these are
  // orphaned or corrupt records that can never render on the map.
  const badFeatureIds = state.features
    .filter(f => !f.geojson?.geometry)
    .map(f => f.id);
  if (badFeatureIds.length > 0) {
    console.warn(`[migrateState] Removing ${badFeatureIds.length} feature(s) with no geometry:`, badFeatureIds);
    state.articles = state.articles.filter(a => !(a._silo === 'atlas' && !a.geojson?.geometry));
    syncArticleViews();
    badFeatureIds.forEach(id => idbDeleteObject(`article-${id}`));
    needsSave = true;
  }

  // mapId: null marks a folder as world-scope (lore). Atlas folders always have a non-null mapId.
  // Idempotent: if encyclopediaFolders is already empty, this is a no-op.
  if (state.encyclopediaFolders && state.encyclopediaFolders.length > 0) {
    for (const ef of state.encyclopediaFolders) {
      if (!state.folders.find(f => f.id === ef.id)) {
        state.folders.push({ ...ef, mapId: null });
      }
    }
    state.encyclopediaFolders = [];
    markEntityDirty('meta');
    needsSave = true;
  }

  // _silo distinguishes atlas features ('atlas') from lore entries ('lore') in
  // the unified getAllArticles() view. Marking entities dirty here causes
  // _performSave to write them under the new 'article-{id}' key. The old
  // 'feature-{id}' and 'encyclopedia-{id}' IDB keys are cleaned up by
  // cleanupOrphans() after the migration save completes.
  state.features.forEach(f => {
    if (f._silo !== 'atlas') {
      f._silo = 'atlas';
      markEntityDirty('article', f.id);
      needsSave = true;
    }
  });
  (state.encyclopedia || []).forEach(e => {
    if (e._silo !== 'lore') {
      e._silo = 'lore';
      markEntityDirty('article', e.id);
      needsSave = true;
    }
  });

  return needsSave;
}