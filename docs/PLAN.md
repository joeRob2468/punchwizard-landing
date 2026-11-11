# Punchwizard Landing — Project Plan

> Status: **agreed, M0 in progress** · 2026-11-11. This is the roadmap. Once work begins,
> current state lives in `status.md` and how things work in `design.md`; this file
> keeps only what is still ahead.

An interactive, decorative landing page for `punchwizard.com`: a head-and-shoulders
fantasy wizard rendered in 3D as a hand-tinted plate from an antique anatomy book.
Visitors rotate the specimen, drag a sectioning plane through it to expose fictional
anatomy, and read ink-drawn labels joined to it by leader lines. Purely decorative:
it sits at the root domain and links nowhere.

---

## 1. Goals and non-goals

### Goals
- **The specimen is the page.** Full-viewport 3D scene, almost no chrome.
- **Hand-tinted plate look.** Bold ink outlines and flat watercolour washes in a
  Deyrolle-style palette, on aged paper. Heavily stylised, so simple geometry reads as
  intentional. References in `moodboard/` (local only, never committed).
- **Sectioning.** A draggable cut plane that reveals solid, tinted cross-sections,
  not hollow shells.
- **Labels.** Numbered labels in the margins with leader lines, always shown for
  visible features; tooltips with lore. No links.
- **Procedural internals.** Skin layers, skeleton and organs generated in code.
- **Swappable outer shell.** Procedural first; an AI-generated or sculpted mesh can
  replace it later without touching the rest (§6).
- **Professional codebase.** Strict TypeScript, isolated modules, linting, docs,
  Conventional Commits. Mirrors `discord-stream-recorder`'s conventions where they
  apply.

### Non-goals
- Realistic or medically accurate anatomy (all anatomy is fictional).
- Automated tests. Pure modules stay testable so `vitest` can be added later.
- CMS, backend, analytics. Static site only.
- Full body, rigging, or animation beyond subtle idle motion.

---

## 2. Experience

### 2.1 Layout
- Paper background fills the viewport (procedural: fibres, foxing, vignette, faint
  ruled border).
- Wizard centred, three-quarter view on load.
- Plate header in an old-style serif, small, top-left: the species name as title,
  ***Pugnomagus pileatus*** ("hatted fist-wizard"; *pugnus* fist + *magus*,
  *pileatus* capped), with the vernacular name beneath it as in a field guide —
  **"The Common Punchwizard"** — then the subtitle *"Sectio capitis et humerorum"*
  and a small Hudspeth-style taxonomy block (Kingdom *Animalia* … Family *Magidae* …
  Species *P. pileatus*).
- Labels in left and right margin columns, Hudspeth-style, joined to the model by
  thin ink leader lines.
- The only persistent UI: a slice-axis glyph and a reset glyph, drawn as small ink
  marks in a corner.

### 2.2 Controls
Standard web 3D viewer conventions (three.js, Sketchfab, `<model-viewer>`). Bindings
live in one config module.

| Input | Action |
|---|---|
| Left-drag | Orbit |
| Right-drag, or Shift + left-drag | Pan |
| Wheel / pinch | Zoom (clamped) |
| Left-drag on the slice handle | Move the cut plane along its normal |
| Hover label or feature | Highlight feature, show tooltip |
| Click label or feature | Pin tooltip; click elsewhere to dismiss |
| Double-click empty space | Reset view |
| Touch: 1 finger / 2 fingers | Orbit / pinch-zoom + pan |
| Keyboard | Arrows orbit, `+`/`-` zoom, `[`/`]` move slice, `S` cycle slice axis, `R` reset, Tab cycles labels |

Orbit clamped so the camera never goes under the shoulders; zoom clamped between
"whole bust" and "eye close-up"; damping on. Slow idle auto-rotate after ~8 s without
input, stopping on interaction; off under `prefers-reduced-motion`.

### 2.3 Slicing
- One cut plane with three axis presets: **sagittal** (default, left/right halves),
  **coronal** (front/back), **transverse** (top/bottom). `S` or the axis glyph cycles.
- Drawn as a faint ink rectangle with one drag handle (a pin glyph).
- Everything beyond the plane is removed; each closed part shows a **cap** at the cut,
  a flat face in that tissue's wash colour with a simple pattern (bone: stipple; brain:
  wavy lines; hat horn: growth rings; mana core: glowing cyan wash).
- Starts parked just outside the model. A one-time intro slides it partway in to
  teach the interaction.

### 2.4 Labels and tooltips
- Each feature: id, common name, Latin name, short lore, 3D anchor, layer.
- Shown when its anchor is on the kept side of the plane and not hidden behind other
  geometry. Fades in and out.
- Number + common name at the margin end of the leader line; Latin and lore in the
  tooltip.
- Leader lines have a slight hand-inked wobble.

### 2.5 Polish
- Idle motion: slight breathing in the shoulders, hat-tip sway, slow mana pulse.
- Load: paper first, then the specimen "inks in" (outlines, then washes).
- `<noscript>` / no-WebGL fallback: static plate image.
- Accessibility: labels are real, focusable DOM elements, readable by screen readers.

---

## 3. The fictional anatomy

Draft. Final names and lore go in `docs/anatomy.md` and `src/anatomy/registry.ts`.
Descriptions only; the registry has no link field (easy to add later if wanted).

| # | Common name | Latin | Layer | Notes |
|---|---|---|---|---|
| 1 | The Hat | *Pileus arcanus* | Integument | Not clothing: a laminated keratin horn grown from the crown. Section shows growth rings. |
| 2 | Conduit Lattice | *Rete pilei* | Arcane | Branching mana fibres up the inside of the hat; discharge point at the tip. |
| 3 | Third Fontanelle | *Fonticulus tertius* | Skeleton | Opening in the crown that never closes; vents surplus mana into the hat. |
| 4 | Aetheric Core | *Nucleus aethericus* | Organs | Glowing nodule deep in the brain where mana is stored. |
| 5 | Ethereal Gland | *Glandula aetheris* | Organs | Regulates spell potency; cause of "wizard burnout". |
| 6 | Focus Gems | *Gemmae cogitationis* | Organs | Garnet-like crystals in the cortex; more accrue over a lifetime of study. |
| 7 | Crystalline Eye | *Oculus crystallinus* | Organs | Faceted lens; sees ley lines. |
| 8 | Incantatory Sinus | *Sinus incantatorius* | Skeleton | Resonance chamber behind the nose that tunes spoken spells. |
| 9 | Glossal Arcanum | *Lingua sigillata* | Organs | Sigil-ridged tongue muscle for precise incantation. |
| 10 | Mnemonic Beard | *Barba mnemonica* | Integument | Each follicle stores one memory; root plexus along the jaw. |
| 11 | Aetherial Vessels | *Vasa aetheria* | Arcane | Cyan vessels from the core down the neck to the shoulders. |
| 12 | Familiar's Perch | *Processus familiaris* | Skeleton | Bony shelf on the clavicle where a familiar sits. |

**Layers**, outside in: Integument → Musculature (simplified, optional) → Skeleton →
Organs → Arcane. Toggleable in code and by keyboard; no visible layer UI.

**Palette** (Deyrolle-inspired, flat washes): paper cream, sepia ink, flesh pink,
muscle red, bone ivory, brain rose-grey, ochre, verdigris green, vein blue; arcane
accents in cyan (mana) and garnet (gems). Defined once as tokens shared by CSS and
shaders.

---

## 4. Technical approach

### 4.1 Stack
- **Vite + React + TypeScript** (strict), ESM, **npm**, Node 24 (`.nvmrc`).
- **@react-three/fiber** for the scene; **@react-three/drei** for camera controls and
  helpers; **@react-three/postprocessing** (pmndrs `postprocessing`) for the effect
  pipeline. Custom shaders for ink/wash, caps and paper.
- **zustand** for shared state (slice, hovered/pinned feature, layers). Per-frame
  values (label screen positions, plane drag) are read with `getState()` in
  `useFrame` and written straight to DOM refs — no React re-render per frame.
- **CSS Modules** for the DOM overlay; theme tokens as CSS custom properties.
- **Fonts** self-hosted via `@fontsource` (e.g. *IM Fell English*). No font CDN calls.
- **Tooling:** ESLint (typescript-eslint `strictTypeChecked` + `stylisticTypeChecked`,
  react-hooks), Prettier (100 cols, single quotes, trailing commas), `tsc --noEmit`,
  EditorConfig. `npm run check` = format:check + lint + typecheck; must pass before
  every commit.
- **tsx** to run the bake script in Node.

### 4.2 Procedural geometry: signed distance fields → meshes
Each procedural part (shell, skull, brain, organs) is a **signed distance field**: a
function giving the distance from any point to the part's surface. Parts combine
primitives (spheres, capsules, ellipsoids, cones, rounded boxes) with smooth union,
subtraction and intersection, plus domain warps for organic irregularity. All
randomness is seeded, so builds are identical.

Why SDFs:
- **Watertight by construction**, which slice caps require.
- **Layers derive from each other:** skin = shell offset inward; skull inside that;
  brain inside the skull's cavity. Reshape the head and everything inside follows.
- **Works with an imported shell:** a mesh can be turned into an SDF at bake time, so
  internals fit inside it (§6).

Low detail is a feature here: the flat-wash style wants clean, simple forms, so grids
stay coarse and meshes light.

**Meshing:** surface nets on a grid, smoothed normals, optional decimation.

**Non-SDF parts:** vessels and the conduit lattice are seeded branching curves
(space-colonisation growth) turned into capped tubes. Beard: an SDF mass (sliceable)
plus a few surface strand ribbons for line texture.

**Bake runs during the build** (decided): `npm run build` runs `scripts/bake.ts`
first, writing to `generated/` (git-ignored), then Vite bundles it into `dist/`. In
dev, a small Vite plugin bakes on start and re-bakes when files under
`src/procedural/` change, then reloads the page. Output format: one compact binary
buffer per part (positions, normals, indices) plus a `manifest.json` (parts, layers,
landmarks, bounds). Simpler than glTF and needs no exporter in Node; imported shells
from Blender still come in as `.glb` and are converted at bake.

### 4.3 Rendering: ink + flat watercolour
1. **Geometry pass** with a custom `InkWashMaterial`:
   - Tone from a fixed key light, **quantised into 2–3 flat wash steps** per part
     colour (cel-style), with edges broken up by paper-grain noise so they look
     painted, not digital.
   - Wash "pooling": slightly darker pigment along tone boundaries, like watercolour
     drying.
   - **Hatching only in the deepest shadow band**: sparse ink strokes in triplanar
     space.
   - Arcane parts: soft cyan or garnet glow wash, pulsing; no neon bloom.
2. **Outline effect:** edge detection on depth and normals, drawn as sepia ink lines
   with width jitter and slight wobble; heavier on silhouettes than creases.
3. **Paper effect:** scene multiplied over procedural paper (fibres, foxing,
   vignette, slight colour bleed), so pigment looks absorbed.

GLSL lives in `.glsl` files imported via Vite. Effects are `postprocessing` `Effect`
subclasses wrapped as R3F components.

### 4.4 Slicing
- One `THREE.Plane` set as the clipping plane on every specimen material.
- **Caps** with the standard stencil technique per part: back faces increment,
  front faces decrement, so non-zero stencil marks that part's interior at the cut;
  a plane-aligned quad then draws there with the part's `CapMaterial`. Render order
  draws inner parts' caps over outer ones.
- Drag handle: pointer movement projected onto the plane normal, clamped to the
  model's bounds. Handle drags stop propagation so they don't orbit.

### 4.5 Labels
- **Registry** (`anatomy/registry.ts`): pure data. Anchors are defined relative to
  named landmarks, so they move with the geometry.
- **Visibility**, throttled (~10 Hz, only when camera or plane changed): clip-side
  test against the plane; occlusion by raycasting camera → anchor against visible
  meshes, ignoring hits on the clipped side.
- **Layout** (pure function): split by screen-x into left/right columns, sort by
  screen-y, resolve overlaps with 1-D relaxation, avoid crossing leader lines where
  possible.
- **Rendering:** labels are DOM nodes (CSS Modules) in an overlay; leader lines in one
  SVG layer. Positions written to refs each frame.

### 4.6 Performance budget
- 60 fps on a mid-range laptop; usable on recent phones.
- < ~300k triangles total; baked data < ~3 MB (gzip-served by nginx).
- DPR capped at 2 (`<Canvas dpr={[1, 2]}>`); post-processing scales down on weak GPUs
  (drei `PerformanceMonitor`).

---

## 5. Repository layout and conventions

```
punchwizard-landing/
├─ CLAUDE.md               agent guidance: read-first list, commands, working rules
├─ README.md               what it is, quick start, deploy at a glance
├─ docs/
│  ├─ PLAN.md              this roadmap
│  ├─ status.md            what works, what's next
│  ├─ design.md            architecture, data flow, render pipeline, shell pipeline
│  ├─ conventions.md       code, style, git and docs rules
│  ├─ development.md       scripts, local workflow, adding an anatomy part
│  ├─ operations.md        server runbook: deploy, update, troubleshoot
│  └─ anatomy.md           the fictional anatomy: names, lore, art notes
├─ moodboard/              reference images — git-ignored, never committed
├─ art/                    (M7) .blend sources + Blender export scripts
├─ deploy/
│  └─ nginx.conf
├─ scripts/
│  └─ bake.ts              runs generators → generated/
├─ vite-plugins/
│  └─ bake.ts              dev re-bake on change; serves generated/ in dev
├─ generated/              bake output (git-ignored)
├─ public/
│  └─ fallback/            static plate image for no-WebGL
├─ src/
│  ├─ main.tsx             entry: WebGL detect, mount <App/> or fallback
│  ├─ app/                 App.tsx: <Canvas> + overlay; composition root
│  ├─ state/               zustand store + selectors
│  ├─ config/              control bindings, camera limits, palette tokens
│  ├─ scene/               Specimen, CameraRig, lighting, idle motion
│  ├─ rendering/
│  │  ├─ materials/        InkWashMaterial, CapMaterial, ArcaneMaterial
│  │  ├─ effects/          OutlineEffect, PaperEffect (+ R3F wrappers)
│  │  └─ shaders/          *.glsl
│  ├─ slicing/             slice plane, stencil caps, handle, plane math
│  ├─ labels/              projection hook, visibility, layout (pure), overlay, leader lines
│  ├─ ui/                  axis/reset glyphs, tooltip, plate title, fallback
│  ├─ specimen/            loads manifest + buffers → geometries; ShellSource
│  ├─ anatomy/             registry.ts (data) + types
│  ├─ procedural/          PURE: sdf/, mesh/, growth/, landmarks.ts, parts/, format/
│  └─ styles/              tokens.css, global.css
├─ Dockerfile  .dockerignore  compose.yaml  compose.server.yaml
├─ index.html  package.json  tsconfig*.json  vite.config.ts
└─ eslint.config.js  .prettierrc.json  .editorconfig  .nvmrc  .gitignore
```

**Architecture rules**
- `procedural/` and `anatomy/` are pure: no DOM, React or scene objects (three's math
  types allowed). They run the same in Node (bake) and the browser.
- Rendering, slicing and labels depend on `specimen/` interfaces, not on how parts
  were made — this is what makes the shell swappable.
- Modules share state only through the zustand store; no reaching into each other's
  internals.
- Per-frame work never goes through React state.

**Code conventions** (adapted from `discord-stream-recorder`): ESM; strict TS with
`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly` (no enums or
namespaces); no `any`; kebab-case file names except `PascalCase.tsx` for components;
short "why" docblock per module, JSDoc on non-obvious exports, no narrating comments.

**Git**
- `git init` locally; `main` only; public GitHub repo later (push only with the
  owner's go-ahead), which the server pulls from.
- **Conventional Commits** (`feat(slicing): …`, `fix(labels): …`, `docs: …`,
  `chore: …`, `build: …`), imperative, subject ≤ 72 chars, body for the why.
- **One commit per feature or logical change**, plus a milestone wrap-up commit
  (status.md update) at the end of each milestone.
- **No AI attribution** — no `Co-Authored-By` trailers or "Generated with" lines.
- `moodboard/` is git-ignored. Nothing install-specific (real hosts, IPs) in the repo;
  docs use placeholders (`<server>`, `example.com`).

**Docs** describe the current state, briefly, without history. Updated in the same
commit as the change they describe.

---

## 6. Outer shell: AI image-to-3D and Blender

**Procedural shell ships first.** AI image-to-3D (Meshy, Tripo, Rodin, …) is
reasonable for the *outer shell only*, as a later swap-in (M7). Its problems and the
answers:

| Problem | Answer |
|---|---|
| Messy topology (holes, self-intersections) breaks slice caps | Bake converts the mesh to an SDF and re-meshes it: watertight |
| One fused mesh (hat + head + beard + robe) | Generate parts separately, or split in Blender |
| Baked lighting textures | Discarded — the shader reads geometry only |
| Internals must fit an arbitrary head | Internals placed from landmarks; skin and skull derived from the shell's SDF |
| Licensing and uploads to a third party | Owner checks the tool's terms; uploads happen outside this repo |

**Blender via Blender MCP (M7):** clean-up (voxel remesh, fill holes, decimate,
scale/orient), part separation, landmarks as named empties (`LM_eye_L`, `LM_crown`, …)
exported in the `.glb` and read by the bake, hand sculpt tweaks, and the fallback
plate render. Internals stay procedural in TypeScript; the site never needs Blender to
build. Blender MCP servers run arbitrary Python and some have online integrations
(Poly Haven, Hyper3D) — keep those off unless the owner chooses otherwise.

`ShellSource` has two implementations: `ProceduralShell` and
`ImportedShell(glb)`. Swapping is a config change plus a re-bake.

---

## 7. Deployment

Same pattern as `discord-stream-recorder`. Server facts below were checked over SSH
(read-only) on 2026-11-11.

**Server as found**
- Traefik v3 (in the `docker-media-stack` project) on the external `media_network`;
  entrypoints `web` (redirects to HTTPS) and `websecure`; certificate resolver
  `letsencrypt` via Cloudflare DNS challenge, already issuing a cert for
  `<domain>` + `*.<domain>`. So the apex needs **no new certificate work**.
- Nothing routes the apex or `www.` yet: no Traefik router uses them, and neither
  has a DNS record. Subdomains like `archive` are Cloudflare CNAMEs to `media`
  (DNS only), which points at the server.
- Repos are pulled with a per-repo read-only deploy key and an SSH host alias
  (`Host github-dsr` → `~/.ssh/discord-disco-archive_deploy`).

**In the repo**
- **Dockerfile**, multi-stage: `node:24-alpine` runs `npm ci` and `npm run build`
  (bake + Vite) → `nginx:alpine` serves `dist/` with `deploy/nginx.conf` (gzip, long
  cache for hashed assets, no-cache for `index.html`, `/healthz` for the healthcheck).
  Runs as nginx's unprivileged user; no volumes, no secrets.
- **compose.yaml** (local): binds `127.0.0.1:${PORT:-8080}`, healthcheck,
  `restart: unless-stopped`.
- **compose.server.yaml** (overlay): `ports: !reset []`, joins `media_network`, labels:
  - router `pw-landing`: `Host(\`${DOMAIN}\`) || Host(\`www.${DOMAIN}\`)`,
    entrypoint `websecure`;
  - middleware `pw-landing-www`: `redirectregex` from `^https://www\.(.*)` to
    `https://$1`, permanent — so `www.` 301s to the apex;
  - service port 8080 (unprivileged nginx).
- **.env.example**: `DOMAIN`, `PORT`, `COMPOSE_FILE` (documented; the site needs no
  other config).

**One-time setup on the server and DNS** (owner does these, or approves each step;
written up in `operations.md`)
1. Cloudflare DNS: apex `@` CNAME → `media.<domain>` (Cloudflare flattens it) and
   `www` CNAME → `media.<domain>`, both **DNS only**, matching the other subdomains.
2. GitHub: create the public repo and add a read-only deploy key.
3. Server: generate `~/.ssh/punchwizard-landing_deploy`, add a `Host github-pwl`
   alias, clone into `~/.services/punchwizard-landing`, create `.env` with
   `DOMAIN` and `COMPOSE_FILE=compose.yaml:compose.server.yaml`.
4. `docker compose up -d --build`; check `docker compose ps` shows healthy, then
   both `https://<domain>` and the `www.` redirect.

**Updating:** `git pull && docker compose up -d --build` in
`~/.services/punchwizard-landing`. Image built on the server; no registry.

**LAN note:** if the home network can't reach the server by its public IP (no NAT
hairpin), the apex needs the same local DNS / hosts override the other subdomains use.

---

## 8. Milestones

Each milestone is several feature commits, ends in a runnable state, and closes with
a status.md update. Visual checks happen in the local dev server; the owner signs off
on the look at the end of M1 and M2.

| # | Milestone | Deliverable |
|---|---|---|
| M0 | **Scaffold** | git init, .gitignore (incl. `moodboard/`), Vite + React + TS strict, ESLint/Prettier, `npm run check`, folder layout, CLAUDE.md, README, docs stubs. Paper background renders. |
| M1 | **Render pipeline** | Canvas, camera controls (§2.2), `InkWashMaterial`, outline + paper effects, palette tokens — on test primitives. **Look sign-off.** |
| M2 | **SDF toolkit + bake** | SDF primitives/ops, surface nets, binary format + manifest, bake script + Vite plugin, landmarks. Procedural shell: head, nose, ears, brow, shoulders/robe, hat, beard mass. **Shape sign-off.** |
| M3 | **Slicing** | Clip plane, stencil caps with per-tissue patterns, drag handle, axis cycling, intro slide-in. |
| M4 | **Internals** | Skin layer, skull/mandible/vertebrae/clavicles, brain, eyes, tongue, sinus, fantasy organs, vessel and lattice growth. |
| M5 | **Labels** | Registry, visibility + occlusion, margin layout, leader lines, tooltips, keyboard navigation. |
| M6 | **Polish** | Idle motion, ink-in load, touch tuning, reduced motion, fallback, performance pass. Docker + compose + nginx, tested locally only. |
| M7 | *(optional)* **Imported shell** | Blender MCP setup, `ImportedShell`, `art/` export scripts, landmark empties, AI or sculpted bust trial. |
| M8 | **Deploy** | Last step, once the owner calls the site final: §7 one-time setup, first deploy, operations.md verified against the live server. |

M2 and M4 are the largest (most art iteration). M3 and M5 are mostly engineering.

---

## 9. Still open (not blocking)

Nothing blocks starting. Deploy is the very last step (M8), after the owner calls the site final. Owner actions
needed then: the DNS
records, GitHub repo and deploy key in §7.

## 10. Risks

- **Wash and outline quality** is the main aesthetic risk; tuned first, in M1, on
  simple shapes. Fallback: pre-drawn stroke/grain textures instead of pure procedural.
- **SDF face quality:** the beard and hat brim cover much of the face, the style is
  forgiving, and the imported shell is the escape hatch.
- **Stencil caps with many nested parts** need careful render order; prototyped in M3
  before the full organ set exists.
- **R3F + custom stencil/post-processing** needs some manual render-order and
  `renderOrder`/material-flag work outside React's usual patterns; contained in
  `slicing/` and `rendering/`.
- **Mobile GPU cost** of post-processing; scale-down path in §4.6.
