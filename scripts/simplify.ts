/**
 * Bake-time mesh simplification with meshoptimizer: collapses edges where the
 * surface is flat enough that the change stays under `maxError` (specimen units),
 * keeping detail in wrinkles, lids and folds. Vertex positions and the SDF
 * normals of surviving vertices are untouched, and topology is preserved, so
 * meshes stay closed for section caps. Kept out of src/ so the WebAssembly never
 * reaches the browser bundle.
 */
import { MeshoptSimplifier } from 'meshoptimizer';

import { compactMesh } from '../src/procedural/mesh/components.ts';
import type { MeshData } from '../src/procedural/mesh/surface-nets.ts';

/** Normals count toward the error too, so curvature that drives shading survives. */
const NORMAL_WEIGHT = 0.4;

export async function simplifyMesh(mesh: MeshData, maxError: number): Promise<MeshData> {
  await MeshoptSimplifier.ready;
  const [indices] = MeshoptSimplifier.simplifyWithAttributes(
    mesh.indices,
    mesh.positions,
    3,
    mesh.normals,
    3,
    [NORMAL_WEIGHT, NORMAL_WEIGHT, NORMAL_WEIGHT],
    null,
    0,
    maxError,
    ['ErrorAbsolute'],
  );
  return compactMesh(mesh, indices);
}
