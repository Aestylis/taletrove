// Offline: download @3d-dice/dice-box@1.1.4, place at forge/dice-box/, swap import to
// "./dice-box/dice-box.es.min.js" and set assetPath to the local path instead.
import DiceBox from "https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/dice-box.es.min.js";

const DICE_BOX_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/assets/';

// dice-box's own dist only ships the "default" theme; every other theme in Settings → Dice
// lives in the separate @3d-dice/dice-themes package. Without this map, picking one 404'd
// theme.config.json and the roll threw (issue #2).
const DICE_THEMES_BASE = 'https://cdn.jsdelivr.net/npm/@3d-dice/dice-themes@0.2.1/themes/';
const EXTERNAL_THEMES = Object.fromEntries(
    ['wooden', 'gemstone', 'gemstoneMarble', 'blueGreenMetal', 'rust', 'rock', 'smooth', 'diceOfRolling', 'genesys']
        .map(name => [name, DICE_THEMES_BASE + name])
);
const HIDE_AFTER_MS = 5000;

let diceBox;
let isReady = false;
let hideTimer = null;

async function initDice() {
    diceBox = new DiceBox({
        container: "#dice-box",
        origin: '',
        assetPath: DICE_BOX_ASSET_PATH,
        externalThemes: EXTERNAL_THEMES,
        theme: "default",
        offscreen: true,
        scale: 6
    });

    try {
        await diceBox.init();
        isReady = true;
        const diceBoxEl = document.getElementById('dice-box');
        if (diceBoxEl) document.body.appendChild(diceBoxEl);
    } catch (err) {
        console.error("TaleTrove DiceBox: Local Init Error", err);
    }
}

initDice();

window.rollDice = async (notation) => {
    if (!isReady || !diceBox) {
        console.warn("TaleTrove DiceBox: Engine not ready.");
        return;
    }

    const diceBoxEl = document.getElementById('dice-box');
    if (!diceBoxEl) return;

    // The overlay is a full-viewport canvas above everything. It must never take pointer
    // events: pre-fix it was set to 'auto' for the roll and, when a roll threw, never reset —
    // an invisible layer that swallowed every click until reload (issue #2).
    clearTimeout(hideTimer);
    diceBoxEl.classList.add('is-visible');
    if (diceBox.resizeWorld) diceBox.resizeWorld();

    try {
        if (diceBox.clear) diceBox.clear();
        await applyDiceConfig(settings.diceTheme, settings.diceColor);

        console.log("TaleTrove DiceBox: Rolling...", notation);
        const results = await diceBox.roll(notation);

        if (results && results.length > 0) {
            const total = results.reduce((acc, die) => acc + die.value, 0);
            if (window.showToast) {
                window.showToast(`Roll Result: ${total} (${notation})`);
            }
        }
    } catch (e) {
        console.error("TaleTrove DiceBox: Roll failed", e);
        if (window.showToast) window.showToast(`Couldn't roll ${notation}.`, 'error');
    } finally {
        hideTimer = setTimeout(() => diceBoxEl.classList.remove('is-visible'), HIDE_AFTER_MS);
    }
};

// Loads the theme (cached by dice-box after first use) and applies it. A theme that fails to
// load falls back to "default" instead of leaving dice-box with no theme config.
async function applyDiceConfig(theme, color) {
    let name = theme || "default";
    if (name !== "default") {
        const loaded = await diceBox.loadTheme(name).catch(() => null);
        if (!loaded) {
            console.warn(`TaleTrove DiceBox: theme "${name}" unavailable, using default.`);
            name = "default";
        }
    }
    await diceBox.updateConfig({ theme: name, themeColor: color || "#ff7a1a" });
}

window.updateDiceSettings = async (color, theme) => {
    if (isReady && diceBox) {
        await applyDiceConfig(theme, color).catch(e => console.error("TaleTrove DiceBox: settings update failed", e));
    }
};
