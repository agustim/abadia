//
// Gestió del mode gràfic: 'cpc' (gràfics originals de 4 colors) o
// 'vga' (gràfics del remake a 256 colors, fitxer GraficosVGA de Vigasoco).
//
// Els assets VGA generats per scripts/generators/VgaGfxGenerator.js
// reutilitzen els mateixos fitxers .json d'atlas que els CPC, amb els
// PNG sufijats amb _vga.
//

const STORAGE_KEY = 'abadia_gfxmode';

let mode = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'cpc';

export function getGfxMode() {
    return mode;
}

export function setGfxMode(newMode) {
    mode = newMode;
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, mode);
    }
}

export function toggleGfxMode() {
    setGfxMode(mode === 'cpc' ? 'vga' : 'cpc');
    return mode;
}

/**
 * Retorna la clau de textura/atlas per un recurs i moment del dia,
 * tenint en compte el mode gràfic actiu.
 *
 * @param {string} base  nom base del recurs (p. ex. 'guillermo', 'tiles', 'hud')
 * @param {string} time  'day' o 'night'
 */
export function atlasKey(base, time) {
    return `${base}_${time}${mode === 'vga' ? '_vga' : ''}`;
}
