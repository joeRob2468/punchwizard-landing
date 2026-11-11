# Status

Milestones are in [PLAN.md](PLAN.md#8-milestones); the realism revision after the M5 review is [PLAN.md §8a](PLAN.md#8a-revision-after-m5-review-2026-11-11). How things work is in [design.md](design.md). **Before any visual work, check [references.md](references.md)** for which moodboard images inform it.

## Works

- **M0–M5:** scaffold, render pipeline, procedural specimen with bake, sectioning with stencil caps, internals (skeleton, brain, fantasy organs, mana vessels, conduit lattice), twelve labelled features with leader lines and tooltips.
- **Controls:** left-drag orbits, right-drag pans, the **wheel moves the cut** (Ctrl/⌘ + wheel or pinch zooms), two-finger drag moves the cut on touch, `S` / `[` `]` / `R` / arrows / `+` `-`, double-click resets. No on-screen slice handle.
- **Shading:** four soft watercolour glazes, baked ambient occlusion, cross-contour engraved hatching at a steady screen spacing, depth and part-id outlines without flickering specks, paper composite.
- **Face (realism pass, owner-approved):** an old man's face with large, forward-set eyes angled away from the nose, almond lids, fold, bags, filled inner corners, wrinkles. The head has no through-holes.
- **Hair (realism pass):** beard, moustache, eyebrows and hair are clumped locks over solid cores, grown with gravity and collision (`growth/locks.ts`); hair drapes over the shoulders; hair parts hatch along their strands.
- **Hat (realism pass):** floppy lobed brim with a rolled edge, crumpled and creased cone, leather band with a metal buckle and a mana-blue gem.
- **Gaze:** both irises and pupils follow the pointer together (soft-limited turn), anywhere on the page; they return to straight ahead when the pointer leaves the window.
- **Bake:** parallel workers, meshoptimizer simplification, inward-triangle repair, through-hole warnings, baked occlusion, quantised format v3. About 150k triangles, 1.6 MB, 40 s.
- **M6 (started):** Docker image, compose files and runbook written but never built or run.

## Next

Realism pass, in this order (owner wants procedural first; an imported sculpt only if procedural can't get there):

1. **Robe:** layered mantle over an inner robe, high collar, trim along the opening (new part, gold/ochre), a clasp at the chest.
2. Check labels and section anchors still land after the new parts (registry anchors, part names in `src/anatomy/registry.ts`).
3. Then M6 polish (idle motion, ink-in on load, no-WebGL fallback image, touch tuning), building the Docker image (ask first: it pulls base images), and the optional stylisation step (dark background, monotone, MRI-like internals) if the owner wants it. Deploy (M8) only once the owner calls the site final.

## Working notes

- **Checking visuals:** the dev server runs on :5173; Chrome DevTools MCP is approved for localhost only. `window.__plate()` (dev builds) returns the R3F state: `.camera`, `.controls` (camera-controls: `setLookAt(...)`), `.scene` (`getObjectByName(partId)`). The uncut side of the head is visible after pressing `S` three times and scrolling the wheel up (parks the cut). The owner's real mouse over the tab sends pointer events, which can confuse gaze tests.
- **Hunting holes:** `countHandles` (`src/procedural/mesh/topology.ts`) on a part's raw mesh gives its through-holes; to bisect, copy the part file into a scratch folder under `src/procedural/parts/` (fix its import paths), return early at successive construction steps, and measure each. Delete the scratch folder afterwards.
- **Head pitfalls found so far:** shapes that touch the face in two places leave tunnels (blend generously or extend them into the face); carves wider than what covers them leave pits; fine noise must stay shallower than thin features (lids).

## Known issues

- React Three Fiber logs a `THREE.Clock` deprecation warning (inside the library; harmless).
- The production bundle is one ~1.1 MB chunk (three.js, about 310 KB gzipped); splitting wouldn't reduce what a visitor downloads, so the warning is silenced.
- `npm audit` reports a moderate advisory in `minimatch`, used only by ESLint tooling (not shipped).
- Under-eye tear-trough ends can leave a small dimple on one cheek; tidy in a later face pass.
