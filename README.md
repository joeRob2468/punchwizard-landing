# Punchwizard landing

The decorative page at the root of `<domain>`: _Pugnomagus pileatus_, the Common Punchwizard, as a 3D anatomical plate. Rotate the specimen, drag a sectioning plane through it, and read the labels on its (entirely fictional) anatomy.

Built with Vite, React, React Three Fiber and custom shaders for an ink-and-watercolour look. The wizard's insides are generated procedurally from signed distance fields at build time.

## Quick start

```sh
nvm use          # Node 24
npm install
npm run dev      # http://localhost:5173
npm run check    # format, lint, typecheck
```

## Docs

- [docs/status.md](docs/status.md): what works, what's next
- [docs/PLAN.md](docs/PLAN.md): roadmap and decisions
- [docs/design.md](docs/design.md): how it works
- [docs/conventions.md](docs/conventions.md): code rules
- [docs/development.md](docs/development.md): scripts and workflow
- [docs/anatomy.md](docs/anatomy.md): the fictional anatomy
- [docs/operations.md](docs/operations.md): deploying and running on the server
