/**
 * Connects the specimen bake (scripts/bake.ts) to Vite.
 *
 * - Dev: bakes when the server starts and whenever a file under src/procedural/
 *   changes, then reloads the page; serves generated/specimen/ at /specimen/.
 *   Bakes run in a child process so module caches are fresh and the server stays
 *   responsive.
 * - Build: emits generated/specimen/ into dist/specimen/. `npm run build` bakes
 *   first; building without a bake fails.
 */
import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { Plugin, ViteDevServer } from 'vite';

const WATCHED = /[\\/]src[\\/]procedural[\\/]/;
const OUTPUT_DIR = 'generated/specimen';
const URL_PREFIX = '/specimen/';
const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
};

export function bakeSpecimen(): Plugin {
  let root = process.cwd();
  let running = false;
  let queued = false;

  const runBake = (server: ViteDevServer): void => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    const started = Date.now();
    const { logger } = server.config;
    logger.info('[bake] baking specimen…', { timestamp: true });
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/bake.ts'], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    child.on('exit', (code) => {
      running = false;
      if (code === 0) {
        logger.info(`[bake] done in ${Date.now() - started} ms`, { timestamp: true });
        server.ws.send({ type: 'full-reload' });
      } else {
        logger.error('[bake] failed; see the error above', { timestamp: true });
      }
      if (queued) {
        queued = false;
        runBake(server);
      }
    });
  };

  return {
    name: 'punchwizard:bake-specimen',

    configResolved(config) {
      root = config.root;
    },

    configureServer(server) {
      runBake(server);
      server.watcher.on('change', (file) => {
        if (WATCHED.test(file)) runBake(server);
      });

      server.middlewares.use(URL_PREFIX, (req, res, next) => {
        const name = (req.url ?? '').split('?')[0]?.replace(/^\//, '') ?? '';
        // Only plain file names from the bake folder; nothing that could walk out of it.
        if (!/^[\w-]+\.(json|bin)$/.test(name)) {
          next();
          return;
        }
        readFile(resolve(root, OUTPUT_DIR, name)).then(
          (data) => {
            const ext = name.slice(name.lastIndexOf('.'));
            res.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-store');
            res.end(data);
          },
          () => {
            res.statusCode = 404;
            res.end();
          },
        );
      });
    },

    // Procedural modules are bake inputs, not page code: don't hot-update the page for them.
    handleHotUpdate({ file }) {
      return WATCHED.test(file) ? [] : undefined;
    },

    async generateBundle() {
      const dir = resolve(root, OUTPUT_DIR);
      let files: string[];
      try {
        files = await readdir(dir);
      } catch (err) {
        this.error(
          new Error(`no baked specimen in ${OUTPUT_DIR}; run \`npm run bake\``, { cause: err }),
        );
      }
      for (const name of files) {
        this.emitFile({
          type: 'asset',
          fileName: `specimen/${name}`,
          source: await readFile(join(dir, name)),
        });
      }
    },
  };
}
