// Offline: download @3d-dice/dice-box@1.1.4, place at forge/dice-box/, swap import to
// "./dice-box/dice-box.es.min.js" and set assetPath to the local path instead.
import DiceBox from "https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/dice-box.es.min.js";

const DICE_BOX_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/assets/';

let diceBox;
let isReady = false;

async function initDice() {
    diceBox = new DiceBox({
        container: "#dice-box",
        origin: '',
        assetPath: DICE_BOX_ASSET_PATH,
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
    
    diceBoxEl.style.pointerEvents = 'auto';
    diceBoxEl.classList.add('is-visible');
    if (diceBox.resizeWorld) diceBox.resizeWorld();
    
    try {
        if (diceBox.clear) diceBox.clear();
        
        const currentTheme = settings.diceTheme || "default";
        await diceBox.loadTheme(currentTheme);
        await diceBox.updateConfig({
            theme: currentTheme,
            themeColor: settings.diceColor || "#ff7a1a"
        });

        console.log("TaleTrove DiceBox: Rolling...", notation);
        const results = await diceBox.roll(notation);
        
        if (results && results.length > 0) {
            const total = results.reduce((acc, die) => acc + die.value, 0);
            if (window.showToast) {
                window.showToast(`Roll Result: ${total} (${notation})`);
            }
        }
        setTimeout(() => {
            diceBoxEl.classList.remove('is-visible');
            diceBoxEl.style.pointerEvents = 'none';
        }, 5000);
    } catch (e) {
        console.error("TaleTrove DiceBox: Roll failed", e);
        diceBoxEl.classList.remove('is-visible');
    }
};

window.updateDiceSettings = async (color, theme) => {
    if (isReady && diceBox) {
        diceBox.updateConfig({
            theme: theme || "default",
            themeColor: color || "#ff7a1a"
        });
    }
};
