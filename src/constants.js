export const TICK_TIME = 45 * 1000 / 256;

export const ORIENTATION = {
    SOUTH_EAST: 0,
    NORTH_EAST: 1,
    NORTH_WEST: 2,
    SOUTH_WEST: 3
};

export const FLOOR = {
    MAIN: 0,
    SCRIPTORIUM: 1,
    LIBRARY: 2
}

export const FLOOR_HEIGHT = 12;

export const SCREEN_OFFSET_X = ( 320 - 256 ) / 2;

export const TEXT_COLOR_DAY = 0xFFFF80;
export const TEXT_COLOR_NIGHT = 0x808080;
export const BACKGROUND_COLOR_DAY = 0x008080;
export const BACKGROUND_COLOR_NIGHT = 0x000080;

export const TILE_HACKS = [

    // fix stair in room 38
    { type: 0, roomId: 38, posX: 9, posY: 11, priority: 0, depthX: 21, depthY: 19 }, 
    
    // fix stair in room 8
    { type: 0, roomId:  8, posX: 9, posY: 10, priority: 0, depthX: 19, depthY: 16 }, 
    
    // fix door in room 72
    { type: 0, roomId: 72, posX: 2, posY:  5, priority: 0, depthX: 15, depthY: 20 },
    { type: 0, roomId: 72, posX: 2, posY:  5, priority: 1, depthX: 15, depthY: 20 }, 
    
    // fix portico in mirror room
    { type: 0, roomId: 116, posX: 6, posY:  4, priority: 1, depthX: 19, depthY: 21 }, 
    { type: 0, roomId: 116, posX: 6, posY:  4, priority: 2, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 5, posY:  4, priority: 1, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 5, posY:  3, priority: 1, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 6, posY:  3, priority: 2, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 6, posY:  3, priority: 3, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 7, posY:  3, priority: 1, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 7, posY:  2, priority: 1, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 8, posY:  2, priority: 1, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 8, posY:  1, priority: 1, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 9, posY:  1, priority: 1, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 9, posY:  1, priority: 2, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 9, posY:  0, priority: 2, depthX: 19, depthY: 21 },
    { type: 0, roomId: 116, posX: 9, posY:  0, priority: 3, depthX: 19, depthY: 21 },

    // fix library in mirror room
    { type: 1, roomId: 116, posX: 1, posY: 0, tile: 172, depthX: 0, depthY: 0 },
    { type: 1, roomId: 116, posX: 1, posY: 1, tile: 171, depthX: 0, depthY: 0 },
    { type: 1, roomId: 116, posX: 0, posY: 1, tile: 172, depthX: 0, depthY: 0 },
    { type: 1, roomId: 116, posX: 0, posY: 2, tile: 171, depthX: 0, depthY: 0 },

    // fix door in room 78
    { type: 0, roomId: 78, posX: 13, posY: 4, priority: 0, depthX: 14, depthY: 10}
];

export const MIRROR_HACKS = [
    // hack floor to hide Guillermo while falling in mirror room
    { type: 0, roomId: 115, posX: 3, posY: 9, priority: 0, depthX: 17, depthY: 17 },
    { type: 0, roomId: 115, posX: 5, posY: 7, priority: 0, depthX: 17, depthY: 17 },
];

//
// Pedaços de tiles només per al mode VGA, portats de Vigasoco
// (GeneradorPantallas::Parchea i GeneradorPantallas::grabaTile).
//
// El mapa de pantalles és el de la versió CPC, però alguns tiles no
// coincideixen amb el tileset VGA del remake ("ventanals" que es veuen
// bé en CPC i mal amb els tiles VGA). Els pedaços substitueixen el
// contingut de la posició per [bg (fons), fg (primer pla)].
//
export const VGA_TILE_PATCHES = [
    // pica de l'escala que sobresurt (habitació 3)
    { roomId: 3, posX: 4, posY: 8, fg: 9, bg: 9 },
    { roomId: 3, posX: 13, posY: 6, fg: 98, bg: 154 },
    // barandilla habitació 12
    { roomId: 12, posX: 4, posY: 8, fg: 0, bg: 70 },
    // ventanals
    { roomId: 13, posX: 10, posY: 1, fg: 7, bg: 143 },
    { roomId: 14, posX: 0, posY: 7, fg: 9, bg: 163 },
    { roomId: 14, posX: 2, posY: 5, fg: 9, bg: 163 },
    { roomId: 14, posX: 4, posY: 3, fg: 9, bg: 163 },
    { roomId: 21, posX: 7, posY: 0, fg: 7, bg: 143 },
    { roomId: 21, posX: 13, posY: 6, fg: 7, bg: 143 },
    { roomId: 24, posX: 0, posY: 8, fg: 2, bg: 163 },
    { roomId: 24, posX: 2, posY: 6, fg: 2, bg: 163 },
    { roomId: 31, posX: 8, posY: 8, fg: 1, bg: 222 },
    { roomId: 31, posX: 8, posY: 9, fg: 0, bg: 223 },
    { roomId: 36, posX: 15, posY: 0, fg: 7, bg: 143 },
    { roomId: 36, posX: 15, posY: 7, fg: 7, bg: 143 },
    { roomId: 39, posX: 1, posY: 19, fg: 7, bg: 143 },
    { roomId: 39, posX: 9, posY: 0, fg: 7, bg: 143 },
    { roomId: 39, posX: 7, posY: 11, fg: 5, bg: 7 },
    { roomId: 39, posX: 8, posY: 11, fg: 5, bg: 2 },
    { roomId: 43, posX: 1, posY: 6, fg: 2, bg: 163 },
    { roomId: 43, posX: 3, posY: 4, fg: 2, bg: 163 },
    { roomId: 43, posX: 5, posY: 2, fg: 2, bg: 163 },
    { roomId: 43, posX: 7, posY: 0, fg: 2, bg: 163 },
    { roomId: 44, posX: 11, posY: 2, fg: 7, bg: 143 },
    { roomId: 44, posX: 13, posY: 4, fg: 7, bg: 143 },
    { roomId: 44, posX: 15, posY: 6, fg: 7, bg: 143 },
    { roomId: 44, posX: 1, posY: 4, fg: 2, bg: 163 },
];

// Tiles que tenen número diferent al tileset VGA (GeneradorPantallas::grabaTile):
// els llibres i un tile d'escala
export const VGA_TILE_REMAPS = {
    57: 201,    // llibres
    58: 225,    // llibres
    105: 237    // tile d'escala
};
