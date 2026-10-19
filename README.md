# La Abadía del Crimen (Opera Soft 1988) port for the web

*La Abadía del Crimen* reimplementation written in Javascript using assets from the Amstrad CPC version.

## Play

- Browser: https://ultrabolido.github.io/abadia/
- Controls:
  - `Cursor keys`: Guillermo & Adso movement (push `Cursor down` to control Adso)
  - `SPACE`: leave item
  - `ESC`: reset game
  - `V`: toggle graphics mode (CPC / VGA 256 colors)

- Debug controls:
  - `NUMPAD +`: advance moment of the day (use with care)
  - `1-8`: change camera tracking

## Graphics modes

The game ships with two graphics modes, toggleable at runtime with `V`
(the preference is persisted in `localStorage`):

- **CPC** (default): the original 4-color Amstrad CPC graphics, extracted
  from the original disk image by `scripts/generators/GfxGenerator.js`.
- **VGA**: the 256-color remake graphics by Manuel Abadía, taken from the
  `GraficosVGA` file bundled with Vigasoco and extracted by
  `scripts/generators/VgaGfxGenerator.js`. Both modes share the same
  sprite/tile atlas geometry, so all game logic is unaffected.

The VGA mode also applies the tile patches from Vigasoco
(`GeneradorPantallas::Parchea` and `::grabaTile`): the CPC room map points
to a few tiles that have a different number (or look wrong) in the VGA
tileset — windows, books and a staircase tile. See
[`docs/adhoc-fixes.md`](docs/adhoc-fixes.md) for the full analysis of
every ad-hoc screen fix and why they are needed.

## Development

```bash
npm install
npm start        # dev server at http://localhost:9002
npm run generate # regenerate all assets from the disk image (CPC + VGA)
npm test         # run the test suite (node --test)
npm run build    # production bundle to dist/
npm run deploy   # build + publish to GitHub Pages
```

Assets are generated from `public/assets/disk/abadia.dsk` (CPC) and
`scripts/data/GraficosVGA` (VGA) into `public/assets/gfx/`. Tests verify
palettes, sprite geometry, tile round-trips, the published assets and the
runtime graphics-mode switching.

## Work in progress

This version is a work in progress. The game is fully playable, but there are bound to be some bugs.

## Credits
Paco Menéndez & Juan Delcán for written the original Amstrad CPC version © Opera Soft 1988.  
Antonio Giner & Manuel Pazos for the [disassembly](https://github.com/luzbel/vigasocosdl-la-abadia-del-crimen) of the Amstrad CPC version and the [SDL port](https://github.com/luzbel/VigasocoSDL).

Manuel Abadía for the 256-color VGA remake graphics bundled with Vigasoco.


