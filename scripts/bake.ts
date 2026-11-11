/**
 * Bakes the procedural specimen: meshes every part's SDF and writes
 * `manifest.json` plus one binary file per part to generated/specimen/ (git-ignored).
 * The Vite plugin in vite-plugins/bake.ts serves it in dev and emits it into dist/.
 *
 * Parts are meshed in parallel worker threads. Output is written to a temporary
 * folder and swapped in, so a reader never sees a half-written bake.
 *
 * Usage: node --import tsx scripts/bake.ts [outDir]
 */
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';

import {
  FORMAT_VERSION,
  type PartEntry,
  type SpecimenManifest,
} from '../src/procedural/format/specimen-format.ts';
import { LANDMARKS, specimenParts } from '../src/procedural/specimen.ts';
import type { BakeFailure, BakeResult } from './bake-worker.ts';

const outDir = resolve(process.argv[2] ?? 'generated/specimen');
const tempDir = `${outDir}.tmp`;
const workerUrl = new URL('./bake-worker.ts', import.meta.url);

async function bake(): Promise<void> {
  const started = performance.now();
  const parts = specimenParts();
  const results = await meshInWorkers(parts.length);

  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  const entries: PartEntry[] = [];
  let totalTriangles = 0;
  let totalBytes = 0;
  for (const [index, part] of parts.entries()) {
    const result = results.get(index);
    if (!result) throw new Error(`part "${part.id}" was not meshed`);
    const file = `${part.id}.bin`;
    await writeFile(join(tempDir, file), result.bytes);
    entries.push({
      id: part.id,
      layer: part.layer,
      look: part.look,
      file,
      vertexCount: result.vertexCount,
      indexCount: result.indexCount,
      indexType: result.indexType,
      bounds: part.bounds,
    });
    const triangles = result.indexCount / 3;
    totalTriangles += triangles;
    totalBytes += result.bytes.byteLength;
    console.log(
      `  ${part.id.padEnd(15)} ${String(triangles).padStart(7)} tris  ${kb(result.bytes.byteLength)}  ${Math.round(result.ms)} ms`,
    );
    if (result.handles > (part.intendedHoles ?? 0)) {
      console.warn(
        `  warning: "${part.id}" has ${result.handles} through-hole(s); look for parts that touch in two places, or carves/noise deeper than the skin is thick`,
      );
    }
  }

  const manifest: SpecimenManifest = {
    version: FORMAT_VERSION,
    parts: entries,
    landmarks: LANDMARKS,
  };
  await writeFile(join(tempDir, 'manifest.json'), JSON.stringify(manifest));
  await rm(outDir, { recursive: true, force: true });
  await rename(tempDir, outDir);

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(
    `baked ${entries.length} parts, ${totalTriangles} tris, ${kb(totalBytes)} in ${seconds} s`,
  );
}

/** Spreads part indices round-robin over workers and collects their results. */
async function meshInWorkers(count: number): Promise<Map<number, BakeResult>> {
  const workerCount = Math.max(1, Math.min(count, availableParallelism() - 1));
  const buckets: number[][] = Array.from({ length: workerCount }, () => []);
  for (let i = 0; i < count; i++) buckets[i % workerCount]?.push(i);

  const results = new Map<number, BakeResult>();
  const failures: BakeFailure[] = [];
  await Promise.all(
    buckets.map(
      (indices) =>
        new Promise<void>((done, fail) => {
          const worker = new Worker(workerUrl, {
            workerData: indices,
            execArgv: ['--import', 'tsx'],
          });
          worker.on('message', (message: BakeResult | BakeFailure) => {
            if ('error' in message) failures.push(message);
            else results.set(message.index, message);
          });
          worker.on('error', fail);
          worker.on('exit', () => {
            done();
          });
        }),
    ),
  );

  if (failures.length > 0) {
    const ids = specimenParts();
    const detail = failures.map((f) => `  ${ids[f.index]?.id ?? f.index}: ${f.error}`).join('\n');
    throw new Error(`could not mesh ${failures.length} part(s):\n${detail}`);
  }
  return results;
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(0).padStart(5)} KB`;
}

await bake();
