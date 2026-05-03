
function generateName(type) {
    const data = GENERATOR_DATA[type];
    if (!data) return '';

    // Select a random pattern if multiple exist, otherwise use the single pattern.
    const pattern = Array.isArray(data.pattern) ? getRandom(data.pattern) : data.pattern;
    if (!pattern) return '';

    let name = pattern;
    const placeholders = name.match(/{\w+}/g) || [];

    for (const placeholder of placeholders) {
        const key = placeholder.replace(/[{}]/g, '');
        const words = data[key];
        if (words) {
            name = name.replace(placeholder, getRandom(words));
        }
    }
    return name;
}

function showGeneratorMenu(event, targetInput) {
    // Close any existing menu
    const existingMenu = document.getElementById('generatorContextMenu');
    if (existingMenu) existingMenu.remove();

    const closeMenu = () => {
        const menu = document.getElementById('generatorContextMenu');
        if (menu) menu.remove();
        document.body.removeEventListener('click', closeMenu, true);
    };

    const menuItems = [];
    // Identify if we're dealing with a Feature (Atlas) or an Entry (Encyclopedia)
    const currentItem = (selectedId) 
        ? state.features.find(f => f.id === selectedId)
        : state.encyclopedia.find(e => e.id === selectedEncyclopediaEntryId);

    if (!currentItem) return;

    // Features have 'geometry', Encyclopedia entries are always treated as 'point' (lore-pins)
    const geometryType = currentItem.geometry || 'point';

    // Determine which generators are relevant based on item type/geometry
    const relevantGenerators = geometryType === 'point' ?
        ['person-male', 'person-female', 'npc-archetype', 'tavern', 'location', 'monster'] :
        ['location', 'organization', 'settlement-hook', 'env-detail'];

    relevantGenerators.forEach(type => {
        const item = el('li', {
            text: `Generate ${type.replace('-', ' ')}`
        });
        item.onclick = () => {
            const generatedName = generateName(type);
            targetInput.value = generatedName;
            // Trigger the change event so the app saves the new name
            targetInput.dispatchEvent(new Event('change', {
                bubbles: true
            }));
            closeMenu();
        };
        menuItems.push(item);
    });

    const menu = el('div', {
        id: 'generatorContextMenu',
        class: 'context-menu'
    }, [
        el('ul', {
            class: 'is-dropdown-menu'
        }, menuItems)
    ]);

    // Append the menu to the body so we can measure its dimensions
    document.body.appendChild(menu);

    // Get the dimensions of the menu and the window
    const menuRect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let finalX = event.clientX;
    let finalY = event.clientY;

    // If the menu would overflow on the right...
    if (finalX + menuRect.width > windowWidth) {
        // ...recalculate X to align its right edge with the cursor.
        finalX = event.clientX - menuRect.width;
    }

    // If the menu would overflow on the bottom...
    if (finalY + menuRect.height > windowHeight) {
        // ...recalculate Y to align its bottom edge with the cursor.
        finalY = event.clientY - menuRect.height;
    }

    // Apply the final, screen-aware positions
    menu.style.top = `${finalY}px`;
    menu.style.left = `${finalX}px`;

    setTimeout(() => {
        document.body.addEventListener('click', closeMenu, {
            once: true,
            capture: true
        });
    }, 0);
}