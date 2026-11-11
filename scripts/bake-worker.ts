/**
 * Worker for scripts/bake.ts: meshes the parts at the indices it is given and
 * posts back each part's encoded buffer and stats.
 */
import { parentPort, workerData } from 'node:worker_threads';

import { encodePart } from '../src/procedural/format/specimen-format.ts';
import { dropSmallComponents } from '../src/procedural/mesh/components.ts';
import { bakeOcclusion } from '../src/procedural/mesh/occlusion.ts';
import { meshSdf } from '../src/procedural/mesh/surface-nets.ts';
import { union } from '../src/procedural/sdf/operators.ts';
import { specimenParts } from '../src/procedural/specimen.ts';
import { simplifyMesh } from './simplify.ts';

export interface BakeResult {
  readonly index: number;
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly indexType: 'uint16' | 'uint32';
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly ms: number;
}

export interface BakeFailure {
  readonly index: number;
  readonly error: string;
}

/** Disconnected pieces smaller than this are noise islands, not anatomy. */
const MIN_PIECE_TRIANGLES = 60;
/** Allowed simplification error, as a fraction of the part's cell size. */
const SIMPLIFY_ERROR = 0.2;

const indices = workerData as number[];
const parts = specimenParts();
// Outer parts are shaded with occlusion from all outer parts together (the brim
// shades the face, the beard the robe). Internal parts are only seen in section.
const outer = parts.filter((p) => p.layer === 'integument');
const outerField = union(...outer.map((p) => p.field));
for (const index of indices) {
  const part = parts[index];
  if (!part) continue;
  const started = performance.now();
  try {
    const raw = dropSmallComponents(
      meshSdf(part.field, part.bounds, part.cellSize),
      MIN_PIECE_TRIANGLES,
    );
    const mesh = await simplifyMesh(raw, part.cellSize * SIMPLIFY_ERROR);
    const occlusion = part.layer === 'integument' ? bakeOcclusion(mesh, outerField) : null;
    const { bytes, indexType } = encodePart(mesh, part.bounds, occlusion);
    const result: BakeResult = {
      index,
      bytes,
      indexType,
      vertexCount: mesh.positions.length / 3,
      indexCount: mesh.indices.length,
      ms: performance.now() - started,
    };
    parentPort?.postMessage(result, [bytes.buffer]);
  } catch (err) {
    const failure: BakeFailure = {
      index,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
    parentPort?.postMessage(failure);
  }
}
