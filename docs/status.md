# Status

Milestones are in [PLAN.md](PLAN.md#8-milestones); the realism revision after the M5 review is [PLAN.md §8a](PLAN.md#8a-revision-after-m5-review-2026-11-11). How things work is in [design.md](design.md). **Before any visual work, check [references.md](references.md)** for which moodboard images inform it.

## Works

- **M0–M5:** scaffold, render pipeline, procedural specimen with bake, sectioning with stencil caps, internals (skeleton, brain, fantasy organs, mana vessels, conduit lattice), nineteen labelled features with leader lines and tooltips.
- **Controls:** left-drag orbits, right-drag pans, the **wheel moves the cut** (Ctrl/⌘ + wheel or pinch zooms), two-finger drag moves the cut on touch, `S` / `[` `]` / `R` / arrows / `+` `-`, double-click resets. No on-screen slice handle.
- **Shading:** lit like a photograph (wrapped key, fill, rim) with baked ambient occlusion and per-surface materials (skin, cloth, leather, hair, bone, tissue, gilt: highlight, sheen, scattering, fine relief, colour variation), fine anti-aliased section lines, depth and part-id outlines without flickering specks, paper composite (screened onto dark paper).
- **Face (realism pass, owner-approved):** an old man's face with large, forward-set eyes angled away from the nose, almond lids, fold, bags, filled inner corners, wrinkles. The head has no through-holes.
- **Labels:** all land in the default cut except the Cochlea Arcana (by the ears; coronal or transverse cuts) and the Familiar's Perch (on the removed half).
- **Hair (realism pass):** beard, moustache, eyebrows and hair are clumped locks over solid cores, grown with gravity and collision (`growth/locks.ts`); hair drapes over the shoulders.
- **Hat (realism pass):** floppy lobed brim with a rolled edge, crumpled and creased cone, leather band with a metal buckle and a mana-blue gem.
- **Robe (realism pass):** plum inner robe with folds, blue mantle with scalloped hem, V opening and stand collar, gold trim, two brooches with garnets and a chain; the Familiar's Perch stands clear of the mantle on the left shoulder.
- **Internal anatomy (after the medical references):** skull with cranial fossae, palate, orbits and nasal cavity (septum, conchae, frontal and sphenoid sinuses); mandible and 32 teeth; brain with corpus callosum, ventricles, brainstem and cerebellum, meninges/CSF, spinal cord; C1–T10 with the cervical curve, discs and canal; tongue, soft palate, hyoid, larynx, trachea and oesophagus with open airways; clavicles, sternum, scapulae, humeri, ribs and costal cartilage; torso flesh under the robe. The resting sagittal cut sits just past the septum.
- **Fantasy pass:** the head grows up into the hat as a horn core and the brain fills it (Pileal Lobe); refined Aetheric Core (crystal in crossed rings), Ethereal Gland (scaled cone), Focus Gems (crystal clusters) and Incantatory Sinus (organ pipes); new Lexicon Lamellae, Cor Aethericum, Cochlea Arcana, Ganglia Arcana and Radix Barbae, all labelled; “Signature Look of Superiority” (19) points at the face.
- **Layers:** shown, see-through or hidden per layer, with presets (Omnia, Ossa, Viscera; `L`), bottom left. Internal features label from outside once what covers them is see-through or hidden.
- **Gaze:** both irises and pupils follow the pointer together (soft-limited turn), anywhere on the page; they return to straight ahead when the pointer leaves the window.
- **Bake:** parallel workers, meshoptimizer simplification, inward-triangle repair, through-hole warnings, baked occlusion, quantised format v3. About 400k triangles, ~4 MB, a 90–110 s bake (the head with its horn core dominates; over the plan's budget, fine for the desktop audience).
- **Views:** Tabula (default: Deyrolle washes on ink-black paper, dark outlines and section lines) and Resonantia (MRI greys, hair and clothing black), switched at the bottom right or with `V`. Bloom (each magical organ glows in its own colour, in both views, and through see-through layers) and Lens (aberration, light grain, vignette) are on in both; a dev panel at top centre can switch them off. See design.md § Views.
- **M6 (started):** Docker image, compose files and runbook written but never built or run.

## Next

Exterior, internal anatomy, fantasy organs, layers and framing are done and approved. In this order:

1. **Stylisation:** decided: Tabula and Resonantia, lit shading, bloom and lens. Remaining: owner tuning of the two views; whether the dev effects panel goes before shipping; ideas not yet tried (god rays from the Aetheric Core, floating mana motes); effects' cost on low-end GPUs isn't measured yet.
2. **Optimise:** bake is ~100 s (head with horn core, hair, beard dominate; consider coarser cells or splitting the head's horn into its own part), ~400k triangles / ~4 MB (simplification error, fewer hair locks), and label tracking cost (BVHs for every part now).
3. **Finalise (M6 polish):** idle motion, ink-in on load, no-WebGL fallback image, touch tuning, build and test the Docker image locally (ask first: it pulls base images). Deploy (M8) only once the owner calls the site final.

## Working notes

- **Coincident surfaces flicker:** two parts carving the same field share a wall and z-fight. Give each tissue its own offset of a shared cavity (see `parts/airways.ts`).
- **Dev-server checks:** the page re-bakes on any change under `src/procedural/` (~100 s) and reloads; wait for `[bake] done` in the dev server log before screenshotting. Idle auto-rotate moves the camera after 8 s: override `matchMedia('(prefers-reduced-motion)')` in a navigation init script to stop it. Park the cut with ~40 wheel-up events on the canvas. `controls.setLookAt(...)` positions the camera; layers can be switched by clicking the bottom-left buttons.
- **Checking visuals:** the dev server runs on :5173; Chrome DevTools MCP is approved for localhost only. `window.__plate()` (dev builds) returns the R3F state: `.camera`, `.controls` (camera-controls: `setLookAt(...)`), `.scene` (`getObjectByName(partId)`). The uncut side of the head is visible after pressing `S` three times and scrolling the wheel up (parks the cut). The owner's real mouse over the tab sends pointer events, which can confuse gaze tests.
- **Hunting holes:** `countHandles` (`src/procedural/mesh/topology.ts`) on a part's raw mesh gives its through-holes; to bisect, copy the part file into a scratch folder under `src/procedural/parts/` (fix its import paths), return early at successive construction steps, and measure each. Delete the scratch folder afterwards.
- **Head pitfalls found so far:** shapes that touch the face in two places leave tunnels (blend generously or extend them into the face); carves wider than what covers them leave pits; fine noise must stay shallower than thin features (lids).

## Known issues

- The bake warns about holes in hair parts (real gaps between locks), the skull (openings into its cavities) and a few internals; none show as defects on screen.

- React Three Fiber logs a `THREE.Clock` deprecation warning (inside the library; harmless).
- The production bundle is one ~1.1 MB chunk (three.js, about 310 KB gzipped); splitting wouldn't reduce what a visitor downloads, so the warning is silenced.
- `npm audit` reports a moderate advisory in `minimatch`, used only by ESLint tooling (not shipped).
- Under-eye tear-trough ends can leave a small dimple on one cheek; tidy in a later face pass.
