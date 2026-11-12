/**
 * Connects the specimen bake (scripts/bake.ts) to Vite.
 *
 * - Dev: bakes when the server starts and whenever files under src/procedural/
 *   change, then reloads the page; serves generated/specimen/ at /specimen/.
 *   Bakes run in a child process so module caches are fresh and the server stays
 *   responsive. A bake waits until changes settle (an edit and the formatter's
 *   rewrite make one bake), a change during a bake restarts it rather than queueing
 *   a second, and saves that leave the sources as they were don't bake at all
 *   (nor does starting the server when they match the last successful bake).
 * - Build: emits generated/specimen/ into dist/specimen/ and preloads every file
 *   of it from index.html, so the specimen downloads alongside the script instead
 *   of after it. `npm run build` bakes first; building without a bake fails.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { HtmlTagDescriptor, Plugin, ViteDevServer } from 'vite';

const WATCHED = /[\\/]src[\\/]procedural[\\/]/;
const SOURCES_DIR = 'src/procedural';
/** Quiet time after the last change before a bake starts. */
const SETTLE_MS = 1500;
const OUTPUT_DIR = 'generated/specimen';
/** The fingerprint of the sources behind the bake in OUTPUT_DIR (kept out of it: it would ship). */
const FINGERPRINT_FILE = 'generated/specimen.sources';
const URL_PREFIX = '/specimen/';
const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
};

export function bakeSpecimen(): Plugin {
  let root = process.cwd();
  let base = '/';
  let child: ChildProcess | null = null;
  let settle: ReturnType<typeof setTimeout> | undefined;
  /** Fingerprint of the sources the last successful bake (or the running one) used. */
  let baked: string | null = null;
  let loaded = false;

  const runBake = async (server: ViteDevServer): Promise<void> => {
    const { logger } = server.config;
    if (!loaded) {
      loaded = true;
      baked = await readFile(resolve(root, FINGERPRINT_FILE), 'utf8').catch(() => null);
    }
    const fingerprint = await sourcesFingerprint(resolve(root, SOURCES_DIR));
    if (fingerprint === baked) {
      if (!child) logger.info('[bake] specimen is up to date', { timestamp: true });
      return;
    }
    if (child) {
      // Its sources are already out of date: start over rather than finish it.
      const stale = child;
      child = null;
      stale.kill();
      logger.info('[bake] sources changed; restarting', { timestamp: true });
    }
    baked = fingerprint;
    const started = Date.now();
    logger.info('[bake] baking specimen…', { timestamp: true });
    const current = spawn(process.execPath, ['--import', 'tsx', 'scripts/bake.ts'], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    child = current;
    current.on('exit', (code) => {
      if (child !== current) return; // replaced by a newer bake
      child = null;
      if (code === 0) {
        logger.info(`[bake] done in ${Date.now() - started} ms`, { timestamp: true });
        server.ws.send({ type: 'full-reload' });
        writeFile(resolve(root, FINGERPRINT_FILE), fingerprint).catch((err: unknown) => {
          logger.warn(`[bake] could not save the sources fingerprint: ${String(err)}`);
        });
      } else {
        baked = null; // so saving the same sources again retries
        logger.error('[bake] failed; see the error above', { timestamp: true });
      }
    });
  };

  const scheduleBake = (server: ViteDevServer): void => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      runBake(server).catch((err: unknown) => {
        server.config.logger.error(`[bake] could not start: ${String(err)}`, { timestamp: true });
      });
    }, SETTLE_MS);
  };

  return {
    name: 'punchwizard:bake-specimen',

    configResolved(config) {
      root = config.root;
      base = config.base;
    },

    // Builds only: in dev the bake may be mid-flight, and the files aren't cached.
    async transformIndexHtml(_html, context): Promise<HtmlTagDescriptor[]> {
      if (context.server) return [];
      const manifest = JSON.parse(
        await readFile(resolve(root, OUTPUT_DIR, 'manifest.json'), 'utf8'),
      ) as { parts: { file: string }[] };
      // `as="fetch"` with `crossorigin` matches the loader's same-origin fetch().
      return ['manifest.json', ...manifest.parts.map((part) => part.file)].map((file) => ({
        tag: 'link',
        attrs: {
          rel: 'preload',
          href: `${base}specimen/${file}`,
          as: 'fetch',
          crossorigin: 'anonymous',
        },
        injectTo: 'head',
      }));
    },

    configureServer(server) {
      scheduleBake(server);
      // A restart (config or plugin edits) closes this server: stop its bake too.
      server.httpServer?.once('close', () => {
        clearTimeout(settle);
        child?.kill();
        child = null;
      });
      server.watcher.on('change', (file) => {
        if (WATCHED.test(file)) scheduleBake(server);
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

    // Procedural modules are bake inputs, and some are also imported by the page
    // (format decoder, landmarks, fields for labels). Don't hot-update them, or the
    // page would mix new code with the old bake; invalidate them so the full reload
    // sent when the bake finishes picks up fresh code.
    handleHotUpdate({ file, modules, server }) {
      if (!WATCHED.test(file)) return undefined;
      for (const mod of modules) server.moduleGraph.invalidateModule(mod);
      return [];
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

/** A hash of every file under `dir` (paths and contents). */
async function sourcesFingerprint(dir: string): Promise<string> {
  const hash = createHash('sha1');
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
  for (const file of files) {
    hash.update(file);
    hash.update(await readFile(file));
  }
  return hash.digest('hex');
}
