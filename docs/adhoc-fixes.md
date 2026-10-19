# Correccions "ad hoc" de pantalles i tiles

Anàlisi de tots els sistemes de correcció visual que existeixen al projecte
(port web), a [Vigasoco](https://github.com/luzbel/VigasocoSDL) i al remake PC
d'Antonio Giner, amb les causes arrel i la cobertura de cada un.

## Els 4 sistemes de correcció

| Sistema | On viu | Mode | Habitacions | Què corregeix |
|---|---|---|---|---|
| `TILE_HACKS` tipus 0 | `src/constants.js` | CPC + VGA | 38, 8, 72, 78, 116 | Profunditats de capes (ordre sprites/tiles) |
| `TILE_HACKS` tipus 1 + `MIRROR_HACKS` | `src/constants.js` | CPC + VGA | 116, 115 | Afegir tiles (pòrtic/biblioteca del mirall), amagar Guillermo caient |
| `VGA_TILE_PATCHES` | `src/constants.js` + `src/levels/VgaTileFixes.js` | només VGA | 3, 12, 13, 14, 21, 24, 31, 36, 39, 43, 44 | Contingut de tiles (ventanals) |
| `VGA_TILE_REMAPS` | `src/constants.js` + `src/levels/VgaTileFixes.js` | només VGA | totes (tiles 57, 58, 105) | Renumeració de tiles (llibres, escales) |

**Zero solapament** entre les habitacions del port web i les de Vigasoco:
els dos autors van corregir problemes diferents (profunditats vs contingut
de tiles), i els dos sistemes conviuen sense conflicte.

## Causes arrel

### 1. El buffer de profunditat trunca capes

Cada posició del tauler (16×20 per pantalla) pot acumular diverses capes
de tiles quan estructures diferents es dibuixen al mateix lloc (parets,
escales, baranes...). El buffer per posició de l'original té una mida fixa
(`nivelesProfTiles` a Vigasoco) i **descarta** les capes que sobren:

- **CPC original: 2 nivells.** Les capes del fors es perdien; el joc
  original vivia amb aquests defectes.
- **Vigasoco: 4 nivells.** El comentari del codi ho explica:
  *"Con 3 en CPC se ve bastante bien, pero con VGA hay imperfecciones
  visuales bastante notables (... un pulpito ... que queda un hueco sin
  dibujar que queda con el color de fondo de la pantalla!!!)"*.
  Amb 4: *"Con esto ya se ve bien casi todo, incluso a veces mejor al
  remake 32 bits 256 colores"*.
- **Port web: capes il·limitades** (`ScriptInterpreter.grabaTile` fa
  `push` a un array, sense descartar-ne cap). No té forats, però l'ordre
  de profunditat resultant no sempre coincideix amb l'original → per això
  existeixen els `TILE_HACKS` de tipus 0, que ajusten la profunditat
  (`depthX`/`depthY`) d'una capa concreta (`priority`) a mà.

Dades mesurades escanejant les 116 habitacions interpretades: **144
posicions tenen més de 4 capes** (màxim 7). Distribució de capes per
posició: 8.719 buides, 13.331 amb 1, 10.774 amb 2, 3.472 amb 3, 680 amb 4,
121 amb 5, 19 amb 6, 4 amb 7.

### 2. El model de profunditat és per blocs, no per tiles

El port calcula `depthx`/`depthy` **un cop per bloc** dibuixat
(`ScriptInterpreter.js`), i la reordenació de capes és una simplificació
de `GeneradorPantallas::actualizaTile` del C++. Quan un bloc dibuixa tiles
que haurien de quedar **davant** dels sprites (portes, escales, baranes),
l'ordre surt malament i cal corregir-ho a mà:

- room 38 i room 8: escales
- room 72 i room 78: portes
- room 116: columnes del pòrtic de l'habitació del mirall

A Vigasoco passa el mateix: molts pedaços del remake PC estan **comentats**
precisament perquè *"queda por delante de los sprites"*, i en lloc de
pedaçar-los van resoldre el problema de manera global pujant
`nivelesProfTiles` a 4.

### 3. Renumeració de tiles al tileset VGA

El mapa d'habitacions (`rooms.json`) és el de la versió CPC, però el
tileset del remake VGA (`GraficosVGA`) té els tiles en un ordre diferent.
Això provava dos tipus de defectes, corregits a Vigasoco a
`GeneradorPantallas::Parchea` i `GeneradorPantallas::grabaTile`:

- **Finestres ("ventanales")**: *"los típicos ventanales que se ven bien
  en CPC y mal con los tiles VGA"*. El mapa apunta a tiles que al tileset
  VGA no són la finestra correcta. El pedaç substitueix el contingut de la
  posició per `[bg (fons), fg (primer pla)]`, mantenint les profunditats
  existents (habitacions 3, 12, 13, 14, 21, 24, 31, 36, 39, 43, 44).
- **Tiles renumerats**: els llibres (`57→201`, `58→225`) i un tile
  d'escala (`105→237`) tenen número diferent al tileset VGA. Al tileset
  CPC aquests números són altres tiles, per això el remap **només s'ha
  d'aplicar en mode VGA**.

### 4. Casos especials del motor

- **Room 115 (habitació del mirall)**: el reflex és una feature especial
  del motor (`MIRROR_BLOCK`, `Reflection`). `MIRROR_HACKS` amaga el sòl
  quan Guillermo cau pel mirall (s'activa amb `trapOpened`).
- **Room 116**: el pòrtic i la biblioteca de l'habitació del mirall
  necessiten tiles afegits que el bloc-script no dibuixa
  (`TILE_HACKS` tipus 1).

## Detalls d'implementació al port web

- `applyVgaTileFixes(roomData, roomId)` (`src/levels/VgaTileFixes.js`) és
  una **funció pura**: no muta el `roomData` cachejat a
  `AbadiaBuilder.interpretedRooms`, perquè el mode gràfic es pot commutar
  en calent (tecla `V`) i cal poder tornar al mode CPC sense artifacts.
- `AbadiaBuilder.buildRoom` aplica els fixes VGA **després** del cache i
  **abans** de `renderRoom`, només quan `getGfxMode() === 'vga'`.
- Els `TILE_HACKS` de tipus 0 s'apliquen en **ambdós modes**: l'ordre de
  profunditat no depèn del tileset.
- A més, en mode VGA `renderRoom` pinta el **tile 0 com a base** de tota
  l'àrea de joc (256×160): a l'original `GeneradorPantallas::limpiaPantalla`
  inicialitza el buffer de tiles amb tile 0 a tot arreu, i els forats
  transparents dels tiles el deixen veure. Al CPC no cal pintar-lo perquè
  el tile 0 CPC és **exactament** el color de fons del port `(0,128,128)`
  (teal); al VGA és gris pedra i, si no es pinta, els forats mostren el
  color de fons de la càmera (efecte "blau cel").

## Diferència respecte Vigasoco que queda

Les 144 posicions amb més de 4 capes: Vigasoco hi descartaria les capes
del fons; el port les manté totes. Visualment el port es veu millor (sense
forats), igual que Vigasoco amb 4 nivells (*"mejor al remake 32 bits"*).
Si mai es volés fidelitat 1:1 amb el CPC original, seria un mode
"truncat a 2 capes" — no recomanat.

## Referències al codi de Vigasoco

- `core/abadia/GeneradorPantallas.h`: `nivelesProfTiles` i el comentari del pulpito
- `core/abadia/GeneradorPantallas.cpp`: `Parchea()` (pedaços amb els comentaris
  de quins s'apliquen i quins no), `grabaTile()` (remap de tiles),
  `limpiaPantalla()` (tile 0 com a fons), `actualizaTile()` (reordenació de capes)
- `core/abadia/MotorGrafico.cpp`: `dibujaPantalla()` — només crida `Parchea()`
  quan els gràfics són VGA (`if (elJuego->GraficosCPC==false)`)
