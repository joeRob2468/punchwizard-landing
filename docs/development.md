# Development

## Setup

Node 24 (`.nvmrc`) and npm.

```sh
npm install
npm run dev
```

## Scripts

| Script              | What it does                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run dev`       | Vite dev server with hot reload on `http://localhost:5173`                                      |
| `npm run build`     | Production build into `dist/`                                                                   |
| `npm run preview`   | Serve `dist/` locally                                                                           |
| `npm run check`     | `format:check` + `lint` + `typecheck`; must pass before committing                              |
| `npm run format`    | Prettier, writing changes                                                                       |
| `npm run lint:fix`  | ESLint with autofix                                                                             |
| `npm run typecheck` | `tsc` for the browser project (`tsconfig.app.json`) and the Node tooling (`tsconfig.node.json`) |

## Layout

```
src/
  main.tsx        entry: WebGL check, mounts App or Fallback
  app/            composition root
  config/         palette and other tunables
  ui/             DOM overlay components
  styles/         global CSS and tokens
```

More folders arrive with each milestone; see [PLAN.md](PLAN.md#5-repository-layout-and-conventions).

## Reference images

Put mood and reference images in `moodboard/`. It's git-ignored and never committed.
