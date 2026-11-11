/**
 * Bakes the procedural specimen: meshes every part's SDF and writes
 * `manifest.json` plus one binary file per part to generated/specimen/ (git-ignored).
 * The Vite plugin in vite-plugins/bake.ts serves it in dev and emits it into dist/.
 * Output is written to a temporary folder and swapped in, so a reader never sees
 * a half-written bake.
 *
 * Usage: node --import tsx scripts/bake.ts [outDir]
 */
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  encodePart,
  FORMAT_VERSION,
  type PartEntry,
  type SpecimenManifest,
} from '../src/procedural/format/specimen-format.ts';
import { meshSdf } from '../src/procedural/mesh/surface-nets.ts';
import { LANDMARKS, specimenParts } from '../src/procedural/specimen.ts';

const outDir = resolve(process.argv[2] ?? 'generated/specimen');
const tempDir = `${outDir}.tmp`;

async function bake(): Promise<void> {
  const started = performance.now();
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  const entries: PartEntry[] = [];
  let totalTriangles = 0;
  let totalBytes = 0;

  for (const part of specimenParts()) {
    const t0 = performance.now();
    let mesh;
    try {
      mesh = meshSdf(part.field, part.bounds, part.cellSize);
    } catch (err) {
      throw new Error(`could not mesh part "${part.id}"`, { cause: err });
    }
    const { bytes, indexType } = encodePart(mesh);
    const file = `${part.id}.bin`;
    await writeFile(join(tempDir, file), bytes);

    const vertexCount = mesh.positions.length / 3;
    const triangles = mesh.indices.length / 3;
    totalTriangles += triangles;
    totalBytes += bytes.byteLength;
    entries.push({
      id: part.id,
      layer: part.layer,
      look: part.look,
      file,
      vertexCount,
      indexCount: mesh.indices.length,
      indexType,
      bounds: part.bounds,
    });
    const ms = Math.round(performance.now() - t0);
    console.log(
      `  ${part.id.padEnd(10)} ${String(triangles).padStart(7)} tris  ${kb(bytes.byteLength)}  ${ms} ms`,
    );
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

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(0).padStart(5)} KB`;
}

await bake();
