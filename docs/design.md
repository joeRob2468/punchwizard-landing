# Design

How the site works. The full rationale and roadmap are in [PLAN.md](PLAN.md); this file describes what exists now.

## Page structure

`src/main.tsx` checks for WebGL 2 and mounts either `<App>` or `<Fallback>`.

`<App>` (`src/app/App.tsx`) stacks three layers in one full-viewport `<main>`:

1. **Paper backdrop** (`ui/PaperBackdrop`): CSS stand-in for the procedural paper effect.
2. **Scene** (`<Canvas>` from React Three Fiber): transparent, DPR capped at 2. Empty for now.
3. **Overlay**: DOM elements above the canvas with `pointer-events: none` by default. Holds the title block (`ui/PlateHeader`).

## Palette

Colours are defined twice and kept in step: CSS custom properties in `src/styles/tokens.css` for the DOM, and `PALETTE` in `src/config/palette.ts` for shaders and materials.

## Typography

_IM Fell English_ (regular and italic), self-hosted through `@fontsource/im-fell-english`.
