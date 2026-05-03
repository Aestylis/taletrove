/**
 * obsidian-importer.js
 * TaleTrove — Obsidian Vault Importer
 *
 * Depends on (global scope): uid, escapeHtml, idbSet (utils.js),
 *   state, markEntityDirty, debouncedSave (state.js),
 *   refreshEncyclopediaView (panels.js)
 *
 * Public: window.openObsidianImportModal()
 */
(function () {
  'use strict';

  // ─── Signal scoring tables ──────────────────────────────────────────────────

  /**
   * Frontmatter key → { bucket: score } contributions
   * Buckets: person, location, thing, org
   */
  const FM_KEY_SCORES = {
    // Person — strong
    alignment:  { person: 3 },
    class:      { person: 3 },
    str:        { person: 3 },
    dex:        { person: 3 },
    con:        { person: 3 },
    int:        { person: 3 },
    wis:        { person: 3 },
    cha:        { person: 3 },
    born:       { person: 2 },
    age:        { person: 2 },
    race:       { person: 2 },
    species:    { person: 2 },
    gender:     { person: 2 },
    pronouns:   { person: 2 },
    hp:         { person: 2 },
    cr:         { person: 2 },
    challenge:  { person: 2 },
    // Person — weak
    titles:     { person: 1 },
    // Shared — location and person
    location:   { person: 1, location: 1 },
    // Shared — person and org
    faction:    { person: 1, org: 1 },
    domains:    { person: 1 },
    symbol:     { person: 1 },
    // Location
    population:  { location: 3 },
    climate:     { location: 3 },
    terrain:     { location: 2 },
    capital:     { location: 2 },
    government:  { location: 2 },
    region:      { location: 2 },
    // Thing
    rarity:      { thing: 3 },
    attunement:  { thing: 3 },
    value:       { thing: 2 },
    weight:      { thing: 2 },
    damage:      { thing: 2 },
    cost:        { thing: 2 },
    properties:  { thing: 1 },
    // Org
    members:      { org: 2 },
    leader:       { org: 2 },
    headquarters: { org: 2 },
    ideology:     { org: 2 },
    ranks:        { org: 2 },
  };

  /** Tag/category keywords → bucket, each match +2 */
  const TAG_VOCAB = {
    person: new Set([
      'npc', 'character', 'person', 'pc', 'player', 'villain', 'hero',
      'deity', 'god', 'goddess', 'creature', 'monster', 'humanoid', 'beast',
      'cleric', 'wizard', 'fighter', 'rogue', 'ranger', 'paladin', 'barbarian',
      'monk', 'druid', 'sorcerer', 'warlock', 'bard',
      'noble', 'merchant', 'king', 'queen', 'prince', 'princess',
      'knight', 'elder', 'admiral', 'captain',
    ]),
    location: new Set([
      'city', 'town', 'village', 'settlement', 'location', 'place',
      'region', 'country', 'nation', 'dungeon', 'building', 'tavern',
      'temple', 'castle', 'forest', 'mountain', 'river', 'ocean', 'sea',
      'island', 'ruins', 'landmark', 'cave', 'district', 'port',
      'shop', 'inn', 'keep', 'tower',
    ]),
    thing: new Set([
      'item', 'artifact', 'weapon', 'armor', 'armour', 'potion', 'spell',
      'magic', 'magical', 'mundane', 'equipment', 'tool',
      'plant', 'flora', 'fauna', 'mineral', 'drug', 'poison',
      'vehicle', 'ship', 'relic', 'legendary', 'cursed', 'enchanted',
      'crafting', 'material', 'ingredient',
    ]),
    org: new Set([
      'faction', 'guild', 'clan', 'organization', 'organisation',
      'cult', 'order', 'society', 'party', 'group', 'alliance',
      'religion', 'church', 'brotherhood', 'sisterhood',
      'military', 'government', 'council', 'family', 'lineage',
    ]),
  };

  /** H1-H4 heading text → bucket, each match +1 */
  const HEADING_VOCAB = {
    person: new Set([
      'abilities', 'actions', 'reactions', 'legendary actions',
      'hit points', 'saving throws', 'biography', 'backstory',
      'personality', 'ideals', 'bonds', 'flaws', 'appearance',
      'stat block', 'statblock', 'combat', 'spellcasting',
      'multiattack', 'abilities & features',
    ]),
    location: new Set([
      'population', 'trade', 'wealth', 'economy', 'districts',
      'landmarks', 'founding', 'government', 'history', 'current state',
      'notable figures', 'points of interest', 'neighborhoods',
      'defenses', 'infrastructure', 'key locations', 'geography',
    ]),
    thing: new Set([
      'effects', 'properties', 'crafting', 'ingredients', 'rarity',
      'variants', 'alchemical', 'magical properties', 'lore & legends',
      'profile', 'relationships & ecology',
    ]),
    org: new Set([
      'members', 'leadership', 'headquarters', 'goals', 'ideology',
      'hierarchy', 'recruitment', 'ranks', 'tenets', 'beliefs',
      'notable members',
    ]),
  };

  /** Headings that indicate GM-tool / meta content — skip entire file */
  const SKIP_HEADING_SIGNALS = new Set([
    'session notes', 'session log', 'encounter table', 'random encounter',
    'house rules', 'dm notes', 'gm notes', 'adventure hooks',
    'combat tracker', 'loot table', 'random table', 'audio playlist',
    'battle map', 'adventure outline', 'npc generator', 'reward tables',
  ]);

  const CONFIDENCE_IMPORT = 4;
  const CONFIDENCE_LOW    = 2;

  const TYPE_MAP = {
    person:   { type: 'Character' },
    location: { type: 'Location' },
    thing:    { type: 'Item' },
    org:      { type: 'Organization' },
  };

  const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
  const RESOURCE_DIR_NAMES = new Set(['_resources', 'resources', 'attachments', 'assets', 'files', 'media']);

  // ─── Frontmatter parser ─────────────────────────────────────────────────────

  /**
   * Parse YAML frontmatter from the top of a markdown file.
   * Returns { fm: Object, body: String }
   */
  function parseFrontmatter(text) {
    const fm = {};
    if (!text.startsWith('---')) return { fm, body: text };

    const end = text.indexOf('\n---', 3);
    if (end === -1) return { fm, body: text };

    const block = text.slice(3, end).replace(/^\n/, '');
    const body  = text.slice(end + 4).replace(/^\n/, '');

    const lines = block.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // Block list continuation — handled inside key parsing
      const keyMatch = line.match(/^([A-Za-z_][A-Za-z0-9_\-]*):\s*(.*)/);
      if (!keyMatch) { i++; continue; }

      const key = keyMatch[1].toLowerCase();
      const rest = keyMatch[2].trim();

      if (rest === '' || rest === null) {
        // Possibly a block list follows
        const listItems = [];
        i++;
        while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
          listItems.push(lines[i].replace(/^\s+-\s+/, '').trim());
          i++;
        }
        fm[key] = listItems.length ? listItems : true;
        continue;
      }

      if (rest.startsWith('[') && rest.endsWith(']')) {
        // Inline array
        fm[key] = rest.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        // Scalar — strip surrounding quotes
        fm[key] = rest.replace(/^['"]|['"]$/g, '');
      }
      i++;
    }

    return { fm, body };
  }

  // ─── Image reference extractor ──────────────────────────────────────────────

  function _isImageExt(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return IMAGE_EXTS.has(ext);
  }

  /**
   * Extract image references from markdown text.
   * Returns array of { original, filename, type }
   */
  function extractImageRefs(text) {
    const refs = [];
    const seen = new Set();

    function add(original, filename, type) {
      // Strip |size suffix from embed filenames
      const clean = filename.split('|')[0].trim();
      if (!_isImageExt(clean)) return;
      const key = original;
      if (seen.has(key)) return;
      seen.add(key);
      refs.push({ original, filename: clean, type });
    }

    // ![[filename.ext]] and ![[filename.ext|size]]
    const embedRe = /!\[\[([^\]]+)\]\]/g;
    let m;
    while ((m = embedRe.exec(text)) !== null) {
      add(m[0], m[1], 'embed');
    }

    // <img src="...">
    const imgTagRe = /<img\s[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = imgTagRe.exec(text)) !== null) {
      const src = m[1];
      const filename = src.split('/').pop();
      if (_isImageExt(filename)) {
        add(m[0], filename, 'html');
      }
    }

    return refs;
  }

  // ─── Content cleaner ────────────────────────────────────────────────────────

  /**
   * Transform Obsidian markdown body for TaleTrove.
   */
  function cleanContent(text) {
    // [[Link|Alias]] → [[Link]]
    text = text.replace(/\[\[([^\]|]+)\|[^\]]+\]\]/g, '[[$1]]');

    // Remove image embeds: ![[image.ext]] and ![[image.ext|size]]
    text = text.replace(/!\[\[[^\]]+\]\]/g, '');

    // Remove <img ...> tags
    text = text.replace(/<img\s[^>]*>/gi, '');

    // <div style="float: ...">...</div> — extract inner content
    text = text.replace(/<div\s+style="float:[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1');

    // <div style="clear: ..."></div> — remove entirely
    text = text.replace(/<div\s+style="clear:[^"]*"[^>]*>\s*<\/div>/gi, '');

    // <div class="narration">...</div> — extract inner content
    text = text.replace(/<div\s+class="narration"[^>]*>([\s\S]*?)<\/div>/gi, '$1');

    // [text](obsidian://...) → just text
    text = text.replace(/\[([^\]]+)\]\(obsidian:\/\/[^)]+\)/g, '$1');

    // Normalize excessive blank lines (4+ consecutive → 3)
    text = text.replace(/(\n\s*){4,}/g, '\n\n\n');

    return text.trim();
  }

  // ─── Inline hashtag extractor ───────────────────────────────────────────────

  /**
   * Extract hashtag-style tags from a markdown body.
   * Captures:
   *   • Lines beginning with "Tags:" / "Tag:" (case-insensitive)
   *   • Lines composed entirely of #word tokens (pure-tag lines)
   * Returns a deduplicated lowercase string array (without the leading #).
   */
  function extractBodyTags(body) {
    const tags = new Set();
    const hashtagRe = /#([A-Za-z][A-Za-z0-9_\-/]*)/g;

    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip markdown headings (# Heading, ## Heading, etc.)
      if (/^#{1,6}\s/.test(trimmed)) continue;

      // "Tags: #npc, #villain" or "Tag: #location"
      if (/^tags?\s*:/i.test(trimmed)) {
        let m;
        hashtagRe.lastIndex = 0;
        while ((m = hashtagRe.exec(trimmed)) !== null) {
          tags.add(m[1].toLowerCase());
        }
        continue;
      }

      // Lines consisting only of #hashtags (with optional commas/spaces)
      const stripped = trimmed.replace(/,/g, ' ').trim();
      if (/^(#[A-Za-z][A-Za-z0-9_\-/]*[\s]*)+$/.test(stripped)) {
        let m;
        hashtagRe.lastIndex = 0;
        while ((m = hashtagRe.exec(stripped)) !== null) {
          tags.add(m[1].toLowerCase());
        }
      }
    }

    return [...tags];
  }

  // ─── Signal scorer ──────────────────────────────────────────────────────────

  /**
   * Score a note's content and return:
   * { scores: { person, location, thing, org }, winner, confidence, signals }
   */
  function scoreCandidates(fm, body) {
    const scores = { person: 0, location: 0, thing: 0, org: 0 };
    const signals = [];

    // 0. Explicit fm.type override — strongest signal (+6, guaranteed confident)
    if (fm.type) {
      const t = String(fm.type).toLowerCase().trim();
      const EXPLICIT_TYPE_MAP = {
        person: 'person', character: 'person', npc: 'person', creature: 'person', deity: 'person',
        location: 'location', place: 'location', city: 'location', region: 'location', settlement: 'location',
        item: 'thing', thing: 'thing', artifact: 'thing', object: 'thing', equipment: 'thing',
        organization: 'org', organisation: 'org', faction: 'org', guild: 'org', group: 'org',
      };
      const bucket = EXPLICIT_TYPE_MAP[t];
      if (bucket) {
        scores[bucket] += 6;
        signals.push(`fm.type:${fm.type}→${bucket}(+6)`);
      }
    }

    // 1. Frontmatter key signals
    for (const [key, val] of Object.entries(fm)) {
      const rule = FM_KEY_SCORES[key];
      if (!rule) continue;
      for (const [bucket, pts] of Object.entries(rule)) {
        scores[bucket] += pts;
        signals.push(`fm:${key}→${bucket}(+${pts})`);
      }
    }

    // 2. Tag signals — from fm.tags array
    const fmTags = Array.isArray(fm.tags)
      ? fm.tags
      : (fm.tags ? [fm.tags] : []);

    for (const tag of fmTags) {
      const tagLow = String(tag).toLowerCase();
      for (const [bucket, vocab] of Object.entries(TAG_VOCAB)) {
        if (vocab.has(tagLow)) {
          scores[bucket] += 2;
          signals.push(`tag:${tagLow}→${bucket}(+2)`);
        }
      }
    }

    // Also check fm.type / fm.category
    for (const fmField of ['type', 'category', 'kind']) {
      if (!fm[fmField]) continue;
      const val = Array.isArray(fm[fmField])
        ? fm[fmField]
        : String(fm[fmField]).split(',').map(s => s.trim());
      for (const v of val) {
        const low = v.toLowerCase();
        for (const [bucket, vocab] of Object.entries(TAG_VOCAB)) {
          if (vocab.has(low)) {
            scores[bucket] += 2;
            signals.push(`fm.${fmField}:${low}→${bucket}(+2)`);
          }
        }
      }
    }

    // 3. Heading signals
    const headingRe = /^#{1,4}\s+(.+)$/gm;
    let hm;
    while ((hm = headingRe.exec(body)) !== null) {
      const heading = hm[1].trim().toLowerCase();
      for (const [bucket, vocab] of Object.entries(HEADING_VOCAB)) {
        if (vocab.has(heading)) {
          scores[bucket] += 1;
          signals.push(`heading:"${heading}"→${bucket}(+1)`);
        }
      }
    }

    // Determine winner
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const winner     = sorted[0][0];
    const confidence = sorted[0][1];

    return { scores, winner, confidence, signals };
  }

  /**
   * Detect if a note is GM-only meta content by scanning headings.
   * Returns the offending heading string or null.
   */
  function detectSkipHeading(body) {
    const headingRe = /^#{1,4}\s+(.+)$/gm;
    let m;
    while ((m = headingRe.exec(body)) !== null) {
      const h = m[1].trim().toLowerCase();
      if (SKIP_HEADING_SIGNALS.has(h)) return m[1].trim();
    }
    return null;
  }

  // ─── Vault walker ───────────────────────────────────────────────────────────

  async function* walkDir(dirHandle, basePath) {
    basePath = basePath || '';
    for await (const [name, entry] of dirHandle) {
      if (name.startsWith('.')) continue;
      const relPath = basePath ? `${basePath}/${name}` : name;
      if (entry.kind === 'file' && name.endsWith('.md')) {
        yield { handle: entry, path: relPath, name };
      } else if (entry.kind === 'directory') {
        yield* walkDir(entry, relPath);
      }
    }
  }

  /**
   * Find a resources/attachments directory in the vault.
   * Checks root first, then one level deep.
   * Returns a Map<lowercaseName, FileSystemDirectoryHandle> for all resource dirs found.
   */
  async function findResourceDirs(rootHandle) {
    const found = new Map(); // filename.toLowerCase() → FileSystemFileHandle

    async function scanDir(dirHandle) {
      try {
        for await (const [name, entry] of dirHandle) {
          if (entry.kind === 'directory' && RESOURCE_DIR_NAMES.has(name.toLowerCase())) {
            // Index all files in this directory
            for await (const [fname, fentry] of entry) {
              if (fentry.kind === 'file') {
                found.set(fname.toLowerCase(), fentry);
              }
            }
          }
        }
      } catch (_) {}
    }

    // Root level
    await scanDir(rootHandle);
    // One level deep
    try {
      for await (const [name, entry] of rootHandle) {
        if (name.startsWith('.')) continue;
        if (entry.kind === 'directory') {
          await scanDir(entry);
        }
      }
    } catch (_) {}

    return found;
  }

  // ─── Image type guesser ─────────────────────────────────────────────────────

  const EXT_MIME = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    bmp: 'image/bmp', avif: 'image/avif',
  };

  function guessTypeFromExt(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return EXT_MIME[ext] || 'application/octet-stream';
  }

  // ─── Resource bulk importer ─────────────────────────────────────────────────

  /**
   * Import every image file from the vault's resource directories into IDB.
   * Registers original filenames in state.assetNames so the Assets panel shows
   * real names instead of img-{uid} keys.
   * Returns Map<lowercaseFilename, imgKey> for note image resolution.
   */
  async function importAllResources(resourceFiles) {
    state.assetNames = state.assetNames || {};
    const keyMap = new Map(); // lowercase filename → img key

    for (const [lowerName, fileHandle] of resourceFiles) {
      if (!_isImageExt(lowerName)) continue;
      try {
        const file   = await fileHandle.getFile();
        const ab     = await file.arrayBuffer();
        const mimeType = file.type || guessTypeFromExt(lowerName);
        const blob   = new Blob([ab], { type: mimeType });
        const key    = 'img-' + uid();
        await idbSet(key, blob);
        // Store the original (mixed-case) filename as the display name
        state.assetNames[key] = file.name || lowerName;
        keyMap.set(lowerName, key);
      } catch (_) {
        // Skip unreadable files silently — they'll surface as image errors on notes
      }
    }

    return keyMap;
  }

  // ─── Main scan ──────────────────────────────────────────────────────────────

  /**
   * Walk the vault, parse every .md file, and classify.
   * Returns { toImport, skipped, vaultName }
   */
  async function scanVault(rootHandle) {
    const vaultName = rootHandle.name;

    // First pass — collect all .md filenames for wiki-link validation
    const allMdNames = new Set();
    for await (const entry of walkDir(rootHandle)) {
      allMdNames.add(entry.name.replace(/\.md$/, '').toLowerCase());
    }

    // Find resource directories
    const resourceFiles = await findResourceDirs(rootHandle);

    const toImport = [];
    const skipped  = [];

    for await (const { handle, path, name } of walkDir(rootHandle)) {
      let text;
      try {
        const file = await handle.getFile();
        text = await file.text();
      } catch (err) {
        skipped.push({ name, path, reason: `Could not read file: ${err.message}` });
        continue;
      }

      const { fm, body } = parseFrontmatter(text);

      // Check for GM-only meta headings
      const skipHeading = detectSkipHeading(body);
      if (skipHeading) {
        skipped.push({ name, path, reason: `GM-tool heading detected: "${skipHeading}"` });
        continue;
      }

      const scoring = scoreCandidates(fm, body);
      const imageRefs = extractImageRefs(text);

      // Broken wiki-links detection
      const brokenLinks = [];
      const wikiRe = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
      let wm;
      while ((wm = wikiRe.exec(body)) !== null) {
        const target = wm[1].trim().toLowerCase();
        if (!allMdNames.has(target)) {
          brokenLinks.push(`[[${wm[1].trim()}]]`);
        }
      }

      toImport.push({
        name,
        path,
        fm,
        body,
        scoring,
        imageRefs,
        brokenLinks,
        resourceFiles,
        handle,
      });
    }

    return { toImport, skipped, vaultName };
  }

  // ─── Import executor ────────────────────────────────────────────────────────

  /**
   * Import a single note entry into TaleTrove encyclopedia state.
   * Returns { entry, unclassified, imageErrors }
   */
  async function importNote(noteData, folderId, resourceKeyMap, opts) {
    const { fm, body, scoring, imageRefs, name: filename } = noteData;
    const { tagObsidian } = opts;

    const baseName = filename.replace(/\.md$/, '');

    // Display name: prefer fm.aliases[0]
    let displayName = baseName;
    if (Array.isArray(fm.aliases) && fm.aliases.length && fm.aliases[0]) {
      displayName = fm.aliases[0];
    } else if (typeof fm.aliases === 'string' && fm.aliases) {
      displayName = fm.aliases;
    } else if (fm.name) {
      displayName = String(fm.name);
    }

    // Default to Item — neutral type; users reclassify manually after import
    const typeInfo = TYPE_MAP.thing;

    // Tags — frontmatter (strip leading # some vaults include, e.g. tags: [#npc])
    const fmTagsRaw = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
    const fmTags = fmTagsRaw.map(t => String(t).replace(/^#/, '').trim()).filter(Boolean);

    // Tags — inline body hashtags (Tags: #x, #y lines and pure-hashtag lines)
    const bodyTags = extractBodyTags(body);

    // Merge and deduplicate (body tags are already lowercase)
    const tagSet = new Set([...fmTags, ...bodyTags]);
    if (tagObsidian) tagSet.add('obsidian-import');
    const tags = [...tagSet];

    // Clean body
    const cleanedBody = cleanContent(body);

    // Images — keys already stored in IDB by importAllResources; just look up
    let heroImageKey = null;
    const extraImageBlocks = [];
    const imageErrors = [];

    for (const imgRef of imageRefs) {
      const { filename: imgFilename } = imgRef;
      const key = resourceKeyMap.get(imgFilename.toLowerCase());
      if (!key) {
        imageErrors.push({ name: displayName, filename: imgFilename, reason: 'File not found in vault resources' });
        continue;
      }
      if (!heroImageKey) {
        heroImageKey = key;
      } else {
        extraImageBlocks.push({
          blockId: 'blk-' + uid(),
          type: 'Image',
          visibleToPlayers: true,
          data: { src: key, alt: imgFilename, caption: '' },
        });
      }
    }

    // Build blocks
    const blocks = [
      {
        blockId: 'blk-' + uid(),
        type: 'TextField',
        visibleToPlayers: true,
        data: { label: 'Content', content: cleanedBody },
      },
      ...extraImageBlocks,
    ];

    // Build entry
    const entry = {
      id: 'ent-' + uid(),
      name: displayName,
      type: typeInfo.type,
      tags,
      blocks,
      heroImageKey,
      iconClass: null,
      visibleToPlayers: true,
      links: [],
    };
    if (folderId) entry.folderId = folderId;

    return { entry, imageErrors };
  }

  /**
   * Run full import: mirror vault folder structure, classify all notes,
   * write to state.encyclopedia.
   * Returns { imported, foldersCreated, imageErrors, brokenLinks }
   */
  async function executeImport(scanResult, opts) {
    const { toImport } = scanResult;
    const imported       = [];
    const allImageErrors = [];
    const allBrokenLinks = [];

    // Snapshot state before any mutations so the entire import is a single undoable action
    recordState();

    // Bulk-import ALL resource files into IDB first (with real names in state.assetNames)
    const sharedResourceFiles = toImport.length ? toImport[0].resourceFiles : new Map();
    const resourceKeyMap = await importAllResources(sharedResourceFiles);

    // Build Encyclopedia folder tree from vault directory structure
    // Phase B.2: count lore folders (mapId == null) in the unified state.folders array
    const foldersBefore = (state.folders || []).filter(f => f.mapId == null).length;
    const pathToId = buildFolderMap(toImport.map(n => n.path));
    const foldersCreated = (state.folders || []).filter(f => f.mapId == null).length - foldersBefore;

    for (const noteData of toImport) {
      // Resolve this note's Encyclopedia folder from its vault path
      const dirPath = noteData.path.split('/').slice(0, -1).join('/');
      const folderId = dirPath ? (pathToId.get(dirPath) || null) : null;

      try {
        const { entry, imageErrors } = await importNote(noteData, folderId, resourceKeyMap, opts);
        state.articles.push(entry);
        syncArticleViews();
        markEntityDirty('article', entry.id);

        imported.push({ entry, noteData });
        allImageErrors.push(...imageErrors);
      } catch (err) {
        allImageErrors.push({
          name: noteData.name,
          filename: '(entry)',
          reason: `Import failed: ${err.message}`,
        });
      }

      // Collect broken links report
      if (noteData.brokenLinks && noteData.brokenLinks.length) {
        allBrokenLinks.push({ name: noteData.name, links: noteData.brokenLinks });
      }
    }

    markEntityDirty('meta');
    debouncedSave();

    if (typeof refreshEncyclopediaView === 'function') refreshEncyclopediaView();
    if (typeof refreshAssetsView === 'function') refreshAssetsView(true);

    return {
      imported,
      foldersCreated,
      assetsImported: resourceKeyMap.size,
      imageErrors: allImageErrors,
      brokenLinks: allBrokenLinks,
    };
  }

  // ─── CSS injection ──────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('obs-importer-styles')) return;
    const style = document.createElement('style');
    style.id = 'obs-importer-styles';
    style.textContent = `
@keyframes obs-spin { to { transform: rotate(360deg); } }

.obs-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.obs-modal {
  background: var(--bg-2);
  border: 1px solid var(--border-1);
  border-radius: 12px;
  width: min(560px, 95vw);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.obs-header {
  padding: 1.25rem 1.5rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.obs-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.4rem;
  color: var(--text-primary);
  margin: 0;
}
.obs-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 1.2rem;
  padding: 0.25rem;
  line-height: 1;
}
.obs-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}
.obs-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-1);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.obs-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.obs-stat-card {
  background: var(--bg-3);
  border: 1px solid var(--border-1);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}
.obs-stat-card.is-warn { border-color: var(--warning, #f4a261); }
.obs-stat-card.is-success { border-color: var(--accent, #06b6d4); }
.obs-stat-num {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}
.obs-stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}
.obs-spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border-1);
  border-top-color: var(--accent, #06b6d4);
  border-radius: 50%;
  animation: obs-spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
.obs-details {
  margin-bottom: 0.75rem;
}
.obs-details summary {
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.4rem 0;
  user-select: none;
}
.obs-log-list {
  max-height: 140px;
  overflow-y: auto;
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-top: 0.4rem;
  line-height: 1.7;
  padding-left: 0.5rem;
}
.obs-option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 0.625rem;
  color: var(--text-primary);
}
.obs-folder-input {
  flex: 1;
  padding: 0.2rem 0.5rem;
  background: var(--bg-3);
  border: 1px solid var(--border-1);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.85rem;
}
.obs-vault-name {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}
.obs-vault-name strong {
  color: var(--text-primary);
}
.obs-skip-note {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-bottom: 1rem;
}
.obs-center {
  text-align: center;
  padding: 1.5rem 0;
}
.obs-center p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}
`;
    document.head.appendChild(style);
  }

  // ─── Modal ──────────────────────────────────────────────────────────────────

  let _overlay = null;

  function destroyModal() {
    if (_overlay) {
      _overlay.remove();
      _overlay = null;
    }
  }

  function createOverlay() {
    destroyModal();
    injectStyles();

    _overlay = document.createElement('div');
    _overlay.className = 'obs-overlay';
    _overlay.innerHTML = `
      <div class="obs-modal" role="dialog" aria-modal="true" aria-label="Import from Obsidian">
        <div class="obs-header">
          <h2 class="obs-title">Import from Obsidian</h2>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <a href="../docs/obsidian-import.md" target="_blank" rel="noopener"
               style="font-size:0.8rem;color:var(--text-secondary);text-decoration:none;opacity:0.8;"
               title="Open import guide">Help &amp; Tips ↗</a>
            <button class="obs-close" id="obsCloseBtn" aria-label="Close">&times;</button>
          </div>
        </div>
        <div class="obs-body" id="obsBody"></div>
        <div class="obs-footer" id="obsFooter"></div>
      </div>
    `;

    document.body.appendChild(_overlay);

    document.getElementById('obsCloseBtn').addEventListener('click', destroyModal);
    _overlay.addEventListener('click', (e) => {
      if (e.target === _overlay) destroyModal();
    });

    return {
      body: document.getElementById('obsBody'),
      footer: document.getElementById('obsFooter'),
    };
  }

  // Step 1 — Scanning
  function renderStepScanning(body, footer) {
    body.innerHTML = `
      <div class="obs-center">
        <div class="obs-spinner"></div>
        <p>Scanning vault&hellip;</p>
      </div>
    `;
    footer.innerHTML = '';
  }

  // Step 2 — Preview
  function renderStepPreview(body, footer, scanResult) {
    const { toImport, skipped, vaultName } = scanResult;

    // Count by winning classification bucket
    const counts = { person: 0, location: 0, thing: 0, org: 0 };
    for (const note of toImport) {
      counts[note.scoring.winner]++;
    }

    const folderCount = _countUniqueDirs(toImport.map(n => n.path));

    body.innerHTML = `
      <p class="obs-vault-name">Vault: <strong>${escapeHtml(vaultName)}</strong></p>
      <div class="obs-stat-grid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="obs-stat-card">
          <div class="obs-stat-num">${counts.person}</div>
          <div class="obs-stat-label">Characters</div>
        </div>
        <div class="obs-stat-card">
          <div class="obs-stat-num">${counts.location}</div>
          <div class="obs-stat-label">Locations</div>
        </div>
        <div class="obs-stat-card">
          <div class="obs-stat-num">${counts.thing + counts.org}</div>
          <div class="obs-stat-label">Items &amp; Orgs</div>
        </div>
      </div>
      <p class="obs-skip-note" style="margin-bottom:0.5rem">
        <strong>${toImport.length}</strong> entr${toImport.length !== 1 ? 'ies' : 'y'} will be imported into
        <strong>${folderCount}</strong> folder${folderCount !== 1 ? 's' : ''} mirroring your vault structure.
        ${skipped.length ? `${skipped.length} file${skipped.length !== 1 ? 's' : ''} will be skipped (GM-tool content or unreadable).` : ''}
      </p>
      <p class="obs-skip-note">
        Types are inferred from note content. Use right-click → <em>Move to Atlas</em> after import to place locations on your map.
      </p>
      <div class="obs-option-row">
        <input type="checkbox" id="obsTagCheck" checked>
        <label for="obsTagCheck">Tag all imports with <code>obsidian-import</code></label>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn-secondary" id="obsCancelBtn">Cancel</button>
      <button class="btn-primary" id="obsImportBtn">Import ${toImport.length} Entr${toImport.length !== 1 ? 'ies' : 'y'}</button>
    `;

    document.getElementById('obsCancelBtn').addEventListener('click', destroyModal);
    document.getElementById('obsImportBtn').addEventListener('click', async () => {
      const tagObsidian = document.getElementById('obsTagCheck').checked;

      renderStepImporting(body, footer);

      try {
        const result = await executeImport(scanResult, { tagObsidian });
        renderStepResults(body, footer, result, scanResult.skipped);
      } catch (err) {
        body.innerHTML = `<p style="color:var(--error,#ef4444)">Import failed: ${escapeHtml(err.message)}</p>`;
        footer.innerHTML = `<button class="btn-secondary" id="obsDoneBtn2">Close</button>`;
        document.getElementById('obsDoneBtn2').addEventListener('click', destroyModal);
      }
    });
  }

  // Step 3 — Importing
  function renderStepImporting(body, footer) {
    body.innerHTML = `
      <div class="obs-center">
        <div class="obs-spinner"></div>
        <p>Importing entries and images&hellip;</p>
      </div>
    `;
    footer.innerHTML = '';
  }

  // Step 4 — Results
  function renderStepResults(body, footer, result, skipped) {
    const { imported, foldersCreated, assetsImported, imageErrors, brokenLinks } = result;

    body.innerHTML = `
      <div class="obs-stat-grid" style="grid-template-columns:1fr 1fr 1fr 1fr">
        <div class="obs-stat-card is-success">
          <div class="obs-stat-num">${imported.length}</div>
          <div class="obs-stat-label">Entries</div>
        </div>
        <div class="obs-stat-card is-success">
          <div class="obs-stat-num">${assetsImported}</div>
          <div class="obs-stat-label">Assets</div>
        </div>
        <div class="obs-stat-card is-success">
          <div class="obs-stat-num">${foldersCreated}</div>
          <div class="obs-stat-label">Folders</div>
        </div>
        <div class="obs-stat-card ${skipped.length > 0 ? 'is-warn' : ''}">
          <div class="obs-stat-num">${skipped.length}</div>
          <div class="obs-stat-label">Skipped</div>
        </div>
      </div>
      ${_renderDetails('Skipped files (' + skipped.length + ')',
          skipped.map(s => `${escapeHtml(s.name)} &mdash; ${escapeHtml(s.reason)}`)
        )}
      ${_renderDetails('Broken wiki-links (' + brokenLinks.length + ')',
          brokenLinks.map(b => `${escapeHtml(b.name)}: ${b.links.map(escapeHtml).join(', ')}`)
        )}
      ${_renderDetails('Image errors (' + imageErrors.length + ')',
          imageErrors.map(e => `${escapeHtml(e.name)}: ${escapeHtml(e.filename)} &mdash; ${escapeHtml(e.reason)}`)
        )}
    `;

    footer.innerHTML = `
      <button class="btn-secondary" id="obsDownloadLogBtn">Download Log</button>
      <button class="btn-primary" id="obsDoneBtn">Done</button>
    `;

    document.getElementById('obsDoneBtn').addEventListener('click', destroyModal);
    document.getElementById('obsDownloadLogBtn').addEventListener('click', () => {
      _downloadLog(imported, skipped, brokenLinks, imageErrors);
    });
  }

  function _renderDetails(summary, lines) {
    if (!lines.length) return '';
    return `
      <details class="obs-details">
        <summary>${summary}</summary>
        <div class="obs-log-list">${lines.join('<br>')}</div>
      </details>
    `;
  }

  // ─── Folder map builder ─────────────────────────────────────────────────────

  /**
   * Build Encyclopedia folders mirroring the vault directory tree.
   * Takes an array of relative note paths (e.g. "NPCs/Villains/Kael.md").
   * Returns a Map<dirPath, folderId> — e.g. "NPCs/Villains" → "efolder-abc".
   * Notes at vault root (no subdirectory) map to an empty string key → null.
   */
  function buildFolderMap(notePaths) {
    // Phase B.2: lore folders live in state.folders with mapId: null
    if (!state.folders) state.folders = [];

    // Collect every unique ancestor directory path
    const allDirPaths = new Set();
    for (const p of notePaths) {
      const parts = p.split('/');
      parts.pop(); // remove filename
      for (let i = 1; i <= parts.length; i++) {
        allDirPaths.add(parts.slice(0, i).join('/'));
      }
    }

    // Sort shallow-first so parents exist before children
    const sorted = [...allDirPaths].sort((a, b) => {
      return a.split('/').length - b.split('/').length;
    });

    const loreFolders = state.folders.filter(f => f.mapId == null);
    const pathToId = new Map();

    for (const dirPath of sorted) {
      const parts   = dirPath.split('/');
      const name    = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const parentId   = parentPath ? (pathToId.get(parentPath) || null) : null;

      // Reuse existing folder if name + parentId match
      const existing = loreFolders.find(
        f => f.name === name && (f.parentFolderId || null) === parentId
      );
      if (existing) {
        pathToId.set(dirPath, existing.id);
      } else {
        const id = 'efolder-' + uid();
        state.folders.push({ id, name, collapsed: false, parentFolderId: parentId, mapId: null });
        pathToId.set(dirPath, id);
      }
    }

    if (allDirPaths.size > 0) markEntityDirty('meta');
    return pathToId;
  }

  /** Count unique vault directory paths from a list of note paths. */
  function _countUniqueDirs(notePaths) {
    const dirs = new Set();
    for (const p of notePaths) {
      const parts = p.split('/');
      parts.pop();
      for (let i = 1; i <= parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    }
    return dirs.size;
  }

  // ─── Log download ───────────────────────────────────────────────────────────

  function _downloadLog(imported, skipped, brokenLinks, imageErrors) {
    const lines = [];

    lines.push('TALETROVE — OBSIDIAN IMPORT LOG');
    lines.push('Generated: ' + new Date().toISOString());
    lines.push('');

    lines.push('── IMPORTED (' + imported.length + ') ──');
    for (const { entry, noteData } of imported) {
      const topSignals = (noteData.scoring.signals || []).slice(0, 3).join(', ');
      lines.push(`  ✓ ${entry.name} → ${entry.type}  [${topSignals || 'no signals'}]`);
    }
    lines.push('');

    lines.push('── SKIPPED (' + skipped.length + ') ──');
    for (const s of skipped) {
      lines.push(`  ✗ ${s.name}`);
      lines.push(`    ${s.reason}`);
    }
    lines.push('');

    lines.push('── BROKEN WIKI-LINKS (' + brokenLinks.length + ') ──');
    for (const b of brokenLinks) {
      lines.push(`  ${b.name}: ${b.links.join(', ')}`);
    }
    lines.push('');

    lines.push('── IMAGE ERRORS (' + imageErrors.length + ') ──');
    for (const e of imageErrors) {
      lines.push(`  ${e.name}: ${e.filename} — ${e.reason}`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'taletrove-obsidian-import.log.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ─── Public entry point ─────────────────────────────────────────────────────

  async function openObsidianImportModal() {
    // Check File System Access API support
    if (typeof window.showDirectoryPicker !== 'function') {
      if (typeof showAlertModal === 'function') {
        showAlertModal(
          'Browser Not Supported',
          'Obsidian vault import requires the File System Access API. Please use Chrome, Edge, or another Chromium-based browser.'
        );
      } else {
        // Last resort — should not normally be reached per project conventions,
        // but we guard against missing globals gracefully
        console.error('[ObsidianImporter] showAlertModal not available and File System Access API not supported.');
      }
      return;
    }

    let rootHandle;
    try {
      rootHandle = await window.showDirectoryPicker({ mode: 'read' });
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled
      if (typeof showAlertModal === 'function') {
        showAlertModal('Cannot Open Vault', `Failed to open folder: ${err.message}`);
      }
      return;
    }

    const { body, footer } = createOverlay();
    renderStepScanning(body, footer);

    // Give the browser a frame to paint the spinner before the sync-heavy scan
    await new Promise(r => setTimeout(r, 30));

    let scanResult;
    try {
      scanResult = await scanVault(rootHandle);
    } catch (err) {
      body.innerHTML = `<p style="color:var(--error,#ef4444)">Vault scan failed: ${escapeHtml(err.message)}</p>`;
      footer.innerHTML = `<button class="btn-secondary" id="obsScanErrClose">Close</button>`;
      document.getElementById('obsScanErrClose').addEventListener('click', destroyModal);
      return;
    }

    renderStepPreview(body, footer, scanResult);
  }

  // ─── Export ─────────────────────────────────────────────────────────────────
  window.openObsidianImportModal = openObsidianImportModal;

})();
