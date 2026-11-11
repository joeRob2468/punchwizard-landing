# Design

How the site works. The rationale and roadmap are in [PLAN.md](PLAN.md); this file describes what exists now.

## Page structure

`src/main.tsx` checks for WebGL 2 and mounts either `<App>` or `<Fallback>`.

`<App>` (`src/app/App.tsx`) stacks two layers in one full-viewport `<main>`:

1. **Scene** (`<Canvas>`): camera rig, specimen (currently `scene/TestBust`, a primitive stand-in) and the post-processing stack. The renderer runs with no tone mapping (`flat`) so palette colours stay exact, DPR capped at 2.
2. **Overlay**: DOM above the canvas, `pointer-events: none` by default. Holds the printed double rule (`ui/PlateBorder`) and the title block (`ui/PlateHeader`).

`<Fallback>` shows the same border and title on CSS paper (`ui/PaperBackdrop`).

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
