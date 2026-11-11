# Conventions

How code in this repo should look and be organised. Setup and scripts are in [development.md](development.md).

## Architecture rules

- **One composition root:** `src/app/App.tsx` wires modules together. Other modules don't import each other's internals.
- **Pure core:** `src/procedural/` and `src/anatomy/` have no DOM, React or scene objects (three's math types are fine). They run the same in Node (the bake) and the browser.
- **Rendering, slicing and labels depend on `src/specimen/` interfaces**, not on how parts were made, so the outer shell stays swappable.
- **Shared state** goes through the zustand store in `src/state/`. Per-frame values (label positions, plane drags) are read with `getState()` inside `useFrame` and written to refs or the DOM directly, never through React state.
- **Config:** tunables (control bindings, camera limits, palette) live in `src/config/`. The palette is mirrored in `src/styles/tokens.css`; change both together.

## TypeScript

- **ESM only.** Relative imports include the `.ts` / `.tsx` extension.
- **`erasableSyntaxOnly`:** no `enum` (use `as const` objects or string unions), no `namespace`, no constructor parameter properties.
- **`verbatimModuleSyntax`:** `import type` / inline `type` for types. ESLint enforces it.
- **Strict everything:** `strict`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` (relaxed in `tsconfig.app.json` only, for CSS Modules). No `any`.
- **Errors:** throw `Error` subclasses with a `name`; pass `cause` when wrapping. Never swallow an error without a comment saying why.
- **Async:** no floating promises; `void` only for deliberate fire-and-forget.
- **No `console.*`** in shipped code except a deliberate warning on a fallback path.

## React and three.js

- Function components only (the one exception is `ui/ErrorBoundary`, since React requires a class). One component per file, `PascalCase.tsx`, with its CSS Module beside it (`Foo.module.css`).
- Don't allocate three.js objects (vectors, materials, geometries) in render or per frame; create them once (`useMemo`, module scope) and dispose of what you create.
- GLSL lives in `.glsl` files under `src/rendering/shaders/`, imported with `?raw`.

## Style

- **Prettier** (100 columns, single quotes, trailing commas) and **ESLint** (typescript-eslint `strictTypeChecked` + `stylisticTypeChecked`, react-hooks). Don't hand-format: run `npm run format`.
- **Naming:** `camelCase` values, `PascalCase` types and components, `SCREAMING_SNAKE_CASE` module constants, kebab-case file names for non-component modules (`plane-math.ts`).
- **Comments:** a short module docblock saying _why_ the module exists, JSDoc on exported things whose purpose isn't obvious, and inline comments only for non-obvious reasons. Don't narrate the code.
- **Functions** are small and pure where possible, taking dependencies as arguments.

## Testing

No automated tests, by decision. `npm run check` must pass before every commit, and visual changes are checked in the dev server.

## Git

- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `build:`, `perf:`, `style:`, with an optional scope (`feat(slicing):`, `fix(labels):`). Imperative mood, subject ≤ 72 characters, a body explaining _why_ when it isn't obvious.
- **One commit per feature or logical change**, plus a wrap-up commit (status.md) at the end of each milestone.
- **No AI attribution** in commits or PRs (no `Co-Authored-By` trailers, no "Generated with" footers).
- `main` is the only branch. The repo will be public: nothing install-specific (real hosts, IPs) and nothing from `moodboard/` goes in it.

## Docs

Docs describe the current state, briefly and without history. Update them in the same commit as the change. Use placeholders (`<domain>`, `<server>`).
