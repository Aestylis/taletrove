/**
 * user-chip.js — user identity chip, recent-projects list, app-shell scaling (WS7 #7,
 * extracted from worldbuilder.js initEventListeners, where these were column-0 closure locals).
 *
 * Owns: initUserChip (avatar chip render + role menu), setAppShellScaled (hub/fullscreen
 * shell scale, read by modals.js via window.setAppShellScaled), renderRecentProjects,
 * and the brand-logo click that opens the Settings hub.
 *
 * Classic script sharing global scope. initUserChipListeners() is called from
 * initEventListeners() (worldbuilder.js); initUserChip() is called from the
 * DOMContentLoaded boot handler.
 */

function initUserChip() {
  const AVATAR_COLORS = [
    '#ff7a1a', '#e74c3c', '#e91e8c', '#9b59b6',
    '#3498db', '#1abc9c', '#2ecc71', '#f1c40f',
    '#16a085', '#8e44ad', '#c0392b', '#27ae60',
    '#2980b9', '#d35400', '#7f8c8d', '#34495e'
  ];

  if (!settings.userProfile) {
    settings.userProfile = { name: '', color: '#ff7a1a' };
  }

  const chip          = $('#userChip');
  const avatar        = $('#userAvatar');
  const avatarPreview = $('#userAvatarPreview');
  const popover       = $('#userChipPopover');
  const nameInput     = $('#userNameInput');
  const swatches      = $('#userColorSwatches');

  if (!chip) return;

  const updateChip = () => {
    const { name, color } = settings.userProfile;
    const display = name.trim() || 'Guest';
    const initial = display.charAt(0).toUpperCase();
    const safeColor = safeCssColor(color);
    avatar.textContent = initial;
    avatar.style.backgroundColor = safeColor;
    if (avatarPreview) {
      avatarPreview.textContent = initial;
      avatarPreview.style.backgroundColor = safeColor;
    }
    nameInput.value = name;
    swatches.querySelectorAll('.user-color-swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === color);
    });
  };

  AVATAR_COLORS.forEach(color => {
    const swatch = el('div', {
      class: 'user-color-swatch',
      'data-color': color,
      style: `background-color: ${safeCssColor(color)}`
    });
    swatch.onclick = () => {
      settings.userProfile.color = color;
      saveLS('worldSettings', settings);
      updateChip();
    };
    swatches.appendChild(swatch);
  });

  nameInput.oninput = () => {
    settings.userProfile.name = nameInput.value;
    saveLS('worldSettings', settings);
    updateChip();
  };

  chip.addEventListener('click', () => {
    const isOpen = !popover.classList.contains('hidden');
    if (isOpen) {
      popover.classList.add('hidden');
      return;
    }
    popover.classList.remove('hidden');
    setTimeout(() => {
      const closePopover = (e) => {
        if (!popover.contains(e.target) && !chip.contains(e.target)) {
          popover.classList.add('hidden');
          document.removeEventListener('click', closePopover, true);
        }
      };
      document.addEventListener('click', closePopover, true);
    }, 0);
  });

  popover.addEventListener('click', (e) => {
    const actionItem = e.target.closest('[data-action]');
    if (!actionItem) return;
    if (actionItem.dataset.action === 'drive-signout') {
      window.googleDrive?.signOut();
      popover.classList.add('hidden');
    }
  });

  updateChip();
}

function setAppShellScaled(active) {
  document.body.classList.toggle('modal-open-scale', active);
}

function renderRecentProjects() {
  const section = $('#hubRecentSection');
  const grid = $('#hubRecentGrid');
  if (!section || !grid) return;

  const recent = loadLS('recentProjects', []);
  const others = recent.filter(r => r.worldId !== settings.worldId);

  if (others.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  grid.innerHTML = '';

  others.forEach(entry => {
    const dateStr = new Date(entry.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const card = el('div', { class: 'hub-recent-card', title: `Open "${entry.name}"` });
    const thumb = el('div', { class: 'hub-recent-thumb' });
    if (entry.thumbnailDataUrl && /^data:image\/[a-z]+;base64,/.test(entry.thumbnailDataUrl)) {
      thumb.style.backgroundImage = `url('${entry.thumbnailDataUrl}')`;
    }
    const name = el('div', { class: 'hub-recent-name', text: entry.name });
    const date = el('div', { class: 'hub-recent-date', text: dateStr });
    const info = el('div', { class: 'hub-recent-info' }, [name, date]);
    card.append(thumb, info);
    card.addEventListener('click', () => {
      showConfirmationModal(
        `Open "${entry.name}"?`,
        'Your current world will be saved as a recent entry and can be restored later.',
        'Open World',
        () => restoreWorldSnapshot(entry.worldId)
      );
    });
    grid.append(card);
  });
}

/** Wires the brand-logo click that opens the Settings hub. Called from initEventListeners(). */
function initUserChipListeners() {
  $('#brandLogo').addEventListener('click', () => {
    const projectModal = document.getElementById('projectActionsModal');
    if (projectModal) {
      if (window.showHubOverview) window.showHubOverview();
      const nameEl = $('#hubCurrentProjectName');
      if (nameEl) nameEl.textContent = settings.projectName || 'Untitled World';
      const sidebarNameEl = $('#hubSidebarWorldName');
      if (sidebarNameEl) sidebarNameEl.textContent = settings.projectName || 'My World';

      const catToggle = $('#catToggleInHub');
      if (catToggle) {
        catToggle.checked = showCats;
      }

      // Show modal immediately — async work populates in the background
      projectModal.classList.remove('hidden');

      const heroEl = $('#hubCurrentProjectHero');
      if (heroEl) {
        heroEl.style.backgroundImage = 'none';
        const activeMap = state.maps.find(m => m.id === state.activeMapId);
        if (activeMap && activeMap.imageKey) {
          resolveImageUrl(activeMap.imageKey).then(url => {
            if (url) heroEl.style.backgroundImage = `url('${url}')`;
          }).catch(() => {});
        }
      }

      const sizeEl = $('#hubProjectSize');
      if (sizeEl) {
        sizeEl.textContent = 'Calculating usage...';
        calculateProjectSize().then(bytes => {
          sizeEl.textContent = `Project Usage: ${formatBytes(bytes)}`;
        }).catch(() => { sizeEl.textContent = 'Project Usage: unavailable'; });
      }

      saveRecentProject().then(() => renderRecentProjects()).catch(e => console.error('[worldbuilder] saveRecentProject failed:', e));
    }
  });
}
