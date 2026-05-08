const PRESET_COLORS = [
  '#000000', '#222034', '#45283c', '#663931', '#8f563b', '#df7126', '#d9a066', '#eec39a',
  '#fbf236', '#99e550', '#6abe30', '#37946e', '#4b692f', '#524b24', '#323c39', '#3f3f74',
  '#306082', '#5b6ee1', '#639bff', '#5fcde4', '#cbdbfc', '#ffffff', '#9badb7', '#847e87',
  '#696a6a', '#595652', '#76428a', '#ac3232', '#d95763', '#d77bba', '#8f974a', '#8a6f30'
];

// Shared DOMPurify config — must allow wiki-link and dice data attrs, and <button> for dice rolls.
const PURIFY_CONFIG = {
  ADD_ATTR: ['data-notation', 'data-wiki-name'],
  ADD_TAGS: ['button']
};

const SLASH_COMMANDS = [
  { type: 'TextField',     label: 'Text',          icon: 'text-align-left',   desc: 'Rich markdown text' },
  { type: 'Image',         label: 'Image',          icon: 'image',             desc: 'Upload or embed an image' },
  { type: 'MapEmbed',      label: 'Map',            icon: 'map-trifold',       desc: 'Embed an interactive map view' },
  { type: 'Timeline',      label: 'Timeline',       icon: 'calendar-blank',    desc: 'Chronological event list' },
  { type: 'Relationships', label: 'Relationships',  icon: 'arrows-horizontal', desc: 'Links to other entries' },
  { type: 'Meter',         label: 'Meter',          icon: 'hourglass',         desc: 'Stat bar or progress meter' },
  { type: 'Tags',          label: 'Tags',           icon: 'tag',               desc: 'Searchable tag labels' },
  { type: 'YouTube',       label: 'YouTube',        icon: 'youtube-logo',      desc: 'Embed YouTube video' },
  { type: 'Spotify',       label: 'Spotify',        icon: 'spotify-logo',      desc: 'Embed Spotify track' },
];

const _embedMapInstances = new Map(); // blockId → L.map instance

let _slashPalette = null;
let _slashQuery = '';
let _slashSelectedIdx = 0;
let _slashOwner = null; // { ownerId, ownerType }

// Block traversal: cursor positioning after panel rebuild
let _blockTraversalFocusEnd = false; // ArrowUp → focus prev block at end
let _blockMergePoint = -1;           // Backspace-merge → restore cursor at join point

function _autoExpand(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function _openSlashPalette(textarea, ownerId, ownerType) {
  _closeSlashPalette();
  _slashQuery = '';
  _slashSelectedIdx = 0;
  _slashOwner = { ownerId, ownerType };
  _slashPalette = el('div', { class: 'slash-palette', role: 'listbox', 'aria-label': 'Insert block' });
  _renderSlashPalette();
  document.body.appendChild(_slashPalette);
  _positionSlashPalette(textarea);
}

function _positionSlashPalette(textarea) {
  if (!_slashPalette || !textarea) return;
  const rect = textarea.getBoundingClientRect();
  const paletteH = 280;
  const spaceBelow = window.innerHeight - rect.bottom;
  _slashPalette.style.left = rect.left + 'px';
  _slashPalette.style.top = spaceBelow >= paletteH || rect.top < paletteH
    ? (rect.bottom + 4) + 'px'
    : (rect.top - paletteH - 4) + 'px';
}

function _renderSlashPalette() {
  if (!_slashPalette) return;
  const q = _slashQuery.toLowerCase();
  const filtered = SLASH_COMMANDS.filter(c =>
    c.label.toLowerCase().startsWith(q) ||
    c.type.toLowerCase().startsWith(q) ||
    c.desc.toLowerCase().includes(q)
  );
  if (filtered.length === 0) { _closeSlashPalette(); return; }
  _slashSelectedIdx = Math.min(_slashSelectedIdx, filtered.length - 1);

  _slashPalette.innerHTML = '';
  _slashPalette.appendChild(el('div', { class: 'slash-query-row' }, [
    el('span', { class: 'slash-prompt', text: '/' }),
    el('span', { class: 'slash-query-text', text: _slashQuery }),
    el('span', { class: 'slash-cursor', text: '|' })
  ]));

  const list = el('div', { class: 'slash-list' });
  filtered.forEach((cmd, i) => {
    const item = el('div', {
      class: `slash-item${i === _slashSelectedIdx ? ' is-active' : ''}`,
      role: 'option'
    }, [
      el('div', { class: 'slash-item-icon', innerHTML: getIconHTMLSync(cmd.icon, 'currentColor') }),
      el('div', { class: 'slash-item-body' }, [
        el('span', { class: 'slash-item-label', text: cmd.label }),
        el('span', { class: 'slash-item-desc', text: cmd.desc })
      ])
    ]);
    item.addEventListener('mousedown', (e) => { e.preventDefault(); _insertSlashBlock(cmd.type); });
    list.appendChild(item);
  });
  _slashPalette.appendChild(list);

  const activeItem = list.querySelector('.is-active');
  if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
}

function _closeSlashPalette() {
  if (_slashPalette) { _slashPalette.remove(); _slashPalette = null; }
  _slashQuery = '';
  _slashSelectedIdx = 0;
  _slashOwner = null;
}

function _insertSlashBlock(blockType) {
  if (!_slashOwner) return;
  const { ownerId, ownerType } = _slashOwner;
  _closeSlashPalette();
  addBlock(ownerId, ownerType, blockType);
}

document.addEventListener('mousedown', (e) => {
  if (_slashPalette && !_slashPalette.contains(e.target)) _closeSlashPalette();
});

async function renderBlock(block) {
  const isSelected = (block.blockId === selectedBlockId);
  // Determine the owner item (feature or encyclopedia)
  const ownerItem = (infoPanelFeatureId)
    ? state.features.find(f => f.id === infoPanelFeatureId)
    : state.encyclopedia.find(e => e.id === selectedEncyclopediaEntryId);

  const ownerId = ownerItem?.id;
  const ownerType = infoPanelFeatureId ? 'feature' : 'encyclopedia';

  // Float: only applies to Image blocks in view mode
  const blockFloat = (block.type === 'Image' && !isContentEditMode)
    ? (block.data.float || 'none')
    : 'none';
  const floatClass = blockFloat === 'left' ? 'float-left'
    : blockFloat === 'right' ? 'float-right'
    : '';

  const wrapper = el('div', {
    class: `canvas-block type-${block.type.toLowerCase()} ${isSelected ? 'is-editing' : ''} ${!block.visibleToPlayers ? 'gm-only-block' : ''} ${floatClass}`.trim(),
    'data-block-id': block.blockId,
    ...(!block.visibleToPlayers ? { title: 'GM only — hidden in Player view' } : {})
  });

  if (blockFloat !== 'none') {
    wrapper.style.width = `${block.data.size || 40}%`;
  }

  if (role === 'gm' && isContentEditMode) {
    wrapper.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('.multiselect-container')) {
        e.stopPropagation();
        return;
      }
      selectBlock(ownerId, block.blockId, ownerType);
    });
  }

  // Drag handle — always visible for GM (subtle in view mode, clearer in edit mode).
  // Rendered unconditionally so blocks always have a reorder affordance.
  if (role === 'gm') {
    const dragHandle = el('div', {
      class: 'block-drag-handle',
      title: 'Drag to Rearrange',
      innerHTML: await getIconHTML('dots-three-outline', 'var(--text)')
    });

    const controlsChildren = [dragHandle];

    // Visibility toggle + delete button only appear in Edit Mode.
    if (isContentEditMode) {
      const visibilityIcon = block.visibleToPlayers ? 'eye' : 'eye-closed';
      const visibilityChip = el('button', {
        class: `chip visibility-toggle ${block.visibleToPlayers ? 'player' : 'gm'}`,
        title: block.visibleToPlayers ? 'Visible to Players' : 'GM Only',
        style: 'display:inline-flex;align-items:center;gap:4px;',
      }, [
        el('div', { style: `display:inline-block;width:11px;height:11px;flex-shrink:0;background-color:currentColor;-webkit-mask-image:url('./ui-icons/${visibilityIcon}.svg');mask-image:url('./ui-icons/${visibilityIcon}.svg');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;` }),
        el('span', { text: block.visibleToPlayers ? 'Player' : 'GM' })
      ]);
      visibilityChip.addEventListener('click', (e) => {
        e.stopPropagation();
        recordState();
        block.visibleToPlayers = !block.visibleToPlayers;
        markEntityDirty(ownerType, ownerId);
        showInfoPanel(ownerId, ownerType);
        debouncedSave();
      });

      const deleteBtn = el('button', {
        class: 'delete-block-btn',
        title: 'Delete Block',
        onclick: (e) => {
          e.stopPropagation();
          deleteBlock(ownerId, block.blockId, ownerType);
        }
      }, [
        el('div', { class: 'icon-container', style: '-webkit-mask-image: url("ui-icons/x-circle.svg"); mask-image: url("ui-icons/x-circle.svg");' })
      ]);

      controlsChildren.push(visibilityChip, deleteBtn);
    }

    const controlsWrapper = el('div', { class: 'block-controls' }, controlsChildren);
    wrapper.appendChild(controlsWrapper);
  }

  // The inline editor view is only shown if the block is selected AND we are in Edit Mode.
  if (isSelected && isContentEditMode) {
    switch (block.type) {
      case 'TextField':
        const labelInput = el('input', {
          id: `${block.blockId}-label`, name: `${block.blockId}-label`, type: 'text',
          class: 'inline-editor label-input', placeholder: 'Optional: Section Label...',
          value: block.data.label || '', onfocus: () => recordState(),
          onchange: (e) => updateBlockData(ownerId, block.blockId, { label: e.target.value })
        });
        labelInput.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showGeneratorMenu(e, labelInput);
        });
        const labelWrapper = el('div', { class: 'generatable-input' }, [
          labelInput,
          el('div', { class: 'generator-icon', innerHTML: await getIconHTML('dice-six') })
        ]);

        const snippetBar = el('div', { class: 'markdown-snippet-bar' });
        const snippets = [
          { label: 'Table', icon: 'ui-icons/table.svg', template: '\n| Stat | Value |\n| :--- | :--- |\n| STR | 10 |\n| DEX | 10 |\n' },
          { label: 'Note', icon: 'ui-icons/note.svg', template: '\n> [!NOTE] Title\n> Body text goes here.\n' },
          { label: 'Flavor Text', icon: 'ui-icons/quotes.svg', template: '\n> [!QUOTE]\n> Enter your beautiful flavor text here...\n> \n> {{attribution\n> — Name\n> }}\n' },
          { label: 'Warning', icon: 'ui-icons/warning-circle.svg', template: '\n> [!WARNING] Title\n> Important warning text.\n' },
          { label: 'Loot Table', icon: 'ui-icons/dice-six.svg', template: '\n| Roll {{1d100}} | Item |\n| :--- | :--- |\n| 1-50 | Common Sword |\n| 51-90 | Rare Amulet |\n| 91-100 | Legendary Relic |\n' },
          { label: 'Collapsible', icon: 'ui-icons/chat-centered-text.svg', template: '\n> [!INFO]- Collapsible Title\n> This content is hidden by default.\n' },
          { label: 'Highlight', icon: 'ui-icons/paint-brush-household.svg', template: '==highlighted text==' },
          { label: 'Monster', icon: 'ui-icons/skull.svg', template: '\n> [!MONSTER] Monster Name\n> | AC | HP | Spd |\n> | :--- | :--- | :--- |\n> | 15 | 45 | 30ft |\n' },
          { label: 'Colored Block', icon: 'ui-icons/paint-brush-household.svg', template: '\n{{callout-monster, --monster-color:teal, --monster-bg:white\n### Teal Dragon\nThis monster block uses custom colors via CSS variables!\n}}\n' },
          { label: 'Custom Block', icon: 'ui-icons/code-block.svg', template: '\n{{purple, #book, text-align:center, background:#aa88aa55\nMy favorite book is Wheel of Time.\n}}\n' }
        ];

        for (const s of snippets) {
          const btn = el('button', {
            type: 'button',
            class: 'snippet-btn ghost',
            title: `Insert ${s.label} template`,
            onclick: () => {
              recordState();
              const currentVal = contentInput.value;
              const start = contentInput.selectionStart;
              const end = contentInput.selectionEnd;
              const newVal = currentVal.substring(0, start) + s.template + currentVal.substring(end);
              contentInput.value = newVal;
              updateBlockData(ownerId, block.blockId, { content: newVal });
              contentInput.focus();
              contentInput.setSelectionRange(start + s.template.length, start + s.template.length);
            }
          }, [
            el('div', { class: 'icon-container', style: `-webkit-mask-image: url("${s.icon}"); mask-image: url("${s.icon}");` })
          ]);
          snippetBar.appendChild(btn);
        }

        const contentInput = el('textarea', {
          id: `${block.blockId}-content`, name: `${block.blockId}-content`,
          class: 'inline-editor', placeholder: 'Enter your text content (Markdown supported)...',
          text: block.data.content || '', onfocus: () => recordState(),
          onchange: (e) => updateBlockData(ownerId, block.blockId, { content: e.target.value })
        });
        contentInput.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showGeneratorMenu(e, contentInput);
        });
        contentInput.addEventListener('keydown', (e) => {
          // Palette open — route all keys to palette navigation
          if (_slashPalette) {
            const q = _slashQuery.toLowerCase();
            const filtered = SLASH_COMMANDS.filter(c =>
              c.label.toLowerCase().startsWith(q) ||
              c.type.toLowerCase().startsWith(q) ||
              c.desc.toLowerCase().includes(q)
            );
            switch (e.key) {
              case 'ArrowDown':
                e.preventDefault();
                _slashSelectedIdx = (_slashSelectedIdx + 1) % Math.max(filtered.length, 1);
                _renderSlashPalette(); return;
              case 'ArrowUp':
                e.preventDefault();
                _slashSelectedIdx = (_slashSelectedIdx - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1);
                _renderSlashPalette(); return;
              case 'Enter':
                e.preventDefault();
                if (filtered[_slashSelectedIdx]) _insertSlashBlock(filtered[_slashSelectedIdx].type);
                return;
              case 'Escape':
                e.stopPropagation();
                _closeSlashPalette(); return;
              case 'Backspace':
                e.preventDefault();
                if (_slashQuery.length === 0) _closeSlashPalette();
                else { _slashQuery = _slashQuery.slice(0, -1); _renderSlashPalette(); }
                return;
              default:
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault();
                  _slashQuery += e.key;
                  _renderSlashPalette();
                }
                return;
            }
          }
          // --- Block traversal: ArrowUp at first line → select previous block ---
          if (e.key === 'ArrowUp' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            const pos = contentInput.selectionStart;
            const val = contentInput.value;
            if (val.lastIndexOf('\n', pos - 1) < 0) { // cursor is on first line
              const blockIdx = ownerItem.blocks.findIndex(b => b.blockId === block.blockId);
              if (blockIdx > 0) {
                e.preventDefault();
                _blockTraversalFocusEnd = true;
                selectBlock(ownerId, ownerItem.blocks[blockIdx - 1].blockId, ownerType);
                return;
              }
            }
          }

          // --- Block traversal: ArrowDown at last line → select next block ---
          if (e.key === 'ArrowDown' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            const pos = contentInput.selectionEnd;
            const val = contentInput.value;
            if (val.indexOf('\n', pos) < 0) { // cursor is on last line
              const blockIdx = ownerItem.blocks.findIndex(b => b.blockId === block.blockId);
              if (blockIdx < ownerItem.blocks.length - 1) {
                e.preventDefault();
                selectBlock(ownerId, ownerItem.blocks[blockIdx + 1].blockId, ownerType);
                return;
              }
            }
          }

          // --- Backspace at position 0: merge into previous TextField ---
          if (e.key === 'Backspace' && contentInput.selectionStart === 0 && contentInput.selectionEnd === 0) {
            const blockIdx = ownerItem.blocks.findIndex(b => b.blockId === block.blockId);
            if (blockIdx > 0 && ownerItem.blocks[blockIdx - 1].type === 'TextField') {
              e.preventDefault();
              const prevBlock = ownerItem.blocks[blockIdx - 1];
              recordState();
              const prevLen = (prevBlock.data.content || '').length;
              prevBlock.data.content = (prevBlock.data.content || '') + contentInput.value;
              ownerItem.blocks.splice(blockIdx, 1);
              markEntityDirty(ownerType, ownerId);
              _blockMergePoint = prevLen;
              selectedBlockId = prevBlock.blockId;
              showInfoPanel(ownerId, ownerType);
              debouncedSave();
              return;
            }
          }

          // --- Ctrl/Cmd+Enter: split block at cursor ---
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            const pos = contentInput.selectionStart;
            const val = contentInput.value;
            const head = val.substring(0, pos);
            const tail = val.substring(pos).replace(/^\n/, '');
            recordState();
            block.data.content = head;
            const newBlock = {
              blockId: 'blk-' + uid(),
              type: 'TextField',
              visibleToPlayers: block.visibleToPlayers,
              data: { content: tail, label: '' }
            };
            const blockIdx = ownerItem.blocks.findIndex(b => b.blockId === block.blockId);
            ownerItem.blocks.splice(blockIdx + 1, 0, newBlock);
            markEntityDirty(ownerType, ownerId);
            selectedBlockId = newBlock.blockId;
            showInfoPanel(ownerId, ownerType);
            debouncedSave();
            return;
          }

          // Open slash palette: '/' at line start or in empty textarea
          if (e.key === '/') {
            const pos = contentInput.selectionStart;
            const val = contentInput.value;
            if (pos === 0 || val[pos - 1] === '\n' || val.trim() === '') {
              e.preventDefault();
              _openSlashPalette(contentInput, ownerId, ownerType);
              return;
            }
          }
          // Enter on empty textarea → new text block
          if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            if (contentInput.value.trim() === '') {
              e.preventDefault();
              addBlock(ownerId, ownerType, 'TextField');
            }
          }
        });
        const contentWrapper = el('div', { class: 'generatable-input' }, [
          contentInput,
          el('div', { class: 'generator-icon', innerHTML: await getIconHTML('dice-six') })
        ]);

        contentInput.addEventListener('input', () => _autoExpand(contentInput));

        wrapper.append(labelWrapper, snippetBar, contentWrapper);
        setTimeout(() => {
          _autoExpand(contentInput);
          contentInput.focus();
          if (_blockTraversalFocusEnd) {
            _blockTraversalFocusEnd = false;
            const len = contentInput.value.length;
            contentInput.setSelectionRange(len, len);
          } else if (_blockMergePoint >= 0) {
            contentInput.setSelectionRange(_blockMergePoint, _blockMergePoint);
            _blockMergePoint = -1;
          }
        }, 0);
        break;
      case 'Image':
        const previewContainer = el('div', { class: 'block-image-preview' });
        renderBlockViewMode(block).then(html => { if (previewContainer.parentNode) previewContainer.innerHTML = html; });
        const uploadBtn = el('button', {
          class: 'ghost', style: 'flex: 1;', text: 'Upload',
          title: 'Upload an image from your device',
          onclick: () => {
            window.targetBlockForUpload = block.blockId;
            $('#imageBlockUploadFile').click();
          }
        });
        const searchBtn = el('button', {
          class: 'ghost', style: 'flex: 1;', text: 'Search',
          title: 'Search free image libraries (Wikimedia Commons)',
          onclick: () => {
            if (typeof window.openImageSearchModal !== 'function') {
              if (typeof showAlertModal === 'function') showAlertModal('Image Search Unavailable', 'The image search module did not load.');
              return;
            }
            window.openImageSearchModal({
              title: 'Search Images',
              onPick: async (blob, meta) => {
                const processed = await processImageUpload(blob);
                const imageKey = 'img-' + uid();
                await idbSet(imageKey, processed);
                state.assetNames = state.assetNames || {};
                state.assetNames[imageKey] = meta.title || 'Untitled';
                state.assetMeta = state.assetMeta || {};
                state.assetMeta[imageKey] = meta;
                markEntityDirty('meta');
                updateBlockData(ownerId, block.blockId, { src: imageKey, caption: block.data.caption || (meta.author ? `${meta.title} — ${meta.author} (${meta.licenseLabel})` : '') });
                if (typeof refreshAssetsView === 'function') refreshAssetsView(true);
                if (typeof showToast === 'function') showToast(`Inserted “${meta.title}”.`);
              },
            });
          }
        });
        const imageBtnRow = el('div', { style: 'display: flex; gap: 0.4rem;' }, [uploadBtn, searchBtn]);
        const srcInput = el('input', {
          id: `${block.blockId}-src`, name: `${block.blockId}-src`,
          type: 'text', class: 'inline-editor', placeholder: 'Image key or URL...',
          value: block.data.src || '', onfocus: () => recordState(),
          onchange: (e) => updateBlockData(ownerId, block.blockId, { src: e.target.value })
        });
        const captionInput = el('input', {
          id: `${block.blockId}-caption`, name: `${block.blockId}-caption`,
          type: 'text', class: 'inline-editor', placeholder: 'Optional caption...',
          value: block.data.caption || '', onfocus: () => recordState(),
          onchange: (e) => updateBlockData(ownerId, block.blockId, { caption: e.target.value })
        });
        const currentFloat = block.data.float || 'none';
        const floatGroup = el('div', { class: 'float-position-group' });
        [
          { value: 'left',  label: '← Float Left' },
          { value: 'none',  label: 'Inline' },
          { value: 'right', label: 'Float Right →' }
        ].forEach(opt => {
          const btn = el('button', {
            type: 'button',
            class: opt.value === currentFloat ? 'is-active' : '',
            text: opt.label,
            onclick: () => {
              recordState();
              const updates = { float: opt.value };
              if (opt.value !== 'none' && (block.data.size || 100) >= 80) {
                updates.size = 40;
              }
              updateBlockData(ownerId, block.blockId, updates);
            }
          });
          floatGroup.appendChild(btn);
        });
        const sizeLabel = el('label', { class: 'inline-editor', style: 'display: flex; align-items: center; gap: .5rem;' });
        const sizeDisplaySpan = el('span', { text: `${block.data.size || 100}%` });
        const sizeInput = el('input', {
          type: 'range', min: 20, max: 100, step: 5,
          value: block.data.size || 100, onfocus: () => recordState(),
          oninput: (e) => { sizeDisplaySpan.textContent = `${e.target.value}%`; },
          onchange: (e) => { updateBlockData(ownerId, block.blockId, { size: parseInt(e.target.value, 10) }); }
        });
        const sliderLabelText = currentFloat !== 'none' ? 'Width: ' : 'Size: ';
        sizeLabel.append(sliderLabelText, sizeInput, sizeDisplaySpan);
        wrapper.append(previewContainer, imageBtnRow, srcInput, captionInput, floatGroup, sizeLabel);
        break;
      case 'YouTube':
        const youtubeInput = el('input', {
          id: `${block.blockId}-url`, name: `${block.blockId}-url`,
          type: 'url', class: 'inline-editor', placeholder: 'YouTube URL...',
          value: block.data.url || '', onfocus: () => recordState(),
          onchange: (e) => { updateBlockData(ownerId, block.blockId, { url: e.target.value }); }
        });
        wrapper.appendChild(youtubeInput);
        break;
      case 'Spotify':
        const spotifyInput = el('input', {
          id: `${block.blockId}-url`, name: `${block.blockId}-url`,
          type: 'url', class: 'inline-editor', placeholder: 'Spotify URL...',
          value: block.data.url || '', onfocus: () => recordState(),
          onchange: (e) => { updateBlockData(ownerId, block.blockId, { url: e.target.value }); }
        });
        wrapper.appendChild(spotifyInput);
        break;
      case 'Tags':
        const tagsInput = el('input', {
          id: `${block.blockId}-tags`, name: `${block.blockId}-tags`,
          type: 'text', class: 'inline-editor', placeholder: 'Comma, separated, tags...',
          value: (block.data.tags || []).join(', '), onfocus: () => recordState(),
          onchange: (e) => {
            const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
            updateBlockData(ownerId, block.blockId, { tags: tags });
          }
        });
        wrapper.appendChild(tagsInput);
        break;
      case 'FeatureLink':
        const allFeatureOptions = state.features
          .filter(feat => feat.id !== ownerId)
          .map(feat => ({ value: feat.id, text: feat.title || '(untitled)' }));
        const linkEditor = createMultiSelect(
          allFeatureOptions,
          block.data.targetIds || [],
          (newValues) => {
            recordState();
            updateBlockData(ownerId, block.blockId, { targetIds: newValues });
          },
          'Link to a feature...'
        );
        wrapper.appendChild(linkEditor);
        break;
      case 'Timeline': {
        const editorWrapper = el('div', { class: 'timeline-editor' });

        (block.data.events || []).forEach((event, index) => {
          event.dateData = event.dateData || parseLegacyTimelineDate(event.date);
          event.endDateData = event.endDateData || parseLegacyTimelineDate(event.endDate);
          event.source = event.source || 'local';

          let titleWidget;
          if (event.source === 'linked') {
            const options = [
              { value: '', text: 'Pick Encyclopedia Event...' },
              ...state.encyclopedia.filter(e => e.type?.toLowerCase() === 'event').map(e => ({ value: e.id, text: e.name }))
            ];
            titleWidget = createSearchableSelect(options, event.linkedId, (val) => {
              recordState();
              event.linkedId = val;
              window.showInfoPanel(ownerId, ownerType);
              debouncedSave();
            }, 'Pick Encyclopedia Event...');
          } else {
            titleWidget = el('input', {
              type: 'text', placeholder: 'Event Title', value: event.title || '',
              oninput: (e) => window.updateTimelineEvent(block.blockId, index, { title: e.target.value })
            });
          }

          const sourceToggle = el('select', { class: 'timeline-source-toggle', title: 'Event Source' }, [
            el('option', { value: 'local', text: 'Local', selected: event.source === 'local' }),
            el('option', { value: 'linked', text: 'Linked', selected: event.source === 'linked' })
          ]);
          sourceToggle.onchange = (e) => {
            recordState();
            event.source = e.target.value;
            window.showInfoPanel(ownerId, ownerType);
            debouncedSave();
          };

          const headerRow = el('div', { class: 'timeline-editor-event-header' }, [titleWidget, sourceToggle]);

          const descTextarea = el('textarea', {
            placeholder: 'Description...', text: event.description || '',
            disabled: event.source === 'linked',
            oninput: (e) => window.updateTimelineEvent(block.blockId, index, { description: e.target.value })
          });

          const dateCol = el('div', { class: 'timeline-editor-event-date-col' });
          if (event.source === 'linked' && event.linkedId) {
            const src = state.encyclopedia.find(x => x.id === event.linkedId);
            const d = src?.eventData || {};
            const dateStr = `${d.day || ''} ${d.month || ''} ${d.year || ''} ${d.era || ''}`.trim() || 'No date set';
            dateCol.appendChild(el('div', { class: 'form-label', text: 'Event Date' }));
            dateCol.appendChild(el('div', { class: 'linked-date-display', text: dateStr }));
          } else {
            const startPicker = buildDatePicker(event.dateData, (key, val) => {
              const newData = { ...event.dateData, [key]: val };
              window.updateTimelineEvent(block.blockId, index, { dateData: newData });
            }, { label: 'Event Date' });
            dateCol.appendChild(startPicker);
          }

          const bodyRow = el('div', { class: 'timeline-editor-event-body' }, [descTextarea, dateCol]);

          const colorControls = el('div', { class: 'timeline-event-color-controls' }, [
            el('div', { class: 'timeline-event-color-picker-wrap' }, [
              el('span', { text: 'BG' }),
              el('input', {
                type: 'color', class: 'timeline-event-color-picker',
                value: event.color || '#ff7a1a',
                onfocus: () => recordState(),
                oninput: debounce((e) => window.updateTimelineEvent(block.blockId, index, { color: e.target.value }), 200)
              })
            ]),
            el('div', { class: 'timeline-event-color-picker-wrap' }, [
              el('span', { text: 'Text' }),
              el('input', {
                type: 'color', class: 'timeline-event-color-picker',
                value: event.textColor || (siteTheme === 'dark' ? '#e8e9eb' : '#3d352e'),
                onfocus: () => recordState(),
                oninput: debounce((e) => window.updateTimelineEvent(block.blockId, index, { textColor: e.target.value }), 200)
              })
            ])
          ]);

          const removeBtn = el('button', {
            class: 'remove-event-btn', title: 'Remove Event',
            onclick: () => window.removeTimelineEvent(block.blockId, index)
          }, [el('div', { class: 'icon-container', style: '-webkit-mask-image: url("ui-icons/minus.svg"); mask-image: url("ui-icons/minus.svg");' })]);

          const footerRow = el('div', { class: 'timeline-editor-event-footer' }, [colorControls, removeBtn]);

          const eventCard = el('div', { class: 'timeline-editor-event' }, [headerRow, bodyRow, footerRow]);
          editorWrapper.appendChild(eventCard);
        });

        const addBtn = el('button', {
          class: 'ghost full-width', style: 'margin-top: .5rem;', text: '+ Add Event',
          onclick: () => window.addTimelineEvent(block.blockId)
        });
        editorWrapper.appendChild(addBtn);
        wrapper.appendChild(editorWrapper);
        break;
      }
      case 'Relationships':
        const relEditor = el('div', { class: 'relationship-editor' });
        const allOptions = [...state.features, ...state.encyclopedia]
          .filter(item => item.id !== ownerId)
          .map(item => ({ value: item.id, text: item.title || item.name || '(untitled)' }));

        (block.data.links || []).forEach((link, idx) => {
          const row = el('div', { class: 'relationship-editor-row' });
          
          const targetSelect = createSearchableSelect(allOptions, link.targetId, (newVal) => {
            recordState();
            link.targetId = newVal;
            debouncedSave();
            showInfoPanel(ownerId, ownerType);
          }, 'Select Target...');

          const typeInput = el('input', {
            type: 'text', placeholder: 'Type (e.g. Ally)', value: link.type || '',
            onchange: (e) => { recordState(); link.type = e.target.value; debouncedSave(); }
          });

          const removeBtn = el('button', {
            class: 'remove-event-btn', title: 'Remove Relationship',
            onclick: () => {
              recordState();
              block.data.links.splice(idx, 1);
              showToast('Relationship removed.', () => undo());
              debouncedSave();
              showInfoPanel(ownerId, ownerType);
            }
          }, [
            el('div', { class: 'icon-container', style: '-webkit-mask-image: url("ui-icons/minus.svg"); mask-image: url("ui-icons/minus.svg");' })
          ]);

          row.append(targetSelect, typeInput, removeBtn);
          relEditor.appendChild(row);
        });

        const addRelBtn = el('button', {
          class: 'ghost full-width', text: '+ Add Relationship',
          onclick: () => {
            recordState();
            block.data.links = block.data.links || [];
            block.data.links.push({ targetId: null, type: '', isBidirectional: false });
            debouncedSave();
            showInfoPanel(ownerId, ownerType);
          }
        });
        relEditor.appendChild(addRelBtn);
        wrapper.appendChild(relEditor);
        break;
      case 'Meter': {
        const meterLabelInput = el('input', {
          type: 'text', class: 'inline-editor label-input',
          placeholder: 'Label (e.g. Hit Points)...',
          value: block.data.label || '',
          onfocus: () => recordState(),
          onchange: (e) => updateBlockData(ownerId, block.blockId, { label: e.target.value })
        });
        const meterRow = el('div', { class: 'meter-inputs-row' });
        const currentInput = el('input', {
          type: 'number', class: 'inline-editor meter-num-input',
          placeholder: 'Current', min: '0',
          value: String(block.data.current ?? 0),
          onfocus: () => recordState(),
          onchange: (e) => updateBlockData(ownerId, block.blockId, { current: Number(e.target.value) || 0 })
        });
        const maxInput = el('input', {
          type: 'number', class: 'inline-editor meter-num-input',
          placeholder: 'Max', min: '1',
          value: String(block.data.max ?? 10),
          onfocus: () => recordState(),
          onchange: (e) => updateBlockData(ownerId, block.blockId, { max: Math.max(1, Number(e.target.value) || 1) })
        });
        meterRow.append(currentInput, el('span', { class: 'meter-sep', text: '/' }), maxInput);
        wrapper.append(meterLabelInput, meterRow);
        break;
      }
      case 'MapEmbed': {
        const mapOptions = state.maps.map(m => ({ value: m.id, text: m.name }));
        const currentMapId = block.data.mapId || state.activeMapId;
        const mapSelect = createSearchableSelect(
          mapOptions, currentMapId,
          (val) => updateBlockData(ownerId, block.blockId, { mapId: val }),
          'Select map…'
        );

        const heightVal = block.data.height || 280;
        const heightLabel = el('span', { text: `${heightVal}px`, class: 'muted', style: 'min-width: 3rem' });
        const heightInput = el('input', {
          type: 'range', min: '160', max: '600', step: '20',
          value: String(heightVal), class: 'inline-editor',
          oninput:  (e) => { heightLabel.textContent = `${e.target.value}px`; },
          onchange: (e) => updateBlockData(ownerId, block.blockId, { height: Number(e.target.value) })
        });

        const captionInput = el('input', {
          type: 'text', class: 'inline-editor',
          placeholder: 'Caption (optional)…',
          value: block.data.caption || '',
          onfocus: () => recordState(),
          onchange: (e) => updateBlockData(ownerId, block.blockId, { caption: e.target.value })
        });

        wrapper.append(
          el('div', { class: 'block-embed-field' }, [
            el('label', { class: 'form-label', text: 'Map' }),
            mapSelect
          ]),
          el('div', { class: 'block-embed-field' }, [
            el('label', { class: 'form-label', text: 'Height' }),
            el('div', { class: 'block-embed-range-row' }, [heightInput, heightLabel])
          ]),
          el('div', { class: 'block-embed-field' }, [
            el('label', { class: 'form-label', text: 'Caption' }),
            captionInput
          ])
        );
        break;
      }
    }
  } else {
    // This is the default "View Mode"
    wrapper.innerHTML = await renderBlockViewMode(block);

    // Click-to-play for YouTube thumbnails (view mode only — edit mode is handled by block selection)
    const ytThumb = wrapper.querySelector('.video-thumbnail-preview[data-yt-id]');
    if (ytThumb && ytThumb.dataset.ytEditable === '0') {
      ytThumb.style.cursor = 'pointer';
      ytThumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const safeId = ytThumb.dataset.ytId;
        const embedDiv = document.createElement('div');
        embedDiv.className = 'video-embed-wrapper';
        embedDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${safeId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        ytThumb.replaceWith(embedDiv);
      });
    }

    // Wire up interactive elements rendered by the Marked extensions.
    // Using data-* attributes avoids injecting executable code into HTML strings.
    wrapper.querySelectorAll('.dice-roll-link[data-notation]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.rollDice(btn.dataset.notation);
      });
    });
    // Initialize embedded Leaflet maps (async — loading state shows until resolved)
    wrapper.querySelectorAll('.map-embed-container[data-embed-block-id]').forEach(c => {
      _initMapEmbedLeaflet(c);
    });

    // Wiki-link navigation: resolve by name at click time so links never
    // go stale after renames or deletions (no ID is stored in the HTML).
    wrapper.querySelectorAll('.wiki-link[data-wiki-name]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const name = link.dataset.wikiName;
        const lowerName = name.toLowerCase();
        const entry = state.encyclopedia.find(en => en.name.toLowerCase() === lowerName);
        if (entry) { window.navigateToEncyclopediaEntry(entry.id); return; }
        const feature = state.features.find(f => (f.title || f.name || '').toLowerCase() === lowerName);
        if (feature) { window.navigateToFeature(feature.id); return; }
        window.showAlertModal('Not Found', `No entry or feature named "${escapeHtml(name)}" was found.`);
      });
    });
  }
  return wrapper;
}

function deleteBlock(ownerId, blockId, ownerType = 'feature') {
  recordState();
  const item = state.features.find(f => f.id === ownerId) || 
               state.encyclopedia.find(e => e.id === ownerId) ||
               state.maps.find(m => m.id === ownerId);
  if (!item) return;

  const blockIndex = item.blocks.findIndex(b => b.blockId === blockId);
  if (blockIndex === -1) return;
  const blockType = item.blocks[blockIndex].type || 'block';
  item.blocks.splice(blockIndex, 1);
  showToast(`${blockType.charAt(0).toUpperCase() + blockType.slice(1)} block removed.`, () => undo());

  selectedBlockId = null;
  markEntityDirty(ownerType, ownerId);
  showInfoPanel(ownerId, ownerType);
  debouncedSave();
}

async function _initMapEmbedLeaflet(container) {
  const blockId = container.dataset.embedBlockId;
  const rawMapId = container.dataset.embedMapId;
  const rawZoom = container.dataset.embedZoom;
  const rawLat  = container.dataset.embedLat;
  const rawLng  = container.dataset.embedLng;

  const zoom = rawZoom && rawZoom !== 'null' ? Number(rawZoom) : null;
  const lat  = rawLat  && rawLat  !== 'null' ? Number(rawLat)  : null;
  const lng  = rawLng  && rawLng  !== 'null' ? Number(rawLng)  : null;

  if (_embedMapInstances.has(blockId)) {
    try { _embedMapInstances.get(blockId).remove(); } catch (_) {}
    _embedMapInstances.delete(blockId);
  }

  const mapDef = state.maps.find(m => m.id === rawMapId)
    || state.maps.find(m => m.id === state.activeMapId)
    || state.maps[0];
  if (!mapDef) {
    container.innerHTML = '<p class="map-embed-empty">No map found.</p>';
    return;
  }

  const w = mapDef.width  || 2000;
  const h = mapDef.height || 1200;
  const bounds = [[0, 0], [h, w]];

  container.innerHTML = '';

  const embedMap = L.map(container, {
    crs: L.CRS.Simple,
    zoomControl: false,
    attributionControl: false,
    dragging: true,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: true,
    keyboard: false
  });

  if (mapDef.imageKey) {
    const imageUrl = await resolveImageUrl(mapDef.imageKey);
    if (imageUrl) L.imageOverlay(imageUrl, bounds).addTo(embedMap);
  }

  if (lat !== null && lng !== null && zoom !== null) {
    embedMap.setView([lat, lng], zoom);
  } else {
    embedMap.fitBounds(bounds, { animate: false });
  }

  state.articles
    .filter(a => a.mapId === mapDef.id && a.geometry === 'point' && a.lat != null && a.lng != null)
    .forEach(pin => {
      const color = pin.pinColor || pin.color || '#ff7f50';
      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: 5, color, fillColor: color, fillOpacity: 0.85, weight: 1.5
      }).addTo(embedMap);
      marker.bindTooltip(escapeHtml(pin.title || pin.name || '(untitled)'), {
        direction: 'top', offset: [0, -8], className: 'map-embed-tooltip'
      });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        window.navigateAndPeek(pin.id);
      });
    });

  _embedMapInstances.set(blockId, embedMap);
}

async function renderBlockViewMode(block) {
  let innerHTML = '';
  switch (block.type) {
    case 'TextField':
      let labelHTML = '';
      if (block.data.label) {
        labelHTML = `<h4 class="text-block-label">${escapeHtml(block.data.label)}</h4>`;
      }
      const rawMd = block.data.content
        ? marked.parse(block.data.content)
        : '<p class="muted">Empty text field.</p>';
      
      const contentHTML = DOMPurify.sanitize(rawMd, PURIFY_CONFIG);
      innerHTML = labelHTML + contentHTML;
      break;
    case 'Image': {
      const imageUrl = await resolveImageUrl(block.data.src);
      if (imageUrl) {
        const size = block.data.size || 100;
        const floatVal = block.data.float || 'none';
        const figureStyle = floatVal !== 'none'
          ? 'display: block; max-width: 100%; margin: 0;'
          : `display: block; max-width: ${size}%; ${size < 100 ? 'margin: 1rem auto;' : 'margin: 1rem 0;'}`;
        const figure = el('figure', { style: figureStyle });
        const img = el('img', { src: imageUrl, alt: block.data.caption || 'Canvas image', style: 'width: 100%; height: auto; display: block; border-radius: 8px; cursor: zoom-in;', 'data-lightbox': imageUrl });
        figure.appendChild(img);
        if (block.data.caption) {
          figure.appendChild(el('figcaption', { text: block.data.caption }));
        }
        innerHTML = figure.outerHTML;
      } else {
        innerHTML = `
          <div class="block-error-placeholder">
            <div class="icon-container" style="background-color: var(--danger);">${await getIconHTML('warning-circle')}</div>
            <span>Image not found.</span>
          </div>
        `;
      }
      break;
    }
    case 'YouTube': {
      const videoId = getYoutubeVideoId(block.data.url);
      if (videoId) {
        const safeId = encodeURIComponent(videoId);
        const watchUrl = `https://www.youtube.com/watch?v=${safeId}`;
        const embeddable = block.data._ytEmbeddable; // true = yes, false = no, undefined = checking
        if (isContentEditMode) {
          // Edit mode: always show thumbnail (iframe swallows clicks)
          innerHTML = `
            <div class="video-thumbnail-preview" data-yt-id="${safeId}" data-yt-editable="1">
              <img src="https://img.youtube.com/vi/${safeId}/hqdefault.jpg" alt="YouTube thumbnail" loading="lazy">
              <div class="video-thumbnail-overlay">YouTube · click block to edit URL</div>
            </div>
          `;
        } else if (embeddable === false) {
          // Not embeddable — just show a link
          innerHTML = `
            <a class="video-unavailable-link" href="${watchUrl}" target="_blank" rel="noopener noreferrer">
              <div class="video-thumbnail-preview" style="pointer-events:none;">
                <img src="https://img.youtube.com/vi/${safeId}/hqdefault.jpg" alt="YouTube thumbnail" loading="lazy">
                <div class="video-thumbnail-overlay">Embedding disabled · Watch on YouTube ↗</div>
              </div>
            </a>
          `;
        } else {
          // Embeddable (or still checking) — show thumbnail with click-to-play
          const label = embeddable === true ? '▶ Click to play' : '▶ Click to play (checking…)';
          innerHTML = `
            <div class="video-thumbnail-preview" data-yt-id="${safeId}" data-yt-editable="0">
              <img src="https://img.youtube.com/vi/${safeId}/hqdefault.jpg" alt="YouTube thumbnail" loading="lazy">
              <div class="video-thumbnail-overlay">${label}</div>
            </div>
            <a class="video-watch-link" href="${watchUrl}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>
          `;
        }
      } else {
        innerHTML = `
          <div class="block-error-placeholder">
            <span>Invalid YouTube URL.</span>
          </div>
        `;
      }
      break;
    }
    case 'Spotify':
      const spotifyData = parseSpotifyUrl(block.data.url);
      if (spotifyData) {
        innerHTML = `
          <div class="spotify-embed-wrapper">
            <iframe src="${escapeHtml(spotifyData.url)}" height="${parseInt(spotifyData.height, 10) || 152}" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
          </div>
        `;
      } else {
        innerHTML = `
          <div class="block-error-placeholder">
            <span>Invalid Spotify URL.</span>
          </div>
        `;
      }
      break;
    case 'Tags':
      if (block.data.tags && block.data.tags.length > 0) {
        innerHTML = block.data.tags.map(tagText => `<span class="tag">${escapeHtml(tagText)}</span>`).join('');
      } else {
        innerHTML = '<p class="muted">No tags yet.</p>';
      }
      break;
    case 'FeatureLink':
      const targetIds = block.data.targetIds || [];
      if (targetIds.length > 0) {
        // Create a collapsible details element
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
            link.onclick = (e) => {
              e.preventDefault(); // Prevents page reload
              navigateToFeature(targetFeature.id);
            };
            linkList.appendChild(el('li', {}, [link]));
          }
        }
        details.append(summary, linkList);
        innerHTML = details.outerHTML;
      } else {
        innerHTML = '<p class="muted">No features linked.</p>';
      }
      break;
    case 'Timeline': {
      const events = (block.data.events || [])
        .map(e => {
          // Migration: if no dateData but has string date, parse it
          if (!e.dateData && e.date) e.dateData = parseLegacyTimelineDate(e.date);
          
          // If linked, fetch current data from encyclopedia
          if (e.source === 'linked' && e.linkedId) {
            const sourceEvent = state.encyclopedia.find(x => x.id === e.linkedId);
            if (sourceEvent) {
              return { 
                ...e, 
                title: sourceEvent.name, 
                dateData: sourceEvent.eventData,
                sortableDate: parseSortableDate(sourceEvent.eventData)
              };
            }
          }
          
          return { ...e, sortableDate: parseSortableDate(e.dateData) };
        })
        .filter(e => e.title)
        .sort((a, b) => (a.sortableDate || 0) - (b.sortableDate || 0));

      if (events.length > 0) {
        const timelineWrapper = el('div', { class: 'timeline-block' });
        for (const event of events) {
          const d = event.dateData || {};
          const dateStr = `${d.day || ''} ${d.month || ''} ${d.year || ''} ${d.era || ''}`.trim();
          
          const eventNode = el('div', { class: 'timeline-event' }, [
            el('div', { class: 'timeline-date', text: dateStr }),
            el('div', { class: 'timeline-content' }, [
              el('h4', { text: event.title }),
              el('div', { innerHTML: DOMPurify.sanitize(marked.parse(event.description || ''), PURIFY_CONFIG) })
            ])
          ]);
          timelineWrapper.appendChild(eventNode);
        }
        innerHTML = timelineWrapper.outerHTML;
      } else {
        innerHTML = '<p class="muted">No events in this timeline yet.</p>';
      }
      break;
    }
    case 'Meter': {
      const cur = Number(block.data.current ?? 0);
      const max = Math.max(1, Number(block.data.max ?? 10));
      const pct = Math.max(0, Math.min(100, Math.round((cur / max) * 100)));
      const mLabel = block.data.label ? `<div class="meter-label">${escapeHtml(block.data.label)}</div>` : '';
      innerHTML = `
        <div class="meter-block">
          ${mLabel}
          <div class="meter-bar-track"><div class="meter-bar-fill" style="width:${pct}%"></div></div>
          <div class="meter-values">${cur} / ${max}</div>
        </div>
      `;
      break;
    }
    case 'Relationships':
      const links = (block.data.links || []).filter(l => l.targetId);
      if (links.length > 0) {
        const list = el('div', { class: 'relationship-list' });
        for (const link of links) {
          const target = state.features.find(f => f.id === link.targetId) || state.encyclopedia.find(e => e.id === link.targetId);
          if (target) {
            const chip = el('button', {
              class: 'chip relationship-chip',
              onclick: (e) => {
                e.preventDefault();
                const targetType = state.features.some(f => f.id === link.targetId) ? 'feature' : 'encyclopedia';
                if (targetType === 'feature') navigateToFeature(target.id);
                else navigateToEncyclopediaEntry(target.id);
              }
            }, [
              el('span', { class: 'rel-type', text: (link.type || 'Link') + ': ' }),
              el('span', { class: 'rel-target', text: target.title || target.name || '(untitled)' })
            ]);
            list.appendChild(chip);
          }
        }
        innerHTML = list.outerHTML;
      } else {
        innerHTML = '<p class="muted">No relationships defined.</p>';
      }
      break;
    case 'MapEmbed': {
      const embedMapId = block.data.mapId || state.activeMapId || '';
      const embedHeight = Math.max(160, Math.min(600, Number(block.data.height) || 280));
      const embedZoom = block.data.zoom ?? 'null';
      const embedLat  = block.data.lat  ?? 'null';
      const embedLng  = block.data.lng  ?? 'null';
      const embedCaption = block.data.caption || '';
      innerHTML = `
        <div class="map-embed-container"
             data-embed-block-id="${escapeHtml(block.blockId)}"
             data-embed-map-id="${escapeHtml(embedMapId)}"
             data-embed-zoom="${embedZoom}"
             data-embed-lat="${embedLat}"
             data-embed-lng="${embedLng}"
             style="height: ${embedHeight}px">
          <div class="map-embed-loading"><span>Loading map…</span></div>
        </div>
        ${embedCaption ? `<p class="map-embed-caption">${escapeHtml(embedCaption)}</p>` : ''}
      `;
      break;
    }
  }
  return innerHTML;
}

function findBacklinks(targetId) {
  const backlinks = [];
  for (const feature of state.features) {
    if (feature.id === targetId) continue;

    if (feature.blocks) {
      for (const block of feature.blocks) {
        if (!block) continue;

        if (block.type === 'FeatureLink' && Array.isArray(block.data.targetIds) && block.data.targetIds.includes(targetId)) {
          backlinks.push({
            id: feature.id,
            title: feature.title || '(untitled)',
            mapId: feature.mapId,
          });
          break; // Found a link in this feature, no need to check other blocks.
        }
      }
    }
  }
  return backlinks;
}

function updateCustomColor(index, newColor) {
  if (state.customColors[index]) {
    recordState();
    state.customColors[index] = newColor;
    debouncedSave();
  }
}

function removeCustomColor(index) {
  if (state.customColors[index]) {
    recordState();
    state.customColors.splice(index, 1);
    markEntityDirty('meta');
    showToast('Custom color removed.', () => undo());
    debouncedSave();
  }
}

function openColorPicker(feature, propertyName, onSelectCallback) {
  const modal = $('#colorPickerModal');
  const presetGrid = $('#presetColorGrid');
  const customGrid = $('#customColorGrid');
  const title = $('#colorPickerTitle');

  title.textContent = propertyName === 'iconColor' ? 'Choose Pin Color' : 'Choose Icon Color';
  presetGrid.innerHTML = '';
  customGrid.innerHTML = '';

  let currentTarget = { feature, property: propertyName };
  let currentColor = null;
  if (feature && propertyName) {
    currentColor = feature[propertyName];
  }


  const selectColor = onSelectCallback || ((hexColor) => {
    if (!feature || !propertyName) return;
    recordState();
    feature[propertyName] = hexColor;

    let type = 'feature';
    if (state.encyclopedia.some(e => e.id === feature.id)) type = 'encyclopedia';
    else if (state.maps.some(m => m.id === feature.id)) type = 'map';

    markEntityDirty(type, feature.id);
    render({ full: true });
    if (window.updateSingleFeatureUI) window.updateSingleFeatureUI(feature);
    debouncedSave();
    if (window.closeSideSheet) window.closeSideSheet(modal); else modal.classList.add('hidden');
  });


  const showColorContextMenu = (e, index) => {
    e.preventDefault();
    e.stopPropagation();

    const closeMenu = () => {
      const existingMenu = document.getElementById('colorContextMenu');
      if (existingMenu) existingMenu.remove();
      document.body.removeEventListener('click', closeMenu, { capture: true });
    };
    closeMenu(); // Close any existing menu first

    const changeItem = el('li', { text: 'Change Color...' });
    changeItem.onclick = () => {
      closeMenu();
      const colorInput = el('input', { type: 'color' });
      colorInput.oninput = () => {
        updateCustomColor(index, colorInput.value);
        openColorPicker(feature, propertyName); // Refresh the modal
      };
      colorInput.click();
    };

    const clearItem = el('li', { text: 'Clear Color' });
    clearItem.onclick = () => {
      closeMenu();
      removeCustomColor(index);
      openColorPicker(feature, propertyName); // Refresh the modal
    };

    const menu = el('div', { id: 'colorContextMenu' }, [
      el('ul', { class: 'is-dropdown-menu' }, [changeItem, clearItem])
    ]);
    menu.style.top = `${e.clientY}px`;
    menu.style.left = `${e.clientX}px`;
    document.body.appendChild(menu);

    setTimeout(() => {
      document.body.addEventListener('click', closeMenu, { once: true, capture: true });
    }, 0);
  };

  // Populate preset colors
  PRESET_COLORS.forEach(color => {
    const swatch = el('div', { class: 'color-swatch', style: `background-color: ${safeCssColor(color)}` });
    // The click handler now calls our flexible selectColor function
    swatch.onclick = () => {
      selectColor(color);
      if (window.closeSideSheet) window.closeSideSheet(modal); else modal.classList.add('hidden');
    };
    presetGrid.appendChild(swatch);
  });

  // Populate custom colors
  for (let i = 0; i < 8; i++) {
    if (i < state.customColors.length) {
      const color = state.customColors[i];
      const swatch = el('div', { class: 'color-swatch', style: `background-color: ${safeCssColor(color)}` });
      if (currentColor === color) swatch.classList.add('selected');
      swatch.onclick = () => selectColor(color);
      swatch.oncontextmenu = (e) => showColorContextMenu(e, i); // Add right-click listener
      customGrid.appendChild(swatch);
    } else {
      const addBtn = el('div', { class: 'color-swatch add-color-btn' });
      addBtn.onclick = () => {
        const colorInput = el('input', { type: 'color' });
        colorInput.onchange = () => {
          addCustomColor(colorInput.value);
          openColorPicker(feature, propertyName);
        };
        colorInput.click();
      };
      customGrid.appendChild(addBtn);
    }
  }

  if (window.openSideSheet) window.openSideSheet(modal); else modal.classList.remove('hidden');
}

window.openColorPicker = openColorPicker;
window.findBacklinks = findBacklinks;
window.deleteBlock = deleteBlock;