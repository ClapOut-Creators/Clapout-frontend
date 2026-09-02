# Design reference (Figma → code)

Source: Figma file "Clapout" (key `9N8Lkrbn3JycpBbOktX0qH`), page **Admin**. Design width 1728px
(80px icon rail + 1648px content).

- `figma/_README.md` — index of the 26 admin screens (what each is) + the global token sheet
  (fonts, colors, text styles, radii) measured across the whole page.
- `figma/<screen>.png` — 1:1 export of each screen (scale 1).
- `figma/<screen>.json` — node spec: nested nodes with `x,y,w,h` (px, relative to the screen),
  `fill`/`stroke` hex, `r` radius, `lay` auto-layout `{d, gap, pad[t,r,b,l]}`, and for TEXT
  `txt`, `font` ("Family Style"), `fs`, `lh`. Use it for exact values.
- `figma-extract.js` — how the specs were produced with `figma-use` (dense frames are split
  recursively because a single `eval` returns `undefined` when its payload is too large).
  Re-run after design changes: connect Figma via `figma-cli daemon start && figma-cli connect`,
  regenerate `_index.json` (see the script header), then `node figma-extract.js <out dir>`.

Rule of the house: admin screens match these designs 1:1, verified by screenshotting the app at
1728px and comparing against the PNGs — not from memory.

## Clipper (creator) surfaces — `figma-clippers/`

Same format, from the Figma page **"Web App - clippers"** (node 140:2972): public campaigns list
(desktop 1728 + mobile 402), public campaign detail (desktop + mobile), sign-in ("Sign A"),
create-account ("Sign B"), and the clipper dashboard. See `figma-clippers/_README.md`.
