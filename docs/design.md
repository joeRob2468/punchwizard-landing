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

Each part (`parts/*.ts`) is a `PartDefinition`: an id, a layer, a look (palette key and optional glow), a signed distance field, the bounds the surface must fit in, and a cell size for meshing. `specimen.ts` lists the parts in draw order.

| Part    | Layer      | Built from                                                                                                                             |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `robe`  | integument | Sloping shoulder cones, arms, chest ellipsoid and a rolled collar, cut flat at the bust base; vertical fold noise                      |
| `head`  | integument | Cranium and face ellipsoids, cheeks, brow ridge, nose cone and nostrils, ears, neck; eye sockets carved out; fine noise                |
| `eyes`  | organs     | Two spheres in the sockets, glowing cyan                                                                                               |
| `hair`  | integument | A mantle behind the head, below the brim; strand noise                                                                                 |
| `beard` | integument | Jaw mass, side tufts, a tapering fall down the chest along a curve, moustache and eyebrows; strand noise                               |
| `hat`   | integument | A rounded disc brim that droops and ripples, and a cone of tapering segments along a spine that bends at the tip; solid (lore: a horn) |

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

`scripts/bake.ts` meshes every part and writes `generated/specimen/` (git-ignored): `manifest.json` (parts, layers, looks, counts, bounds, landmarks) and one `<part>.bin` each. A part file holds Float32 positions, normalised Int8 normals (padded to 4 bytes) and Uint16 or Uint32 indices (`format/specimen-format.ts`). Output goes to a temporary folder that replaces the old one at the end.

`vite-plugins/bake.ts` runs the bake in a child process when the dev server starts and whenever a file in `src/procedural/` changes, serves `generated/specimen/` at `/specimen/`, and reloads the page. In builds it emits the files into `dist/specimen/`; `npm run build` bakes first.

Current output: about 140k triangles and 1.8 MB (before gzip) across six parts, baked in about 7 s.

### Loading

`specimen/load-specimen.ts` fetches the manifest and buffers (started at module load, so it overlaps start-up) and builds a `BufferGeometry` per part with a bounding sphere from the part's bounds. `specimen/Specimen.tsx` creates an `InkWashMaterial` per part from its look and advances material time each frame.

## Render pipeline

The scene is drawn as **pigment on white** (the scene background is white), then post-processed:

1. **Surface: `InkWashMaterial`** (`rendering/materials/`, shaders in `rendering/shaders/ink-wash.*.glsl`). A `ShaderMaterial` with clipping enabled.
   - Tone = half-Lambert against a fixed key light in **view space** (upper left), so the specimen is always lit like an illustration whichever way it's turned.
   - Tone is perturbed by object-space noise, then split into three flat bands (light, mid, shadow) with soft edges. The light band is thinned toward white.
   - Pigment pools (darkens) along band edges, and wash density varies across the surface.
   - Below the deep-shadow threshold, ink hatching is projected triplanar in object space, so strokes stick to the surface as it turns.
   - `glow` (0–1) makes a part self-lit: pale centre, saturated rim, slow pulse. Used for arcane parts.
2. **`OutlineEffect`** (`rendering/effects/`): reads the depth buffer. Large relative depth jumps draw silhouettes; spikes in depth curvature draw fainter crease lines. Sample positions wobble and line width varies with screen-space noise.
3. **`PaperEffect`**: multiplies the result onto procedural paper fixed to the screen (mottling, fibres, foxing, vignette). Pigment density is modulated by grain noise (granulation). Empty areas (white) become plain paper.

Both effects use `BlendFunction.SET` and run in one merged pass, outline first. Shared noise functions are in `shaders/lib/noise.glsl` (prefixed `pw`).

Tunables (light direction, hatch density, outline width and strength) are in `src/config/render.ts`.

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

### Handle and controls

`slicing/SliceHandle` draws a faint ink rectangle where the plane crosses the specimen's bounds (no depth writes, so the outline effect ignores it) and a garnet knob on its top edge (front edge for transverse). Hovering the knob sets `handleActive`, which disables the camera controls; dragging maps the pointer ray to the closest point on the plane's normal through the knob (`plane-math.offsetUnderRay`).

`ui/SliceControls`, bottom right: the section's Latin name (click to change axis) and a reset mark (camera and cut).

## Camera and input

`scene/CameraRig` wraps drei's `<CameraControls>` (the `camera-controls` library). Settings are in `src/config/camera.ts`.

| Input                         | Action                                         |
| ----------------------------- | ---------------------------------------------- |
| Left-drag                     | Orbit                                          |
| Right-drag, Shift + left-drag | Pan (target kept inside a box around the bust) |
| Wheel, middle-drag, pinch     | Zoom (distance clamped)                        |
| Arrow keys                    | Orbit in steps                                 |
| `+` / `-`                     | Zoom in steps                                  |
| `R`, double-click             | Reset to the initial three-quarter view        |

The polar angle is clamped so the camera can look down on the hat but not up from under the shoulders. After 8 s without input the camera turns slowly; this is off when `prefers-reduced-motion` is set (`hooks/use-prefers-reduced-motion`).

## Palette

Defined twice and kept in step: CSS custom properties in `src/styles/tokens.css`, and `PALETTE` in `src/config/palette.ts` for shaders. Washes are saturated Deyrolle-style pigments; arcane accents are cyan (mana) and garnet (gems).

## Typography

_IM Fell English_ (regular and italic), self-hosted through `@fontsource/im-fell-english`.
