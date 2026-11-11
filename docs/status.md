# Status

Milestones are defined in [PLAN.md](PLAN.md#8-milestones).

## Works

- **M0 scaffold:** Vite + React + TypeScript (strict), ESLint + Prettier (`npm run check`), docs, title block, no-WebGL fallback.

- **M1 render pipeline (awaiting look sign-off):** ink-and-wash material, depth outlines, paper composite with granulation, and camera controls with keyboard, reset and idle turn, shown on a primitive test bust. Checked at desktop and phone widths.

- **M2 procedural shell (awaiting shape sign-off):** SDF toolkit, surface-nets mesher, bake into a compact binary format (dev re-bake on save, emitted into builds), and the outer shell: head, glowing eyes, beard, hair, hat and robed bust, rendered in place of the test bust.

## Next

- **Sign-off** on the look (M1) and shape (M2).
- **M3 slicing:** clip plane, stencil caps, drag handle, axis cycling.

## Known issues

- The specimen is about 312k triangles, 3.2 MB (2.4 MB gzipped): slightly over the 300k-triangle budget. Meshopt encoding could roughly halve the download if needed.
- Sub-pixel slivers along silhouettes occasionally leave tiny `+`-shaped ink specks (the outline's four-neighbour sampling around a single odd pixel). They read as ink dust; to revisit in M6.

- The hat mesh has one pinched edge (shared by four triangles) on the brim. It is still closed, so slice caps are unaffected.

- React Three Fiber logs a `THREE.Clock` deprecation warning (inside the library; harmless).

- The production bundle is one ~1.1 MB chunk (three.js); splitting is part of the M6 performance pass.
- `npm audit` reports a moderate advisory in `minimatch`, used only by ESLint tooling (not shipped).
