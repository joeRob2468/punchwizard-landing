/**
 * Counts through-holes (genus) in a closed mesh from its Euler characteristic,
 * per connected piece: V − E + F = 2 − 2g. A head, hat or organ should have none;
 * a tunnel (two blobs touching at both ends with a gap between) shows up here even
 * though the mesh has no open edges, and on screen reads as a hole.
 */
import type { MeshData } from './surface-nets.ts';

export function countHandles(mesh: MeshData): number {
  const vertexCount = mesh.positions.length / 3;
  const parent = new Int32Array(vertexCount).map((_, i) => i);
  const find = (v: number): number => {
    while ((parent[v] ?? v) !== v) {
      const next = parent[parent[v] ?? v] ?? v;
      parent[v] = next;
      v = next;
    }
    return v;
  };
  const edges = new Set<string>();
  const { indices } = mesh;
  for (let t = 0; t < indices.length; t += 3) {
    const tri = [indices[t] ?? 0, indices[t + 1] ?? 0, indices[t + 2] ?? 0];
    for (let i = 0; i < 3; i++) {
      const a = tri[i] ?? 0;
      const b = tri[(i + 1) % 3] ?? 0;
      edges.add(a < b ? `${a}_${b}` : `${b}_${a}`);
      parent[find(a)] = find(b);
    }
  }
  const used = new Set<number>();
  for (const v of indices) used.add(v);
  const pieces = new Set<number>();
  for (const v of used) pieces.add(find(v));
  const euler = used.size - edges.size + indices.length / 3;
  // Sum over pieces of (2 − 2g) = euler  ⇒  total genus = (2·pieces − euler) / 2.
  return Math.round((2 * pieces.size - euler) / 2);
}
