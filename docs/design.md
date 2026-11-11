# Design

How the site works. The rationale and roadmap are in [PLAN.md](PLAN.md); this file describes what exists now.

## Page structure

`src/main.tsx` checks for WebGL 2 and mounts either `<App>` or `<Fallback>`.

`<App>` (`src/app/App.tsx`) stacks two layers in one full-viewport `<main>`:

1. **Scene** (`<Canvas>`): camera rig, the specimen (`specimen/Specimen`, inside `<Suspense>` while it loads) and the post-processing stack. The renderer runs with no tone mapping (`flat`) so palette colours stay exact, DPR capped at 2.
2. **Overlay**: DOM above the canvas, `pointer-events: none` by default. Holds the printed double rule (`ui/PlateBorder`) and the title block (`ui/PlateHeader`).

`<Fallback>` shows the same border and title on CSS paper (`ui/PaperBackdrop`). It's used when WebGL 2 is missing and, through `ui/ErrorBoundary`, when the plate fails to render (for example, the specimen can't be fetched).

In dev, `scene/DevHandle` exposes the R3F state getter as `window.__plate` for inspection.

## Procedural specimen

Everything the wizard is made of is generated in `src/procedural/` (pure TypeScript, no DOM) and meshed ahead of time by the **bake**.

### Space and landmarks

Specimen space: origin near the centre of the head, y up, the face looking along +z, +x on the wizard's left; one unit is about a head's height. `landmarks.ts` names the reference points (eyes, nose tip, chin, ears, neck, shoulders, brim centre, hat tip, beard tip, bust base). Parts are positioned from them, and label anchors will refer to them.

### Parts

Each part (`parts/*.ts`) is a `PartDefinition`: an id, a layer, a look (palette key, optional glow, section pattern), a signed distance field, the bounds the surface must fit in, a cell size for meshing, and optionally `intendedHoles` (through-holes it is meant to have) and `gazePivot` (turns to follow the pointer). `specimen.ts` lists the parts **outermost to innermost**, which is also the order section caps are drawn in (see Sectioning). Names and lore are in [anatomy.md](anatomy.md).

| Part                        | Layer      | Section | Built from                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hat-gem`                   | integument | glow    | A cut gem (octahedron with a table) set in the buckle; built in the buckle's frame on the band                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `hat-buckle`                | integument | stipple | A square metal frame on the front of the band (one intended hole)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `hat-band`                  | integument | hatch   | A leather ring just proud of the cone above the brim (one intended hole)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `hat`                       | integument | rings   | A wide brim that droops in uneven lobes (less over the face, so the eyes show) with a rolled edge; a cone of tapering segments along a spine that bends at the tip, knocked sideways with height and pressed with slanting creases above the band; solid                                                                                                                                                                                                                                                                                                     |
| `eyebrows`                  | integument | strands | Bushy clumped locks along each brow ridge: inner ones rise, outer ones sweep out and droop                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `moustache`                 | integument | strands | Thick locks from under the nose that sweep out and droop over the beard, the ends curling up                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `hair`                      | integument | strands | A cap under the brim and a fall down the back, covered by three rows of long locks that drape over the shoulders (side locks to the front, the rest behind)                                                                                                                                                                                                                                                                                                                                                                                                  |
| `beard`                     | integument | strands | A jaw mass and tapering fall, covered by four rows of locks rooted from sideburn to chin and drawn toward the tip; the outer ones stop short so it tapers                                                                                                                                                                                                                                                                                                                                                                                                    |
| `robe`                      | integument | hatch   | Sloping shoulder cones, arms, chest and a rolled collar, cut flat at the bust base; fold noise                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `head`                      | integument | hatch   | An old man's face: cranium, face and jaw; heavy brow; cheekbones over hollow cheeks and temples; long humped nose with nostril wings running back into the cheek; lips; large ears; neck. Eyes: the face is opened only in front of each eyeball, down to its surface; lids are a sheet over the ball with an almond opening, an upper-lid fold, an inner-corner pad and a bag below with a tear-trough crease, all turned 10° away from the nose (`eyeFrame`). Wrinkles: forehead furrows, crow's feet, frown line, fine skin noise faded out near the eyes |
| `skull`                     | skeleton   | stipple | Vault and facial bones, hollowed by the cranial cavity; orbits, nasal aperture, foramen, the Third Fontanelle and the sinus chamber cut out                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `tongue`                    | organs     | hatch   | A tilted ellipsoid with ridges along its length                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `sinus`                     | organs     | rings   | A three-lobed chamber behind the nose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `mandible`                  | skeleton   | stipple | Two bodies meeting at the chin, with rami up to the condyles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `spine`                     | skeleton   | stipple | Cervical vertebrae down the neck: bodies, spinous and transverse processes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `girdle`                    | skeleton   | stipple | Curved clavicles; the Familiar's Perch on the left, a shelf that breaks the robe's surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `brain`                     | organs     | gyri    | Cerebrum, cerebellum and stem, with ridged noise pressed in for folds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `focus-gems`                | organs     | glow    | Five octahedra just under the cortex                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ethereal-gland`            | organs     | stipple | A small double lobe behind the core                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `eyes`                      | organs     | stipple | Two white eyeballs (radius 0.08)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `iris-left`, `iris-right`   | organs     | glow    | Glowing caps on the front of each eyeball; turn to follow the pointer (`gazePivot`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `pupil-left`, `pupil-right` | organs     | stipple | Dark caps at the centre of each iris; turn with it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `vessels`                   | arcane     | glow    | Branching tubes from the core down the neck to shoulders and arms, and forward to the eyes, trimmed to stay inside skin and robe                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `lattice`                   | arcane     | glow    | A trunk from the core through the fontanelle up the hat's spine, with branches, trimmed to stay inside the hat                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `aetheric-core`             | arcane     | glow    | A sphere at the centre of the brain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Shell fields that others need are exported: `headSkinField`, `robeField`, `hatField` and `hatSpine` keep vessels and the lattice inside the body; `cranialCavity` is shared by skull and brain.

### Growth

`growth/locks.ts` grows hair: a lock is a chain of tapered segments from a root, pulled by gravity, an optional drift and target, with a sideways wave and a curl toward the tip, pushed out of collider fields (head, robe, hat) so it slides over them. `growClump` adds thinner strands around a guide lock that gather toward its tip, which reads as a sculpted lock with grooves once blended. Hair parts take their bounds from the grown segments (`segmentsBounds`). Gaps between locks are real through-holes, so the bake's hole warnings for hair parts are expected.

`growth/branches.ts` builds tubes as tapered segments: `curve` makes a trunk along a quadratic Bézier, and `sprout` grows seeded random side branches (with lean, a directional bias and recursive depth) from existing segments. `segmentsField` turns a list into one smooth SDF. It buckets segments in a 0.1-unit grid so each sample only tests nearby ones; where none are near, it returns the bucket size, a safe lower bound. `growth/random.ts` is a seeded PRNG (mulberry32).

`intersectLazy(shape, container, skipBeyond)` skips the expensive container (noisy skin) where the cheap shape is already far away.

### SDF toolkit

`sdf/` has primitives (after Inigo Quilez's distance functions), hard and smooth booleans, offsets, shells, rotations, mirroring, displacement, domain warps and seeded value noise (`fbm`). Fields take three numbers and return one, so sampling doesn't allocate.

### Meshing

`mesh/surface-nets.ts` meshes a field on a regular grid:

1. Sample the field in 4×4×4 blocks; a block whose centre is far from the surface (beyond twice its half-diagonal) takes the centre's value instead of sampling every point.
2. One vertex per cell the surface crosses, at the average of its edge crossings.
3. One quad per grid edge with a sign change, joining the four cells around it, wound so the normal points outward.
4. Each vertex is pulled onto the surface with Newton steps; normals come from the field's gradient.

Meshes are closed as long as the surface stays inside the part's bounds; the mesher throws `SurfaceOutOfBoundsError` if it reaches the grid edge. Features thinner than about three cells can pinch (an edge shared by four triangles); keep thin parts (brim, hat tip) at least that thick.

### Bake and format

`scripts/bake.ts` meshes parts in parallel worker threads (`scripts/bake-worker.ts`). Per part:

1. Mesh the field (surface nets, above) and drop disconnected pieces under 60 triangles (noise islands; `mesh/components.ts`).
2. Count through-holes from the Euler characteristic (`mesh/topology.ts`) and warn if there are more than the part's `intendedHoles` (the skull declares 4). A tunnel keeps a mesh closed, so open-edge checks miss it, but it shows on screen as a hole; typical causes are two shapes touching in two places with a gap between, or a carve or noise deeper than a thin feature.
3. Simplify with meshoptimizer to a fifth of the cell size in error, weighting normals so shading curvature survives (`scripts/simplify.ts`, bake-only so the WebAssembly never reaches the browser). Surviving vertices keep their exact positions and SDF normals.
4. Re-orient any triangle facing inward, using the SDF normals at its corners (`mesh/orient.ts`); backward triangles are culled and read as holes.
5. For outer (integument) parts, bake ambient occlusion per vertex from all outer parts' fields together (`mesh/occlusion.ts`).

Output is `generated/specimen/` (git-ignored): `manifest.json` (format version 3: parts, layers, looks, counts, bounds, gaze pivots, landmarks) and one `<part>.bin` each, holding positions quantised to Int16 within the part's bounds, normalised Int8 normals, Uint8 occlusion and Uint16/Uint32 indices, each section 4-byte aligned (`format/specimen-format.ts`). Output goes to a temporary folder that replaces the old one at the end.

`vite-plugins/bake.ts` runs the bake in a child process when the dev server starts and whenever a file in `src/procedural/` changes, serves `generated/specimen/` at `/specimen/`, invalidates the changed modules (the page imports some of them) and reloads the page when the bake finishes. In builds it emits the files into `dist/specimen/`; `npm run build` bakes first.

Current output: about 150k triangles and 1.6 MB across 24 parts, baked in about 40 s (head, hair and beard dominate).

### Loading

`specimen/load-specimen.ts` fetches the manifest and buffers (started at module load, so it overlaps start-up) and builds a `BufferGeometry` per part with a bounding sphere from the part's bounds. `specimen/Specimen.tsx` creates an `InkWashMaterial` per part from its look and advances material time each frame.

## Render pipeline

The scene is drawn as **pigment on white** (the scene background is white), then post-processed:

1. **Surface: `InkWashMaterial`** (`rendering/materials/`, shaders in `rendering/shaders/ink-wash.*.glsl`). A `ShaderMaterial` with clipping enabled.
   - Tone = half-Lambert against a fixed key light in **view space** (upper left), so the specimen is always lit like an illustration whichever way it's turned, darkened by the baked occlusion attribute (specimen parts set `useOcclusion`).
   - Tone is laid down as four soft glazes, their edges brushed by object-space noise and pooling slightly darker pigment. Thin wash in the light, the full wash in mid-tones, a deeper and more saturated version in shadow; pigment also collects in occluded crevices; wash density varies across the surface.
   - Hatching follows the form (cross-contour): rings of constant height on upright surfaces, concentric rings on flat ones, and in deeper shadow a spiral cross-hatch around the vertical axis. Lines thicken as tone darkens and keep a steady on-screen spacing (about 9 device px) at any zoom by cross-fading between octaves of density, chosen from the screen-space derivative of position. Hair parts (look `hatch: 'strands'`) hatch along their strands instead: wavy, near-vertical lines from the mid-tones down.
   - `glow` (0–1) makes a part self-lit: pale centre, saturated rim, slow pulse. Used for arcane parts.
2. **`OutlineEffect`** (`rendering/effects/`): reads the depth buffer and the part ids in alpha. A clearly farther neighbour draws a silhouette on the near side of the jump; spikes in depth curvature draw fainter creases; a change of part id draws a part edge (see below). Sample positions wobble and line width varies with screen-space noise.

   Colour is multisampled but the depth texture has one sample per pixel, so sub-pixel slivers (thin edges at grazing angles, stray cap samples) appear in depth or alpha as single odd pixels. To keep them from being inked as flickering specks, a difference only counts if it persists two steps out in the same direction, and a pixel nearer than at least 7 of its 8 neighbours is never inked.

3. **`PaperEffect`**: multiplies the result onto procedural paper fixed to the screen (mottling, fibres, foxing, vignette). Pigment density is modulated by grain noise (granulation). Empty areas (white) become plain paper.

**Part edges.** Surface and cap materials write a per-part id (manifest index + 1; `specimen/part-id.ts`) to the alpha channel, and the outline effect also inks wherever that id changes between neighbouring pixels. This outlines each tissue on a cut face, where caps are coplanar and depth alone shows nothing, and separates overlapping parts. Helpers that blend (the plane's guide lines) leave alpha untouched.

Both effects use `BlendFunction.SET` and run in one merged pass, outline first. Shared noise functions are in `shaders/lib/noise.glsl` (prefixed `pw`).

Tunables (light direction, base hatch density, outline width and strength, part-edge strength) are in `src/config/render.ts`.

### Gaze

The irises and pupils are separate left and right parts that carry a `gazePivot` (the eyeball's centre) in the manifest. `specimen/gaze.ts` (`GazeRig`) computes one rotation shared by both eyes, so they always move together: toward a point on the pointer's ray, 60% of the way from the camera to the point between the eyes, softly limited to about 0.8 rad from straight ahead (so the eyes keep responding near the limit rather than freezing) and smoothed. The pointer is tracked over the whole page (labels included); when it leaves the window, the eyes ease back to straight ahead. `specimen/GazePivot` applies the rotation about the pivot, in the specimen and to the parts' section-cap stencils, so cut faces stay correct.

## Sectioning

### State

`src/state/plate-store.ts` (zustand) holds the slice: axis, current `offset`, `targetOffset`, travel `range` and whether the handle is active, plus `viewResets` (a counter the camera rig watches). Components subscribe to what they display; per-frame code uses `getState()` so easing never re-renders React.

### Plane and clipping

`slicing/clip-plane.tsx` provides one `ClipPlane` (a three.js `Plane` with `setNormal` / `setOffset`) through context. Every specimen material lists it in `clippingPlanes`; the renderer has `localClippingEnabled`. Fragments are kept where `dot(normal, p) + offset > 0`.

Axes are in `src/config/slice.ts`. Each normal points away from the default camera, so the removed half is the one nearest the viewer and the cut face looks toward them:

| Axis       | Normal | Removes                            | Resting offset  |
| ---------- | ------ | ---------------------------------- | --------------- |
| Sagittal   | −x     | The wizard's left (viewer's right) | 0.08            |
| Coronal    | −z     | The front                          | 0.18            |
| Transverse | −y     | The top                            | 0.1 (eye level) |

`slicing/SliceController` recomputes the travel range from the specimen's bounds when the axis changes (`plane-math.offsetRange`), eases `offset` toward `targetOffset` each frame, writes the plane, binds `S`, `[` and `]`, and runs the intro: the plane starts parked just outside the specimen and slides to the resting cut after 1.4 s (set immediately under reduced motion). Changing axis parks the plane and eases it in again.

### Section caps

`slicing/SectionCaps` fills cut faces with the stencil technique, per part:

1. The part's geometry is drawn twice with colour and depth writes off and the clip plane on: back faces increment the stencil, front faces decrement it. Where the plane cuts the part's interior, the count ends non-zero.
2. A large quad on the plane draws with `CapMaterial` only where the stencil is non-zero, then resets it to 0.

Parts are capped in manifest order with `LessEqual` depth, so later caps win where volumes overlap; `specimenParts()` therefore lists parts from outermost to innermost. The effect composer's buffers have a stencil attachment for this.

`CapMaterial` (`rendering/shaders/cap.*.glsl`) paints a deeper version of the part's wash plus its section pattern from the part's look: `hatch` (45° lines; flesh, robe), `stipple` (jittered dots; hair), `rings` (growth rings around a vertical axis; the hat) or `glow` (self-lit; eyes). Pattern coordinates are on the plane, so patterns don't swim as the plane moves.

### Controls

The scroll wheel moves the cut: `SliceController` listens for wheel events on the canvas and moves the target offset by `SLICE.wheelStep` per 100 px (scrolling down pushes the cut deeper), eased like every other change. Ctrl/⌘ + wheel is left to the camera rig, which zooms with it; trackpad pinches arrive as Ctrl + wheel, so they zoom too. camera-controls' own wheel handling is switched off. On touch screens, two fingers dragged up or down move the cut (`SLICE.touchStep` per 100 px), while camera-controls handles only the pinch (`TOUCH_DOLLY`). There is no on-screen handle.

`ui/SliceControls`, bottom right: the section's Latin name (click to change axis) and a reset mark (camera and cut).

## Labels

### Registry

`src/anatomy/registry.ts` holds the twelve features (text mirrors [anatomy.md](anatomy.md)): number, name, Latin name, lore, the manifest part it belongs to, and two lists of candidate anchors in specimen space:

- `section`: points to label where the cut passes through the part.
- `surface`: guesses near the outer surface, for features seen uncut (hat, eye, beard, perch).

### Tracking (in the scene)

`labels/LabelTracker` runs every frame inside the Canvas:

1. **Section anchors.** If the cut is in (not parked) and the camera is on the removed side, each candidate is projected onto the plane and kept if the part's SDF is negative there (`anchors.sectionAnchor`). The fields come from `specimenParts()`, the same pure code the bake uses, so labels sit exactly on the cut face and follow it as the plane moves.
2. **Surface anchors.** Snapped onto the part's surface at start-up (Newton steps on the field). Every 6 frames each is checked: it must face the camera; if the cut is in, it must be on the kept side and the sight line must not cross the plane inside an outer part (that would be looking through a cap); and no kept geometry may be in the way, tested with `three-mesh-bvh` raycasts against the outer parts. The BVHs are built one part at a time after start-up to avoid a stall.
3. Visible anchors are projected to CSS pixels and written to a `LabelChannel` (`setSample`, `setViewport`), which notifies its subscriber.

### Overlay (in the DOM)

`labels/LabelOverlay` renders one button per feature (number, italic name, and a tooltip with the Latin name and lore) and an SVG of leader paths and anchor dots, once. On each channel update it lays out the visible labels (`layout.layoutLabels`: left or right column by the anchor's side of the specimen's centre, sorted by height, pushed apart to a minimum row height and kept within the column's limits; the left column starts below the title block) and writes positions, paths and visibility straight to the elements.

Leaders are cubic curves from the label to the anchor with a small per-label wobble. Hovering or focusing a label thickens its leader; hover, focus or click shows its tooltip, and a click pins it until Escape or a press elsewhere. Hidden labels are taken out of the tab order and hidden from assistive tech. Below 720 px wide, labels show their number only and the tooltip adds the name.

## Camera and input

`scene/CameraRig` wraps drei's `<CameraControls>` (the `camera-controls` library). Settings are in `src/config/camera.ts`.

| Input                              | Action                                                     |
| ---------------------------------- | ---------------------------------------------------------- |
| Left-drag                          | Orbit                                                      |
| Right-drag, Shift + left-drag      | Pan (target kept inside a box around the bust)             |
| Middle-drag, pinch, Ctrl/⌘ + wheel | Zoom (distance clamped)                                    |
| Arrow keys                         | Orbit in steps                                             |
| `+` / `-`                          | Zoom in steps                                              |
| `R`, double-click, reset mark      | Reset the view and ease the cut back to its resting offset |
| Wheel                              | Move the cut (down: deeper)                                |
| Two-finger drag (touch)            | Move the cut (up: deeper); pinch zooms, one finger orbits  |
| `[` / `]`                          | Move the cut in steps                                      |
| `S`, section name                  | Change the section axis                                    |

The polar angle is clamped so the camera can look down on the hat but not up from under the shoulders. After 8 s without input the camera turns slowly; this is off when `prefers-reduced-motion` is set (`hooks/use-prefers-reduced-motion`).

## Palette

Defined twice and kept in step: CSS custom properties in `src/styles/tokens.css`, and `PALETTE` in `src/config/palette.ts` for shaders. Washes are saturated Deyrolle-style pigments; arcane accents are cyan (mana) and garnet (gems).

## Typography

_IM Fell English_ (regular and italic), self-hosted through `@fontsource/im-fell-english`.
