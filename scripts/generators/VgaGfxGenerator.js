const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

//
// VgaGfxGenerator
//
// Genera els assets gràfics en mode VGA (256 colors) a partir del fitxer
// "GraficosVGA" del remake de Manuel Abadía inclòs a Vigasoco
// (vigasoco/VigasocoSDL/roms/abadia/GraficosVGA).
//
// Format del fitxer (174065 bytes), tot indexat a paleta de 256 colors,
// 1 byte per píxel:
//
//   0x0000  Paleta dia      (256 entrades RGBA, el 4t byte no s'usa)
//   0x0400  Paleta nit
//   0x0800  Paleta làmpada
//   0x0C00  Paleta pergamí
//   0x1000  Paleta introducció
//   0x1400  Tiles: 256 tiles de 16x8 (128 bytes/tile)
//   ...     Sprites (1 byte/píxel, 255 = transparent)
//
// Els offsets dels sprites estan extrets de les taules VGA del codi C++
// de Vigasoco (Guillermo.cpp, Adso.cpp, SpriteMonje.cpp, Puerta.cpp,
// Juego.cpp, Marcador.cpp).
//
// Els PNG generats reutilitzen els fitxers .json d'atlas del mode CPC
// (mateixa geometria de frames), només canvien els píxels.
//

const VGA_TRANSPARENT = 255;    // index de paleta transparent als sprites VGA
const VGA_TILE_TRANSPARENT = 0; // index de paleta transparent als tiles VGA (tiles >= 0x0b)

// Offsets de les paletes dins del fitxer
const VGA_PALETTES = {
    DAY: 0x0000,
    NIGHT: 0x0400,
    LAMP: 0x0800,
    PARCHMENT: 0x0C00,
    INTRO: 0x1000
};

// Offset inicial dels tiles
const VGA_TILES_OFFSET = 0x1400;

// Taules d'animacio VGA (offset, amplada, alcada) per personatge,
// extretes de les taules "tablaAnimacion" VGA dels .cpp de Vigasoco
const VGA_GUILLERMO_FRAMES = [
    { offset: 54480, width: 20, height: 34 },
    { offset: 53760, width: 20, height: 36 },
    { offset: 54480, width: 20, height: 34 },
    { offset: 55180, width: 20, height: 34 },
    { offset: 57240, width: 16, height: 33 },
    { offset: 55880, width: 20, height: 35 },
    { offset: 57240, width: 16, height: 33 },
    { offset: 56580, width: 20, height: 33 }
];

const VGA_ADSO_FRAMES = [
    { offset: 58408, width: 20, height: 32 },
    { offset: 57768, width: 20, height: 32 },
    { offset: 58408, width: 20, height: 32 },
    { offset: 59048, width: 20, height: 31 },
    { offset: 59668, width: 16, height: 30 },
    { offset: 60148, width: 16, height: 30 },
    { offset: 59668, width: 16, height: 30 },
    { offset: 60628, width: 16, height: 30 }
];

// Trajos dels monjos (SpriteMonje::despAnimTraje VGA, base 61108)
const VGA_MONK_TRAJE_BASE = 61108;
const VGA_MONK_TRAJE_OFFSETS = [520, 0, 520, 1000, 2440, 1480, 2440, 1980];
const VGA_MONK_TRAJE_HEIGHTS = [24, 26, 24, 24, 23, 25, 23, 23]; // files de cos (alcada frame - 10)
const VGA_MONK_HEAD_ROWS = 10;

// Cares dels monjos (datosCara VGA). 7 monjos x 2 variants de 200 bytes
// (10 files x 20 px). L'encapuchat es la segona cara de Berengario.
const VGA_MONK_FACES_BASE = 66908;
const VGA_MONK_CHARACTERS = ['severino', 'abad', 'malaquias', 'berengario', 'bernardo', 'jorge', 'hooded'];

// Porta (Puerta::notificaVisibleEnPantalla VGA)
const VGA_DOOR_OFFSET = 69708;
const VGA_DOOR_WIDTH = 24;
const VGA_DOOR_HEIGHT = 40;

// Objectes (Juego::initSprites, despObjetos VGA)
const VGA_OBJECT_FRAMES = [
    { offset: 11200, width: 16, height: 12 },  // book
    { offset: 34496, width: 16, height: 12 },  // gloves
    { offset: 34304, width: 16, height: 12 },  // glasses
    { offset: 34880, width: 16, height: 12 },  // scroll
    { offset: 34688, width: 16, height: 12 },  // key1
    { offset: 34688, width: 16, height: 12 },  // key2
    { offset: 34688, width: 16, height: 12 },  // key3
    { offset: 11008, width: 16, height: 12 }   // lamp
];

// HUD (Marcador::dibujaMarcador VGA) i digits del dia (Marcador::dibujaDigitoDia VGA)
const VGA_HUD_OFFSET = 0xB200;
const VGA_HUD_WIDTH = 256;
const VGA_HUD_HEIGHT = 32;
const VGA_DIGIT_V_OFFSET = 72108;
const VGA_DIGIT_I_OFFSET = 72108 + 8 * 8;
const VGA_DIGIT_WIDTH = 8;
const VGA_DIGIT_HEIGHT = 8;

// Pantalla de titol VGA (Juego::muestraPresentacion VGA: showVGAScreen(romsVGA + 0x1ADF0))
const VGA_TITLE_OFFSET = 0x1ADF0;
const VGA_TITLE_WIDTH = 320;
const VGA_TITLE_HEIGHT = 200;

// Adaptacio de colors del pergamí a la paleta VGA (Pergamino::AdaptaColorAPaletaVGA)
const VGA_PARCHMENT_COLOR_MAP = { 0: 255, 1: 20, 2: 0, 3: 1 };

// Dades del pergamí dins la rom CPC (Bank 8), mates geometria que GfxGenerator
const SCROLL_BANK = 0x20000;
const SCROLL_BASE_OFFSET = 0x3a00;

class VgaGfxGenerator {

    constructor(vgaData, memoryData = null) {
        this.vgaData = vgaData;
        this.memoryData = memoryData;
    }

    /////////////////////////////////////////////////////////////////
    // paletes
    /////////////////////////////////////////////////////////////////

    getPalette(name) {
        const offset = VGA_PALETTES[name];
        const palette = [];
        for (let i = 0; i < 256; i++) {
            const p = VGA_PALETTES[name] + i * 4;
            palette.push([this.vgaData[p], this.vgaData[p + 1], this.vgaData[p + 2], 0xFF]);
        }
        return palette;
    }

    /////////////////////////////////////////////////////////////////
    // generacio
    /////////////////////////////////////////////////////////////////

    generateAll(outputPath) {
        this.generateAllTileSet(outputPath);
        this.generateAllSpriteSet(outputPath);
        this.generateUiSet(outputPath);
    }

    /////////////////////////////////////////////////////////////////
    // pantalles de titol i scroll
    /////////////////////////////////////////////////////////////////

    // pantalla de titol VGA: 320x200 lineals amb la paleta d'introduccio
    generateTitleScreen(outputPath) {
        const palette = this.getPalette('INTRO');
        const png = new PNG({ width: VGA_TITLE_WIDTH, height: VGA_TITLE_HEIGHT });

        for (let j = 0; j < VGA_TITLE_HEIGHT; j++) {
            for (let i = 0; i < VGA_TITLE_WIDTH; i++) {
                const color = this.vgaData[VGA_TITLE_OFFSET + j * VGA_TITLE_WIDTH + i];
                png.data.set(palette[color], ((png.width * j) + i) << 2);
            }
        }

        this.savePNG(png, `${outputPath}title_vga.png`);
        console.log('Generated VGA Title Screen');
    }

    // pantalla de scroll (pergamí): bitmaps CPC amb colors adaptats a la
    // paleta pergamí VGA, seguint Pergamino::dibuja en mode VGA
    generateScrollScreen(outputPath) {
        if (!this.memoryData) return;

        const palette = this.getPalette('PARCHMENT');
        const png = new PNG({ width: 320, height: 200 });

        const setPixel = (x, y, color) => {
            png.data.set(palette[color], ((png.width * y) + x) << 2);
        };

        // fons de pergamí i margins exteriors (Pergamino::dibuja VGA)
        this.fill(png, 0, 0, 320, 200, 255);
        this.fill(png, 0, 0, 64, 200, 20);
        this.fill(png, 192 + 64, 0, 64, 200, 20);
        this.fill(png, 0, 192, 320, 8, 20);

        // sanefes ornamentades del pergamí (mateixes dades CPC que el mode CPC)
        this.drawHScrollStrip(png, 0, SCROLL_BANK, SCROLL_BASE_OFFSET, setPixel);
        this.drawVScrollStrip(png, 248, SCROLL_BANK, SCROLL_BASE_OFFSET + 0x180, setPixel);
        this.drawVScrollStrip(png, 64, SCROLL_BANK, SCROLL_BASE_OFFSET + 0x180 * 2, setPixel);
        this.drawHScrollStrip(png, 184, SCROLL_BANK, SCROLL_BASE_OFFSET + 0x180 * 3, setPixel);

        this.savePNG(png, `${outputPath}scroll_vga.png`);
        console.log('Generated VGA Scroll Screen');
    }

    fill(png, x, y, width, height, colorIndex) {
        const palette = this.getPalette('PARCHMENT');
        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                png.data.set(palette[colorIndex], ((png.width * (y + j)) + x + i) << 2);
            }
        }
    }

    getByte(bank, offset) {
        return this.memoryData[bank + offset] & 0xff;
    }

    unpackPixelMode1(data, pixel) {
        return (((data >> (3 - pixel)) & 0x01) << 1) | ((data >> (7 - pixel)) & 0x01);
    }

    drawHScrollStrip(png, y, bank, offset, setPixel) {
        for (let i = 0; i < 192 / 4; i++) {
            for (let j = 0; j < 8; j++) {
                const data = this.getByte(bank, offset++);
                for (let k = 0; k < 4; k++) {
                    const color = VGA_PARCHMENT_COLOR_MAP[this.unpackPixelMode1(data, k)];
                    setPixel(64 + i * 4 + k, y + j, color);
                }
            }
        }
    }

    drawVScrollStrip(png, x, bank, offset, setPixel) {
        for (let j = 0; j < 192; j++) {
            for (let i = 0; i < 2; i++) {
                const data = this.getByte(bank, offset++);
                for (let k = 0; k < 4; k++) {
                    const color = VGA_PARCHMENT_COLOR_MAP[this.unpackPixelMode1(data, k)];
                    setPixel(x + i * 4 + k, j, color);
                }
            }
        }
    }

    generateAllTileSet(outputPath) {
        for (const paletteName of ['DAY', 'NIGHT']) {
            const png = new PNG({ width: 256, height: 128 });
            for (let num = 0; num < 0x100; num++) {
                this.generateTile(png, num, paletteName);
            }
            this.savePNG(png, `${outputPath}tiles/tiles_${paletteName.toLowerCase()}_vga.png`);
            console.log(`Generated VGA Tileset ${paletteName}`);
        }
    }

    generateTile(tileset, num, paletteName) {
        const palette = this.getPalette(paletteName);
        // els tiles < 0x0b no tenen transparencia (MezcladorSprites::combinaTile VGA)
        const transparent = num < 0x0b ? -1 : VGA_TILE_TRANSPARENT;
        const offsetX = (num % 16) * 16;
        const offsetY = Math.floor(num / 16) * 8;
        const tileData = VGA_TILES_OFFSET + num * 128;

        for (let j = 0; j < 8; j++) {
            for (let i = 0; i < 16; i++) {
                const color = this.vgaData[tileData + j * 16 + i];
                if (color !== transparent) {
                    const idx = (tileset.width * (offsetY + j) + offsetX + i) << 2;
                    tileset.data.set(palette[color], idx);
                }
            }
        }
    }

    generateAllSpriteSet(outputPath) {
        const spritesPath = `${outputPath}sprites/`;

        // personatges amb atlas d' monjo (20x36 cells) i principals
        const configs = [
            { name: 'guillermo', frames: VGA_GUILLERMO_FRAMES, cell: { width: 20, height: 36 } },
            { name: 'adso', frames: VGA_ADSO_FRAMES, cell: { width: 20, height: 32 } },
            { name: 'doors', frames: [{ offset: VGA_DOOR_OFFSET, width: VGA_DOOR_WIDTH, height: VGA_DOOR_HEIGHT }], cell: { width: 24, height: 40 } },
            { name: 'objects', frames: VGA_OBJECT_FRAMES, cell: { width: 16, height: 12 }, flip: false }
        ];

        configs.forEach(config => this.generateSpriteSet(config, spritesPath, 'DAY'));
        configs.forEach(config => this.generateSpriteSet(config, spritesPath, 'NIGHT'));

        // monjos (cos + cara), mateixa geometria que monk.json
        VGA_MONK_CHARACTERS.forEach((name, index) => {
            const faceBase = VGA_MONK_FACES_BASE + index * (VGA_MONK_HEAD_ROWS * 20 * 2);
            const config = {
                name,
                cell: { width: 20, height: 36 },
                frames: VGA_MONK_TRAJE_OFFSETS.map((trajeOffset, i) => ({
                    trajeOffset,
                    height: VGA_MONK_TRAJE_HEIGHTS[i] + VGA_MONK_HEAD_ROWS
                })),
                faceBase
            };
            this.generateSpriteSet(config, spritesPath, 'DAY');
            this.generateSpriteSet(config, spritesPath, 'NIGHT');
        });
    }

    generateSpriteSet(config, outputPath, paletteName) {
        const { name, frames, cell, flip = true } = config;
        const palette = this.getPalette(paletteName);
        const spriteSet = new PNG({ width: cell.width * frames.length, height: flip ? cell.height * 2 : cell.height });

        frames.forEach((frame, index) => {
            // compon el sprite (per els monjos: cara + cos)
            const pixels = this.composeSprite(config, frame, index);
            const w = frame.width || cell.width;
            const h = frame.height || cell.height;
            const x0 = index * cell.width;

            // copia el sprite a l'atlas
            for (let j = 0; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    const color = pixels[j * w + i];
                    if (color !== VGA_TRANSPARENT) {
                        let idx = (spriteSet.width * j + x0 + i) << 2;
                        spriteSet.data.set(palette[color], idx);
                        // copia flipejada
                        if (flip) {
                            idx = (spriteSet.width * (cell.height + j) + x0 + (w - 1 - i)) << 2;
                            spriteSet.data.set(palette[color], idx);
                        }
                    }
                }
            }
        });

        this.savePNG(spriteSet, `${outputPath}${name}_${paletteName.toLowerCase()}_vga.png`);
        console.log(`Generated VGA Spriteset ${name} ${paletteName}`);
    }

    // compon un sprite VGA com a array de indexes de paleta (w*h)
    composeSprite(config, frame, index) {
        const w = frame.width || config.cell.width;
        const h = frame.height || config.cell.height;
        const pixels = new Uint8Array(w * h);

        if (config.faceBase !== undefined) {
            // monjo: files 0-9 de la cara, files 10+ del traje
            // variant de cara 2 (monjo de tornada/esquena): +0x32*4 = +200 bytes
            // (0x32 CPC = 50 bytes = 10 files x 5 bytes; en VGA x4 = 200)
            const faceVariantOffset = index > 3 ? (VGA_MONK_HEAD_ROWS * w) : 0;
            const faceOffset = config.faceBase + faceVariantOffset;
            const trajeOffset = VGA_MONK_TRAJE_BASE + frame.trajeOffset;

            for (let j = 0; j < VGA_MONK_HEAD_ROWS; j++) {
                for (let i = 0; i < w; i++) {
                    pixels[j * w + i] = this.vgaData[faceOffset + j * w + i];
                }
            }
            for (let j = VGA_MONK_HEAD_ROWS; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    pixels[j * w + i] = this.vgaData[trajeOffset + (j - VGA_MONK_HEAD_ROWS) * w + i];
                }
            }
        } else {
            const { offset } = frame;
            for (let j = 0; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    pixels[j * w + i] = this.vgaData[offset + j * w + i];
                }
            }
        }

        return pixels;
    }

    generateUiSet(outputPath) {
        const uiPath = `${outputPath}ui/`;

        this.generateTitleScreen(uiPath);
        this.generateScrollScreen(uiPath);

        for (const paletteName of ['DAY', 'NIGHT']) {
            const palette = this.getPalette(paletteName);

            // HUD 256x32 (Marcador::dibujaMarcador VGA)
            const hud = new PNG({ width: VGA_HUD_WIDTH, height: VGA_HUD_HEIGHT });
            for (let j = 0; j < VGA_HUD_HEIGHT; j++) {
                for (let i = 0; i < VGA_HUD_WIDTH; i++) {
                    const color = this.vgaData[VGA_HUD_OFFSET + j * VGA_HUD_WIDTH + i];
                    const idx = (hud.width * j + i) << 2;
                    hud.data.set(palette[color], idx);
                }
            }
            this.savePNG(hud, `${uiPath}hud_${paletteName.toLowerCase()}_vga.png`);
            console.log(`Generated VGA HUD ${paletteName}`);

            // digits del dia: V i I (Marcador::dibujaDigitoDia VGA)
            const days = new PNG({ width: 16, height: 8 });
            [VGA_DIGIT_V_OFFSET, VGA_DIGIT_I_OFFSET].forEach((digitOffset, i) => {
                for (let j = 0; j < VGA_DIGIT_HEIGHT; j++) {
                    for (let k = 0; k < VGA_DIGIT_WIDTH; k++) {
                        const color = this.vgaData[digitOffset + j * VGA_DIGIT_WIDTH + k];
                        const idx = (days.width * j + i * 8 + k) << 2;
                        days.data.set(palette[color], idx);
                    }
                }
            });
            this.savePNG(days, `${uiPath}days_${paletteName.toLowerCase()}_vga.png`);
            console.log(`Generated VGA Days ${paletteName}`);
        }
    }

    savePNG(png, outputPath) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, PNG.sync.write(png));
    }
}

module.exports = VgaGfxGenerator;
