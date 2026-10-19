//
// Correccions de tiles específiques del mode VGA, portades de Vigasoco:
//
// - GeneradorPantallas::grabaTile: alguns tiles del mapa CPC tenen un número
//   diferent al tileset VGA del remake (llibres i un tile d'escala).
//
// - GeneradorPantallas::Parchea: el mapa de pantalles CPC amb els tiles VGA
//   té errors gràfics (típics "ventanals" que es veuen bé en CPC i mal amb
//   els tiles VGA). Els pedaços substitueixen el contingut de la posició
//   per [bg (fons), fg (primer pla)], com al remake PC d'Antonio Giner.
//
// La funció és pura: no muta el roomData cachejat, perquè el mode es pot
// commutar en calent (tecla V).
//

import { VGA_TILE_PATCHES, VGA_TILE_REMAPS } from '../constants.js';

const DEFAULT_DEPTH = { depthX: 16, depthY: 16 };

export function applyVgaTileFixes(roomData, roomId) {

    const patches = VGA_TILE_PATCHES.filter(p => p.roomId === roomId);
    const hasRemaps = Object.keys(VGA_TILE_REMAPS).length > 0;

    if (patches.length === 0 && !hasRemaps) return roomData;

    const patchMap = new Map(patches.map(p => [`${p.posX},${p.posY}`, p]));

    return roomData.map((col, x) => col.map((layers, y) => {

        const patch = patchMap.get(`${x},${y}`);

        if (patch) {
            // la posició passa a contenir només [fons, primer pla],
            // mantenint la profunditat del layer superior existent
            const top = layers.length ? layers[layers.length - 1] : null;
            const depth = top ? { depthX: top.depthX, depthY: top.depthY } : { ...DEFAULT_DEPTH };
            return [
                { tile: patch.bg, ...depth },
                { tile: patch.fg, ...depth }
            ];
        }

        if (hasRemaps && layers.some(l => VGA_TILE_REMAPS[l.tile] !== undefined)) {
            return layers.map(l => {
                const remapped = VGA_TILE_REMAPS[l.tile];
                return remapped !== undefined ? { ...l, tile: remapped } : l;
            });
        }

        return layers;
    }));
}
