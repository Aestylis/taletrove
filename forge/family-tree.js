// family-tree.js — SVG-based generational family tree view
// Depends on: state.js, utils.js, ui.js

// ─── Constants ────────────────────────────────────────────────────────────────

const FT_NODE_W     = 200;
const FT_NODE_H     = 72;
const FT_H_GAP      = 40;
const FT_GEN_GAP    = 64;
const FT_PAD        = 60;
const FT_MAX_DEPTH  = 8;

const FT_PARENT_LABELS = new Set([
  'father','mother','parent','dad','mom','sire','dam','papa','mama',
  'adoptive father','adoptive mother','stepfather','stepmother',
  'foster father','foster mother','guardian','birth mother','birth father',
]);
const FT_CHILD_LABELS = new Set([
  'child','son','daughter','offspring','heir','ward','kid',
  'adopted child','stepchild','stepson','stepdaughter',
]);
const FT_SPOUSE_LABELS = new Set([
  'spouse','husband','wife','partner','consort','betrothed',
  'lover','ex-wife','ex-husband','ex-spouse','ex-partner',
  'fiancé','fiancée','fiance','fiancee',
]);
const FT_SIBLING_LABELS = new Set([
  'sibling','brother','sister','twin','half-brother','half-sister',
  'step-brother','step-sister','stepbrother','stepsister',
]);
const FT_HOUSE_LABELS = new Set([
  'house','clan','family','dynasty','tribe','guild','order','bloodline',
  'member of','belongs to','member','vassal',
]);

// ─── Module State ─────────────────────────────────────────────────────────────

let _ftModal     = null;
let _ftSvg       = null;
let _ftZoomGroup = null;
let _ftTransform = { x: 0, y: 0, scale: 1 };
let _ftRootId    = null;
let _ftNodes     = new Map();   // id → FTNode
let _ftEdges     = [];          // FTEdge[]

let _ftIsPanning   = false;
let _ftPanStart    = null;
let _ftTxStart     = null;
let _ftWasDragging = false;
let _ftDragDist    = 0;

// ─── SVG Element Helper ───────────────────────────────────────────────────────

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) n.setAttribute(k, String(v));
  }
  return n;
}

// ─── Label Classification ─────────────────────────────────────────────────────

function ftClassifyLabel(label) {
  if (!label) return 'unknown';
  const l = label.toLowerCase().trim();
  if (FT_PARENT_LABELS.has(l))  return 'parent';
  if (FT_CHILD_LABELS.has(l))   return 'child';
  if (FT_SPOUSE_LABELS.has(l))  return 'spouse';
  if (FT_SIBLING_LABELS.has(l)) return 'sibling';
  // Fuzzy substring match
  if (l.includes('parent') || l.includes('father') || l.includes('mother')) return 'parent';
  if (l.includes('child')  || l.includes(' son')   || l.includes('daughter')) return 'child';
  if (l.includes('spouse') || l.includes('wife')   || l.includes('husband') || l.includes('partner')) return 'spouse';
  if (l.includes('sibling')|| l.includes('brother')|| l.includes('sister'))  return 'sibling';
  return 'unknown';
}

// ─── Data Building ────────────────────────────────────────────────────────────

function ftCollectSubgraph(rootId) {
  _ftNodes.clear();
  _ftEdges = [];

  const allEntities = new Map();
  [...state.encyclopedia, ...state.features].forEach(e => allEntities.set(e.id, e));

  // BFS from root — only include nodes reachable through family links
  const visited  = new Set();
  const edgeKeys = new Set();
  const queue    = [{ id: rootId, depth: 0 }];

  while (queue.length) {
    const { id, depth } = queue.shift();
    if (visited.has(id) || depth > FT_MAX_DEPTH) continue;
    visited.add(id);

    const entity = allEntities.get(id);
    if (!entity) continue;

    const b = entity.birthData || {};
    const d = entity.deathData || {};

    // Inherit CoA from a linked house/clan/family entity if the character has none
    let houseCoa    = null;
    let houseCoaKey = null;
    let houseId     = null;
    if (!entity.coatOfArms && !entity.coatOfArmsKey) {
      for (const link of (entity.links || [])) {
        if (!link.targetId || !link.label) continue;
        const ll = link.label.toLowerCase().trim();
        if (!FT_HOUSE_LABELS.has(ll) && !FT_HOUSE_LABELS.has(ll.replace(/^(is |a |the )/, ''))) continue;
        const houseEntity = allEntities.get(link.targetId);
        if (!houseEntity) continue;
        if (houseEntity.coatOfArmsKey) { houseCoaKey = houseEntity.coatOfArmsKey; houseId = houseEntity.id; break; }
        if (houseEntity.coatOfArms)    { houseCoa    = houseEntity.coatOfArms;    houseId = houseEntity.id; break; }
      }
    }

    _ftNodes.set(id, {
      id,
      label:         entity.name || entity.title || '(untitled)',
      category:      entity.type || entity.category || '',
      heroImageKey:  entity.heroImageKey  || null,
      coatOfArms:    entity.coatOfArms    || null,
      coatOfArmsKey: entity.coatOfArmsKey || null,
      houseCoa,
      houseCoaKey,
      houseId,
      birthYear:     b.year  || null,
      deathYear:     d.year  || null,
      kind:          state.encyclopedia.find(e => e.id === id) ? 'encyclopedia' : 'feature',
      generation:    0,
      col:           0,
      x:             0,
      y:             0,
      spouseOf:      [],
    });

    for (const link of (entity.links || [])) {
      if (link.linkType !== 'family' || !link.targetId) continue;

      const rel = ftClassifyLabel(link.label);

      // Deduplicate by sorted pair (one canonical edge per pair)
      const pairKey = [id, link.targetId].sort().join('|');
      if (edgeKeys.has(pairKey)) {
        // Still enqueue the target so we visit the node
        if (!visited.has(link.targetId)) queue.push({ id: link.targetId, depth: depth + 1 });
        continue;
      }
      edgeKeys.add(pairKey);

      // Canonical direction: fromId=parent, toId=child for parent/child edges
      let fromId = id, toId = link.targetId;
      if (rel === 'parent') {
        // "A links to B as Father" → B is A's parent → B=parent, A=child
        fromId = link.targetId;
        toId   = id;
      }
      // rel='child': "A links to B as Son" → A=parent, B=child → fromId=A already correct

      _ftEdges.push({ fromId, toId, rel });

      if (!visited.has(link.targetId)) queue.push({ id: link.targetId, depth: depth + 1 });
    }
  }
}

// ─── Generation Assignment ────────────────────────────────────────────────────

function ftAssignGenerations() {
  const visited = new Set();
  const queue   = [{ id: _ftRootId, gen: 0 }];

  while (queue.length) {
    const { id, gen } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    const node = _ftNodes.get(id);
    if (!node) continue;
    node.generation = gen;

    for (const edge of _ftEdges) {
      if (edge.rel === 'parent' || edge.rel === 'child') {
        // fromId=parent (gen G), toId=child (gen G+1)
        if (edge.fromId === id && !visited.has(edge.toId)) {
          queue.push({ id: edge.toId, gen: gen + 1 });
        }
        if (edge.toId === id && !visited.has(edge.fromId)) {
          queue.push({ id: edge.fromId, gen: gen - 1 });
        }
      } else {
        // Spouse / sibling / unknown → same generation
        if (edge.fromId === id && !visited.has(edge.toId)) {
          queue.push({ id: edge.toId, gen });
        }
        if (edge.toId === id && !visited.has(edge.fromId)) {
          queue.push({ id: edge.fromId, gen });
        }
      }
    }
  }

  // Mark spouse pairs on nodes
  for (const edge of _ftEdges) {
    if (edge.rel !== 'spouse') continue;
    const a = _ftNodes.get(edge.fromId);
    const b = _ftNodes.get(edge.toId);
    if (a && !a.spouseOf.includes(edge.toId))   a.spouseOf.push(edge.toId);
    if (b && !b.spouseOf.includes(edge.fromId)) b.spouseOf.push(edge.fromId);
  }
}

// ─── Column Assignment ────────────────────────────────────────────────────────

function ftAssignColumns() {
  // Group nodes by generation
  const byGen = new Map();
  for (const node of _ftNodes.values()) {
    if (!byGen.has(node.generation)) byGen.set(node.generation, []);
    byGen.get(node.generation).push(node);
  }
  const gens = [...byGen.keys()].sort((a, b) => a - b);

  // Initial placement per row — keep spouses adjacent
  for (const gen of gens) {
    const row    = byGen.get(gen);
    const inRow  = new Set(row.map(n => n.id));
    const placed = [];
    const added  = new Set();

    // Root first, then stable order
    row.sort((a, b) => {
      if (a.id === _ftRootId) return -1;
      if (b.id === _ftRootId) return 1;
      return a.id.localeCompare(b.id);
    });

    for (const node of row) {
      if (added.has(node.id)) continue;
      placed.push(node);
      added.add(node.id);
      // Place each spouse immediately after
      for (const spouseId of node.spouseOf) {
        if (inRow.has(spouseId) && !added.has(spouseId)) {
          placed.push(_ftNodes.get(spouseId));
          added.add(spouseId);
        }
      }
    }
    placed.forEach((node, i) => { node.col = i; });
  }

  // Centering pass (bottom-up): center parents over their children
  for (let pass = 0; pass < 3; pass++) {
    for (const gen of [...gens].reverse()) {
      for (const node of byGen.get(gen)) {
        const children = _ftEdges
          .filter(e => e.fromId === node.id && (e.rel === 'parent' || e.rel === 'child'))
          .map(e => _ftNodes.get(e.toId))
          .filter(Boolean);
        if (!children.length) continue;
        node.col = children.reduce((s, c) => s + c.col, 0) / children.length;
      }
    }
  }

  // Normalize: eliminate overlap within each row, preserving order
  for (const gen of gens) {
    const row = [...byGen.get(gen)].sort((a, b) => a.col - b.col);
    let cursor = 0;
    for (const node of row) {
      if (node.col < cursor) node.col = cursor;
      cursor = node.col + 1;
    }
  }
}

// ─── Coordinate Computation ───────────────────────────────────────────────────

function ftComputeCoords() {
  let minGen = Infinity, minCol = Infinity;
  for (const node of _ftNodes.values()) {
    minGen = Math.min(minGen, node.generation);
    minCol = Math.min(minCol, node.col);
  }
  for (const node of _ftNodes.values()) {
    node.x = FT_PAD + (node.col - minCol) * (FT_NODE_W + FT_H_GAP);
    node.y = FT_PAD + (node.generation - minGen) * (FT_NODE_H + FT_GEN_GAP);
  }
}

// ─── Connectors ───────────────────────────────────────────────────────────────

function ftBuildConnectors(group) {
  for (const edge of _ftEdges) {
    const from = _ftNodes.get(edge.fromId);
    const to   = _ftNodes.get(edge.toId);
    if (!from || !to) continue;

    let d, cls;

    if (edge.rel === 'spouse') {
      const left  = from.x <= to.x ? from : to;
      const right = from.x <= to.x ? to   : from;
      const midY  = left.y + FT_NODE_H * 0.5;
      d   = `M ${left.x + FT_NODE_W} ${midY} L ${right.x} ${midY}`;
      cls = 'ft-connector ft-connector-spouse';

    } else if (edge.rel === 'sibling') {
      const left  = from.x <= to.x ? from : to;
      const right = from.x <= to.x ? to   : from;
      const y     = Math.min(left.y, right.y) - 14;
      d   = `M ${left.x  + FT_NODE_W / 2} ${y} L ${right.x + FT_NODE_W / 2} ${y}`;
      cls = 'ft-connector ft-connector-sibling';

    } else if (edge.rel === 'parent' || edge.rel === 'child') {
      // fromId=parent, toId=child
      const px   = from.x + FT_NODE_W / 2;
      const py   = from.y + FT_NODE_H;
      const cx   = to.x   + FT_NODE_W / 2;
      const cy   = to.y;
      const midY = (py + cy) / 2;
      d   = `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`;
      cls = 'ft-connector ft-connector-parent';

    } else {
      const x1 = from.x + FT_NODE_W / 2, y1 = from.y + FT_NODE_H / 2;
      const x2 = to.x   + FT_NODE_W / 2, y2 = to.y   + FT_NODE_H / 2;
      d   = `M ${x1} ${y1} L ${x2} ${y2}`;
      cls = 'ft-connector ft-connector-unknown';
    }

    group.appendChild(svgEl('path', { class: cls, d }));
  }
}

// ─── Node Cards ───────────────────────────────────────────────────────────────

function ftBuildCard(node) {
  const isRoot      = node.id === _ftRootId;
  const maxLen      = 20;
  const displayName = node.label.length > maxLen
    ? node.label.slice(0, maxLen - 1) + '…'
    : node.label;

  let datesStr = '';
  if (node.birthYear && node.deathYear) datesStr = `${node.birthYear} – ${node.deathYear}`;
  else if (node.birthYear) datesStr = `b. ${node.birthYear}`;
  else if (node.deathYear) datesStr = `d. ${node.deathYear}`;

  const hasCoa = !!(node.coatOfArms || node.coatOfArmsKey || node.houseCoa || node.houseCoaKey);

  // Find this node's relationship to root for hover border hint
  const relEdge = _ftEdges.find(e => e.toId === node.id || e.fromId === node.id);
  const relType = relEdge?.rel || null;

  const card = el('div', {
    class:          `ft-node-card${isRoot ? ' is-root' : ''}`,
    'data-ft-id':   node.id,
    'data-ft-rel':  relType || '',
  });

  // CoA watermark placeholder (populated async)
  if (hasCoa) card.appendChild(el('div', { class: 'ft-node-coa-bg' }));

  // Avatar — hero image if set, otherwise gradient + initials monogram
  const avatar = el('div', { class: 'ft-node-avatar' });
  if (!node.heroImageKey) {
    const words = node.label.trim().split(/\s+/);
    const initials = words.length >= 2
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : node.label.slice(0, 2).toUpperCase();
    avatar.appendChild(el('span', { class: 'ft-node-initials', text: initials }));
  }
  card.appendChild(avatar);

  // Text block
  const info = el('div', { class: 'ft-node-info' });
  info.appendChild(el('div', { class: 'ft-node-name', text: displayName }));
  if (node.category) {
    const cat = node.category.charAt(0).toUpperCase() + node.category.slice(1, 16);
    info.appendChild(el('div', { class: 'ft-node-category', text: cat }));
  }
  if (datesStr) info.appendChild(el('div', { class: 'ft-node-dates', text: datesStr }));

  card.appendChild(info);
  return card;
}

async function ftLoadAvatars() {
  if (!_ftModal || !window.resolveImageUrl) return;
  for (const node of _ftNodes.values()) {
    if (!node.heroImageKey) continue;
    try {
      const url = await resolveImageUrl(node.heroImageKey);
      if (!url || !_ftModal) continue;
      const avatar = _ftModal.querySelector(`[data-ft-id="${CSS.escape(node.id)}"] .ft-node-avatar`);
      if (avatar) {
        avatar.style.backgroundImage = `url('${url}')`;
        avatar.classList.add('has-image');
        avatar.innerHTML = '';
      }
    } catch (_) { /* skip */ }
  }
}

async function ftLoadCoatOfArms() {
  if (!_ftModal) return;
  for (const node of _ftNodes.values()) {
    const hasOwn   = !!(node.coatOfArms || node.coatOfArmsKey);
    const hasHouse = !!(node.houseCoa   || node.houseCoaKey);
    if (!hasOwn && !hasHouse) continue;

    try {
      // Resolve own CoA first, fall back to house CoA
      let url        = null;
      let isInherited = false;

      if (node.coatOfArmsKey && window.resolveImageUrl) {
        url = await resolveImageUrl(node.coatOfArmsKey);
      } else if (node.coatOfArms && window.generateCoatOfArms) {
        const seed = node.coatOfArms.seed || node.id;
        url = await window.generateCoatOfArms(seed, { shield: node.coatOfArms.shield || 'heater', size: 128 });
      } else if (node.houseCoaKey && window.resolveImageUrl) {
        url = await resolveImageUrl(node.houseCoaKey);
        isInherited = true;
      } else if (node.houseCoa && window.generateCoatOfArms) {
        const seed = node.houseCoa.seed || node.houseId || node.id;
        url = await window.generateCoatOfArms(seed, { shield: node.houseCoa.shield || 'heater', size: 128 });
        isInherited = true;
      }

      if (!url || !_ftModal) continue;

      // Watermark only — inherited CoA is dimmer; avatar handled by ftLoadAvatars
      const bg = _ftModal.querySelector(`[data-ft-id="${CSS.escape(node.id)}"] .ft-node-coa-bg`);
      if (bg) {
        bg.style.backgroundImage = `url('${url}')`;
        if (isInherited) bg.classList.add('is-inherited');
      }
    } catch (_) { /* skip */ }
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────

function ftRender() {
  if (!_ftZoomGroup) return;

  // Clear previous render
  while (_ftZoomGroup.firstChild) _ftZoomGroup.removeChild(_ftZoomGroup.firstChild);

  // Remove any stale empty state
  _ftModal?.querySelector('.ft-empty-state')?.remove();

  if (_ftNodes.size === 0) {
    const empty = el('div', { class: 'ft-empty-state' });
    empty.appendChild(el('p', { text: 'No family connections found.' }));
    empty.appendChild(el('p', {
      class: 'muted',
      text:  'Add links with type "Family" between characters to build the tree.',
    }));
    _ftModal.appendChild(empty);
    return;
  }

  // Connectors (drawn under nodes)
  const connectors = svgEl('g', { class: 'ft-connectors' });
  ftBuildConnectors(connectors);
  _ftZoomGroup.appendChild(connectors);

  // Nodes as foreignObjects
  for (const node of _ftNodes.values()) {
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x',        node.x);
    fo.setAttribute('y',        node.y);
    fo.setAttribute('width',    FT_NODE_W);
    fo.setAttribute('height',   FT_NODE_H);
    fo.setAttribute('overflow', 'visible');

    const card = ftBuildCard(node);
    fo.appendChild(card);
    _ftZoomGroup.appendChild(fo);
  }

  ftLoadAvatars();
  ftLoadCoatOfArms();
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ftBuildLegend() {
  const legend = el('div', { class: 'ft-legend' });
  const items = [
    { label: 'Parent / Child', color: 'var(--ft-parent)',  dashed: false },
    { label: 'Spouse',         color: 'var(--ft-spouse)',  dashed: false },
    { label: 'Sibling',        color: 'var(--ft-sibling)', dashed: false },
    { label: 'Unknown',        color: 'var(--ft-unknown)', dashed: true  },
  ];
  for (const item of items) {
    const row  = el('div', { class: 'ft-legend-row' });
    const line = el('div', { class: `ft-legend-line${item.dashed ? ' is-dashed' : ''}` });
    if (!item.dashed) line.style.background = item.color;
    line.style.color = item.color;
    row.appendChild(line);
    row.appendChild(el('span', { text: item.label }));
    legend.appendChild(row);
  }
  return legend;
}

// ─── Pan / Zoom ───────────────────────────────────────────────────────────────

function ftSvgPoint(e) {
  const rect = _ftSvg.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function ftApplyTransform() {
  _ftZoomGroup?.setAttribute('transform',
    `translate(${_ftTransform.x} ${_ftTransform.y}) scale(${_ftTransform.scale})`);
}

function ftOnMouseDown(e) {
  if (e.target.closest('[data-ft-id]')) return;
  _ftIsPanning   = true;
  _ftWasDragging = false;
  _ftDragDist    = 0;
  _ftPanStart    = { x: e.clientX, y: e.clientY };
  _ftTxStart     = { x: _ftTransform.x, y: _ftTransform.y };
  _ftSvg.classList.add('is-panning');
  e.preventDefault();
}

function ftOnMouseMove(e) {
  if (!_ftIsPanning) return;
  _ftDragDist += Math.abs(e.movementX) + Math.abs(e.movementY);
  if (_ftDragDist > 4) _ftWasDragging = true;
  _ftTransform.x = _ftTxStart.x + (e.clientX - _ftPanStart.x);
  _ftTransform.y = _ftTxStart.y + (e.clientY - _ftPanStart.y);
  ftApplyTransform();
}

function ftOnMouseUp() {
  _ftIsPanning = false;
  _ftSvg?.classList.remove('is-panning');
}

let _ftZoomRaf = null;
function ftOnWheel(e) {
  e.preventDefault();
  const pt       = ftSvgPoint(e);
  const factor   = e.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.max(0.1, Math.min(4, _ftTransform.scale * factor));
  const ratio    = newScale / _ftTransform.scale;
  _ftTransform.x = pt.x - (pt.x - _ftTransform.x) * ratio;
  _ftTransform.y = pt.y - (pt.y - _ftTransform.y) * ratio;
  _ftTransform.scale = newScale;
  if (!_ftZoomRaf) {
    _ftZoomRaf = requestAnimationFrame(() => { ftApplyTransform(); _ftZoomRaf = null; });
  }
}

function ftOnDblClick(e) {
  if (e.target.closest('[data-ft-id]')) return;
  ftCenterOn(_ftRootId);
}

// Click delegated at modal level (captures events from inside foreignObject)
function ftOnClick(e) {
  if (_ftWasDragging) { _ftWasDragging = false; return; }
  const card = e.target.closest('[data-ft-id]');
  if (!card) return;
  const id = card.dataset.ftId;
  closeFamilyTree();
  requestAnimationFrame(() => {
    if (state.encyclopedia.find(x => x.id === id)) window.enterPeekMode?.(id, 'encyclopedia');
    else window.navigateAndPeek?.(id, 'feature');
  });
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ftShowTooltip(node, cardEl) {
  const tooltip = _ftModal?.querySelector('.ft-tooltip');
  if (!tooltip) return;

  const linkCount  = _ftEdges.filter(e => e.fromId === node.id || e.toId === node.id).length;
  const catDisplay = node.category
    ? node.category.charAt(0).toUpperCase() + node.category.slice(1)
    : 'Character';

  tooltip.innerHTML =
    `<strong class="graph-tt-name">${escapeHtml(node.label)}</strong>` +
    `<span class="graph-tt-meta">${escapeHtml(catDisplay)}</span>` +
    `<span class="graph-tt-links">${linkCount} family connection${linkCount !== 1 ? 's' : ''}</span>`;

  tooltip.classList.remove('hidden');

  const modalRect = _ftModal.getBoundingClientRect();
  const cardRect  = cardEl.getBoundingClientRect();
  let tx = cardRect.right  - modalRect.left + 8;
  let ty = cardRect.top    - modalRect.top;

  tooltip.style.left = `${tx}px`;
  tooltip.style.top  = `${Math.max(4, ty)}px`;

  requestAnimationFrame(() => {
    const tw = tooltip.offsetWidth;
    if (tx + tw > _ftModal.offsetWidth - 8) {
      tx = cardRect.left - modalRect.left - tw - 8;
      tooltip.style.left = `${tx}px`;
    }
  });
}

function ftHideTooltip() {
  _ftModal?.querySelector('.ft-tooltip')?.classList.add('hidden');
}

// ─── Center on Node ───────────────────────────────────────────────────────────

function ftCenterOn(id) {
  const node = _ftNodes.get(id);
  if (!node || !_ftSvg) return;
  const rect = _ftSvg.getBoundingClientRect();
  _ftTransform.x = rect.width  / 2 - (node.x + FT_NODE_W / 2) * _ftTransform.scale;
  _ftTransform.y = rect.height / 2 - (node.y + FT_NODE_H / 2) * _ftTransform.scale;
  ftApplyTransform();
}

// ─── Open / Close ─────────────────────────────────────────────────────────────

function openFamilyTree(rootId = null) {
  if (_ftModal) closeFamilyTree();

  // Find a fallback root if none provided
  if (!rootId) {
    const first = state.encyclopedia.find(e =>
      (e.links || []).some(l => l.linkType === 'family')
    );
    rootId = first?.id || null;
  }

  _ftRootId    = rootId;
  _ftTransform = { x: 0, y: 0, scale: 1 };

  // ── Modal shell ──
  _ftModal = el('div', {
    class: 'ft-modal',
    id: 'familyTreeModal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'ft-modal-title',
  });

  // Header (reuses graph-modal-header styling)
  const header   = el('div', { class: 'graph-modal-header' });
  const rootEntity = rootId
    ? (state.encyclopedia.find(e => e.id === rootId) || state.features.find(f => f.id === rootId))
    : null;
  const titleEl  = el('span', {
    id:    'ft-modal-title',
    class: 'graph-modal-title',
    text:  rootEntity ? `Family Tree · ${rootEntity.name || rootEntity.title || ''}` : 'Family Tree',
  });
  const actions  = el('div', { class: 'graph-modal-actions' });

  const centerBtn = el('button', { class: 'ghost', text: 'Center' });
  centerBtn.addEventListener('click', () => ftCenterOn(_ftRootId));

  const resetBtn = el('button', { class: 'ghost', text: 'Reset View' });
  resetBtn.addEventListener('click', () => {
    _ftTransform = { x: 0, y: 0, scale: 1 };
    ftApplyTransform();
    requestAnimationFrame(() => ftCenterOn(_ftRootId));
  });

  const closeBtn = el('button', {
    class: 'ghost graph-close-btn',
    text:  '×',
    'aria-label': 'Close',
  });
  closeBtn.addEventListener('click', closeFamilyTree);

  actions.append(centerBtn, resetBtn, closeBtn);
  header.append(titleEl, actions);
  _ftModal.appendChild(header);

  // SVG canvas
  _ftSvg       = svgEl('svg', { class: 'ft-svg' });
  _ftZoomGroup = svgEl('g',   { class: 'ft-zoom-group' });
  _ftSvg.appendChild(_ftZoomGroup);
  _ftModal.appendChild(_ftSvg);

  // Tooltip
  _ftModal.appendChild(el('div', { class: 'ft-tooltip hidden' }));

  document.body.appendChild(_ftModal);

  // ── Build data + render ──
  if (rootId) {
    ftCollectSubgraph(rootId);
    ftAssignGenerations();
    ftAssignColumns();
    ftComputeCoords();
  }
  ftRender();
  _ftModal.appendChild(ftBuildLegend());

  // ── Events ──
  _ftSvg.addEventListener('mousedown',  ftOnMouseDown);
  _ftSvg.addEventListener('mousemove',  ftOnMouseMove);
  _ftSvg.addEventListener('mouseup',    ftOnMouseUp);
  _ftSvg.addEventListener('mouseleave', ftOnMouseUp);
  _ftSvg.addEventListener('wheel',      ftOnWheel, { passive: false });
  _ftSvg.addEventListener('dblclick',   ftOnDblClick);

  // Click + tooltip delegation (captures foreignObject events)
  _ftModal.addEventListener('click', ftOnClick);

  _ftModal.addEventListener('mouseover', (e) => {
    const card = e.target.closest('[data-ft-id]');
    if (!card) return;
    const node = _ftNodes.get(card.dataset.ftId);
    if (node) ftShowTooltip(node, card);
  });
  _ftModal.addEventListener('mouseout', (e) => {
    const card = e.target.closest('[data-ft-id]');
    if (card && !card.contains(e.relatedTarget)) ftHideTooltip();
  });

  // Keyboard
  const onKey = (e) => { if (e.key === 'Escape') closeFamilyTree(); };
  document.addEventListener('keydown', onKey);
  _ftModal._onKey = onKey;

  // Animate in, then center on root
  requestAnimationFrame(() => {
    _ftModal.classList.add('is-open');
    requestAnimationFrame(() => ftCenterOn(_ftRootId));
  });
}

function closeFamilyTree() {
  if (!_ftModal) return;
  if (_ftModal._onKey) document.removeEventListener('keydown', _ftModal._onKey);
  _ftModal.classList.remove('is-open');
  setTimeout(() => {
    _ftModal?.remove();
    _ftModal = _ftSvg = _ftZoomGroup = null;
    _ftNodes.clear();
    _ftEdges  = [];
    _ftRootId = null;
  }, 220);
}

// ─── Exports ──────────────────────────────────────────────────────────────────
window.openFamilyTree  = openFamilyTree;
window.closeFamilyTree = closeFamilyTree;
