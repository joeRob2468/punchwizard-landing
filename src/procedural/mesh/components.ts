/**
 * Drops small disconnected pieces from a mesh. Noise displacement can leave tiny
 * floating islands next to a surface; they read as specks of dirt on the plate.
 */
import type { MeshData } from './surface-nets.ts';

/** Removes connected components with fewer than `minTriangles` triangles. */
export function dropSmallComponents(mesh: MeshData, minTriangles: number): MeshData {
  const vertexCount = mesh.positions.length / 3;
  const parent = new Int32Array(vertexCount).map((_, i) => i);
  const find = (v: number): number => {
    let root = v;
    while ((parent[root] ?? root) !== root) root = parent[root] ?? root;
    while ((parent[v] ?? v) !== root) {
      const next = parent[v] ?? v;
      parent[v] = root;
      v = next;
    }
    return root;
  };
  const join = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const { indices } = mesh;
  for (let t = 0; t < indices.length; t += 3) {
    join(indices[t] ?? 0, indices[t + 1] ?? 0);
    join(indices[t] ?? 0, indices[t + 2] ?? 0);
  }

  const triangleCount = new Map<number, number>();
  for (let t = 0; t < indices.length; t += 3) {
    const root = find(indices[t] ?? 0);
    triangleCount.set(root, (triangleCount.get(root) ?? 0) + 1);
  }

  const kept: number[] = [];
  for (let t = 0; t < indices.length; t += 3) {
    if ((triangleCount.get(find(indices[t] ?? 0)) ?? 0) >= minTriangles) {
      kept.push(indices[t] ?? 0, indices[t + 1] ?? 0, indices[t + 2] ?? 0);
    }
  }
  if (kept.length === indices.length) return mesh;

  // Compact: keep only referenced vertices.
  const remap = new Int32Array(vertexCount).fill(-1);
  const positions: number[] = [];
  const normals: number[] = [];
  const outIndices = new Uint32Array(kept.length);
  kept.forEach((v, i) => {
    if (remap[v] === -1) {
      remap[v] = positions.length / 3;
      positions.push(
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      );
      normals.push(
        mesh.normals[v * 3] ?? 0,
        mesh.normals[v * 3 + 1] ?? 0,
        mesh.normals[v * 3 + 2] ?? 0,
      );
    }
    outIndices[i] = remap[v] ?? 0;
  });
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: outIndices,
  };
}
