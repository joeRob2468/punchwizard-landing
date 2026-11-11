# Status

Milestones are defined in [PLAN.md](PLAN.md#8-milestones).

## Works

- **M0 scaffold:** Vite + React + TypeScript (strict), ESLint + Prettier (`npm run check`), docs, title block, no-WebGL fallback.

- **M1 render pipeline (awaiting look sign-off):** ink-and-wash material, depth outlines, paper composite with granulation, and camera controls with keyboard, reset and idle turn, shown on a primitive test bust. Checked at desktop and phone widths.

## Next

- **M1 sign-off** on the look, then **M2:** SDF toolkit, mesher, bake, and the procedural outer shell.

## Known issues

- React Three Fiber logs a `THREE.Clock` deprecation warning (inside the library; harmless).

- The production bundle is one ~1.1 MB chunk (three.js); splitting is part of the M6 performance pass.
- `npm audit` reports a moderate advisory in `minimatch`, used only by ESLint tooling (not shipped).
