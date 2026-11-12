# Development

## Setup

Node 24 (`.nvmrc`) and npm.

```sh
npm install
npm run dev
```

## Scripts

| Script              | What it does                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Vite dev server with hot reload on `http://localhost:5173`                                          |
| `npm run bake`      | Mesh the procedural specimen into `generated/specimen/` (the dev server and `build` run it for you) |
| `npm run build`     | Bake, then production build into `dist/`                                                            |
| `npm run preview`   | Serve `dist/` locally                                                                               |
| `npm run check`     | `format:check` + `lint` + `typecheck`; must pass before committing                                  |
| `npm run format`    | Prettier, writing changes                                                                           |
| `npm run lint:fix`  | ESLint with autofix                                                                                 |
| `npm run typecheck` | `tsc` for the browser project (`tsconfig.app.json`) and the Node tooling (`tsconfig.node.json`)     |

## Layout

```
src/
  main.tsx        entry: WebGL check, mounts App or Fallback
  app/            composition root
  anatomy/        the labelled features (data)
  labels/         label tracking (scene), layout and overlay (DOM)
  procedural/     pure: SDF toolkit, mesher, growth, format, landmarks, parts (bake inputs)
  slicing/        clip plane, section caps, slice controller and handle
  state/          zustand store
  specimen/       loads the baked specimen and renders it
  config/         palette, render and camera tunables
  hooks/          shared React hooks
  rendering/      materials, post-processing effects, GLSL
  scene/          camera rig and scene contents
  ui/             DOM overlay components
  styles/         global CSS and tokens
```

More folders arrive with each milestone; see [PLAN.md](PLAN.md#5-repository-layout-and-conventions).

## Working on the specimen

The dev server re-bakes when files in `src/procedural/` change and reloads the page when it's done (about 90 s; progress is in the terminal). It waits 1.5 s for changes to settle (an edit and `npm run format` make one bake), restarts a running bake when sources change under it, and skips the bake when the sources match the last successful one (also on server start; the fingerprint is in `generated/specimen.sources`). A bake error, such as a surface outside its part's bounds, is printed there and the previous bake stays in place.

### Adding a part

1. Add a generator in `src/procedural/parts/` returning a `PartDefinition`: a field built from `sdf/` and positioned from `LANDMARKS`, its layer, a look (a `PALETTE` key, optional `glow`), bounds with some margin, and a cell size (about 0.012–0.03; keep features at least three cells thick).
2. Add it to `specimenParts()` in `src/procedural/specimen.ts`.
3. Save; check the bake output for the part's triangle count (the specimen is about 71k after simplification) and any through-hole warning.

## Tuning the look

Edit `src/config/render.ts`, `src/config/palette.ts` (and `src/styles/tokens.css`) or the GLSL in `src/rendering/shaders/`; the dev server reloads on save. Shader compile errors appear in the browser console.

## Reference images

Put mood and reference images in `moodboard/`. It's git-ignored and never committed.
