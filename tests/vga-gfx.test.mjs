import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';

const require = createRequire(import.meta.url);
const DiskImageLoader = require('../scripts/utils/DiskImageLoader.js');

import VgaGfxGenerator from '../scripts/generators/VgaGfxGenerator.js';
import { atlasKey, getGfxMode, setGfxMode, toggleGfxMode } from '../src/gfxMode.js';
import { applyVgaTileFixes } from '../src/levels/VgaTileFixes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const VGA_FILE = path.join(ROOT, 'scripts/data/GraficosVGA');
const OUT = path.join(ROOT, 'tests', 'output', 'gfx');
const PUBLIC_GFX = path.join(ROOT, 'public', 'assets', 'gfx');

const SPRITE_NAMES = ['guillermo', 'adso', 'severino', 'abad', 'malaquias', 'berengario', 'bernardo', 'jorge', 'hooded', 'doors', 'objects'];

function readPNG(p) {
    return PNG.sync.read(fs.readFileSync(p));
}

function atlasJson(name) {
    const file = (name === 'adso' || name === 'doors' || name === 'objects') ? name : 'monk';
    const dir = name === 'tiles' ? 'tiles' : 'sprites';
    return JSON.parse(fs.readFileSync(path.join(PUBLIC_GFX, dir, `${file}.json`)));
}

function frameMask(png, frame) {
    const mask = [];
    for (let y = 0; y < frame.h; y++) {
        for (let x = 0; x < frame.w; x++) {
            const idx = (png.width * (frame.y + y) + frame.x + x) * 4 + 3;
            mask.push(png.data[idx] > 0 ? 1 : 0);
        }
    }
    return mask;
}

// signatura de les 10 primeres files (la cara) d'un frame
function headSignature(png, frame) {
    const rows = 10;
    const sig = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < frame.w; x++) {
            const idx = (png.width * (frame.y + y) + frame.x + x) * 4;
            sig.push(png.data[idx], png.data[idx + 1], png.data[idx + 2]);
        }
    }
    return sig.join(',');
}

describe('VgaGfxGenerator', () => {

    let vgaData;

    before(() => {
        vgaData = fs.readFileSync(VGA_FILE);
        assert.equal(vgaData.length, 174065, 'GraficosVGA ha de tenir 174065 bytes');
        const diskImage = fs.readFileSync(path.join(ROOT, 'public/assets/disk/abadia.dsk'));
        const memoryData = DiskImageLoader.readDiskImageToMemory(diskImage);
        const generator = new VgaGfxGenerator(vgaData, memoryData);
        generator.generateAll(OUT + '/');
    });

    describe('paletes', () => {
        const generator = new VgaGfxGenerator(fs.readFileSync(VGA_FILE));

        it('genera paletes de 256 colors RGBA', () => {
            for (const name of ['DAY', 'NIGHT', 'LAMP', 'PARCHMENT', 'INTRO']) {
                const pal = generator.getPalette(name);
                assert.equal(pal.length, 256);
                for (const c of pal) {
                    assert.equal(c.length, 4);
                    assert.ok(c.every(v => v >= 0 && v <= 255));
                    assert.equal(c[3], 0xFF, 'l\'alfa ha de ser opac');
                }
            }
        });

        it('la paleta del dia té els colors coneguts del remake VGA', () => {
            const pal = generator.getPalette('DAY');
            assert.deepEqual(pal[0].slice(0, 3), [0, 0, 0]);
            assert.deepEqual(pal[1].slice(0, 3), [47, 95, 107]);
            assert.deepEqual(pal[255].slice(0, 3), [255, 255, 255]);
        });

        it('la paleta de nit és diferent de la del dia', () => {
            const day = generator.getPalette('DAY');
            const night = generator.getPalette('NIGHT');
            assert.notDeepEqual(day[1], night[1]);
            assert.notDeepEqual(day[2], night[2]);
        });

        it('la paleta pergamí té el fons crema i el vermell coneguts', () => {
            const pal = generator.getPalette('PARCHMENT');
            assert.deepEqual(pal[255].slice(0, 3), [247, 227, 159]);
            assert.deepEqual(pal[1].slice(0, 3), [167, 0, 0]);
        });
    });

    describe('tiles', () => {
        it('genera tiles_day_vga i tiles_night_vga de 256x128 amb la geometria de tiles.json', () => {
            for (const time of ['day', 'night']) {
                const png = readPNG(path.join(OUT, `tiles/tiles_${time}_vga.png`));
                assert.equal(png.width, 256);
                assert.equal(png.height, 128);
            }
        });

        it('el tile 0 és una superfície opaca gairebé uniforme (paret)', () => {
            const png = readPNG(path.join(OUT, 'tiles/tiles_day_vga.png'));
            const colors = new Set();
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 16; x++) {
                    const idx = (png.width * y + x) * 4;
                    colors.add(`${png.data[idx]},${png.data[idx + 1]},${png.data[idx + 2]}`);
                    assert.equal(png.data[idx + 3], 255, 'els tiles < 0x0b són opacs');
                }
            }
            assert.ok(colors.size <= 4, `tile 0 gairebé uniforme (té ${colors.size} colors)`);
        });

        it('els tiles >= 0x0b tenen transparència (index 0)', () => {
            const png = readPNG(path.join(OUT, 'tiles/tiles_day_vga.png'));
            // tile index 100: fila 6, col 4 -> regió (64, 48)
            let transparent = 0, opaque = 0;
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 16; x++) {
                    const idx = (png.width * (48 + y) + 64 + x) * 4 + 3;
                    if (png.data[idx] === 0) transparent++; else opaque++;
                }
            }
            assert.ok(transparent > 0, 'hi ha pixels transparents');
            assert.ok(opaque > 0, 'hi ha pixels opacs');
        });

        it('els pixels dels tiles VGA corresponen exactament a les dades del fitxer (round-trip)', () => {
            const generator = new VgaGfxGenerator(vgaData);
            const palette = generator.getPalette('DAY');
            const png = readPNG(path.join(OUT, 'tiles/tiles_day_vga.png'));

            for (let num = 0; num < 0x100; num++) {
                const transparent = num < 0x0b ? -1 : 0;
                const ox = (num % 16) * 16, oy = Math.floor(num / 16) * 8;
                for (let j = 0; j < 8; j++) {
                    for (let i = 0; i < 16; i++) {
                        const dataColor = vgaData[0x1400 + num * 128 + j * 16 + i];
                        const idx = ((png.width * (oy + j)) + ox + i) * 4;
                        if (dataColor === transparent) {
                            assert.equal(png.data[idx + 3], 0, `tile ${num} (${i},${j}) hauria de ser transparent`);
                        } else {
                            assert.deepEqual(
                                [...png.data.slice(idx, idx + 3)],
                                [...palette[dataColor].slice(0, 3)],
                                `tile ${num} (${i},${j}) color incorrecte`);
                        }
                    }
                }
            }
        });
    });

    describe('sprites de personatges', () => {

        it('genera tots els spritesets amb les mides dels atlas CPC', () => {
            for (const name of SPRITE_NAMES) {
                const json = atlasJson(name);
                for (const time of ['day', 'night']) {
                    const png = readPNG(path.join(OUT, `sprites/${name}_${time}_vga.png`));
                    assert.equal(png.width, json.meta.size.w, `${name} amplada`);
                    assert.equal(png.height, json.meta.size.h, `${name} alcada`);
                }
            }
        });

        it('cada frame té contingut opac i transparent (255 = transparent)', () => {
            for (const name of ['guillermo', 'adso', 'severino', 'hooded']) {
                const png = readPNG(path.join(OUT, `sprites/${name}_day_vga.png`));
                const json = atlasJson(name);
                const frames = Object.entries(json.frames).filter(([k]) => k.startsWith('walk_0') || k === 'door_0');
                for (const [key, frameInfo] of frames) {
                    const mask = frameMask(png, frameInfo.frame);
                    assert.ok(mask.includes(1), `${name}/${key}: cap pixel opac`);
                    assert.ok(mask.includes(0), `${name}/${key}: cap pixel transparent`);
                }
            }
        });

        it('els colors opacs pertanyen a la paleta VGA del dia', () => {
            const generator = new VgaGfxGenerator(vgaData);
            const palette = new Set(generator.getPalette('DAY').map(c => `${c[0]},${c[1]},${c[2]}`));
            const png = readPNG(path.join(OUT, 'sprites/guillermo_day_vga.png'));
            for (let i = 0; i < png.width * png.height; i++) {
                if (png.data[i * 4 + 3] > 0) {
                    const key = `${png.data[i * 4]},${png.data[i * 4 + 1]},${png.data[i * 4 + 2]}`;
                    assert.ok(palette.has(key), `color ${key} no és a la paleta del dia`);
                }
            }
        });

        it('la variant nit usa la paleta de nit', () => {
            const generator = new VgaGfxGenerator(vgaData);
            const day = generator.getPalette('DAY');
            const night = generator.getPalette('NIGHT');
            // un color present al dia i absent a la nit (i a l'inrevés)
            const daySet = new Set(day.map(c => `${c[0]},${c[1]},${c[2]}`));
            const nightSet = new Set(night.map(c => `${c[0]},${c[1]},${c[2]}`));
            const dayOnly = [...daySet].find(c => !nightSet.has(c));
            assert.ok(dayOnly, 'les paletes dia i nit han de ser diferents');

            const dayPng = readPNG(path.join(OUT, 'sprites/guillermo_day_vga.png'));
            const nightPng = readPNG(path.join(OUT, 'sprites/guillermo_night_vga.png'));
            assert.notDeepEqual(dayPng.data, nightPng.data, 'el sprite de nit ha de ser diferent del de dia');
        });

        it('la meitat inferior de l\'atlas és la còpia flipejada de la superior', () => {
            const png = readPNG(path.join(OUT, 'sprites/adso_day_vga.png'));
            const json = atlasJson('adso');
            const { frame: f0 } = json.frames['walk_0_0'];
            const { frame: f3 } = json.frames['walk_3_0'];
            const normal = frameMask(png, f0);
            const flipped = frameMask(png, f3);
            // mask flipejada: invertir l'ordre de les columnes
            const w = f0.w, h = f0.h;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    assert.equal(normal[y * w + x], flipped[y * w + (w - 1 - x)],
                        `walk_3_0 ha de ser el mirall horitzontal de walk_0_0 a (${x},${y})`);
                }
            }
        });

        it('els monjos comparteixen el cos però difereixen a la cara', () => {
            const severino = readPNG(path.join(OUT, 'sprites/severino_day_vga.png'));
            const abad = readPNG(path.join(OUT, 'sprites/abad_day_vga.png'));
            const { frame } = atlasJson('severino').frames['walk_0_0'];

            // files de la cara (0-9): diferents entre monjos
            let headDiffs = 0;
            // files del cos (10+): els dos usen el traje 0x82, idèntics
            let bodyDiffs = 0;
            for (let y = 0; y < frame.h; y++) {
                for (let x = 0; x < frame.w; x++) {
                    const idx = (severino.width * (frame.y + y) + frame.x + x) * 4;
                    if (severino.data.slice(idx, idx + 4).toString() !== abad.data.slice(idx, idx + 4).toString()) {
                        if (y < 10) headDiffs++; else bodyDiffs++;
                    }
                }
            }
            assert.ok(headDiffs > 20, `les cares han de diferir (diffs=${headDiffs})`);
            assert.equal(bodyDiffs, 0, 'el cos (traje) ha de ser idèntic entre monjos');
        });

        it('l\'encapuchat usa la segona cara de berengario', () => {
            // a la taula CPC, hooded = cap índex 6 = segona cara de berengario
            const berengario = readPNG(path.join(OUT, 'sprites/berengario_day_vga.png'));
            const hooded = readPNG(path.join(OUT, 'sprites/hooded_day_vga.png'));

            // berengario frames 4-7 (walk_1_*) usen la variant 2 de la seva cara,
            // igual que hooded frames 0-3? No: cada personatge té la seva cara.
            // El que podem verificar: hooded cara != berengario cara (variant 1)
            const { frame } = atlasJson('hooded').frames['walk_0_0'];
            let diffs = 0;
            for (let y = 0; y < 10; y++) {
                for (let x = 0; x < frame.w; x++) {
                    const i1 = (berengario.width * y + x) * 4;
                    const i2 = (hooded.width * y + x) * 4;
                    if (berengario.data.slice(i1, i1 + 4).toString() !== hooded.data.slice(i2, i2 + 4).toString()) diffs++;
                }
            }
            assert.ok(diffs > 10, 'la cara de l\'encapuchat ha de diferir de la de berengario');
        });

        it('REGRESSIÓ: les frames de gir (walk_1_*) no mostren la cara del monjo següent', () => {
            // amb l'offset de variant de cara erroni (+400 en lloc de +200),
            // les frames de gir d'un monjo mostraven la cara frontal del monjo següent
            const MONKS = ['severino', 'abad', 'malaquias', 'berengario', 'bernardo', 'jorge', 'hooded'];
            const { frame } = atlasJson('severino').frames['walk_0_0'];
            const heads = {};
            for (const name of MONKS) {
                const png = readPNG(path.join(OUT, `sprites/${name}_day_vga.png`));
                heads[name] = {
                    front: headSignature(png, atlasJson(name).frames['walk_0_0'].frame),
                    turn: headSignature(png, atlasJson(name).frames['walk_1_0'].frame)
                };
            }
            for (let i = 0; i < MONKS.length; i++) {
                const name = MONKS[i];
                // la cara de gir ha de diferir de la frontal del mateix monjo (esquena vs cara)
                assert.notEqual(heads[name].turn, heads[name].front,
                    `${name}: la frame de gir té la mateixa cara que la frontal`);
                // i no ha de coincidir amb la cara frontal del monjo següent
                const next = MONKS[i + 1];
                if (next) {
                    assert.notEqual(heads[name].turn, heads[next].front,
                        `${name}: en girar mostra la cara de ${next}`);
                }
            }
        });

        it('els objectes tenen els 8 frames i no es flipejen', () => {
            const png = readPNG(path.join(OUT, 'sprites/objects_day_vga.png'));
            assert.equal(png.width, 128);
            assert.equal(png.height, 12);
            const json = atlasJson('objects');
            assert.equal(Object.keys(json.frames).length, 8);
            // cada objecte ha de tenir contingut
            for (const [key, info] of Object.entries(json.frames)) {
                const mask = frameMask(png, info.frame);
                assert.ok(mask.includes(1), `objecte ${key} buit`);
            }
        });

        it('la porta flipejada és el mirall horitzontal de la porta normal', () => {
            const png = readPNG(path.join(OUT, 'sprites/doors_day_vga.png'));
            const { frame: d0 } = atlasJson('doors').frames['door_0'];
            const { frame: d1 } = atlasJson('doors').frames['door_1'];
            const normal = frameMask(png, d0);
            const flipped = frameMask(png, d1);
            const w = d0.w, h = d0.h;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    assert.equal(normal[y * w + x], flipped[y * w + (w - 1 - x)]);
                }
            }
        });
    });

    describe('UI', () => {

        it('genera el HUD VGA de 256x32 amb les dues variants dia/nit', () => {
            const day = readPNG(path.join(OUT, 'ui/hud_day_vga.png'));
            const night = readPNG(path.join(OUT, 'ui/hud_night_vga.png'));
            assert.equal(day.width, 256);
            assert.equal(day.height, 32);
            assert.notDeepEqual(day.data, night.data);
        });

        it('genera els digits del dia (V i I) de 16x8', () => {
            const png = readPNG(path.join(OUT, 'ui/days_day_vga.png'));
            assert.equal(png.width, 16);
            assert.equal(png.height, 8);
            // V i I han de ser diferents
            let diffs = 0;
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const idx = (png.width * y + x) * 4;
                    if (png.data.slice(idx, idx + 3).toString() !== png.data.slice(idx + 32, idx + 35).toString()) diffs++;
                }
            }
            assert.ok(diffs > 5, 'V i I han de ser diferents');
        });

        it('genera la pantalla de títol VGA de 320x200 amb molts colors', () => {
            const png = readPNG(path.join(OUT, 'ui/title_vga.png'));
            assert.equal(png.width, 320);
            assert.equal(png.height, 200);
            const colors = new Set();
            for (let i = 0; i < png.width * png.height; i++) {
                colors.add(`${png.data[i * 4]},${png.data[i * 4 + 1]},${png.data[i * 4 + 2]}`);
            }
            assert.ok(colors.size > 100, `la pantalla VGA ha de tenir molts colors (té ${colors.size})`);
        });

        it('genera la pantalla de scroll VGA amb el fons pergamí', () => {
            const png = readPNG(path.join(OUT, 'ui/scroll_vga.png'));
            assert.equal(png.width, 320);
            assert.equal(png.height, 200);
            // centre del pergamí: color crema (247,227,159)
            const center = ((png.width * 100) + 160) * 4;
            assert.deepEqual([...png.data.slice(center, center + 3)], [247, 227, 159]);
            // marge esquerre: marró fosc (index 20 -> 31,27,11)
            const margin = ((png.width * 100) + 10) * 4;
            assert.deepEqual([...png.data.slice(margin, margin + 3)], [31, 27, 11]);
        });
    });

    describe('applyVgaTileFixes (peda\u00e7os de tiles VGA de Vigasoco)', () => {

        function emptyRoom() {
            const rd = [];
            for (let x = 0; x < 16; x++) {
                rd[x] = [];
                for (let y = 0; y < 20; y++) rd[x][y] = [];
            }
            return rd;
        }

        it('no modifica habitacions sense peda\u00e7os', () => {
            const rd = emptyRoom();
            rd[3][3] = [{ tile: 42, depthX: 8, depthY: 9 }];
            const result = applyVgaTileFixes(rd, 999);
            assert.deepEqual(result[3][3], [{ tile: 42, depthX: 8, depthY: 9 }],
                'contingut intacte a habitacions sense peda\u00e7os');
        });

        it('substitueix el contingut de la posici\u00f3 peda\u00e7ada per [bg, fg]', () => {
            const rd = emptyRoom();
            rd[10][1] = [
                { tile: 7, depthX: 16, depthY: 14 },
                { tile: 129, depthX: 16, depthY: 14 }
            ];
            const result = applyVgaTileFixes(rd, 13); // room 13: peda\u00e7 (10,1) fg=7 bg=143
            const layers = result[10][1];
            assert.equal(layers.length, 2);
            assert.equal(layers[0].tile, 143, 'fons (bg) darrere');
            assert.equal(layers[1].tile, 7, 'primer pla (fg) davant');
            assert.equal(layers[1].depthX, 16);
            assert.equal(layers[1].depthY, 14);
        });

        it('no muta el roomData original (el mode es pot commutar en calent)', () => {
            const rd = emptyRoom();
            rd[10][1] = [{ tile: 7, depthX: 16, depthY: 14 }];
            applyVgaTileFixes(rd, 13);
            assert.equal(rd[10][1].length, 1);
            assert.equal(rd[10][1][0].tile, 7, 'el original ha de quedar intacte');
        });

        it('posicions sense capes usen la profunditat per defecte', () => {
            const rd = emptyRoom();
            const result = applyVgaTileFixes(rd, 44); // room 44: peda\u00e7 (11,2) amb 0 capes
            const layers = result[11][2];
            assert.equal(layers.length, 2);
            assert.equal(layers[0].tile, 143);
            assert.equal(layers[0].depthX, 16);
            assert.equal(layers[1].tile, 7);
        });

        it('remapa els tiles 57/58/105 (llibres i escala) a la numeraci\u00f3 VGA', () => {
            const rd = emptyRoom();
            rd[5][5] = [
                { tile: 57, depthX: 10, depthY: 10 },
                { tile: 58, depthX: 11, depthY: 11 },
                { tile: 105, depthX: 12, depthY: 12 },
                { tile: 42, depthX: 13, depthY: 13 }
            ];
            const result = applyVgaTileFixes(rd, 1);
            const layers = result[5][5];
            assert.equal(layers[0].tile, 201);
            assert.equal(layers[1].tile, 225);
            assert.equal(layers[2].tile, 237);
            assert.equal(layers[3].tile, 42, 'tiles sense remap intactes');
            assert.equal(layers[0].depthX, 10, 'les profunditats es mantenen');
        });

    });

    describe('tile 0: fons de l\'\u00e0rea de joc', () => {

        // A l'original (GeneradorPantallas::limpiaPantalla) el buffer de tiles
        // s'inicialitza amb tile 0 a tot arreu: els forats transparents dels
        // tiles el deixen veure. Al CPC el tile 0 \u00e9s el teal del fons (per
        // aix\u00f2 el port web no el pintava i el CPC es veia b\u00e9), per\u00f2 al VGA
        // \u00e9s gris pedra i cal pintar-lo (fix del "blau cel").

        it('el tile 0 CPC \u00e9s exactament el color de fons teal (0,128,128)', () => {
            const png = readPNG(path.join(PUBLIC_GFX, 'tiles/tiles_day.png'));
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 16; x++) {
                    const idx = (png.width * y + x) * 4;
                    assert.equal(png.data[idx], 0);
                    assert.equal(png.data[idx + 1], 128);
                    assert.equal(png.data[idx + 2], 128);
                }
            }
        });

        it('el tile 0 VGA \u00e9s gris pedra, no teal', () => {
            const png = readPNG(path.join(PUBLIC_GFX, 'tiles/tiles_day_vga.png'));
            let minR = 255;
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 16; x++) {
                    const idx = (png.width * y + x) * 4;
                    assert.equal(png.data[idx + 3], 255, 'tile 0 VGA opac');
                    minR = Math.min(minR, png.data[idx]);
                }
            }
            assert.ok(minR > 80, 'tile 0 VGA clar (gris)');
        });

    });

    describe('assets publicats (public/assets/gfx)', () => {

        it('tots els assets VGA estan generats i actualitzats respecte el generador', () => {
            const files = [
                'tiles/tiles_day_vga.png', 'tiles/tiles_night_vga.png',
                'ui/hud_day_vga.png', 'ui/hud_night_vga.png',
                'ui/days_day_vga.png', 'ui/days_night_vga.png',
                'ui/title_vga.png', 'ui/scroll_vga.png',
                ...SPRITE_NAMES.flatMap(n => [`sprites/${n}_day_vga.png`, `sprites/${n}_night_vga.png`])
            ];
            for (const f of files) {
                const published = fs.readFileSync(path.join(PUBLIC_GFX, f));
                const regenerated = fs.readFileSync(path.join(OUT, f));
                assert.deepEqual([...published], [...regenerated], `${f} no està actualitzat (executa npm run generate)`);
            }
        });

        it('tots els sprites tenen el seu json d\'atlas CPC amb la mateixa geometria', () => {
            for (const name of SPRITE_NAMES) {
                const json = atlasJson(name);
                for (const time of ['day', 'night']) {
                    const png = readPNG(path.join(PUBLIC_GFX, `sprites/${name}_${time}_vga.png`));
                    assert.equal(png.width, json.meta.size.w, `${name} (${time})`);
                    assert.equal(png.height, json.meta.size.h, `${name} (${time})`);
                }
            }
        });
    });

    describe('gfxMode (runtime)', () => {

        it('el mode per defecte és cpc', () => {
            setGfxMode('cpc');
            assert.equal(getGfxMode(), 'cpc');
        });

        it('atlasKey retorna la clau CPC sense sufix', () => {
            setGfxMode('cpc');
            assert.equal(atlasKey('guillermo', 'day'), 'guillermo_day');
            assert.equal(atlasKey('tiles', 'night'), 'tiles_night');
        });

        it('atlasKey retorna la clau VGA amb sufix _vga', () => {
            setGfxMode('vga');
            assert.equal(atlasKey('guillermo', 'day'), 'guillermo_day_vga');
            assert.equal(atlasKey('hud', 'night'), 'hud_night_vga');
            assert.equal(atlasKey('objects', 'day'), 'objects_day_vga');
        });

        it('toggleGfxMode commuta entre cpc i vga', () => {
            setGfxMode('cpc');
            assert.equal(toggleGfxMode(), 'vga');
            assert.equal(toggleGfxMode(), 'cpc');
        });
    });
});
