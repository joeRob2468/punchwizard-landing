# Status

Milestones are defined in [PLAN.md](PLAN.md#8-milestones).

## Works

- **M0 scaffold:** Vite + React + TypeScript (strict), ESLint + Prettier (`npm run check`), docs. The page shows a CSS paper backdrop with a ruled border, the species title block and an empty transparent WebGL canvas; without WebGL 2 it shows the same paper and title as a fallback.

## Next

- **M1 render pipeline:** camera controls, ink-and-wash material, outline and paper effects on test shapes, for a look sign-off.

## Known issues

- The production bundle is one ~1.1 MB chunk (three.js); splitting is part of the M6 performance pass.
- `npm audit` reports a moderate advisory in `minimatch`, used only by ESLint tooling (not shipped).
