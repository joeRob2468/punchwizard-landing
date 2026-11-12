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
- **Layers:** bottom left: presets (Omnia, Ossa, Viscera, Arcana; `L`) and an on/off switch per layer; one see-through switch (Perspicua, `T`) shows the layers that are off as a faint outline instead of hiding them. All glowing organs are in the arcane layer, so Arcana shows them alone (in a faint outline of the rest with see-through on). Internal features label from outside once what covers them is see-through or hidden.
- **Label pulse:** hovering or pinning a label makes its part flare and its leader line glow in the part's colour.
- **Mana flow:** slow pulses of light leave the Aetheric Core at random moments and travel along the lattice, vessels and ganglia.
- **Motes:** a few faint specks float around the model, for depth as the camera moves.
- **Rune circles:** Elder Futhark rings: a turning summoning circle with a valknut under the bust and a faint halo ring behind the head.
- **Spotlight (step 1):** a warm spot from the viewer's upper right (the cut side) that follows the camera lazily and drifts; deep shadows, rim kept; cut faces lit with a floor; casts shadows (brim on the face, beard on the robe); Tabula only.
- **Grade:** halation, split-toning, a soft S-curve and a highlight shoulder (tone only in the scan view); `G` toggles it in dev.
- **Cut edge glow:** a fine undulating line of the circle's light just inside the cut's outer edge.
- **Ground seam:** the bust rises through the ground circle: a glowing band where every part (and cut face) meets the ground, and light on the ground along his outline there.
- **Marginalia:** a faint astrolabe, zodiac band, planetary orbits, great arcs to the frame, constellations and construction lines, drawn into the paper behind the specimen (the rune pedestal blocks them).
- **Border:** a solid black frame, a band of runes in the double rule, corner medallions, and runes that catch the light now and then.
- **Key of lights:** an inset (top right) with each magical organ's glow colour, number and Latin name (hover to flare it), and a scale.
- **Cipher notes:** two short notes in runes (under the taxonomy and in the key) that read as Latin on hover.
- **Idle life:** glows breathe on their own rhythms, the heart beats, the eyes' glow blinks now and then, the hat sways (cuts and labels follow); sway and blinks respect reduced motion.
- **Gaze:** both irises and pupils follow the pointer together (soft-limited turn), anywhere on the page; they return to straight ahead when the pointer leaves the window.
- **Bake:** parallel workers, meshoptimizer simplification, inward-triangle repair, through-hole warnings, baked occlusion, quantised, meshopt-compressed format v4. About 400k triangles, 2.2 MB (2.0 MB gzipped), a 90–110 s bake (the head with its horn core dominates; over the plan's budget, fine for the desktop audience).
- **Views:** Tabula (default: Deyrolle washes on ink-black paper, dark outlines and section lines) and Resonantia (MRI greys, hair and clothing black), switched at the bottom right or with `V`. Bloom (each magical organ glows in its own colour, in both views, and through see-through layers) and Lens (aberration, light grain, vignette) are part of both. See design.md § Views.
- **Performance:** about 3 ms a frame on the GPU at 2500 × 1330 (no MSAA; SMAA alone), cut faces drawn only for parts the plane crosses, label overlay writes only what changed, pixel ratio adapts on weak devices; the specimen is meshopt-compressed (2.0 MB gzipped) and preloaded from the HTML.
- **Preloader:** a ring of Futhark runes that ink in as the specimen loads, captioned _Praeparatur specimen_, fading out on the first frame.
- **Metadata:** title, description, canonical URL, Open Graph and X/Twitter cards with a 1200 × 630 title-card preview image.
- **Icons:** SVG favicon (the hat on dark paper) with ICO, touch and manifest (incl. maskable) renders, and a web manifest.
- **Fallback:** without WebGL 2 (or if the plate fails), the border and title with a still of the specimen and a short note; `<noscript>` shows the same still.
- **Touch:** no browser gestures on the plate (pinch zooms the camera, not the page), larger tap targets on touch screens, bottom controls stacked on phones, tooltips kept on screen (they open toward the middle, and upward low down).
- **Ink-in:** the specimen inks in from its centre as the preloader fades (glows included), then the labels fade in.
- **M6 (Docker):** the image builds (the bake runs inside it, ~85 s) and runs healthy locally with `docker compose up -d` on 127.0.0.1:8080; checked in the browser: gzip on text and specimen files, caching (assets immutable for a year, specimen an hour, pages revalidated), the security headers and CSP (the WebAssembly decoder runs), the manifest's MIME type, the health check.

## Next

The look, the views, the layers and the flair round are done and reviewed. Launch prep is done: performance pass, preloader, metadata and icons, the fallback still, touch tuning and the ink-in (see Works and design.md). Next:

1. **Lighting (in progress):** the spotlight and its shadows are in; next a volumetric beam with motes lit inside it.
2. **Ship:** rebuild the image from the final source, then deploy (M8) only once the owner calls the site final.

## Working notes

- **Coincident surfaces flicker:** two parts carving the same field share a wall and z-fight. Give each tissue its own offset of a shared cavity (see `parts/airways.ts`).
- **Dev-server checks:** the page re-bakes on changes under `src/procedural/` (~90 s, once per settled batch of saves; unchanged sources skip it) and reloads; wait for `[bake] done` in the dev server log before screenshotting. Idle auto-rotate moves the camera after 20 s: override `matchMedia('(prefers-reduced-motion)')` in a navigation init script to stop it. Park the cut with ~40 wheel-up events on the canvas. `controls.setLookAt(...)` positions the camera; layers can be switched by clicking the bottom-left buttons.
- **Checking visuals:** the dev server runs on :5173; Chrome DevTools MCP is approved for localhost only. `window.__plate()` (dev builds) returns the R3F state: `.camera`, `.controls` (camera-controls: `setLookAt(...)`), `.scene` (`getObjectByName(partId)`). The uncut side of the head is visible after pressing `S` three times and scrolling the wheel up (parks the cut). The owner's real mouse over the tab sends pointer events, which can confuse gaze tests.
- **Hunting holes:** `countHandles` (`src/procedural/mesh/topology.ts`) on a part's raw mesh gives its through-holes; to bisect, copy the part file into a scratch folder under `src/procedural/parts/` (fix its import paths), return early at successive construction steps, and measure each. Delete the scratch folder afterwards.
- **Parts that meet:** never trim one part to sit just outside another (hat, hair cap on the head): the two near-coincident surfaces fight as a jagged seam. Sink the trimmed part a little under the other's surface instead (`outsideHead` in hat.ts and hair.ts), and don't let two parts end at the same edge (the collar trim wraps over the collar's top).
- **Head pitfalls found so far:** shapes that touch the face in two places leave tunnels (blend generously or extend them into the face); carves wider than what covers them leave pits; fine noise must stay shallower than thin features (lids).

## Known issues

- The bake warns about holes in hair parts (real gaps between locks), the skull (openings into its cavities) and a few internals; none show as defects on screen.

- React Three Fiber logs a `THREE.Clock` deprecation warning (inside the library; harmless).
- The production bundle is one ~1.56 MB chunk (three.js, postprocessing, the SDF fields the labels use; about 470 KB gzipped); splitting wouldn't reduce what a visitor downloads, so the warning is silenced.
- Ink lines along the beard's and moustache's edges still shimmer slightly while the model turns (owner: acceptable).
- `npm audit` reports a moderate advisory in `minimatch`, used only by ESLint tooling (not shipped).
- Under-eye tear-trough ends can leave a small dimple on one cheek; tidy in a later face pass.
