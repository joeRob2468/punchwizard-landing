# Operations

Running and updating the site on the home server. Placeholders: `<server>` is the server's SSH host, `<domain>` is `DOMAIN` from `.env`. Commands run in the project folder on the server, `~/.services/punchwizard-landing`, next to the other stacks; its `.env` sets `COMPOSE_FILE=compose.yaml:compose.server.yaml`, so plain `docker compose` picks up the Traefik overlay.

> **Status:** deployed (2026-11-12). The repository is public on GitHub; the server reads it with a read-only deploy key (`github-pwl` alias).

## At a glance

| What       | Where                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Site       | `https://<domain>`; `https://www.<domain>` redirects there (301)                                                                                                                                                                                             |
| Health     | `/healthz` inside the container (compose healthcheck)                                                                                                                                                                                                        |
| Container  | `web`: nginx (unprivileged, port 8080, read-only filesystem) serving the built `dist/`                                                                                                                                                                       |
| Routing    | The server's Traefik on `media_network`, entrypoint `websecure`; the existing `*.<domain>` + `<domain>` certificate covers both hosts                                                                                                                        |
| Cloudflare | Apex and `www` CNAMEs to `media.<domain>`, **proxied** (other subdomains stay DNS only); SSL/TLS Full (strict); a cache rule (hostname equals `<domain>`, paths `/specimen/` and `/assets/`, edge TTL from the origin's headers); Rocket Loader off; no HSTS |
| Config     | `.env`: `DOMAIN`, `COMPOSE_FILE` (see `.env.example`). No secrets                                                                                                                                                                                            |

The image is self-contained: the Node stage installs dependencies, bakes the specimen and builds the site; the nginx stage only serves files. Nothing is mounted and no state is kept. Every response carries the headers in `deploy/security-headers.conf`, including a strict Content Security Policy; its `'wasm-unsafe-eval'` lets the specimen's decoder (meshoptimizer, WebAssembly) run, and without it the plate falls back to its static page.

## One-time setup

1. **DNS (Cloudflare):** `@` CNAME to `media.<domain>` and `www` CNAME to `media.<domain>`, both **DNS only**, like the other subdomains.
2. **Repository access:** on the server, create a read-only deploy key and add it to the GitHub repository's deploy keys:
   ```sh
   ssh-keygen -t ed25519 -f ~/.ssh/punchwizard-landing_deploy -N '' -C punchwizard-landing
   ```
   and an SSH alias in `~/.ssh/config`:
   ```
   Host github-pwl
     HostName github.com
     IdentityFile ~/.ssh/punchwizard-landing_deploy
   ```
3. **Checkout and config:**
   ```sh
   git clone git@github-pwl:<owner>/punchwizard-landing.git ~/.services/punchwizard-landing
   cd ~/.services/punchwizard-landing
   cp .env.example .env    # set DOMAIN; uncomment COMPOSE_FILE
   ```
4. **Start:** `docker compose up -d --build`, then check below.

## Deploy and update

```sh
ssh <server>
cd ~/.services/punchwizard-landing
git pull
docker compose up -d --build     # rebuilds the image (bake + build, about a minute)
docker compose ps                # web should be "healthy"
```

The old container keeps serving until the new one replaces it; the swap takes a second or two.

## Checks

```sh
docker compose ps                                     # healthy?
docker compose logs --tail 50 web                     # nginx access and error log
curl -sI https://<domain> | head -5                   # 200, Cache-Control: no-cache
curl -sI https://www.<domain> | grep -i location      # 301 to https://<domain>/
```

## Common problems

### The site isn't reachable

1. `docker compose ps`: is `web` running and healthy? If not, `docker compose logs web`.
2. Traefik: the container must be on `media_network` with the labels from `compose.server.yaml` (`docker inspect` the container; print label and network names only).
3. DNS: `<domain>` and `www.<domain>` must resolve to the server (`dig +short <domain>`). On the LAN, if the router can't loop back to its own public IP, the local DNS or hosts override the other subdomains use needs entries for these two names as well.

### The build fails at "bake"

The bake meshes every procedural part. A part whose surface reaches the edge of its bounds fails with `SurfaceOutOfBoundsError` naming the part; widen that part's `bounds` in `src/procedural/parts/`. This should already have failed locally (`npm run build`).

### The page shows only the title on plain paper

That is the fallback: the browser has no WebGL 2, or the specimen failed to load. Check the browser console and that `https://<domain>/specimen/manifest.json` returns JSON.
