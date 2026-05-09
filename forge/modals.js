const GH_OWNER = 'Aestylis';
const GH_REPO  = 'taletrove';

// Side-sheets always stay in the layout (display:flex !important overrides .hidden).
// Toggling .is-open fires the transition reliably — same technique as #infoPanel.
function openSideSheet(overlay) {
  overlay.classList.remove('hidden');
  overlay.classList.add('is-open');
}

function closeSideSheet(overlay) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  overlay.classList.remove('is-open');
  if (reducedMotion) {
    overlay.classList.add('hidden');
    return;
  }
  overlay.classList.add('is-exiting');
  setTimeout(() => {
    overlay.classList.remove('is-exiting');
    overlay.classList.add('hidden');
  }, 200);
}

window.openSideSheet = openSideSheet;
window.closeSideSheet = closeSideSheet;

// Aligned with NN/g "Status, Not Action" + Stripe Spring Principle
const TOAST_MAX     = 3;
const TOAST_DURATION = 6000;

// showToast(message)
// showToast(message, undoCallback)
// showToast(message, 'error' | 'success')
// showToast(message, undoCallback, 'error' | 'success')
function showToast(message, undoCallbackOrType, typeArg) {
  const container = $('#toastContainer');
  if (!container) return;

  // Parse overloaded args
  let undoCallback = null;
  let type = 'default';
  if (typeof undoCallbackOrType === 'function') {
    undoCallback = undoCallbackOrType;
    if (typeArg) type = typeArg;
  } else if (typeof undoCallbackOrType === 'string') {
    type = undoCallbackOrType;
  }

  // Position stack above or below toolbar
  container.classList.toggle('is-top', typeof toolbarPos !== 'undefined' && toolbarPos === 'bottom');

  // Enforce max 3 — remove oldest first
  const existing = container.querySelectorAll('.toast-item');
  if (existing.length >= TOAST_MAX) _dismissToast(existing[0]);

  // Build icon SVG (mask-based, matches app icon system)
  const iconName = type === 'error' ? 'warning-circle' : type === 'success' ? 'circle' : 'bell';
  const toastEl = el('div', { class: `toast-item toast-${type}` });

  const iconEl = el('div', { class: 'toast-icon' });
  iconEl.innerHTML = `<div class="icon-container" style="-webkit-mask-image:url('ui-icons/${iconName}.svg');mask-image:url('ui-icons/${iconName}.svg');"></div>`;

  const msgEl  = el('span', { class: 'toast-message', text: message });
  toastEl.append(iconEl, msgEl);

  if (undoCallback) {
    const undoBtn = el('button', { class: 'ghost toast-undo', text: 'Undo' });
    undoBtn.onclick = () => { undoCallback(); _dismissToast(toastEl); };
    toastEl.appendChild(undoBtn);
  }

  container.appendChild(toastEl);

  // Trigger enter animation (next frame so transition fires)
  requestAnimationFrame(() => toastEl.classList.add('is-visible'));

  // Auto-dismiss
  toastEl._timer = setTimeout(() => _dismissToast(toastEl), TOAST_DURATION);
}

function _dismissToast(toastEl) {
  if (!toastEl || !toastEl.parentNode) return;
  clearTimeout(toastEl._timer);
  toastEl.classList.remove('is-visible');
  toastEl.addEventListener('transitionend', () => toastEl.remove(), { once: true });
}

// Legacy compat — some call sites use hideToast() directly
function hideToast() {
  const container = $('#toastContainer');
  if (!container) return;
  container.querySelectorAll('.toast-item').forEach(_dismissToast);
}

function getMoonPhaseIcon(phaseValue, color = 'var(--muted)') {
  const svgHeader = `<svg viewBox="0 0 100 100" fill="${color}" stroke="none" xmlns="http://www.w3.org/2000/svg">`;
  const svgFooter = `</svg>`;
  const fullCircle = `<circle cx="50" cy="50" r="48" />`;
  const darkCircle = `<circle cx="50" cy="50" r="48" fill="#4b5563" />`;

  // New Moon (dark)
  if (phaseValue > 0.9375 || phaseValue <= 0.0625) {
    return `${svgHeader}${darkCircle}${svgFooter}`;
  }
  // Full Moon (bright)
  if (phaseValue > 0.4375 && phaseValue <= 0.5625) {
    return `${svgHeader}${fullCircle}${svgFooter}`;
  }

  const radius = 48 * Math.abs(0.5 - phaseValue) * 2;
  const sweepFlag = phaseValue > 0.5 ? 0 : 1;
  const terminatorPath = `M50,2 A48,48 0 0,${sweepFlag} 50,98 A${radius},48 0 0,${sweepFlag} 50,2 Z`;

  // Waxing (right side lit)
  if (phaseValue > 0.0625 && phaseValue <= 0.4375) {
    return `${svgHeader}${darkCircle}<path d="${terminatorPath}" />${svgFooter}`;
  }
  // Waning (left side lit)
  if (phaseValue > 0.5625 && phaseValue <= 0.9375) {
    return `${svgHeader}${fullCircle}<path fill="#4b5563" d="${terminatorPath}" />${svgFooter}`;
  }
  return ''; // Fallback
}

function getDayForRelativeDate(year, monthName, week, weekday) {
  const data = settings.donjonCalendar;
  if (!data) return -1;
  const { year_len, months, month_len, week_len, weekdays, first_day } = data;
  let daysBeforeMonth = (year - 1) * year_len;
  for (let i = 0; i < months.indexOf(monthName); i++) {
    daysBeforeMonth += month_len[months[i]];
  }
  const monthStartDayOfWeek = (first_day + daysBeforeMonth) % week_len;
  const targetWeekdayIndex = weekdays.indexOf(weekday);
  if (targetWeekdayIndex === -1) return -1;

  let firstOccurrenceDay = 1 + (targetWeekdayIndex - monthStartDayOfWeek + week_len) % week_len;

  if (week > 0) {
    const dayOfMonth = firstOccurrenceDay + (week - 1) * week_len;
    return (dayOfMonth <= month_len[monthName]) ? dayOfMonth : -1;
  } else {
    let lastOccurrenceDay = firstOccurrenceDay;
    while (lastOccurrenceDay + week_len <= month_len[monthName]) {
      lastOccurrenceDay += week_len;
    }
    return lastOccurrenceDay;
  }
}


function populateShortcutsModal() {
  const groups = [
    {
      label: 'Map Tools',
      shortcuts: [
        { keys: ['P'], desc: 'Pointer Tool' },
        { keys: ['M'], desc: 'Move / Edit Tool' },
        { keys: ['N'], desc: 'New Pin Tool' },
        { keys: ['L'], desc: 'Toggle Labels' },
        { keys: ['O'], desc: 'Toggle Overlay' },
      ]
    },
    {
      label: 'Navigation',
      shortcuts: [
        { keys: ['1'], desc: 'Atlas Tab' },
        { keys: ['2'], desc: 'Encyclopedia Tab' },
        { keys: ['3'], desc: 'Assets Tab' },
        { keys: ['C'], desc: 'Center on Selection' },
        { keys: ['+'], desc: 'Zoom In' },
        { keys: ['-'], desc: 'Zoom Out' },
        { keys: ['I'], desc: 'Toggle Info Panel' },
        { keys: ['Tab'], desc: 'Toggle Inspector' },
        { keys: ['Esc'], desc: 'Deselect / Close Panel' },
      ]
    },
    {
      label: 'Editing',
      shortcuts: [
        { keys: ['Del'], desc: 'Delete Selection' },
        { keys: ['Ctrl', 'Z'], desc: 'Undo' },
        { keys: ['Ctrl', 'Y'], desc: 'Redo' },
      ]
    },
    {
      label: 'Global',
      shortcuts: [
        { keys: ['Ctrl', 'F'], desc: 'Search' },
        { keys: ['Ctrl', 'S'], desc: 'Export Project' },
      ]
    }
  ];

  const listEl = $('#helpShortcutsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  groups.forEach(group => {
    const groupEl = el('div', { class: 'shortcuts-group' });
    const labelEl = el('div', { class: 'shortcuts-group-label', text: group.label });
    const gridEl = el('div', { class: 'shortcuts-list' });

    group.shortcuts.forEach(s => {
      const keyHtml = s.keys.map(k => `<kbd class="shortcut-key">${escapeHtml(k)}</kbd>`).join('<span class="shortcut-plus">+</span>');
      const keyEl = el('div', { class: 'shortcut-keys', innerHTML: keyHtml });
      const descEl = el('div', { class: 'shortcut-desc', text: s.desc });
      gridEl.append(keyEl, descEl);
    });

    groupEl.append(labelEl, gridEl);
    listEl.append(groupEl);
  });
}

function populateNewsModal(newsData) {
  const sheetBody = $('#newsSheetBody');
  if (!sheetBody) return;

  sheetBody.innerHTML = '';

  const lastSeen = loadLS('lastSeenNewsVersion', null);
  const lastSeenIndex = lastSeen ? newsData.findIndex(a => a.id === lastSeen) : -1;

  // Map article id to a display version string (alpha-3 → v0.3.0)
  const versionLabel = (id) => {
    const patch = id.match(/^alpha-(\d+)-(\d+)$/);
    if (patch) return `v0.${patch[1]}.${patch[2]}`;
    const minor = id.match(/^alpha-(\d+)$/);
    return minor ? `v0.${minor[1]}.0` : id;
  };

  newsData.forEach((article, index) => {
    const isUnread = lastSeenIndex === -1 || index < lastSeenIndex;
    const dateStr = new Date(article.date + 'T12:00:00Z')
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const chevron = el('div', { class: 'news-card-chevron' });

    const metaChildren = [el('span', { class: 'news-version-badge', text: versionLabel(article.id) })];
    if (isUnread) metaChildren.push(el('span', { class: 'news-unread-dot' }));

    const tagChips = (article.tags || []).map(tag => el('span', { class: 'news-tag', text: tag }));

    const header = el('div', { class: 'news-card-header' }, [
      el('div', { class: 'news-card-meta' }, metaChildren),
      tagChips.length ? el('div', { class: 'news-card-tags' }, tagChips) : null,
      el('div', { class: 'news-card-title-row' }, [
        el('span', { class: 'news-card-title', text: article.title }),
        chevron,
      ]),
      article.summary ? el('p', { class: 'news-card-summary', text: article.summary }) : null,
      el('span', { class: 'news-card-date', text: dateStr }),
    ]);

    const inner = el('div', { class: 'news-card-inner' }, [
      el('div', { class: 'news-card-content', innerHTML: article.content }),
    ]);
    const body = el('div', { class: 'news-card-body' }, [inner]);

    const card = el('div', {
      class: `news-card${isUnread ? ' is-unread' : ''}`,
      'data-id': article.id,
    }, [header, body]);

    header.addEventListener('click', () => {
      const expanding = !card.classList.contains('is-expanded');
      // Collapse any other open card
      sheetBody.querySelectorAll('.news-card.is-expanded').forEach(c => c.classList.remove('is-expanded'));
      if (expanding) card.classList.add('is-expanded');
    });

    sheetBody.appendChild(card);
  });

  // Auto-expand first unread card, or first card if all read
  const firstUnread = sheetBody.querySelector('.news-card.is-unread') || sheetBody.querySelector('.news-card');
  if (firstUnread) firstUnread.classList.add('is-expanded');
}

async function showCalendarModal() {
  const modal = $('#calendarModal');
  const contentEl = $('#calendarModalContent');
  const data = settings.donjonCalendar;

  // Safety check: ensure currentDate exists
  if (!settings.currentDate) {
    settings.currentDate = { year: 1, month: data?.months?.[0] || null, day: 1 };
  }

  if (!data) {
    const emptyMsg = el('div', { class: 'empty-state-centered', style: 'padding: 2rem; text-align: center;' }, [
      el('p', { class: 'muted', style: 'margin-bottom: 1.5rem;' }, [
        el('span', { text: 'No calendar data found. Please define your ' }),
        el('button', { class: 'ghost', text: 'Time System', onclick: () => openCalendarSettingsModal() }),
        el('span', { text: ' in the settings (Settings > Calendar).' })
      ]),
      el('p', { class: 'muted', style: 'font-size: 0.9rem;' }, [
        el('span', { text: 'Need a template? ' }),
        el('a', { 
          href: 'Examples/Calendar.json', 
          download: 'Calendar.json', 
          text: 'Download the Example Calendar', 
          style: 'color: var(--accent); text-decoration: underline;' 
        }),
        el('span', { text: ' and then upload it in the settings.' })
      ])
    ]);
    contentEl.innerHTML = '';
    contentEl.appendChild(emptyMsg);
    modal.classList.remove('hidden');
    return;
  }

  const calendarModalTitle = $('#calendarModalTitle');
  if (calendarModalTitle) calendarModalTitle.textContent = data.name || 'Calendar';

  // Ensure currentDate.month is valid
  if ((!settings.currentDate.month || data.months.indexOf(settings.currentDate.month) === -1) && data.months.length > 0) {
    settings.currentDate.month = data.months[0];
  }

  // Renders month nav (← Month · Year →) into the graph-modal-header slot
  const renderMonthNav = () => {
    const navEl = $('#calendarMonthNav');
    if (!navEl) return;
    navEl.innerHTML = '';

    const prevBtn = el('button', { class: 'ghost icon-btn', title: 'Previous month', innerHTML: getIconHTMLSync('arrow-left', 'currentColor') });
    const nextBtn = el('button', { class: 'ghost icon-btn', title: 'Next month',     innerHTML: getIconHTMLSync('arrow-right', 'currentColor') });

    const months = data.months;
    const monthSelect = el('select', { class: 'cal-nav-month-select' },
      months.map((m, i) => el('option', { value: i, text: m }))
    );
    monthSelect.value = currentMonth;

    const yearSpan = el('span', { class: 'cal-nav-year', title: 'Click to edit year', text: currentYear });

    prevBtn.addEventListener('click', () => {
      if (--currentMonth < 0) { currentMonth = months.length - 1; currentYear--; }
      renderCalendar();
    });
    nextBtn.addEventListener('click', () => {
      if (++currentMonth >= months.length) { currentMonth = 0; currentYear++; }
      renderCalendar();
    });
    monthSelect.addEventListener('change', (e) => {
      currentMonth = parseInt(e.target.value, 10) || 0;
      renderCalendar();
    });
    yearSpan.addEventListener('click', () => {
      const input = el('input', { type: 'number', class: 'cal-nav-year-input', value: currentYear });
      yearSpan.replaceWith(input);
      input.focus(); input.select();
      const commit = () => {
        const v = parseInt(input.value, 10);
        if (!isNaN(v) && v > 0) currentYear = v;
        renderCalendar();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); else if (e.key === 'Escape') renderCalendar(); });
    });

    navEl.append(
      prevBtn,
      el('div', { class: 'cal-nav-center' }, [
        monthSelect,
        el('span', { class: 'cal-nav-sep', text: '·' }),
        yearSpan,
      ]),
      nextBtn,
    );
  };

  // Opens a popover anchored to the today-badged cell to set the in-game current date
  const openSetTodayPopover = (anchor) => {
    document.querySelector('.cal-date-popover')?.remove();

    const rect = anchor.getBoundingClientRect();
    const popover = el('div', { class: 'cal-date-popover' });

    const dayInput = el('input', { type: 'number', class: 'cal-popover-input', value: settings.currentDate.day, min: 1, max: data.month_len[settings.currentDate.month] || 30 });
    const monthSel = el('select', { class: 'cal-popover-select' },
      data.months.map(m => el('option', { value: m, text: m }))
    );
    monthSel.value = settings.currentDate.month;
    const yearInput = el('input', { type: 'number', class: 'cal-popover-input cal-popover-year', value: settings.currentDate.year, min: 1 });

    const apply = () => {
      const newDay   = parseInt(dayInput.value, 10);
      const newMonth = monthSel.value;
      const newYear  = parseInt(yearInput.value, 10);
      const maxDay   = data.month_len[newMonth] || 30;
      if (isNaN(newDay) || newDay < 1 || newDay > maxDay) return;
      if (isNaN(newYear) || newYear < 1) return;
      settings.currentDate = { day: newDay, month: newMonth, year: newYear };
      markEntityDirty('meta');
      debouncedSave();
      renderCalendar();
    };

    monthSel.addEventListener('change', () => {
      dayInput.max = data.month_len[monthSel.value] || 30;
      const cur = parseInt(dayInput.value, 10);
      if (cur > dayInput.max) dayInput.value = dayInput.max;
    });
    [dayInput, monthSel, yearInput].forEach(f => f.addEventListener('change', apply));

    const mkField = (label, input) => el('div', { class: 'cal-popover-field' }, [
      el('label', { class: 'cal-popover-label', text: label }),
      input,
    ]);

    popover.append(
      el('div', { class: 'cal-popover-title', text: 'Set today\'s date' }),
      el('div', { class: 'cal-popover-row' }, [
        mkField('Day',   dayInput),
        mkField('Month', monthSel),
        mkField('Year',  yearInput),
      ]),
    );
    document.body.appendChild(popover);

    const left = Math.min(rect.left, window.innerWidth - 260);
    popover.style.top  = `${rect.bottom + 6}px`;
    popover.style.left = `${left}px`;

    dayInput.focus(); dayInput.select();

    const dismiss = (e) => {
      if (!popover.contains(e.target) && e.target !== anchor) {
        popover.remove();
        document.removeEventListener('mousedown', dismiss);
      }
    };
    popover.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { popover.remove(); document.removeEventListener('mousedown', dismiss); }
    });
    setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
  };

  let currentYear = settings.currentDate.year;
  let currentMonth = data.months.indexOf(settings.currentDate.month);
  if (currentMonth === -1) currentMonth = 0;

  const renderCalendar = async () => {
    renderMonthNav();
    contentEl.innerHTML = '';

    const { year_len, n_months, month_len, week_len, weekdays, months, first_day, moons } = data;

    const allEvents = [];
    for (const feature of state.features) {
      if (feature.blocks) {
        for (const block of feature.blocks) {
          if (block?.type === 'Timeline' && block.data.events) {
            for (const event of block.data.events) {
              allEvents.push({ ...event, ownerId: feature.id, ownerType: 'feature' });
            }
          }
        }
      }
    }
    if (showEncyclopediaEvents) {
      for (const entry of state.encyclopedia) {
        const type = (entry.type || '').toLowerCase();

        // Case 1: Handle standard "Event" types
        if (type === 'event' && entry.eventData?.month) {
          allEvents.push({
            title: entry.name,
            dateData: entry.eventData,
            ownerId: entry.id,
            ownerType: 'encyclopedia'
          });
        }
        // Case 2: Handle "Character" birthdays and deaths
        else if (type === 'character' && (entry.birthData?.month || entry.deathData?.month)) {
          const deathYear = entry.deathData?.year;

          if (entry.birthData?.month && entry.birthData?.day) {
            // Only show birthday if character is not dead before this year.
            if (!deathYear || currentYear <= deathYear) {
              let ageText = '';
              if (entry.birthData.year && currentYear) {
                const ageTurning = currentYear - entry.birthData.year;
                ageText = ` (Age ${ageTurning})`;
              }

              const birthdayEventData = {
                month: entry.birthData.month,
                day: entry.birthData.day,
                recurrence: { type: 'annual_date' }
              };

              allEvents.push({
                title: `${entry.name}'s Birthday${ageText}`,
                dateData: birthdayEventData,
                ownerId: entry.id,
                ownerType: 'encyclopedia'
              });
            }
          }

          if (entry.deathData?.month && entry.deathData?.day && entry.deathData?.year) {
            // This is a one-time event, so it is not recurring.
            const deathEventData = {
              year: entry.deathData.year,
              month: entry.deathData.month,
              day: entry.deathData.day,
              color: '#847e87', // A muted, somber color
              textColor: '#e8e9eb'
            };

            allEvents.push({
              title: `${entry.name}'s Death`,
              dateData: deathEventData,
              ownerId: entry.id,
              ownerType: 'encyclopedia'
            });
          }
        }
      }
    }

    const currentMonthName = months[currentMonth];
    const currentMonthLength = month_len[currentMonthName];
    const monthStartAbs = toAbsoluteDay({ year: currentYear, month: currentMonthName, day: 1 }, data);
    const daysBeforeMonth = monthStartAbs - 1;
    const startDayOfWeek = dayOfWeek(monthStartAbs, data);

    const getLayoutForMonth = (events) => {
      const monthEvents = [];
      const monthStartSort = daysBeforeMonth + 1;
      const monthEndSort = daysBeforeMonth + currentMonthLength;

      for (const event of events) {
        const dateData = event.dateData;
        if (!dateData || !dateData.month) continue;

        let effectiveDay = dateData.day;
        const occurrences = [];

        if (dateData.recurrence && dateData.recurrence.type === 'lunar') {
          const moonName = dateData.recurrence.moon;
          const targetPhase = dateData.recurrence.phase;
          const cycle = data.lunar_cyc[moonName];
          if (cycle) {
            // A typical lunar cycle is ~30 days, so 1/(2*cycle) is about half a day —
            // narrow enough to pick one day per cycle, wide enough that floating-point matches.
            const threshold = 1 / (cycle * 2);
            for (let d = 1; d <= currentMonthLength; d++) {
              const currentPhase = moonPhase(monthStartAbs + d - 1, moonName, data);
              let diff = Math.abs(currentPhase - targetPhase);
              if (diff > 0.5) diff = 1 - diff; // wrap-around
              if (diff <= threshold) occurrences.push(d);
            }
          }
        } else if (dateData.recurrence && dateData.recurrence.type === 'annual_relative') {
          effectiveDay = getDayForRelativeDate(currentYear, dateData.month, dateData.recurrence.week, dateData.recurrence.weekday);
          if (effectiveDay !== -1) occurrences.push(effectiveDay);
        } else {
          if (effectiveDay !== null) occurrences.push(effectiveDay);
        }

        for (const occDay of occurrences) {
          const yearForStartCalc = dateData.recurrence ? currentYear : dateData.year;
          // Lunar occurrences are days in the current month, not in dateData.month.
          const monthForStartCalc = dateData.recurrence?.type === 'lunar'
            ? currentMonthName
            : (dateData.month || currentMonthName);
          const startSort = toAbsoluteDay(
            { year: yearForStartCalc, month: monthForStartCalc, day: occDay },
            data
          );
          let endSort = startSort;
          let endDayInMonth = occDay;

          if (dateData.endDay && dateData.recurrence?.type !== 'lunar') {
            let yearForEndCalc = dateData.recurrence ? currentYear : (dateData.endYear || dateData.year);
            const startMonthIndex = months.indexOf(dateData.month);
            const endMonthIndex = months.indexOf(dateData.endMonth || dateData.month);

            // For recurring events, if the end month is before the start month it wraps into the next year.
            if (dateData.recurrence && endMonthIndex < startMonthIndex) {
              yearForEndCalc++;
            }

            endSort = toAbsoluteDay(
              { year: yearForEndCalc, month: dateData.endMonth || dateData.month, day: dateData.endDay },
              data
            );
            endDayInMonth = dateData.endDay;
          }

          if (startSort > monthEndSort || endSort < monthStartSort) continue;

          // Determine the visible start and end days for this event within the current month.
          let finalStartDay, finalEndDay;

          // Case 1: Event starts before this month and ends after it (spans the whole month).
          if (startSort < monthStartSort && endSort > monthEndSort) {
            finalStartDay = 1;
            finalEndDay = currentMonthLength;
          }
          // Case 2: Event starts before this month but ends within it.
          else if (startSort < monthStartSort && endSort <= monthEndSort) {
            finalStartDay = 1;
            finalEndDay = dateData.endDay;
          }
          // Case 3: Event starts in this month but ends after it.
          else if (startSort >= monthStartSort && endSort > monthEndSort) {
            finalStartDay = occDay;
            finalEndDay = currentMonthLength;
          }
          // Case 4: Event is contained entirely within the current month.
          else {
            finalStartDay = occDay;
            finalEndDay = endDayInMonth;
          }

          monthEvents.push({
            ...event,
            startDayInMonth: finalStartDay,
            endDayInMonth: finalEndDay,
          });
        }
      }
      return monthEvents;
    };

    const eventLayout = getLayoutForMonth(allEvents);
    for (const event of eventLayout) {
      // This currently only supports Encyclopedia events, but could be expanded.
      if (event.ownerType === 'encyclopedia') {
        const ownerEntry = state.encyclopedia.find(e => e.id === event.ownerId);
        if (ownerEntry && ownerEntry.heroImageKey) {
          event.heroImageUrl = await resolveImageUrl(ownerEntry.heroImageKey);
        }
      }
    }

    const grid = el('div', { class: 'calendar-grid' });

    // Weekday header row
    const weekdaysRow = el('div', { class: 'calendar-weekdays-header', style: `grid-template-columns: repeat(${week_len}, 1fr);` });
    weekdays.forEach(day => weekdaysRow.appendChild(el('div', { class: 'calendar-weekday', text: day })));
    grid.appendChild(weekdaysRow);

    // Greedy lane assignment for spanning event bars
    const CAL_MAX_LANES = 3;
    const assignCalendarLanes = (weekEvents) => {
      const sorted = [...weekEvents].sort((a, b) => a.colStart - b.colStart || (b.colEnd - b.colStart) - (a.colEnd - a.colStart));
      const laneEnds = [];
      for (const ev of sorted) {
        let lane = laneEnds.findIndex(end => end <= ev.colStart);
        if (lane === -1) lane = laneEnds.length;
        ev.lane = lane;
        laneEnds[lane] = ev.colEnd;
      }
      return sorted;
    };

    // Build one week-row per calendar week
    const numWeeks = Math.ceil((startDayOfWeek + currentMonthLength) / week_len);
    for (let week = 0; week < numWeeks; week++) {
      const weekRow = el('div', { class: 'calendar-week-row' });
      const cellsDiv = el('div', { class: 'calendar-week-cells', style: `grid-template-columns: repeat(${week_len}, 1fr);` });
      const eventsOverlay = el('div', { class: 'calendar-week-events', style: `grid-template-columns: repeat(${week_len}, 1fr);` });

      const dayOffset = week * week_len - startDayOfWeek;
      const weekFirstDay = Math.max(1, dayOffset + 1);
      const weekLastDay = Math.min(currentMonthLength, dayOffset + week_len);

      // Day cells (day number + moons only — events live in overlay)
      for (let col = 0; col < week_len; col++) {
        const day = dayOffset + col + 1;
        if (day < 1 || day > currentMonthLength) {
          cellsDiv.appendChild(el('div', { class: 'calendar-day is-empty' }));
          continue;
        }
        const dayCell = el('div', { class: 'calendar-day' });
        if (currentYear === settings.currentDate.year && currentMonthName === settings.currentDate.month && day === settings.currentDate.day) {
          dayCell.classList.add('is-current-date');
          dayCell.title = 'Set today\'s date';
          dayCell.addEventListener('click', () => openSetTodayPopover(dayCell));
        }
        const dayHeader = el('div', { class: 'calendar-day-header' });
        dayHeader.appendChild(el('div', { class: 'day-number', text: day }));
        if (moons.length > 0) {
          const moonContainer = el('div', { class: 'moon-container' });
          const abs = monthStartAbs + day - 1;
          moons.forEach(moonName => {
            const phase = moonPhase(abs, moonName, data);
            moonContainer.appendChild(el('div', { class: 'moon-phase-icon', title: moonName, innerHTML: getMoonPhaseIcon(phase, moonName.toLowerCase() === 'sol' ? 'var(--gm)' : 'var(--muted)') }));
          });
          dayHeader.appendChild(moonContainer);
        }
        dayCell.appendChild(dayHeader);
        cellsDiv.appendChild(dayCell);
      }

      // Collect events that intersect this week and compute their column spans
      const weekEvents = [];
      for (const event of eventLayout) {
        const clipStart = Math.max(event.startDayInMonth, weekFirstDay);
        const clipEnd = Math.min(event.endDayInMonth, weekLastDay);
        if (clipStart > clipEnd) continue;
        weekEvents.push({
          ...event,
          colStart: clipStart - dayOffset,       // 1-based CSS grid column
          colEnd:   clipEnd  - dayOffset + 1,    // exclusive end
          isStart:  event.startDayInMonth >= weekFirstDay,
          isEnd:    event.endDayInMonth   <= weekLastDay,
        });
      }

      const assignedEvents = assignCalendarLanes(weekEvents);
      const overflowCounts = {};

      for (const event of assignedEvents) {
        if (event.lane >= CAL_MAX_LANES) {
          for (let c = event.colStart; c < event.colEnd; c++) overflowCounts[c] = (overflowCounts[c] || 0) + 1;
          continue;
        }

        const eventColor = event.color || event.dateData?.color;
        const isSingleDay = event.colEnd - event.colStart === 1;
        const showLabel = event.isStart || isSingleDay;

        const cls = ['calendar-event-bar',
          isSingleDay       ? 'is-single-day' : '',
          showLabel         ? 'is-start'       : '',
          (event.isEnd || isSingleDay) ? 'is-end' : '',
        ].filter(Boolean).join(' ');

        const bar = el('a', { class: cls, href: '#' });
        bar.style.setProperty('--col-start', event.colStart);
        bar.style.setProperty('--col-end',   event.colEnd);
        bar.style.setProperty('--lane',      event.lane + 1);
        if (eventColor) bar.style.setProperty('--event-color', safeCssColor(eventColor));
        const textColor = event.textColor || event.dateData?.textColor;
        if (textColor) bar.style.setProperty('--event-text-color', safeCssColor(textColor));

        if (showLabel) {
          if (event.heroImageUrl) {
            bar.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url('${event.heroImageUrl}')`;
            bar.style.backgroundSize = 'cover';
            bar.style.backgroundPosition = 'center';
          }
          bar.appendChild(el('span', { class: 'calendar-event-bar-name', text: event.title }));
        }

        bar.addEventListener('click', e => {
          e.preventDefault();
          $('#calendarModal').classList.add('hidden');
          if (event.ownerType === 'feature') navigateToFeature(event.ownerId);
          else navigateToEncyclopediaEntry(event.ownerId);
        });
        eventsOverlay.appendChild(bar);
      }

      // "+N more" overflow chip at the start of each overflow run
      let prevOverflow = false;
      for (let c = 1; c <= week_len; c++) {
        if (overflowCounts[c] && !prevOverflow) {
          const chip = el('span', { class: 'calendar-overflow-chip', text: `+${overflowCounts[c]} more` });
          chip.style.setProperty('--col-start', c);
          chip.style.setProperty('--col-end',   c + 1);
          chip.style.setProperty('--lane',       CAL_MAX_LANES + 1);
          eventsOverlay.appendChild(chip);
        }
        prevOverflow = !!overflowCounts[c];
      }

      weekRow.append(cellsDiv, eventsOverlay);
      grid.appendChild(weekRow);
    }
    contentEl.append(grid);
  };

  // "Today" button — snap view to today's month AND open the date editor
  const jumpTodayBtn = $('#calendarJumpToday');
  if (jumpTodayBtn) {
    jumpTodayBtn.onclick = () => {
      currentYear  = settings.currentDate.year;
      currentMonth = data.months.indexOf(settings.currentDate.month);
      if (currentMonth === -1) currentMonth = 0;
      renderCalendar();
      openSetTodayPopover(jumpTodayBtn);
    };
  }

  renderCalendar();
  modal.classList.remove('hidden');
}

window.showCalendarModal = showCalendarModal;

let timelineBaseZoom = 1.0; // set per-render so reset returns to initial spread

function applyTimelineZoom() {
  const nodes = document.querySelectorAll('.timeline-event-node');
  // Scale node widths relative to the base zoom, not absolute level, so
  // nodes stay at the CSS base size when at the initial spread and only
  // grow/shrink as the user zooms in/out beyond that point.
  const relativeZoom = timelineBaseZoom > 0 ? timelineZoomLevel / timelineBaseZoom : 1;
  const newWidth = TIMELINE_NODE_BASE_WIDTH * Math.max(0.5, relativeZoom);
  nodes.forEach(node => {
    node.style.width = `${newWidth}px`;
  });
  updateTimelineClusters();
}

function zoomTimeline(direction) {
  if (direction === 'in') {
    timelineZoomLevel *= 1.4;
  } else if (direction === 'out') {
    timelineZoomLevel /= 1.4;
  } else if (direction === 'reset') {
    timelineZoomLevel = timelineBaseZoom; // restore to the initial spread, not hard-coded 1.0
  }

  timelineZoomLevel = Math.max(0.2, Math.min(timelineZoomLevel, 20));

  const ganttContainer = $('#timelineViewerContent .gantt-grid-wrapper');
  if (ganttContainer) {
    ganttContainer.style.width = `${100 * timelineZoomLevel}%`;
  }
}

function updateTimelineClusters() {
  const track = document.querySelector('.timeline-track');
  if (!track) return;

  track.querySelectorAll('.timeline-cluster-node').forEach(cluster => cluster.remove());
  const nodes = track.querySelectorAll('.timeline-event-node');
  nodes.forEach(node => node.style.display = 'flex');

  let i = 0;
  while (i < nodes.length - 1) {
    const currentNode = nodes[i];
    const currentRect = currentNode.getBoundingClientRect();
    let clusterGroup = [currentNode];

    let nextIndex = i + 1;
    while (nextIndex < nodes.length) {
      const nextNode = nodes[nextIndex];
      const nextRect = nextNode.getBoundingClientRect();
      // If the right edge of the current node overlaps the next node, add it to the cluster
      if (currentRect.right > nextRect.left + 20) { // +20 provides a small buffer
        clusterGroup.push(nextNode);
        nextIndex++;
      } else {
        break; // No more overlaps
      }
    }

    if (clusterGroup.length > 1) {
      // Hide all the individual nodes in the group
      clusterGroup.forEach(node => node.style.display = 'none');

      const clusterDetails = el('div', { class: 'timeline-event-details' }, [
        el('h4', { text: `+ ${clusterGroup.length} Events` }),
        el('div', { class: 'timeline-date', text: 'Zoom in to see details' })
      ]);

      const clusterNode = el('div', { class: 'timeline-event-node timeline-cluster-node' }, [
        el('div', { class: 'timeline-event-marker' }),
        clusterDetails
      ]);

      // Position the new cluster node where the first hidden node was
      clusterNode.style.width = currentNode.style.width;
      track.insertBefore(clusterNode, currentNode);

      i = nextIndex; // Skip past the nodes we just clustered
    } else {
      i++; // No cluster, move to the next node
    }
  }
}

let timelineViewMode = 'vertical'; // 'vertical' | 'gantt'

async function renderVerticalTimeline(allEvents, contentEl, modal) {
  const wrapper = el('div', { class: 'vertical-timeline-wrapper' });
  let lastRenderedYear = null;
  let index = 0;
  for (const event of allEvents) {
    const currentEventYear = sortableToYear(event.sortableDate);
    if (currentEventYear !== lastRenderedYear) {
      wrapper.appendChild(el('div', { class: 'vertical-timeline-year' }, [el('span', { text: `Year ${currentEventYear}` })]));
      lastRenderedYear = currentEventYear;
    }
    const owner = event.ownerType === 'encyclopedia'
      ? state.encyclopedia.find(e => e.id === event.ownerId)
      : state.features.find(f => f.id === event.ownerId);
    if (!owner) { index++; continue; }

    const side = index % 2 === 0 ? 'is-left' : 'is-right';
    const row = el('div', { class: `vertical-event-row ${side}` });
    const track = el('div', { class: 'vertical-event-track' }, [el('div', { class: 'vertical-event-marker' })]);
    const card = el('div', { class: 'vertical-event-card' });

    const eventColor = event.color || event.dateData?.color;
    if (owner.heroImageKey) {
      const imageUrl = await resolveImageUrl(owner.heroImageKey);
      if (imageUrl) {
        card.style.backgroundImage = `url('${imageUrl}')`;
      } else {
        card.classList.add('no-image');
        if (eventColor) card.style.setProperty('--event-color', safeCssColor(eventColor));
      }
    } else {
      card.classList.add('no-image');
      if (eventColor) card.style.setProperty('--event-color', safeCssColor(eventColor));
    }

    const eventLink = el('a', { href: `#${event.ownerId}`, text: `See full entry for "${owner.title || owner.name}"` });
    eventLink.onclick = (e) => { e.preventDefault(); modal.classList.add('hidden'); event.ownerType === 'encyclopedia' ? navigateToEncyclopediaEntry(event.ownerId) : navigateToFeature(event.ownerId); };
    const content = el('div', { class: 'vertical-event-content' }, [
      el('span', { class: 'chip', text: event.category || 'Event' }),
      el('h4', { class: 'vertical-event-title', text: event.title }),
      el('p', { class: 'vertical-event-date', text: event.displayDate || event.date }),
      eventLink
    ]);
    card.appendChild(content);

    if (side === 'is-left') {
      row.append(card, track);
    } else {
      row.append(track, card);
    }
    wrapper.appendChild(row);
    index++;
  }
  contentEl.appendChild(wrapper);
}

function renderGanttTimeline(allEvents, contentEl) {
  if (!allEvents.length) {
    contentEl.appendChild(el('p', { class: 'muted', style: 'padding: 2rem;', text: 'No timeline events found.' }));
    return;
  }

  // Determine global bounds
  const rawMinDate = Math.min(...allEvents.map(e => e.sortableDate));
  const maxDates = allEvents.map(e => {
    if (e.endDateData) {
      const endStr = `Year ${e.endDateData.year || e.dateData?.year || 9999}, ${e.endDateData.month || e.dateData?.month}, Day ${e.endDateData.day}`;
      return parseSortableDate(endStr);
    }
    return e.sortableDate;
  });
  const rawMaxDate = Math.max(...maxDates);
  const rawRange = Math.max(1, rawMaxDate - rawMinDate);

  // Add 5% padding to the range so events aren't squished against the edges
  const padding = Math.ceil(rawRange * 0.05) || 10;
  const minDate = rawMinDate - padding;
  const maxDate = rawMaxDate + padding;
  const range = maxDate - minDate;

  // Group by category
  const categories = new Map();
  allEvents.forEach(e => {
    const cat = e.category || 'General';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat).push(e);
  });

  const wrapper = el('div', { class: 'gantt-grid-wrapper' });
  const header = el('div', { class: 'gantt-header' }, [
    el('div', { class: 'gantt-category-column-header', text: 'Category' }),
    el('div', { class: 'gantt-time-axis' })
  ]);
  const axis = header.querySelector('.gantt-time-axis');

  // Axis: years (Step logic to avoid 1000s of labels)
  const startYear = sortableToYear(minDate);
  const endYear = sortableToYear(maxDate);
  const totalYears = endYear - startYear;
  let yearStep = 1;
  if (totalYears > 50) yearStep = 5;
  if (totalYears > 200) yearStep = 10;
  if (totalYears > 1000) yearStep = 50;

  for (let y = startYear; y <= endYear; y += yearStep) {
    const yearSort = parseSortableDate(`Year ${y}, ${settings.donjonCalendar.months[0]}, Day 1`);
    const left = ((yearSort - minDate) / range * 100).toFixed(2);
    if (left >= 0 && left <= 100) {
      const marker = el('div', { class: 'gantt-year-marker', style: `left: ${left}%`, text: `Year ${y}` });
      axis.appendChild(marker);
    }
  }

  const body = el('div', { class: 'gantt-body' });
  categories.forEach((events, catName) => {
    events.sort((a, b) => a.sortableDate - b.sortableDate);
    
    const lanes = []; // Array of endDates for each lane
    events.forEach(e => {
      // Calculate effective end date for overlap check
      let endSort = e.sortableDate;
      if (e.endDateData) {
        const endStr = `Year ${e.endDateData.year || e.dateData?.year}, ${e.endDateData.month || e.dateData?.month}, Day ${e.endDateData.day}`;
        endSort = parseSortableDate(endStr);
      }
      // Add a small buffer to the end date for visual breathing room
      const effectiveEnd = endSort + (range * 0.02);

      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (e.sortableDate > lanes[i]) {
          e.laneIndex = i;
          lanes[i] = effectiveEnd;
          placed = true;
          break;
        }
      }
      if (!placed) {
        e.laneIndex = lanes.length;
        lanes.push(effectiveEnd);
      }
    });

    const laneCount = Math.max(1, lanes.length);
    // Adaptive lane height: breathe on sparse tracks, compress on dense ones.
    // M3: consistent spacing scales with content density, not fixed pixels.
    const laneHeight = laneCount <= 2 ? 52 : laneCount <= 5 ? 40 : laneCount <= 9 ? 32 : 26;
    const LANE_PAD = 20;
    const trackHeight = laneCount * laneHeight + LANE_PAD;

    const track = el('div', { class: 'gantt-track', style: `height: ${trackHeight}px;` });
    const label = el('div', { class: 'gantt-track-label', text: catName });
    const content = el('div', { class: 'gantt-track-content' });

    events.forEach(e => {
      const left = ((e.sortableDate - minDate) / range * 100).toFixed(2);
      const topOffset = (e.laneIndex * laneHeight) + Math.round(laneHeight / 2) + Math.round(LANE_PAD / 2);
      const eventColor = e.color || e.dateData?.color;
      const color = (eventColor ? safeCssColor(eventColor) : null) || 'var(--accent-orange)';

      let item;
      if (e.endDateData) {
        const endStr = `Year ${e.endDateData.year || e.dateData?.year}, ${e.endDateData.month || e.dateData?.month}, Day ${e.endDateData.day}`;
        const endSort = parseSortableDate(endStr);
        const width = ((endSort - e.sortableDate) / range * 100).toFixed(2);
        item = el('div', {
          class: 'gantt-item-bar',
          style: `left: ${left}%; top: ${topOffset}px; transform: translateY(-50%); width: ${Math.max(0.1, width)}%; --event-color: ${color};`,
          text: e.title,
          title: `${e.title} (${e.date} → ${e.endDateData.day})`
        });
      } else {
        item = el('div', {
          class: 'gantt-item-node',
          style: `left: ${left}%; top: ${topOffset}px; --event-color: ${color};`,
          'data-title': e.title,
          title: `${e.title} (${e.date})`
        });
      }

      item.onclick = () => {
        $('#timelineModal').classList.add('hidden');
        e.ownerType === 'encyclopedia' ? navigateToEncyclopediaEntry(e.ownerId) : navigateToFeature(e.ownerId);
      };

      // Right-click → "View in Calendar" — jumps the calendar to this event's date
      item.addEventListener('contextmenu', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        // Remove any stale menu
        document.getElementById('ganttItemContextMenu')?.remove();

        const openInCalendar = el('li', { text: 'View in Calendar' });
        openInCalendar.onclick = () => {
          document.getElementById('ganttItemContextMenu')?.remove();
          // Parse date string "Year N, MonthName, Day D"
          const match = (e.date || '').match(/Year\s+(\d+),\s+(.+),\s+Day\s+(\d+)/i);
          if (match) {
            settings.currentDate = { year: parseInt(match[1]), month: match[2].trim(), day: parseInt(match[3]) };
            markEntityDirty('meta');
            debouncedSave();
          }
          $('#timelineModal').classList.add('hidden');
          window.showCalendarModal();
        };

        const menu = el('div', { id: 'ganttItemContextMenu' }, [
          el('ul', { class: 'is-dropdown-menu' }, [openInCalendar])
        ]);
        menu.style.top = `${evt.clientY}px`;
        menu.style.left = `${evt.clientX}px`;
        document.body.appendChild(menu);

        setTimeout(() => {
          document.body.addEventListener('click', () => document.getElementById('ganttItemContextMenu')?.remove(), { once: true, capture: true });
        }, 0);
      });

      content.appendChild(item);
    });

    track.append(label, content);
    body.appendChild(track);
  });

  wrapper.append(header, body);
  contentEl.appendChild(wrapper);

  // Calculate an intelligent base zoom so that even squished events have breathing room.
  // We look for the densest part of the timeline.
  const viewerWidth = contentEl.clientWidth || 900;
  const MIN_BREATHING_ROOM_PX = 200;
  
  let maxDensity = 0;
  if (allEvents.length > 1) {
    for (let i = 1; i < allEvents.length; i++) {
      const gap = allEvents[i].sortableDate - allEvents[i-1].sortableDate;
      if (gap > 0) {
        const density = MIN_BREATHING_ROOM_PX / ((gap / range) * viewerWidth);
        maxDensity = Math.max(maxDensity, density);
      }
    }
  }

  timelineBaseZoom = Math.max(1.0, Math.min(maxDensity, 10)); // Cap initial zoom at 10x
  timelineZoomLevel = timelineBaseZoom;
  
  wrapper.style.width = `${100 * timelineZoomLevel}%`;
}

async function showGlobalTimeline() {
  const modal = $('#timelineModal');
  const contentEl = $('#timelineViewerContent');
  if (!modal || !contentEl) return;

  contentEl.innerHTML = '<p class="muted" style="padding: 2rem;">Gathering events...</p>';
  modal.classList.remove('hidden');

  const toggleEventsBtn = $('#toggleEncyclopediaEventsBtn');
  if (toggleEventsBtn) {
    toggleEventsBtn.classList.toggle('active-toggle', showEncyclopediaEvents);
  }

  const allEvents = [];
  
  // Pre-index encyclopedia for O(1) lookups
  const encyclopediaMap = new Map();
  state.encyclopedia.forEach(e => encyclopediaMap.set(e.id, e));

  for (const feature of state.features) {
    (feature.blocks || []).forEach(block => {
      if (block?.type === 'Timeline' && block.data.events) {
        block.data.events.forEach(event => {
          // Migration/Normalization
          if (!event.dateData && event.date) event.dateData = parseLegacyTimelineDate(event.date);
          
          let eventToPush = { ...event, ownerId: feature.id, ownerType: 'feature' };

          // Handle Linked Events - Optimized lookup
          if (event.source === 'linked' && event.linkedId) {
            const src = encyclopediaMap.get(event.linkedId);
            if (src) {
              eventToPush.title = src.name;
              eventToPush.dateData = src.eventData;
              eventToPush.description = src.description || '';
            }
          }

          eventToPush.sortableDate = parseSortableDate(eventToPush.dateData);
          const d = eventToPush.dateData || {};
          eventToPush.displayDate = `${d.day || ''} ${d.month || ''} ${d.year || ''} ${d.era || ''}`.trim();
          
          allEvents.push(eventToPush);
        });
      }
    });
  }

  if (showEncyclopediaEvents) {
    state.encyclopedia.forEach(entry => {
      if ((entry.type || '').toLowerCase() === 'event' && entry.eventData) {
        const d = entry.eventData;
        const displayDate = `${d.day || ''} ${d.month || ''} ${d.year || ''} ${d.era || ''}`.trim();

        const endDateData = d.endDay ? {
          year: d.endYear,
          era: d.endEra,
          month: d.endMonth,
          day: d.endDay
        } : null;

        allEvents.push({
          title: entry.name,
          displayDate: displayDate,
          sortableDate: parseSortableDate(entry.eventData),
          dateData: entry.eventData,
          endDateData,
          color: entry.eventData.color,
          textColor: entry.eventData.textColor,
          description: '',
          ownerId: entry.id,
          ownerType: 'encyclopedia'
        });
      }
    });
  }

  if (role === 'gm') {
    state.encyclopedia.forEach(entry => {
      if ((entry.type || '').toLowerCase() === 'session' && entry.eventData?.year) {
        const d = entry.eventData;
        const displayDate = `${d.day || ''} ${d.month || ''} ${d.year || ''} ${d.era || ''}`.trim();
        const num = entry.sessionData?.number;
        allEvents.push({
          title: num != null ? `Session ${num}: ${entry.name}` : entry.name,
          displayDate,
          sortableDate: parseSortableDate(entry.eventData),
          dateData: entry.eventData,
          endDateData: null,
          color: '#7c3aed',
          textColor: '#ffffff',
          description: entry.sessionData?.participants ? `Players: ${entry.sessionData.participants}` : '',
          ownerId: entry.id,
          ownerType: 'encyclopedia',
          isSession: true
        });
      }
    });
  }

  allEvents.sort((a, b) => (a.sortableDate || 0) - (b.sortableDate || 0));
  contentEl.innerHTML = '';

  if (allEvents.length === 0) {
    contentEl.appendChild(el('p', { class: 'muted', style: 'padding: 2rem;', text: 'No timeline events found.' }));
    return;
  }

  if (timelineViewMode === 'gantt') {
    renderGanttTimeline(allEvents, contentEl);
  } else {
    await renderVerticalTimeline(allEvents, contentEl, modal);
  }
}




function openGeneralSettingsModal() { openSettingsHub('general'); }
function openCalendarSettingsModal() { openSettingsHub('calendar'); }
function openDiceSettingsModal() { openSettingsHub('dice'); }
function openThemeSettingsModal() { openSettingsHub('theme'); }

function populateCalendarSettings() {
  const modal = $('#projectActionsModal');
  const dynamicContent = $('#calendarSettingsDynamicContent');
  dynamicContent.innerHTML = '';

  // Initialize data structure if missing
  if (!settings.donjonCalendar) {
    settings.donjonCalendar = {
      months: ["Month 1"],
      month_len: { "Month 1": 30 },
      weekdays: ["Day 1"],
      eras: [{ name: "Current Era", startYear: 1 }]
    };
  }
  const cal = settings.donjonCalendar;

  const tabs = el('div', { class: 'calendar-editor-tabs' });
  const sectionsContainer = el('div', { class: 'calendar-sections' });

  const createTab = (id, label, active = false) => {
    const btn = el('button', {
      class: `calendar-tab-btn ${active ? 'active' : ''}`,
      text: label
    });
    btn.onclick = () => {
      modal.querySelectorAll('.calendar-tab-btn').forEach(b => b.classList.remove('active'));
      modal.querySelectorAll('.calendar-editor-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`cal-section-${id}`);
      if (target) target.classList.add('active');
    };
    return btn;
  };

  const createSection = (id, active = false) => el('div', {
    class: `calendar-editor-section ${active ? 'active' : ''}`,
    id: `cal-section-${id}`
  });

  const generalTab = createTab('general', 'General', true);
  const generalSection = createSection('general', true);
  
  const firstDayIn = el('input', { type: 'number', value: cal.first_day || 0, min: 0 });
  firstDayIn.onchange = () => { cal.first_day = parseInt(firstDayIn.value, 10) || 0; };

  const currentYearIn = el('input', { type: 'number', value: settings.currentDate?.year || 1 });
  const currentMonthSel = el('select', {}, (cal.months || []).map(m => el('option', { value: m, text: m, selected: m === settings.currentDate?.month })));
  const currentDayIn = el('input', { type: 'number', value: settings.currentDate?.day || 1 });

  currentYearIn.onchange = () => { settings.currentDate.year = parseInt(currentYearIn.value, 10) || 1; };
  currentMonthSel.onchange = () => { settings.currentDate.month = currentMonthSel.value; };
  currentDayIn.onchange = () => { settings.currentDate.day = parseInt(currentDayIn.value, 10) || 1; };

  generalSection.append(
    el('div', { class: 'form-label', text: 'First Day of Year 1 (0-indexed offset)' }),
    firstDayIn,
    el('hr', { class: 'form-divider' }),
    el('div', { class: 'form-label', text: 'Current Date' }),
    el('div', { style: 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;' }, [
      el('div', {}, [el('div', { class: 'muted', text: 'Year', style: 'font-size: 0.7rem;' }), currentYearIn]),
      el('div', {}, [el('div', { class: 'muted', text: 'Month', style: 'font-size: 0.7rem;' }), currentMonthSel]),
      el('div', {}, [el('div', { class: 'muted', text: 'Day', style: 'font-size: 0.7rem;' }), currentDayIn])
    ])
  );

  const monthsTab = createTab('months', 'Months');
  const monthsSection = createSection('months');
  const monthsList = el('div', { class: 'form', style: 'gap: 0.5rem;' });

  const redrawMonths = () => {
    monthsList.innerHTML = '';
    cal.months.forEach((name, i) => {
      const nameIn = el('input', { type: 'text', value: name, placeholder: 'Month Name' });
      const lenIn = el('input', { type: 'number', value: cal.month_len[name] || 30, min: 1 });
      const delBtn = el('button', { class: 'danger small', text: '×' });

      nameIn.onchange = () => {
        const oldName = cal.months[i];
        const newName = nameIn.value.trim() || oldName;
        cal.months[i] = newName;
        cal.month_len[newName] = cal.month_len[oldName];
        if (newName !== oldName) delete cal.month_len[oldName];
        redrawMonths();
      };
      lenIn.onchange = () => { cal.month_len[cal.months[i]] = parseInt(lenIn.value, 10) || 1; };
      delBtn.onclick = () => { cal.months.splice(i, 1); redrawMonths(); };

      const row = el('div', { class: 'calendar-item-row' }, [nameIn, lenIn, delBtn]);
      monthsList.appendChild(row);
    });
    const addBtn = el('button', {
      class: 'ghost full-width',
      text: '+ Add Month',
      onclick: () => {
        const newName = `New Month ${cal.months.length + 1}`;
        cal.months.push(newName);
        cal.month_len[newName] = 30;
        redrawMonths();
      }
    });
    monthsList.appendChild(addBtn);
  };
  redrawMonths();
  monthsSection.appendChild(monthsList);

  const daysTab = createTab('weekdays', 'Weekdays');
  const daysSection = createSection('weekdays');
  const daysList = el('div', { class: 'form', style: 'gap: 0.5rem;' });

  const redrawWeekdays = () => {
    daysList.innerHTML = '';
    (cal.weekdays || []).forEach((name, i) => {
      const nameIn = el('input', { type: 'text', value: name, placeholder: 'Day Name' });
      const delBtn = el('button', { class: 'danger small', text: '×' });

      nameIn.onchange = () => { cal.weekdays[i] = nameIn.value.trim() || name; };
      delBtn.onclick = () => { cal.weekdays.splice(i, 1); redrawWeekdays(); };

      const row = el('div', { class: 'calendar-item-row weekday' }, [nameIn, delBtn]);
      daysList.appendChild(row);
    });
    const addBtn = el('button', {
      class: 'ghost full-width',
      text: '+ Add Weekday',
      onclick: () => {
        if (!cal.weekdays) cal.weekdays = [];
        cal.weekdays.push(`Day ${cal.weekdays.length + 1}`);
        redrawWeekdays();
      }
    });
    daysList.appendChild(addBtn);
  };
  redrawWeekdays();
  daysSection.appendChild(daysList);

  const erasTab = createTab('eras', 'Eras');
  const erasSection = createSection('eras');
  const erasList = el('div', { class: 'eras-editor' });

  const redrawEras = () => {
    erasList.innerHTML = '';
    cal.eras.forEach((era, i) => {
      const nameIn = el('input', { type: 'text', value: era.name, placeholder: 'Era Name' });
      const yearIn = el('input', { type: 'number', value: era.startYear, placeholder: 'Start Year' });
      const delBtn = el('button', { class: 'danger small', text: '×' });

      nameIn.onchange = () => { era.name = nameIn.value.trim() || era.name; };
      yearIn.onchange = () => { era.startYear = parseInt(yearIn.value, 10) || 1; };
      delBtn.onclick = () => { cal.eras.splice(i, 1); redrawEras(); };

      const row = el('div', { class: 'era-row' }, [nameIn, yearIn, delBtn]);
      erasList.appendChild(row);
    });
    const addBtn = el('button', {
      class: 'ghost full-width',
      text: '+ Add Era',
      onclick: () => {
        const lastEra = cal.eras[cal.eras.length - 1];
        cal.eras.push({ name: 'New Era', startYear: (lastEra ? lastEra.startYear + 1000 : 1) });
        redrawEras();
      }
    });
    erasList.appendChild(addBtn);
  };
  redrawEras();
  erasSection.appendChild(erasList);

  const importTab = createTab('import', 'Import');
  const importSection = createSection('import');
  const importBtn = el('button', {
    class: 'primary',
    text: 'Import Donjon JSON',
    style: 'align-self: center; width: auto; min-width: 200px;',
    onclick: () => $('#donjonCalendarFile').click()
  });
  importSection.append(
    el('p', { class: 'muted', style: 'text-align: center;' }, [
      el('span', { text: 'Import a calendar definition from ' }),
      el('a', { 
        href: 'https://donjon.bin.sh/fantasy/calendar/', 
        target: '_blank', 
        text: 'donjon.bin.sh',
        style: 'color: var(--accent-orange); text-decoration: underline;'
      }),
      el('span', { text: '.' })
    ]),
    importBtn
  );

  tabs.append(generalTab, monthsTab, daysTab, erasTab, importTab);
  sectionsContainer.append(generalSection, monthsSection, daysSection, erasSection, importSection);

  dynamicContent.append(tabs, sectionsContainer);

  $('#saveCalendarSettingsBtn').onclick = () => {
    recordState();
    
    // Finalize data structure
    cal.n_months = cal.months.length;
    cal.week_len = cal.weekdays.length;
    cal.year_len = cal.months.reduce((sum, m) => sum + (cal.month_len[m] || 0), 0);
    cal.eras.sort((a, b) => a.startYear - b.startYear);
    
    // Standardize optional fields for engine
    if (!cal.moons) cal.moons = [];
    if (!cal.lunar_cyc) cal.lunar_cyc = {};
    if (!cal.lunar_shf) cal.lunar_shf = {};

    markEntityDirty('meta');
    debouncedSave();
    showToast('Calendar settings saved.');
  };
}

function populateDiceSettings() {
  const colorInput = $('#diceColorIn');
  let currentColor = settings.diceColor || '#ff7a1a';
  colorInput.value = currentColor;
  $('#diceThemeSel').value = settings.diceTheme || 'default';

  const container = $('#diceColorPickerContainer');
  container.innerHTML = '';

  const preview = el('div', { style: `width: 32px; height: 32px; flex-shrink: 0; border-radius: var(--radius-md); background-color: ${safeCssColor(currentColor)}; border: 1px solid var(--border);` });
  const hexIn = el('input', { type: 'text', value: currentColor, placeholder: '#rrggbb', style: 'font-family: monospace; flex: 1;' });

  const setColor = (hex) => {
    currentColor = hex;
    colorInput.value = hex;
    preview.style.backgroundColor = safeCssColor(hex);
    hexIn.value = hex;
    container.querySelectorAll('.color-swatch[data-color]').forEach(s => {
      s.classList.toggle('selected', s.dataset.color.toLowerCase() === hex.toLowerCase());
    });
    colorInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  hexIn.addEventListener('change', () => {
    const val = hexIn.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setColor(val);
    else hexIn.value = currentColor;
  });

  const grid = el('div', { class: 'color-grid', style: 'margin-top: 0.75rem;' });
  PRESET_COLORS.forEach(color => {
    const swatch = el('div', {
      class: 'color-swatch' + (color.toLowerCase() === currentColor.toLowerCase() ? ' selected' : ''),
      'data-color': color,
      style: `background-color: ${safeCssColor(color)}`
    });
    swatch.onclick = () => setColor(color);
    grid.appendChild(swatch);
  });

  container.append(
    el('div', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [preview, hexIn]),
    grid
  );
}

function populateThemeSettings() {
  // ── Color Theme grids (dark + light) ─────────────────────────────────────
  const darkGrid  = $('#appThemeGridDark');
  const lightGrid = $('#appThemeGridLight');
  if (darkGrid && lightGrid) {
    darkGrid.innerHTML = '';
    lightGrid.innerHTML = '';
    const currentThemeId = state.appearance?.colorTheme || 'default';

    const renderThemeCard = (t, grid) => {
      const card = el('div', {
        class: 'app-theme-card' + (t.id === currentThemeId ? ' selected' : ''),
      }, [
        el('div', { class: 'app-theme-swatch' }, [
          el('div', { class: 'app-theme-swatch-main',  style: `background:${t.bg}` }),
          el('div', { class: 'app-theme-swatch-card',  style: `background:${t.card}` }),
          el('div', { class: 'app-theme-swatch-panel', style: `background:${t.panel}; border-left: 2px solid ${t.accent}` }),
        ]),
        el('div', { class: 'app-theme-card-name', text: t.label }),
      ]);
      card.addEventListener('click', () => {
        // Deselect all cards across both grids
        document.querySelectorAll('#appThemeGridDark .app-theme-card, #appThemeGridLight .app-theme-card')
          .forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        // Apply theme-matched font defaults
        const newAppearance = {
          ...(state.appearance || {}),
          colorTheme: t.id,
          bodyFont: t.defaultBodyFont || 'inter',
          headingFont: t.defaultHeadingFont || 'cormorant',
        };
        state.appearance = newAppearance;
        markEntityDirty('meta');
        debouncedSave();
        if (window.applyAppearance) applyAppearance(state.appearance);
        // Refresh font picker selections
        const bGrid = $('#appBodyFontGrid');
        if (bGrid) {
          bGrid.querySelectorAll('.app-font-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.fontId === newAppearance.bodyFont);
          });
        }
        const hGrid = $('#appHeadingFontGrid');
        if (hGrid) {
          hGrid.querySelectorAll('.app-font-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.fontId === newAppearance.headingFont);
          });
        }
      });
      grid.appendChild(card);
    };

    (window.PRESET_THEMES || []).forEach(t => {
      renderThemeCard(t, t.mode === 'dark' ? darkGrid : lightGrid);
    });
  }

  // ── Body Font grid ────────────────────────────────────────────────────────
  const bodyGrid = $('#appBodyFontGrid');
  if (bodyGrid) {
    bodyGrid.innerHTML = '';
    const currentBodyFont = state.appearance?.bodyFont || 'inter';
    (window.BODY_FONTS || []).forEach(f => {
      const card = el('div', {
        class: 'app-font-card' + (f.id === currentBodyFont ? ' selected' : ''),
        'data-font-id': f.id,
      }, [
        el('div', { class: 'app-font-card-preview', style: `font-family: ${f.css}`, text: 'Aa' }),
        el('div', { class: 'app-font-card-name', text: f.label }),
      ]);
      card.addEventListener('click', () => {
        bodyGrid.querySelectorAll('.app-font-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.appearance = { ...(state.appearance || {}), bodyFont: f.id };
        markEntityDirty('meta');
        debouncedSave();
        if (window.applyAppearance) applyAppearance(state.appearance);
      });
      bodyGrid.appendChild(card);
    });
  }

  // ── Heading Font grid ─────────────────────────────────────────────────────
  const headingGrid = $('#appHeadingFontGrid');
  if (headingGrid) {
    headingGrid.innerHTML = '';
    const currentHeadingFont = state.appearance?.headingFont || 'cormorant';
    (window.HEADING_FONTS || []).forEach(f => {
      const card = el('div', {
        class: 'app-font-card' + (f.id === currentHeadingFont ? ' selected' : ''),
        'data-font-id': f.id,
      }, [
        el('div', { class: 'app-font-card-preview', style: `font-family: ${f.css}`, text: 'Aa' }),
        el('div', { class: 'app-font-card-name', text: f.label }),
      ]);
      card.addEventListener('click', () => {
        headingGrid.querySelectorAll('.app-font-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.appearance = { ...(state.appearance || {}), headingFont: f.id };
        markEntityDirty('meta');
        debouncedSave();
        if (window.applyAppearance) applyAppearance(state.appearance);
      });
      headingGrid.appendChild(card);
    });
  }

  // ── Map background image ──────────────────────────────────────────────────
  const mapBgPreview = $('#appMapBgPreview');
  const mapBgInput   = $('#appMapBgInput');
  const mapBgClear   = $('#appMapBgClearBtn');

  const _setBgZoneImage = (zone, url) => {
    zone.classList.add('has-image');
    zone.style.backgroundImage = `url('${url}')`;
    const label = zone.querySelector('.app-map-bg-zone-label');
    if (label) label.textContent = 'Click to replace';
  };
  const _clearBgZone = (zone) => {
    zone.classList.remove('has-image');
    zone.style.backgroundImage = '';
    const label = zone.querySelector('.app-map-bg-zone-label');
    if (label) label.textContent = 'Upload background image';
    const icon = zone.querySelector('.app-map-bg-zone-icon');
    if (icon && !zone.querySelector('.app-map-bg-zone-icon')) zone.prepend(el('div', { class: 'app-map-bg-zone-icon' }));
  };

  if (mapBgPreview && mapBgInput) {
    if (state.appearance?.mapBgKey) {
      resolveImageUrl(state.appearance.mapBgKey).then(url => {
        if (url && mapBgPreview) _setBgZoneImage(mapBgPreview, url);
      });
      if (mapBgClear) mapBgClear.style.display = 'block';
    }

    mapBgPreview.onclick = () => mapBgInput.click();
    mapBgInput.onchange = async () => {
      const file = mapBgInput.files[0];
      if (!file) return;
      recordState();
      if (state.appearance?.mapBgKey) await idbDelete(state.appearance.mapBgKey);
      const newKey = 'bg-img-' + uid();
      await idbSet(newKey, file);
      state.appearance = { ...(state.appearance || {}), mapBgKey: newKey };
      markEntityDirty('meta');
      debouncedSave();
      if (window.applyAppearance) await applyAppearance(state.appearance);
      _setBgZoneImage(mapBgPreview, URL.createObjectURL(file));
      if (mapBgClear) mapBgClear.style.display = 'block';
    };

    if (mapBgClear) {
      mapBgClear.onclick = async () => {
        if (state.appearance?.mapBgKey) await idbDelete(state.appearance.mapBgKey);
        state.appearance = { ...(state.appearance || {}), mapBgKey: null };
        markEntityDirty('meta');
        debouncedSave();
        if (window.applyAppearance) await applyAppearance(state.appearance);
        _clearBgZone(mapBgPreview);
        mapBgClear.style.display = 'none';
      };
    }
  }

  // ── Legacy custom CSS / bg (advanced, kept in dynamic area) ──────────────
  const dynamicContent = $('#themeSettingsDynamicContent');
  if (!dynamicContent) return;
  dynamicContent.innerHTML = '';

  const currentCustomTheme = settings.customTheme;
  const cssInput = el('input', { type: 'file', accept: '.css', style: 'display: none;' });
  const cssFileName = el('span', { class: 'muted', text: currentCustomTheme?.cssKey ? 'Custom CSS active' : 'No CSS file selected' });
  const uploadCssBtn = el('button', { class: 'ghost full-width' }, [
    el('span', { text: 'Upload CSS Override — ' }), cssFileName
  ]);
  uploadCssBtn.addEventListener('click', () => cssInput.click());
  cssInput.onchange = () => {
    cssFileName.textContent = cssInput.files[0]?.name || 'No CSS file selected';
  };

  const applyBtn = el('button', { class: 'primary full-width', text: 'Apply CSS Override' });
  applyBtn.addEventListener('click', async () => {
    if (!cssInput.files[0]) {
      showAlertModal('Nothing Selected', 'Please select a CSS file first.');
      return;
    }
    await window.handleCustomThemeUpload(null, cssInput.files[0]);
    populateThemeSettings();
  });

  const removeBtn = el('button', { class: 'danger full-width', text: 'Remove CSS Override' });
  removeBtn.disabled = !currentCustomTheme;
  removeBtn.addEventListener('click', () => {
    showConfirmationModal('Remove CSS Override?', 'This will remove the custom CSS file.', 'Remove', async () => {
      await window.removeCustomTheme();
      populateThemeSettings();
    });
  });

  dynamicContent.append(
    cssInput,
    el('div', { class: 'form-label', text: 'Custom CSS' }),
    el('div', { style: 'margin-bottom: 0.5rem;' }, [uploadCssBtn]),
    el('div', { style: 'margin-bottom: 0.35rem;' }, [
      el('a', {
        href: 'Examples/TaleTrove_Example_Theme.zip',
        download: 'TaleTrove_Example_Theme.zip',
        text: 'Download Example Theme',
        style: 'color: var(--accent-orange); text-decoration: underline; font-size: 0.82rem;'
      })
    ]),
    applyBtn,
    el('hr', { class: 'form-divider' }),
    removeBtn
  );
}

function saveDiceSettings() {
  recordState();
  settings.diceColor = $('#diceColorIn').value;
  settings.diceTheme = $('#diceThemeSel').value;
  if (window.updateDiceSettings) {
    window.updateDiceSettings(settings.diceColor, settings.diceTheme);
  }
  debouncedSave();
  $('#diceSettingsModal').classList.add('hidden');
  showToast('Dice settings saved.');
}

function showIconContextMenu(e, iconKey) {
  e.preventDefault();
  e.stopPropagation();

  const closeMenu = () => {
    const existingMenu = document.getElementById('iconContextMenu');
    if (existingMenu) existingMenu.remove();
    document.body.removeEventListener('click', closeMenu, { capture: true });
  };
  closeMenu();

  const removeItem = el('li', { text: 'Remove Icon' });
  removeItem.onclick = () => {
    closeMenu();
    window.deleteCustomIcon(iconKey);
  };

  const closeBtn = el('button', { class: 'context-menu-close-btn', title: 'Close' }, [
    el('div', { class: 'icon-container', style: '-webkit-mask-image: url("ui-icons/x.svg"); mask-image: url("ui-icons/x.svg");' })
  ]);
  closeBtn.onclick = closeMenu;

  const menu = el('div', { id: 'iconContextMenu' }, [
    closeBtn, // Add the close button here
    el('ul', { class: 'is-dropdown-menu' }, [removeItem])
  ]);

  menu.style.top = `${e.clientY}px`;
  menu.style.left = `${e.clientX}px`;
  document.body.appendChild(menu);

  setTimeout(() => { document.body.addEventListener('click', closeMenu, { once: true, capture: true }); }, 0);
}

async function showBlockChooserModal(x, y, ownerId, ownerType = 'feature') {
  const existingModal = document.getElementById('blockChooserModal');
  if (existingModal) existingModal.remove();

  const listItems = [];
  const blockEntries = Object.entries(BLOCK_DEFINITIONS)
    .filter(([type]) => !['Separator'].includes(type));

  for (const [type, def] of blockEntries) {
    const iconHtml = await getIconHTML(def.icon, 'var(--text)');
    const icon = el('div', {
      innerHTML: iconHtml,
      style: 'width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;'
    });
    const li = el('li', {
      style: 'display: flex; align-items: center; gap: 0.75rem;'
    }, [icon, el('span', { text: def.name })]);

    li.addEventListener('click', (e) => {
      e.stopPropagation();
      addBlock(ownerId, ownerType, type);
      closeModal();
    });
    listItems.push(li);
  }

  const divider = el('li', { class: 'divider' });
  const rearrangeLabel = isContentEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode';
  const rearrangeIconName = isContentEditMode ? 'article' : 'pencil';
  const rearrangeIconHtml = await getIconHTML(rearrangeIconName);
  const rearrangeItem = el('li', {
    style: 'display: flex; align-items: center; gap: 0.75rem;'
  }, [
    el('div', {
      innerHTML: rearrangeIconHtml,
      style: 'width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;'
    }),
    el('span', { text: rearrangeLabel })
  ]);

  const closeModal = () => {
    const modalToRemove = document.getElementById('blockChooserModal');
    if (modalToRemove) modalToRemove.remove();
    document.body.removeEventListener('click', closeModal, { capture: true });
  };

  rearrangeItem.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleContentEditMode(ownerId, ownerType);
    closeModal();
  });

  if (role === 'gm') {
    listItems.push(divider, rearrangeItem);
  }

  const modalWidth = 240;
  let finalX = x;

  if (x + modalWidth > window.innerWidth) {
    finalX = x - modalWidth;
  }

  const modal = el('div', {
    id: 'blockChooserModal',
    class: 'modal-content',
    // Use the new finalX variable for the left position
    style: `position: fixed; top: ${y}px; left: ${finalX}px; z-index: 2000; width: ${modalWidth}px; max-width: ${modalWidth}px; padding: 0.5rem; text-align: left;`
  }, [
    el('ul', { class: 'is-dropdown-menu', style: 'margin:0; padding:0; list-style:none;' }, listItems)
  ]);

  document.body.appendChild(modal);
  setTimeout(() => {
    document.body.addEventListener('click', closeModal, { once: true, capture: true });
  }, 0);
}

function showFeatureCreatorModal(x, y, geometryType) {
  // Remove any existing chooser modal first
  const existingModal = document.getElementById('featureCreatorModal');
  if (existingModal) existingModal.remove();

  const listItems = [];

  // Find the button that was clicked using the mouse coordinates.
  const anchorElement = document.elementFromPoint(x, y).closest('button');

  const modal = el('div', {
    id: 'featureCreatorModal',
    class: 'modal-content feature-creator-menu',
  });

  const repositionModal = () => {
    if (!anchorElement) { closeModal(); return; } // Safety check
    const anchorRect = anchorElement.getBoundingClientRect();
    if (anchorRect.width === 0 && anchorRect.height === 0) {
      closeModal();
      return;
    }
    modal.style.position = 'fixed';
    modal.style.top = `${anchorRect.bottom + 8}px`;
    modal.style.left = `${anchorRect.left}px`;
    modal.style.zIndex = '2000';
  };

  const closeModal = () => {
    const modalToRemove = document.getElementById('featureCreatorModal');
    if (modalToRemove) modalToRemove.remove();
    document.body.removeEventListener('click', closeModal, true);
    window.removeEventListener('resize', repositionModal, true);
  };


  const genericType = geometryType === 'point' ? 'generic-pin' : (geometryType === 'polygon' ? 'generic-area' : 'generic-line');
  const genericDef = getTaxonomyItem(genericType);
  const genericItem = el('li', { text: genericDef.name });
  genericItem.addEventListener('click', (e) => {
    e.stopPropagation();
    window.activateToolWithTemplate(genericType, geometryType);
  });
  listItems.push(el('li', { class: 'menu-header', text: 'Generic' }), genericItem);

  const customTemplates = state.templates.filter(t => t.geometry === geometryType);
  if (customTemplates.length > 0) {
    listItems.push(el('li', { class: 'divider' }));
    listItems.push(el('li', { class: 'menu-header', text: 'My Templates' }));

    customTemplates.forEach(template => {
      const deleteBtn = el('button', {
        class: 'small-x-btn',
        title: `Delete template "${template.name}"`,
      }, [
        el('div', { class: 'icon-container', style: '-webkit-mask-image: url("ui-icons/x-circle.svg"); mask-image: url("ui-icons/x-circle.svg");' })
      ]);

      const templateItem = el('li', {
        style: 'display: flex; justify-content: space-between; align-items: center;'
      }, [
        el('span', { text: template.name }),
        deleteBtn
      ]);

      templateItem.addEventListener('click', (e) => {
        if (e.target === deleteBtn) return;
        e.stopPropagation();
        window.activateToolWithTemplate(template.templateId, geometryType);
      });

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTemplate(template.templateId); // This function lives in worldbuilder.js
        closeModal();
      });

      listItems.push(templateItem);
    });
  }

  // Final assembly (no style attribute needed here anymore)
  modal.appendChild(el('ul', { class: 'is-dropdown-menu' }, listItems));
  document.body.appendChild(modal);

  repositionModal();

  setTimeout(() => {
    document.body.addEventListener('click', closeModal, { once: true, capture: true });
    window.addEventListener('resize', repositionModal, { capture: true });
  }, 0);
}

const HUB_PANE_IDS = {
  world:     'hubPaneWorld',
  open:      'hubPaneOpen',
  general:   'settingsPaneGeneral',
  calendar:  'settingsPaneCalendar',
  dice:      'settingsPaneDice',
  theme:     'settingsPaneTheme',
  templates: 'settingsPaneTemplates',
  about:     'settingsPaneAbout',
};

const HUB_PANE_TITLES = {
  world:     () => settings.projectName || 'My World',
  open:      () => 'Open World',
  general:   () => 'General',
  calendar:  () => 'Calendar',
  theme:     () => 'Appearance',
  templates: () => 'Templates',
  dice:      () => '3D Dice',
  about:     () => 'About',
};

function updateGeneralPreview() {
  const size = parseInt($('#globalMarkerSizeIn')?.value, 10) || 40;
  const isPopup = $('#featureClickActionToggle')?.checked ?? false;
  const badge = $('#generalMarkerSizeVal');
  const pin   = $('#gspPin');
  const popup = $('#gspPopup');
  const peek  = $('#gspPeek');
  if (badge) badge.textContent = size + 'px';
  if (pin)   pin.style.setProperty('--gsp-size', size + 'px');
  if (popup) popup.classList.toggle('hidden', !isPopup);
  if (peek)  peek.classList.toggle('hidden',  isPopup);
}

function openHubPane(pane = 'world') {
  const modal = $('#projectActionsModal');
  if (!modal) return;

  // Activate sidebar item
  modal.querySelectorAll('.settings-nav-item[data-pane]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pane === pane);
  });

  // Show correct pane
  const targetId = HUB_PANE_IDS[pane] || 'hubPaneWorld';
  modal.querySelectorAll('.hub-pane').forEach(p => {
    p.classList.toggle('active', p.id === targetId);
  });

  // Update title
  const titleEl = $('#hubPaneTitle');
  if (titleEl) titleEl.textContent = (HUB_PANE_TITLES[pane] || (() => 'TaleTrove'))();

  // Initialize pane-specific data
  if (pane === 'world') {
    const nameEl = $('#hubCurrentProjectName');
    if (nameEl) nameEl.textContent = settings.projectName || 'Untitled World';
    const sidebarNameEl = $('#hubSidebarWorldName');
    if (sidebarNameEl) sidebarNameEl.textContent = settings.projectName || 'My World';
  }
  if (pane === 'calendar') populateCalendarSettings();
  if (pane === 'theme') populateThemeSettings();
  if (pane === 'about') {
    const versionEl = $('#aboutHubVersion');
    if (versionEl) versionEl.textContent = 'v' + APP_VERSION;
  }
  if (pane === 'general') {
    $('#globalMarkerSizeIn').value = settings.globalMarkerSize || 40;
    $('#featureClickActionToggle').checked = settings.featureClickAction === 'popup';
    updateGeneralPreview();
  }
  if (pane === 'dice') populateDiceSettings();
  if (pane === 'templates') populateTemplatesSettings();

  modal.classList.remove('hidden');
}

function openSettingsHub(tab = 'general') { openHubPane(tab); }

function showHubOverview() { openHubPane('world'); }

function initModals() {
  const hubModal = $('#projectActionsModal');
  if (hubModal) {
    hubModal.querySelectorAll('.settings-nav-item[data-pane]').forEach(btn => {
      btn.addEventListener('click', () => openHubPane(btn.dataset.pane));
    });

    const applyMarkerSize = debounce(async () => {
      settings.globalMarkerSize = parseInt($('#globalMarkerSizeIn').value, 10) || 40;
      await save();
      render({ full: true });
      showToast('Marker size updated.');
    }, 600);
    $('#globalMarkerSizeIn').addEventListener('input', () => {
      updateGeneralPreview();
      applyMarkerSize();
    });

    $('#featureClickActionToggle').addEventListener('change', () => {
      settings.featureClickAction = $('#featureClickActionToggle').checked ? 'popup' : 'content';
      saveLS('worldSettings', settings);
      updateGeneralPreview();
      showToast('Settings saved.');
    });

    const applyDice = debounce(async () => {
      settings.diceColor = $('#diceColorIn').value;
      settings.diceTheme = $('#diceThemeSel').value;
      await save();
      showToast('Dice settings saved.');
    }, 400);
    $('#diceColorIn').addEventListener('input', applyDice);
    $('#diceThemeSel').addEventListener('change', applyDice);
  }

  document.querySelectorAll('.js-modal-overlay').forEach(overlay => {
    const closeButtons = overlay.querySelectorAll('.js-modal-close');
    const isSideSheet = overlay.classList.contains('is-side-sheet');
    const closeModal = () => {
      const isHubOrFs = overlay.classList.contains('is-hub') || overlay.classList.contains('is-fullscreen');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if ((isHubOrFs || isSideSheet) && !reducedMotion) {
        // Unscale the app shell immediately so map reveals as hub fades out
        if (isHubOrFs && window.setAppShellScaled) window.setAppShellScaled(false);
        if (isSideSheet) overlay.classList.remove('is-open');
        overlay.classList.add('is-exiting');
        setTimeout(() => {
          overlay.classList.remove('is-exiting');
          overlay.classList.add('hidden');
        }, isHubOrFs ? 280 : 200);
      } else {
        if (isSideSheet) overlay.classList.remove('is-open');
        overlay.classList.add('hidden');
      }
    };
    closeButtons.forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
    if (overlay.classList.contains('is-side-sheet')) {
      // Overlay is pointer-events:none — listen at document level instead
      // Use .is-open (not .hidden) since display:flex !important keeps them in the layout always
      // data-persistent side-sheets (e.g. help cheat-sheet) stay open until explicitly closed
      if (!overlay.dataset.persistent) {
        document.addEventListener('click', (e) => {
          if (overlay.classList.contains('is-open') && !overlay.querySelector('.modal-content').contains(e.target)) {
            closeModal();
          }
        }, true);
      }
    } else {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });
    }
    window.addEventListener('keydown', (e) => {
      const isVisible = isSideSheet ? overlay.classList.contains('is-open') : !overlay.classList.contains('hidden');
      if (e.key === 'Escape' && isVisible) {
        closeModal();
      }
      // Focus trap: keep Tab within the open modal
      if (e.key === 'Tab' && isVisible) {
        const focusable = Array.from(overlay.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.closest('.hidden'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    });

    // Handle Opening/Closing via class changes
    let lastHidden = overlay.classList.contains('hidden');
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isHidden = overlay.classList.contains('hidden');
          if (isHidden !== lastHidden) {
            lastHidden = isHidden;
            const isHubOrFs = overlay.classList.contains('is-fullscreen') || overlay.classList.contains('is-hub');
            if (isHubOrFs && window.setAppShellScaled) {
              window.setAppShellScaled(!isHidden);
            }
          }
        }
      });
    });
    observer.observe(overlay, { attributes: true });
  });

  // toastUndoBtn is now created dynamically per-toast — no static wiring needed

  const welcomeModal = $('#welcomeModal');
  if (welcomeModal) {
    const hook = () => {
      if ($('#neverShowWelcomeChk')?.checked) {
        saveLS('hideWelcomePermanently', true);
      }
      if (typeof updateLoadMapButtonState === 'function') {
        updateLoadMapButtonState();
      }
    };
    welcomeModal.querySelectorAll('.js-modal-close').forEach(btn => {
      btn.addEventListener('click', hook);
    });
    welcomeModal.addEventListener('click', (e) => {
      if (e.target === welcomeModal) hook();
    });
  }

  $('#timelineZoomInBtn')?.addEventListener('click', () => zoomTimeline('in'));
  $('#timelineZoomOutBtn')?.addEventListener('click', () => zoomTimeline('out'));
  $('#timelineZoomResetBtn')?.addEventListener('click', () => zoomTimeline('reset'));
  $('#timelineJumpToDateBtn')?.addEventListener('click', () => jumpToTimelineDate());

  // Wheel / trackpad zoom on the timeline content area
  let zoomRaf = null;
  $('#timelineViewerContent')?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    timelineZoomLevel *= factor;
    timelineZoomLevel = Math.max(0.2, Math.min(timelineZoomLevel, 20));

    if (!zoomRaf) {
      zoomRaf = requestAnimationFrame(() => {
        const ganttContainer = document.querySelector('#timelineViewerContent .gantt-grid-wrapper');
        if (ganttContainer) ganttContainer.style.width = `${100 * timelineZoomLevel}%`;
        applyTimelineZoom();
        zoomRaf = null;
      });
    }
  }, { passive: false });

  document.querySelectorAll('.seg button').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.parentElement;
      parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const iconPickerModal = $('#iconPickerModal');
  if (iconPickerModal) {
    const iconGrid = $('#iconPickerGrid');
    const iconSearchInput = $('#iconSearchInput');

    // Create the filter checkbox and label
    const customOnlyLabel = el('label', { style: 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; cursor: pointer; user-select: none; justify-content: flex-start;' }, [
      el('span', { text: 'Show Custom Only', style: 'font-size: 13px; font-weight: 500; color: var(--muted); white-space: nowrap;' }),
      el('input', { type: 'checkbox', id: 'customIconsOnlyChk', style: 'flex-shrink: 0;' })
    ]);
    iconSearchInput.before(customOnlyLabel);

    const customOnlyChk = $('#customIconsOnlyChk');
    customOnlyChk.addEventListener('change', () => {
      // When the checkbox changes, just rebuild the grid
      populateIconGrid();
    });

    const tooltipEl = el('div', { class: 'js-tooltip' });

    const populateIconGrid = async () => {
      iconGrid.innerHTML = '';
      const showCustomOnly = customOnlyChk.checked;

      const createGridItem = async (iconClass, isCustom = false) => {
        // Corrected line: pass 'var(--text)' as the color
        const iconHtml = await getIconHTML(iconClass, 'var(--text)');
        const item = el('div', {
          class: 'icon-grid-item',
          'data-icon-class': iconClass,
          'data-tooltip': iconClass
        }, [el('div', { innerHTML: iconHtml })]);

        if (isCustom) {
          item.dataset.isCustom = 'true';
          item.addEventListener('contextmenu', (e) => showIconContextMenu(e, iconClass));
        }

        // Tooltip logic
        item.addEventListener('mouseenter', () => {
          tooltipEl.textContent = item.dataset.tooltip;
          document.body.appendChild(tooltipEl);
          const targetRect = item.getBoundingClientRect();
          const tooltipRect = tooltipEl.getBoundingClientRect();
          
          let left = targetRect.left + (targetRect.width / 2);
          const halfWidth = tooltipRect.width / 2;

          // Bounds check
          if (left + halfWidth > window.innerWidth - 10) {
            left = window.innerWidth - halfWidth - 10;
          }
          if (left - halfWidth < 10) {
            left = halfWidth + 10;
          }

          tooltipEl.style.left = `${left}px`;
          tooltipEl.style.top = `${targetRect.top - 8}px`;
          tooltipEl.style.transform = 'translateX(-50%) translateY(-100%)';
          tooltipEl.classList.add('visible');
        });

        item.addEventListener('mouseleave', () => {
          tooltipEl.classList.remove('visible');
        });

        return item;
      };

      const addIconItem = await createGridItem('plus');
      addIconItem.classList.add('add-icon-btn');
      addIconItem.dataset.tooltip = 'Upload Custom Icon';
      addIconItem.onclick = () => { $('#customIconFile').click(); };
      iconGrid.appendChild(addIconItem);

      for (const iconClass of CUSTOM_ICON_MANIFEST) {
        const item = await createGridItem(iconClass, true);
        iconGrid.appendChild(item);
      }

      if (!showCustomOnly) {
        for (const iconClass of ICON_MANIFEST.sort()) {
          const item = await createGridItem(iconClass, false);
          iconGrid.appendChild(item);
        }
      }
    };

    // Expose the function so we can refresh the grid from elsewhere
    iconPickerModal.populateGrid = populateIconGrid;
    populateIconGrid();

    iconSearchInput.addEventListener('input', () => {
      const query = normalizeForSearch(iconSearchInput.value.trim());
      const items = iconGrid.querySelectorAll('.icon-grid-item');
      items.forEach(item => {
        if (item.classList.contains('add-icon-btn')) {
          item.style.display = 'flex';
          return;
        }
        const iconName = normalizeForSearch(item.dataset.iconClass);
        const synonyms = ICON_SYNONYMS[item.dataset.iconClass] || [];
        const matches = !query
          || iconName.includes(query)
          || synonyms.some(s => normalizeForSearch(s).includes(query));
        item.style.display = matches ? 'flex' : 'none';
      });
    });

    const closeIconPicker = () => {
      window.currentTargetFeatureForIcon = null;
      closeSideSheet(iconPickerModal);
    };

    // Emoji tab
    const iconPickerTabs = iconPickerModal.querySelectorAll('.icon-picker-tab');
    const iconsPanel = $('#iconPickerIconsPanel');
    const emojiPanel = $('#iconPickerEmojiPanel');

    const EMOJI_CATEGORIES = [
      { label: 'Characters', emojis: ['👑','🧙','🧝','🧛','👸','🤴','🧟','🧞','🧜','🧚','🦸','🦹','🏹','⚔️','🛡️','👤','🕵️'] },
      { label: 'Creatures',  emojis: ['🐉','🦄','🦅','🐺','🦊','🦁','🐻','🦋','🐍','🕷️','🦂','🦈','🐬','🦭','🦎','🐊','🦬','🐗'] },
      { label: 'Nature',     emojis: ['🌲','🌳','🌴','🌵','🍄','🌾','🌊','🌋','🏔️','⛰️','🏝️','🌿','🍃','❄️','🔥','💧','⚡','🌈','☀️','🌙'] },
      { label: 'Places',     emojis: ['🏰','🏯','⛩️','⛪','🕌','🗼','🏛️','🏕️','🗿','⚓','🌉','🌃','🏗️'] },
      { label: 'Items',      emojis: ['💎','💍','🗡️','🔮','📜','🪄','🪙','💰','🏺','🔑','🗝️','📿','⚗️','🧪','📖','🕯️','🪔','🔔','🎭'] },
      { label: 'Symbols',    emojis: ['⭐','🌟','✨','💫','💀','☠️','👁️','❤️','💙','💚','💛','🖤','⚜️','🔱','⚙️','⚖️','🧭','🚩'] },
    ];

    EMOJI_CATEGORIES.forEach(cat => {
      const section = el('div', { class: 'emoji-category' });
      section.appendChild(el('div', { class: 'emoji-category-label', text: cat.label }));
      const grid = el('div', { class: 'emoji-category-grid' });
      cat.emojis.forEach(emoji => {
        const item = el('div', { class: 'icon-grid-item emoji-grid-item', 'data-emoji': emoji });
        item.textContent = emoji;
        grid.appendChild(item);
      });
      section.appendChild(grid);
      emojiPanel.appendChild(section);
    });

    emojiPanel.addEventListener('click', (e) => {
      const item = e.target.closest('.emoji-grid-item');
      if (!item) return;
      const currentTargetFeature = window.currentTargetFeatureForIcon;
      if (currentTargetFeature) {
        recordState();
        currentTargetFeature.iconClass = item.dataset.emoji;
        let type = 'feature';
        if (state.encyclopedia.some(e => e.id === currentTargetFeature.id)) type = 'encyclopedia';
        else if (state.maps.some(m => m.id === currentTargetFeature.id)) type = 'map';
        markEntityDirty(type, currentTargetFeature.id);
        render({ full: true });
        if (window.updateSingleFeatureUI) window.updateSingleFeatureUI(currentTargetFeature);
        debouncedSave();
        closeIconPicker();
      }
    });

    iconPickerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        iconPickerTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const showEmoji = tab.dataset.tab === 'emoji';
        iconsPanel.classList.toggle('hidden', showEmoji);
        emojiPanel.classList.toggle('hidden', !showEmoji);
      });
    });

    window.openIconPicker = (feature) => {
      window.currentTargetFeatureForIcon = feature;
      iconSearchInput.value = '';
      iconSearchInput.dispatchEvent(new Event('input'));
      iconPickerTabs.forEach(t => t.classList.remove('active'));
      iconPickerModal.querySelector('[data-tab="icons"]').classList.add('active');
      iconsPanel.classList.remove('hidden');
      emojiPanel.classList.add('hidden');
      openSideSheet(iconPickerModal);
      iconSearchInput.focus();
    };

    iconGrid.addEventListener('click', (e) => {
      const item = e.target.closest('.icon-grid-item');
      if (!item || item.classList.contains('add-icon-btn')) return;

      const currentTargetFeature = window.currentTargetFeatureForIcon;
      if (item && currentTargetFeature) {
        recordState();
        currentTargetFeature.iconClass = item.dataset.iconClass;

        let type = 'feature';
        if (state.encyclopedia.some(e => e.id === currentTargetFeature.id)) type = 'encyclopedia';
        else if (state.maps.some(m => m.id === currentTargetFeature.id)) type = 'map';
        markEntityDirty(type, currentTargetFeature.id);

        render({ full: true });
        if (window.updateSingleFeatureUI) window.updateSingleFeatureUI(currentTargetFeature);
        debouncedSave();
        closeIconPicker();
      }
      });
    // Handle manual close (X button, overlay click, ESC) to clear state
    iconPickerModal.querySelectorAll('.js-modal-close').forEach(btn => {
      btn.addEventListener('click', () => window.currentTargetFeatureForIcon = null);
    });
    // For overlay click and ESC, we can't easily hook into the generic initModals logic without changing it,
    // but the generic logic just adds 'hidden'. If we open it again, openIconPicker sets the feature.
    // The safest way is to ensure it's null when hidden.
  }


  const pinShapePickerModal = $('#pinShapePickerModal');
  if (pinShapePickerModal) {
    const shapeGrid = $('#pinShapePickerGrid');
    const shapeSearchInput = $('#shapeSearchInput');
    const customShapeFile = $('#customShapeFile');
    let currentTargetFeature = null;

    const populateShapeGrid = async () => {
      shapeGrid.innerHTML = '';

      const createGridItem = async (shapeName, pathData, isCustom = false) => {
        let svg;
        if (isCustom) {
          const blobUrl = await resolveImageUrl(shapeName);
          svg = `<div class="icon-container" style="-webkit-mask-image: url('${blobUrl}'); mask-image: url('${blobUrl}');"></div>`;
        } else if (shapeName === 'plus') {
          svg = `<div class="icon-container" style="-webkit-mask-image: url('ui-icons/plus.svg'); mask-image: url('ui-icons/plus.svg');"></div>`;
        } else {
          svg = `<svg viewBox="0 0 256 256" fill="currentColor"><path d="${pathData}"></path></svg>`;
        }
        
        const item = el('div', { 
          class: 'icon-grid-item', 
          'data-shape-name': shapeName, 
          'data-is-custom': isCustom
        }, [el('div', { innerHTML: svg })]);
        
        if (isCustom) item.dataset.tooltip = shapeName.replace('cs-', '');
        else item.dataset.tooltip = shapeName;

        return item;
      };

      const addShapeItem = await createGridItem('plus');
      addShapeItem.classList.add('add-icon-btn');
      addShapeItem.dataset.tooltip = 'Upload Custom Shape (SVG)';
      addShapeItem.onclick = () => { customShapeFile.click(); };
      shapeGrid.appendChild(addShapeItem);

      for (const shapeKey of CUSTOM_SHAPE_MANIFEST) {
        const item = await createGridItem(shapeKey, null, true);
        shapeGrid.appendChild(item);
      }

      for (const [shapeName, pathData] of Object.entries(PIN_SHAPES)) {
        const item = await createGridItem(shapeName, pathData, false);
        shapeGrid.appendChild(item);
      }
    };

    pinShapePickerModal.populateGrid = populateShapeGrid;
    populateShapeGrid();

    shapeSearchInput.addEventListener('input', () => {
      const query = shapeSearchInput.value.toLowerCase().trim();
      const items = shapeGrid.querySelectorAll('.icon-grid-item');
      items.forEach(item => {
        if (item.classList.contains('add-icon-btn')) {
          item.style.display = 'flex';
          return;
        }
        const name = item.dataset.shapeName.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
      });
    });

    customShapeFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.type !== 'image/svg+xml') {
        showAlertModal('Invalid File', 'Please upload an SVG file for custom shapes.');
        customShapeFile.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        // Basic SVG validation
        if (!content.includes('<svg')) {
          showAlertModal('Invalid SVG', 'The uploaded file does not appear to be a valid SVG.');
          return;
        }

        const id = 'cs-' + file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' + uid(4);
        const blob = new Blob([content], { type: 'image/svg+xml' });
        
        await idbSaveObject(id, blob, 'files');
        await loadCustomAssets();
        await populateShapeGrid();
        showToast('Custom shape added.');
        customShapeFile.value = '';
      };
      reader.readAsText(file);
    });

    window.openPinShapePicker = (feature) => {
      currentTargetFeature = feature;
      shapeSearchInput.value = '';
      shapeSearchInput.dispatchEvent(new Event('input'));
      openSideSheet(pinShapePickerModal);
      shapeSearchInput.focus();
    };

    shapeGrid.addEventListener('click', (e) => {
      const item = e.target.closest('.icon-grid-item');
      if (!item || item.classList.contains('add-icon-btn')) return;

      if (currentTargetFeature) {
        recordState();
        currentTargetFeature.pinShape = item.dataset.shapeName;

        let type = 'feature';
        if (state.encyclopedia.some(e => e.id === currentTargetFeature.id)) type = 'encyclopedia';
        else if (state.maps.some(m => m.id === currentTargetFeature.id)) type = 'map';
        markEntityDirty(type, currentTargetFeature.id);

        render({ full: true });
        if (window.updateSingleFeatureUI) window.updateSingleFeatureUI(currentTargetFeature);
        debouncedSave();
        closeSideSheet(pinShapePickerModal);
      }
    });
  }

  const newsModal = $('#newsModal');
  if (newsModal) {
    $('#markAllReadBtn').addEventListener('click', () => {
      if (window.LATEST_NEWS_VERSION) {
        saveLS('lastSeenNewsVersion', window.LATEST_NEWS_VERSION);
        $('#newUpdateChip').classList.add('hidden');
        // Remove unread state from all cards
        newsModal.querySelectorAll('.news-card.is-unread').forEach(c => {
          c.classList.remove('is-unread');
          c.querySelector('.news-unread-dot')?.remove();
        });
      }
    });
  }

  initBugReporter();
}

let currentEditingTemplateId = null;

/**
 * Hides the template list and shows the edit form for a specific template.
 */
function showTemplateEditView(templateId) {
  const template = state.templates.find(t => t.templateId === templateId);
  if (!template) return;

  currentEditingTemplateId = templateId;

  $('#templateListView').classList.add('hidden');
  $('#templateEditView').classList.remove('hidden');
  $('#templateEditTitle').textContent = `Edit "${template.name}"`;

  const formContainer = $('#templateEditForm');
  formContainer.innerHTML = '';

  const nameInput = el('input', {
    type: 'text',
    id: 'templateNameInput',
    value: template.name
  });
  formContainer.append(
    el('div', { class: 'form-label', text: 'Template Name' }),
    el('div', { class: 'full-width' }, [nameInput])
  );
}

/**
 * Renders the template list into the Templates settings pane.
 */
const LAYOUT_TEMPLATE_TYPE_LABELS = { feature: 'Atlas', encyclopedia: 'Encyclopedia', map: 'Map' };

function populateTemplatesSettings() {
  const listView = $('#templateListView');
  const editView = $('#templateEditView');
  const listContainer = $('#templateListContainer');
  const layoutListContainer = $('#layoutTemplateListContainer');
  if (!listContainer) return;

  listView?.classList.remove('hidden');
  editView?.classList.add('hidden');
  listContainer.innerHTML = '';
  if (layoutListContainer) layoutListContainer.innerHTML = '';
  currentEditingTemplateId = null;

  if (state.templates.length === 0) {
    listContainer.appendChild(el('p', { class: 'muted', text: 'No feature templates saved yet.' }));
  } else {
    let needsMetaSave = false;
    state.templates.forEach(template => {
      // Migration: templates saved before templateId was introduced may only have 'id'
      if (!template.templateId) {
        template.templateId = template.id || ('template-' + uid());
        needsMetaSave = true;
      }

      const tid = template.templateId;
      const editBtn = el('button', { class: 'ghost', text: 'Edit' });
      const deleteBtn = el('button', { class: 'danger', text: 'Delete' });

      editBtn.dataset.templateId = tid;
      deleteBtn.dataset.templateId = tid;

      editBtn.addEventListener('click', () => showTemplateEditView(editBtn.dataset.templateId));
      deleteBtn.addEventListener('click', () => {
        const id = deleteBtn.dataset.templateId;
        showConfirmationModal('Delete Template?', `Are you sure you want to delete the "${template.name}" template?`, 'Delete', () => {
          window.deleteTemplate(id);
          populateTemplatesSettings();
        });
      });

      listContainer.appendChild(el('div', { class: 'template-list-item' }, [
        el('span', { class: 'template-item-name', text: template.name }),
        el('div', { class: 'template-item-actions' }, [editBtn, deleteBtn])
      ]));
    });
    if (needsMetaSave) { markEntityDirty('meta'); debouncedSave(); }
  }

  if (!layoutListContainer) return;
  const layoutTemplates = state.layoutTemplates || [];
  if (layoutTemplates.length === 0) {
    layoutListContainer.appendChild(el('p', { class: 'muted', text: 'No layout templates saved yet.' }));
  } else {
    layoutTemplates.forEach(tpl => {
      const typeLabel = LAYOUT_TEMPLATE_TYPE_LABELS[tpl.entityType] || 'All';
      const deleteBtn = el('button', { class: 'danger', text: 'Delete' });
      deleteBtn.onclick = () => {
        showConfirmationModal('Delete Layout Template?', `Are you sure you want to delete the "${tpl.name}" layout?`, 'Delete', () => {
          window.deleteLayoutTemplate(tpl.id);
          populateTemplatesSettings();
        });
      };

      layoutListContainer.appendChild(el('div', { class: 'template-list-item' }, [
        el('span', { class: 'template-item-name', text: tpl.name }),
        el('div', { class: 'template-item-actions' }, [
          el('span', { class: 'chip', text: typeLabel }),
          el('span', { class: 'chip muted', text: `${tpl.blocks.length} blocks` }),
          deleteBtn
        ])
      ]));
    });
  }
}

/**
 * Opens the Template Manager (now lives in Master Settings → Templates tab).
 */
function openTemplateManager() {
  openSettingsHub('templates');
}

// Wire up save/cancel for the edit sub-view
document.addEventListener('DOMContentLoaded', () => {
  $('#cancelTemplateEditBtn')?.addEventListener('click', () => {
    populateTemplatesSettings();
  });

  $('#saveTemplateEditBtn')?.addEventListener('click', () => {
    if (!currentEditingTemplateId) return;
    const template = state.templates.find(t => t.templateId === currentEditingTemplateId);
    if (!template) return;

    const newName = $('#templateNameInput')?.value.trim();
    if (newName) {
      recordState();
      template.name = newName;
      debouncedSave();
      showToast('Template saved!');
    }
    populateTemplatesSettings();
  });
});

async function openCoatOfArmsModal(feature) {
  const SHIELD_OPTIONS = [
    { label: 'Heater',      value: 'heater' },
    { label: 'Spanish',     value: 'spanish' },
    { label: 'French',      value: 'french' },
    { label: 'Round',       value: 'round' },
    { label: 'Oval',        value: 'oval' },
    { label: 'Diamond',     value: 'diamond' },
    { label: 'Renaissance', value: 'renaissance' },
    { label: 'Kite',        value: 'kite' },
    { label: 'Polish',      value: 'polish' },
  ];

  let currentShield = feature.coatOfArms?.shield || 'heater';
  let currentSeed   = feature.coatOfArms?.seed   || feature.id;
  let pendingFile = null;
  let pendingPreviewUrl = null;

  const modal = el('div', { class: 'modal-overlay', id: 'coatOfArmsModal' });
  const content = el('div', { class: 'modal-content' });

  const closeBtn = el('button', { class: 'modal-close', title: 'Close' }, [
    el('div', { class: 'icon-container', style: '-webkit-mask-image: url("ui-icons/x.svg"); mask-image: url("ui-icons/x.svg");' })
  ]);

  // Left column: live SVG preview
  const previewEl = el('div', { class: 'coa-modal-preview' });

  // Right column: shield picker + upload
  const shieldSel = el('select', { class: 'coa-shield-select' },
    SHIELD_OPTIONS.map(o => el('option', { value: o.value, text: o.label, ...(o.value === currentShield ? { selected: true } : {}) }))
  );

  const uploadInput = el('input', { type: 'file', accept: 'image/*', class: 'sr-only' });
  const uploadPreview = el('div', { class: 'coa-upload-preview is-empty' }, [
    el('span', { text: 'Drag & drop or click to upload a custom image' })
  ]);
  const uploadBtn = el('button', { class: 'ghost full-width' }, [uploadPreview]);
  uploadBtn.onclick = () => uploadInput.click();

  const saveBtn = el('button', { class: 'primary', text: 'Save' });
  const cancelBtn = el('button', { class: 'ghost', text: 'Cancel' });

  const cleanup = () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
      pendingPreviewUrl = null;
    }
  };

  const closeModal = () => {
    cleanup();
    modal.remove();
  };

  const updatePreview = async () => {
    if (pendingFile) return; // custom image upload — don't overwrite with SVG
    if (!window.generateCoatOfArms) {
      previewEl.textContent = 'Armoria library not loaded.';
      return;
    }
    previewEl.innerHTML = '';
    try {
      const coaUrl = await window.generateCoatOfArms(currentSeed, { shield: currentShield, size: 200 });
      previewEl.innerHTML = `<img src="${coaUrl}" alt="Coat of Arms Preview" style="width:100%;height:100%;object-fit:contain;display:block;">`;
    } catch (e) {
      previewEl.textContent = 'Preview unavailable.';
    }
  };

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };

  // Click the preview to pick a new random seed (only when showing generated SVG)
  previewEl.title = 'Click to regenerate';
  previewEl.onclick = () => {
    if (pendingFile) return; // custom image active — don't regenerate
    currentSeed = uid();
    updatePreview();
  };

  shieldSel.onchange = () => {
    currentShield = shieldSel.value;
    // If user switches back to generated, clear any pending custom upload
    if (pendingFile) {
      pendingFile = null;
      cleanup();
      uploadPreview.innerHTML = '';
      uploadPreview.appendChild(el('span', { text: 'Drag & drop or click to upload a custom image' }));
      uploadPreview.classList.add('is-empty');
    }
    updatePreview();
  };

  uploadInput.onchange = () => {
    const file = uploadInput.files[0];
    if (!file) return;
    cleanup();
    pendingFile = file;
    pendingPreviewUrl = URL.createObjectURL(file);
    uploadPreview.innerHTML = '';
    const img = el('img', { src: pendingPreviewUrl, style: 'width:100%;height:100%;object-fit:contain;display:block;' });
    uploadPreview.appendChild(img);
    uploadPreview.classList.remove('is-empty');
    // Clear SVG preview area since custom image takes over
    previewEl.innerHTML = '';
    const previewImg = el('img', { src: pendingPreviewUrl, style: 'width:100%;height:100%;object-fit:contain;display:block;' });
    previewEl.appendChild(previewImg);
  };

  // Drag-drop on upload button
  uploadBtn.ondragover = (e) => { e.preventDefault(); uploadBtn.classList.add('drag-over'); };
  uploadBtn.ondragleave = () => uploadBtn.classList.remove('drag-over');
  uploadBtn.ondrop = (e) => {
    e.preventDefault();
    uploadBtn.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      uploadInput.files = e.dataTransfer.files; // doesn't always work, use directly
      // Trigger manually
      cleanup();
      pendingFile = file;
      pendingPreviewUrl = URL.createObjectURL(file);
      uploadPreview.innerHTML = '';
      const img = el('img', { src: pendingPreviewUrl, style: 'width:100%;height:100%;object-fit:contain;display:block;' });
      uploadPreview.appendChild(img);
      uploadPreview.classList.remove('is-empty');
      previewEl.innerHTML = '';
      const previewImg = el('img', { src: pendingPreviewUrl, style: 'width:100%;height:100%;object-fit:contain;display:block;' });
      previewEl.appendChild(previewImg);
    }
  };

  saveBtn.onclick = async () => {
    recordState();
    const type = feature.id?.startsWith('ent-') || feature.id?.startsWith('ency-') || feature.kind === 'entry' ? 'encyclopedia' : 'feature';
    
    if (pendingFile) {
      const processed = await processImageUpload(pendingFile);
      const newKey = 'img-' + uid();
      await idbSet(newKey, processed);
      // Remove old custom key if any
      if (feature.coatOfArmsKey) {
        idbDelete(feature.coatOfArmsKey).catch(() => {});
      }
      feature.coatOfArmsKey = newKey;
      feature.coatOfArms    = null;
    } else {
      feature.coatOfArms    = { shield: currentShield, seed: currentSeed !== feature.id ? currentSeed : null };
      feature.coatOfArmsKey = null;
    }
    markEntityDirty(type, feature.id);
    if (window.updateCoaMarkerFor) window.updateCoaMarkerFor(feature.id);
    if ($('#infoPanel').classList.contains('is-visible')) showInfoPanel(feature.id, type);
    debouncedSave();
    closeModal();
  };

  const rightCol = el('div', { class: 'coa-modal-right' }, [
    el('div', { class: 'form-label', text: 'Shield Shape' }),
    shieldSel,
    el('div', { class: 'form-label', style: 'margin-top: 1rem;', text: 'Custom Image (overrides generated)' }),
    uploadInput,
    uploadBtn,
  ]);

  const previewHint = el('p', { class: 'coa-preview-hint muted', text: 'Click to regenerate' });
  const previewCol = el('div', { class: 'coa-modal-preview-col' }, [previewEl, previewHint]);
  const twoCol = el('div', { class: 'coa-modal-cols' }, [previewCol, rightCol]);

  content.append(
    closeBtn,
    el('h3', { text: 'Coat of Arms' }),
    twoCol,
    el('div', { class: 'modal-actions' }, [cancelBtn, saveBtn])
  );
  modal.appendChild(content);
  document.body.appendChild(modal);

  // Initial preview
  if (feature.coatOfArmsKey) {
    const url = await resolveImageUrl(feature.coatOfArmsKey);
    if (url) {
      const img = el('img', { src: escapeHtml(url), style: 'width:100%;height:100%;object-fit:contain;display:block;' });
      previewEl.appendChild(img);
      const uploadImg = el('img', { src: escapeHtml(url), style: 'width:100%;height:100%;object-fit:contain;display:block;' });
      uploadPreview.innerHTML = '';
      uploadPreview.appendChild(uploadImg);
      uploadPreview.classList.remove('is-empty');
    }
  } else {
    updatePreview();
  }
}

async function jumpToTimelineDate() {
  const cal = settings.donjonCalendar;
  if (!cal) return;

  const yearIn = el('input', { type: 'number', value: settings.currentDate?.year || 1, style: 'width: 100%' });
  const monthSel = el('select', { style: 'width: 100%' }, cal.months.map(m => el('option', { value: m, text: m, selected: m === settings.currentDate?.month })));
  const dayIn = el('input', { type: 'number', value: settings.currentDate?.day || 1, style: 'width: 100%' });

  const content = el('div', { class: 'form', style: 'gap: 1rem;' }, [
    el('div', {}, [el('div', { class: 'form-label', text: 'Year' }), yearIn]),
    el('div', {}, [el('div', { class: 'form-label', text: 'Month' }), monthSel]),
    el('div', {}, [el('div', { class: 'form-label', text: 'Day' }), dayIn])
  ]);

  showCustomPromptModal('Jump to Date', content, async () => {
    const y = parseInt(yearIn.value, 10) || 1;
    const m = monthSel.value;
    const d = parseInt(dayIn.value, 10) || 1;
    const dateStr = `Year ${y}, ${m}, Day ${d}`;
    const targetSort = parseSortableDate(dateStr);

    const ganttWrapper = $('#timelineViewerContent .gantt-grid-wrapper');
    if (!ganttWrapper) return;

    // We need the range from the last render
    // Instead of re-calculating everything, we'll try to find the current bounds from the UI markers
    const markers = Array.from(ganttWrapper.querySelectorAll('.gantt-year-marker'));
    if (markers.length < 1) return;

    // Re-calculating range logic since it's not stored globally
    const timelineViewer = $('#timelineViewerContent');
    const allEvents = [];
    for (const feature of state.features) {
      if (feature.blocks) {
        for (const block of feature.blocks) {
          if (block?.type === 'Timeline' && block.data.events) {
            for (const event of block.data.events) {
              allEvents.push({ ...event, sortableDate: parseSortableDate(event.date) });
            }
          }
        }
      }
    }
    // ... including encyclopedia events if active
    if (showEncyclopediaEvents) {
      state.encyclopedia.forEach(entry => {
        if ((entry.type || '').toLowerCase() === 'event' && entry.eventData?.month) {
          const ds = `Year ${entry.eventData.year || '?'}, ${entry.eventData.month}, Day ${entry.eventData.day}`;
          allEvents.push({ sortableDate: parseSortableDate(ds) });
        }
      });
    }
    // ... including sessions with in-world dates (GM only)
    if (role === 'gm') {
      state.encyclopedia.forEach(entry => {
        if ((entry.type || '').toLowerCase() === 'session' && entry.eventData?.year) {
          allEvents.push({ sortableDate: parseSortableDate(entry.eventData) });
        }
      });
    }

    if (!allEvents.length) return;

    const rawMinDate = Math.min(...allEvents.map(e => e.sortableDate));
    const maxDates = allEvents.map(e => {
      if (e.endDateData) {
        const endStr = `Year ${e.endDateData.year || e.dateData?.year || 9999}, ${e.endDateData.month || e.dateData?.month}, Day ${e.endDateData.day}`;
        return parseSortableDate(endStr);
      }
      return e.sortableDate;
    });
    const rawMaxDate = Math.max(...maxDates);
    const rawRange = Math.max(1, rawMaxDate - rawMinDate);
    const padding = Math.ceil(rawRange * 0.05) || 10;
    const minDate = rawMinDate - padding;
    const maxDate = rawMaxDate + padding;
    const range = maxDate - minDate;

    // Zoom in significantly to see the day (e.g., 10x)
    timelineZoomLevel = 10.0;
    ganttWrapper.style.width = `${100 * timelineZoomLevel}%`;

    // Wait for reflow
    requestAnimationFrame(() => {
      const percentage = (targetSort - minDate) / range;
      const scrollWidth = ganttWrapper.scrollWidth;
      const trackWidth = scrollWidth - 200; // Account for 200px category column
      
      const targetX = 200 + (trackWidth * percentage);
      const viewportWidth = ganttWrapper.clientWidth;
      
      ganttWrapper.scrollLeft = targetX - (viewportWidth / 2);
    });
  });
}

/**
 * A specialized prompt that takes a DOM element as content instead of just a string.
 */
function showCustomPromptModal(title, contentEl, onConfirm) {
  const modal = el('div', { class: 'modal-overlay' });
  const content = el('div', { class: 'modal-content', style: 'width: 400px;' });
  
  const close = () => modal.remove();

  const confirmBtn = el('button', { class: 'primary', text: 'Jump' });
  confirmBtn.onclick = () => { onConfirm(); close(); };
  
  const cancelBtn = el('button', { class: 'ghost', text: 'Cancel' });
  cancelBtn.onclick = close;

  content.append(
    el('h3', { text: title }),
    contentEl,
    el('div', { class: 'modal-actions' }, [cancelBtn, confirmBtn])
  );
  modal.appendChild(content);
  document.body.appendChild(modal);
}

function openBugReporter() {
  const modal = $('#bugReportModal');
  if (!modal) return;
  const versionEl = $('#bugVersionIn');
  if (versionEl) versionEl.value = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '—';
  _bugSwitchTab('report');
  openSideSheet(modal);
}

function _bugSwitchTab(tab) {
  const modal = $('#bugReportModal');
  if (!modal) return;
  modal.querySelectorAll('.bug-sheet-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  $('#bugTabReport')?.classList.toggle('active', tab === 'report');
  $('#bugTabKnown')?.classList.toggle('active',  tab === 'known');
  if (tab === 'known') _loadKnownIssues();
}

async function _loadKnownIssues() {
  const list  = $('#knownIssuesList');
  const count = $('#knownIssuesCount');
  if (!list) return;
  list.innerHTML = '<p class="muted" style="text-align:center;padding:2rem 0;font-size:0.85rem;">Loading…</p>';
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/issues?state=open&per_page=30&sort=created&direction=desc`,
      { headers: { 'Accept': 'application/vnd.github+json' } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const issues = await res.json();
    if (count) count.textContent = `${issues.length} open issue${issues.length !== 1 ? 's' : ''}`;
    if (!issues.length) {
      list.innerHTML = '<p class="muted" style="text-align:center;padding:2rem 0;font-size:0.85rem;">No open issues — you\'re all good!</p>';
      return;
    }
    list.innerHTML = '';
    issues.forEach(issue => {
      const labelHtml = issue.labels.map(l => {
        const cls = l.name === 'bug' ? 'bug' : l.name === 'enhancement' ? 'enhancement' : '';
        return `<span class="known-issue-label ${cls}">${escapeHtml(l.name)}</span>`;
      }).join('');
      const item = el('div', { class: 'known-issue-item' });
      item.innerHTML = `
        <div class="known-issue-title">${escapeHtml(issue.title)}</div>
        <div class="known-issue-meta">
          <span class="known-issue-num">#${issue.number}</span>
          ${labelHtml}
          <a class="known-issue-link" href="${escapeHtml(issue.html_url)}" target="_blank" rel="noopener noreferrer">View →</a>
        </div>`;
      list.appendChild(item);
    });
  } catch (e) {
    console.error('[BugReporter] Failed to load issues:', e);
    list.innerHTML = `<p class="muted" style="text-align:center;padding:2rem 0;font-size:0.85rem;">Couldn't load issues (${escapeHtml(e.message)}).<br>If this says 404, the repo may be set to private.</p>`;
  }
}

function _setBugStatus(msg, type) {
  const statusEl = $('#bugSubmitStatus');
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = 'bug-submit-status' + (type ? ` ${type}` : '');
}

function _submitBugIssue() {
  const modal    = $('#bugReportModal');
  const typeBtn  = modal?.querySelector('.bug-type-btn.active');
  const type     = typeBtn?.dataset.type || 'bug';
  const title    = $('#bugTitleIn')?.value.trim();
  const desc     = $('#bugDescIn')?.value.trim();
  const steps    = $('#bugStepsIn')?.value.trim();
  const sevBtn   = modal?.querySelector('.bug-sev-btn.active');
  const severity = sevBtn?.dataset.sev || 'medium';
  const version  = $('#bugVersionIn')?.value || '—';

  if (!title) { _setBugStatus('Title is required.', 'error'); return; }
  if (!desc)  { _setBugStatus('Description is required.', 'error'); return; }

  const isBug = type === 'bug';

  let body = `**Type:** ${isBug ? 'Bug' : 'Feature Request'}\n\n`;
  body    += `**Description:**\n${desc}\n\n`;
  if (isBug && steps) body += `**Steps to Reproduce:**\n${steps}\n\n`;
  if (isBug) body += `**Severity:** ${severity.charAt(0).toUpperCase() + severity.slice(1)}\n\n`;
  body    += `**App Version:** ${version}\n`;
  body    += `**Browser:** ${navigator.userAgent.split(' ').slice(-2).join(' ')}`;

  const ghTitle = encodeURIComponent(title.slice(0, 100));
  const ghBody  = encodeURIComponent(body);
  const url = `https://github.com/${GH_OWNER}/${GH_REPO}/issues/new?title=${ghTitle}&body=${ghBody}`;

  window.open(url, '_blank', 'noopener,noreferrer');
  _setBugStatus('Opening GitHub — finish submitting there.', 'success');
}

function initBugReporter() {
  const modal = $('#bugReportModal');
  if (!modal) return;

  // Tab switching
  modal.querySelectorAll('.bug-sheet-tab').forEach(btn => {
    btn.addEventListener('click', () => _bugSwitchTab(btn.dataset.tab));
  });

  // Type toggle — show/hide steps & severity
  modal.querySelectorAll('.bug-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.bug-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isBug = btn.dataset.type === 'bug';
      $('#bugStepsGroup')?.classList.toggle('hidden', !isBug);
      $('#bugSeverityGroup')?.classList.toggle('hidden', !isBug);
    });
  });

  // Severity buttons
  modal.querySelectorAll('.bug-sev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.bug-sev-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  $('#bugSubmitBtn')?.addEventListener('click', _submitBugIssue);
  $('#knownIssuesRefreshBtn')?.addEventListener('click', _loadKnownIssues);
}

window.openTemplateManager = openTemplateManager;
window.showGlobalTimeline = showGlobalTimeline;
window.openSettingsHub = openSettingsHub;
window.showHubOverview = showHubOverview;
window.openGeneralSettingsModal = openGeneralSettingsModal;
window.openCalendarSettingsModal = openCalendarSettingsModal;
window.openDiceSettingsModal = openDiceSettingsModal;
window.openThemeSettingsModal = openThemeSettingsModal;
window.showToast = showToast;
window.hideToast = hideToast;
window.openBugReporter = openBugReporter;
window.openCoatOfArmsModal = openCoatOfArmsModal;
window.populateNewsModal = populateNewsModal;