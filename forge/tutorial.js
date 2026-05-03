// tutorial.js - Handles the interactive new user tutorial

let currentTutorialStep = 0;
let _activeTourSteps = null; // set by startTutorial — either tourSteps or demoTourSteps

const tourSteps = [
    {
        element: null,
        title: 'Welcome to TaleTrove!',
        text: 'TaleTrove is a local-first world-building tool for GMs, writers, and world-builders — built around a <b>Map-First</b> philosophy.<br><br>This quick tour covers the main areas. Click <b>&times;</b> at any time to skip.',
        position: 'center'
    },
    {
        element: '#brandLogo',
        text: 'The <b>TaleTrove logo</b> opens the Project Hub — where you can create, open, back up, and configure your world.',
        position: 'bottom-left'
    },
    {
        element: '#breadcrumbContainer',
        text: 'This shows your <b>project name</b> and active map. Click the name to edit it — it\'s used as the filename when you export.',
        position: 'right'
    },
    {
        element: '#atlasPanel',
        text: 'The <b>World Panel</b> on the left lists everything in your world — Atlas features, Lore entries, and (for GMs) Session notes — all in a single unified tree.',
        position: 'right'
    },
    {
        element: '#atlasTabBtn',
        text: 'Switch between <b>World</b> (your maps and lore tree) and <b>Assets</b> (images and custom icons you\'ve uploaded) using these tabs.',
        position: 'bottom-left'
    },
    {
        element: '.toolbar',
        text: 'The <b>Toolbar</b> floats over the map. Use it to add pins, draw areas and lines, place text labels, load a map image, and control fog of war.',
        position: 'toolbar-auto'
    },
    {
        element: '#globalSearchInput',
        text: 'The <b>global search bar</b> finds anything in your world instantly — maps, pins, lore entries, and content inside articles.',
        position: 'bottom'
    },
    {
        element: '.role-toggle-wrapper',
        text: 'Toggle between <b>GM</b> and <b>Player</b> view here. As a GM you see everything. Players only see what you\'ve explicitly made visible — great for sharing a live session view.',
        position: 'left'
    },
    {
        element: '#navRail',
        text: 'The <b>left rail</b> gives you quick access to the Global Timeline, Calendar, Relational Graph, and Family Tree views — plus Updates and Help.',
        position: 'right'
    },
    {
        element: '#timelineBtn',
        text: 'The <b>Timeline</b> shows all dated events from across your world in chronological order. Switch between vertical, calendar, and Gantt views.',
        position: 'right'
    },
    {
        element: '#relationalGraphBtn',
        text: 'The <b>Relational Graph</b> visualises how your articles connect to each other through links — locations, factions, characters, and events all in one view.',
        position: 'right'
    },
    {
        element: '#helpBtn',
        text: 'Click <b>Help</b> at any time to re-run this tour or view a full list of keyboard shortcuts.',
        position: 'right'
    },
    {
        element: '#infoPanel',
        text: 'Clicking a map pin opens the <b>Peek Panel</b> here — a quick wiki-style read view. Double-click a pin for the full article. The <b>···</b> button opens the Properties sheet to edit name, icon, type, and visibility.',
        position: 'left'
    },
    {
        element: null,
        title: "You're All Set!",
        text: 'Start by loading a map image, then drop your first pin!<br><br>If you ever need a refresher, click the <b>?</b> icon in the left rail.',
        position: 'center'
    }
];

const demoTourSteps = [
  {
    element: null,
    title: 'Welcome to Aethermoor',
    text: 'This is a sample world built with TaleTrove. Follow along to see what the app can do — nothing here is permanent. Click <b>Next</b> to begin.',
    position: 'center'
  },
  {
    element: '#atlasPanel',
    title: 'The World Panel',
    text: 'Everything in Aethermoor lives here — maps, locations, lore, and session notes in one unified tree. Click any row to navigate to it on the map.',
    position: 'right'
  },
  {
    element: '.toolbar',
    title: 'The Map Toolbar',
    text: 'Add pins, draw regions, place text labels, load your own map image, and toggle fog of war — all from the floating toolbar.',
    position: 'toolbar-auto'
  },
  {
    element: '#infoPanel',
    title: 'Peek Panel',
    text: 'Click any pin on the map to open a quick wiki-style preview here. Hit the expand button for the full article view, or <b>···</b> to edit properties.',
    position: 'left'
  },
  {
    element: '#globalSearchInput',
    title: 'Global Search',
    text: 'Find anything instantly — maps, pins, lore, and content <em>inside</em> articles. Try searching <b>"Ashvane"</b> to see Aethermoor\'s ruling family.',
    position: 'bottom'
  },
  {
    element: '.role-toggle-wrapper',
    title: 'GM / Player View',
    text: 'Toggle between GM and Player view. GM-only pins, articles, and text blocks vanish in Player mode — great for sharing a live session screen.',
    position: 'left'
  },
  {
    element: '#navRail',
    title: 'Views & Tools',
    text: 'The left rail opens the Global Timeline, Calendar, Relational Graph, and Family Tree — all pre-populated with Aethermoor\'s history and characters.',
    position: 'right'
  },
  {
    element: '#timelineBtn',
    title: 'Timeline',
    text: 'Aethermoor\'s history is already mapped here. Switch between vertical scroll, calendar, and Gantt views — events from every article collected automatically.',
    position: 'right'
  },
  {
    element: '#relationalGraphBtn',
    title: 'Relational Graph',
    text: 'Every link between articles becomes a visible edge. Hover any node to trace connections — locations, factions, characters, and events all in one view.',
    position: 'right'
  },
  {
    element: '#brandLogo',
    title: 'Project Hub',
    text: 'The TaleTrove logo opens the Project Hub — create a new world, import an existing one, or export a player-safe bundle to share with your table.',
    position: 'bottom-left'
  },
  {
    element: null,
    title: "Your Turn",
    text: 'You\'ve seen Aethermoor. Now build your own world.<br><br>Load a map from the toolbar, drop your first pin, and start writing. Your data stays on your device — always.<br><br>Click <b>?</b> in the left rail to replay this tour any time.',
    position: 'center'
  }
];

function showDummyInfoPanel() {
    const contentEl = $('#contentContainer');
    const panelEl = $('#infoPanel');
    const containerEl = $('#mainContainer');
    const mask = $('#infoPanelMask');
    if (!contentEl || !panelEl || !containerEl) return;

    contentEl.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
            <h3>Feature Title</h3>
            <p class="muted">This is where detailed information about a selected map feature will appear.</p>
        </div>
    `;

    panelEl.classList.remove('hidden');
    panelEl.classList.add('is-visible');
    containerEl.classList.add('info-panel-visible');
    if (mask) mask.classList.add('is-visible');
}

function startTutorial(isDemoMode = false) {
    _activeTourSteps = isDemoMode ? demoTourSteps : tourSteps;
    $('#tutorialOverlay').classList.remove('hidden');
    goToStep(0);
}

function endTutorial() {
    $('#tutorialOverlay').classList.add('hidden');
    saveLS('hasCompletedTutorial', true);

    const textbox = $('#tutorialTextbox');
    const spotlight = $('#tutorialSpotlight');
    if (textbox) textbox.style.transform = 'none';
    if (spotlight) spotlight.style.opacity = '1';

    const panel = $('#infoPanel');
    const mask = $('#infoPanelMask');
    panel.classList.remove('is-visible');
    $('#mainContainer').classList.remove('info-panel-visible');
    if (mask) mask.classList.remove('is-visible');

    setTimeout(() => {
        panel.classList.add('hidden');
        const contentEl = $('#contentContainer');
        if (contentEl) contentEl.innerHTML = '';
    }, 350);

    updateLoadMapButtonState();
}

async function goToStep(index) {
    const prevStep = currentTutorialStep >= 0 && currentTutorialStep < _activeTourSteps.length ? _activeTourSteps[currentTutorialStep] : null;

    if (prevStep && prevStep.element === '#infoPanel') {
        const panel = $('#infoPanel');
        if (panel) {
            panel.classList.remove('is-visible');
            $('#mainContainer').classList.remove('info-panel-visible');
            infoPanelFeatureId = null;
        }
        await new Promise(resolve => setTimeout(resolve, 350));
    }

    if (index < 0 || index >= _activeTourSteps.length) {
        endTutorial();
        return;
    }

    currentTutorialStep = index;
    const step = _activeTourSteps[index];

    const spotlight = $('#tutorialSpotlight');
    const textbox = $('#tutorialTextbox');

    if (step.element === '#atlasPanel' && asideHidden) {
        toggleAsidePanel(false);
        await new Promise(resolve => setTimeout(resolve, 350));
    }
    if (step.element === '#infoPanel') {
        showDummyInfoPanel();
        await new Promise(resolve => setTimeout(resolve, 350));
    }

    // Resolve dynamic position values
    const position = step.position === 'toolbar-auto'
        ? (document.querySelector('.toolbar')?.classList.contains('bottom') ? 'top' : 'bottom')
        : step.position;
    const resolvedStep = { ...step, position };

    if (step.element) {
        const targetElement = $(step.element);

        if (!targetElement) {
            console.warn(`Tutorial element not found: ${step.element}`);
            goToStep(index + 1);
            return;
        }

        const rect = targetElement.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            console.warn(`Target element ${step.element} has no dimensions.`);
        }

        spotlight.style.left = `${rect.left - 5}px`;
        spotlight.style.top = `${rect.top - 5}px`;
        spotlight.style.width = `${rect.width + 10}px`;
        spotlight.style.height = `${rect.height + 10}px`;
        spotlight.style.opacity = '1';

        const margin = 15;
        let boxWidth = textbox.offsetWidth || 300;
        let boxHeight = textbox.offsetHeight || 150;

        switch (resolvedStep.position) {
            case 'right':
                textbox.style.left = `${rect.right + margin}px`;
                textbox.style.top = `${rect.top}px`;
                break;
            case 'left':
                textbox.style.left = `${rect.left - boxWidth - margin}px`;
                textbox.style.top = `${rect.top}px`;
                break;
            case 'bottom':
                textbox.style.left = `${rect.left + (rect.width / 2) - (boxWidth / 2)}px`;
                textbox.style.top = `${rect.bottom + margin}px`;
                break;
            case 'bottom-right':
                textbox.style.left = `${rect.right - boxWidth}px`;
                textbox.style.top = `${rect.bottom + margin}px`;
                break;
            case 'bottom-left':
                textbox.style.left = `${rect.left}px`;
                textbox.style.top = `${rect.bottom + margin}px`;
                break;
            case 'top':
                textbox.style.left = `${rect.left + (rect.width / 2) - (boxWidth / 2)}px`;
                textbox.style.top = `${rect.top - boxHeight - margin}px`;
                break;
        }

        boxWidth = textbox.offsetWidth;
        boxHeight = textbox.offsetHeight;

        const textRect = {
            left: parseFloat(textbox.style.left),
            top: parseFloat(textbox.style.top),
            width: boxWidth,
            height: boxHeight
        };

        if (textRect.left + textRect.width > window.innerWidth - 10) {
            textbox.style.left = `${window.innerWidth - textRect.width - 10}px`;
        }
        if (textRect.left < 10) textbox.style.left = '10px';
        if (textRect.top + textRect.height > window.innerHeight - 10) {
            textbox.style.top = `${window.innerHeight - textRect.height - 10}px`;
        }
        if (textRect.top < 10) textbox.style.top = '10px';
    } else if (resolvedStep.position === 'center') {
        spotlight.style.opacity = '0';
        textbox.style.left = '50%';
        textbox.style.top = '50%';
        textbox.style.transform = 'translate(-50%, -50%)';
        textbox.classList.add('is-centered');
    }

    if (resolvedStep.position !== 'center') {
        textbox.style.transform = 'none';
        textbox.classList.remove('is-centered');
    }

    const titleHtml = step.title ? `<h3>${step.title}</h3>` : '';
    $('#tutorialText').innerHTML = `${titleHtml}<p>${step.text}</p>`;

    if (step.position !== 'center') {
        const boxWidth = textbox.offsetWidth;
        const boxHeight = textbox.offsetHeight;
        const left = parseFloat(textbox.style.left);
        const top = parseFloat(textbox.style.top);

        if (left + boxWidth > window.innerWidth - 10) {
            textbox.style.left = `${window.innerWidth - boxWidth - 10}px`;
        }
        if (left < 10) textbox.style.left = '10px';
        if (top + boxHeight > window.innerHeight - 10) {
            textbox.style.top = `${window.innerHeight - boxHeight - 10}px`;
        }
        if (top < 10) textbox.style.top = '10px';
    }

    $('#tutorialPrevBtn').style.display = (index === 0) ? 'none' : 'inline-block';
    $('#tutorialNextBtn').textContent = (index === _activeTourSteps.length - 1) ? 'Finish' : 'Next';
    const stepCount = $('#tutorialStepCount');
    if (stepCount) stepCount.textContent = `${index + 1} / ${_activeTourSteps.length}`;
}

$('#tutorialNextBtn').addEventListener('click', () => goToStep(currentTutorialStep + 1));
$('#tutorialPrevBtn').addEventListener('click', () => goToStep(currentTutorialStep - 1));
$('#tutorialCloseBtn').addEventListener('click', endTutorial);
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#tutorialOverlay').classList.contains('hidden')) {
        endTutorial();
    }
});
