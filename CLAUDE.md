# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repo.

## What this is

The decorative landing page at the root of `<domain>`: a sliceable 3D wizard bust (_Pugnomagus pileatus_, the Common Punchwizard) drawn as a hand-tinted antique anatomy plate. Static site: Vite + React + React Three Fiber, served by nginx in Docker behind the home server's Traefik.

## Read first

1. `docs/status.md`: what works, what's next. Keep it current.
2. `docs/PLAN.md`: the agreed roadmap and decisions.
3. `docs/design.md`: how it works.
4. `docs/conventions.md`: code rules. **Follow it.**
5. `docs/development.md`: scripts and local workflow.
6. `docs/anatomy.md`: the fictional anatomy (names, lore, art notes).
7. `docs/operations.md`: the server runbook.

## Commands

```sh
npm run dev       # dev server on :5173
npm run check     # format:check + lint + typecheck; must pass before committing
npm run build     # production build into dist/
npm run format / npm run lint:fix
```

## Working rules

- **Remote actions:** web lookups for research are fine. Ask first before anything that changes remote state: pushing, SSH changes on the server, DNS, publishing. Read-only SSH inspection of the server (`ssh punchwizard`) is fine.
- **Major changes** (features, behaviour or scope changes, deletions, restructuring): describe them and get a yes first.
- **Commits:** Conventional Commits (`feat(slicing): …`), one per feature or logical change, plus a wrap-up commit at the end of each milestone. **No AI attribution or Co-Authored-By trailers.**
- **Never commit `moodboard/`** (reference images; git-ignored).
- **No automated tests** (owner's decision). Keep logic in pure modules so tests can be added later.
- **Deploy is the last step**, only once the owner calls the site final.
- **Pinned versions:** TypeScript stays on 6.0.x until typescript-eslint supports 7.
- **Docs describe the current state**, briefly: update status.md and design.md in the same commit as the change. Docs use placeholders (`<domain>`, `<server>`), not real hosts.
