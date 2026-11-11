/**
 * Makes every triangle face outward. Surface nets and simplification can leave a
 * few triangles wound backwards in tight creases (nostrils, lid corners); those are
 * culled as back faces and read as holes. Each triangle is checked against the SDF
 * normals at its corners, which always point outward, and flipped if it disagrees.
 */
import type { MeshData } from './surface-nets.ts';

/** Returns the mesh with consistent outward winding, and how many triangles it flipped. */
export function orientOutward(mesh: MeshData): { mesh: MeshData; flipped: number } {
  const { positions: p, normals: n } = mesh;
  const indices = Uint32Array.from(mesh.indices);
  let flipped = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] ?? 0;
    const b = indices[t + 1] ?? 0;
    const c = indices[t + 2] ?? 0;
    const e1x = (p[b * 3] ?? 0) - (p[a * 3] ?? 0);
    const e1y = (p[b * 3 + 1] ?? 0) - (p[a * 3 + 1] ?? 0);
    const e1z = (p[b * 3 + 2] ?? 0) - (p[a * 3 + 2] ?? 0);
    const e2x = (p[c * 3] ?? 0) - (p[a * 3] ?? 0);
    const e2y = (p[c * 3 + 1] ?? 0) - (p[a * 3 + 1] ?? 0);
    const e2z = (p[c * 3 + 2] ?? 0) - (p[a * 3 + 2] ?? 0);
    const fx = e1y * e2z - e1z * e2y;
    const fy = e1z * e2x - e1x * e2z;
    const fz = e1x * e2y - e1y * e2x;
    const nx = (n[a * 3] ?? 0) + (n[b * 3] ?? 0) + (n[c * 3] ?? 0);
    const ny = (n[a * 3 + 1] ?? 0) + (n[b * 3 + 1] ?? 0) + (n[c * 3 + 1] ?? 0);
    const nz = (n[a * 3 + 2] ?? 0) + (n[b * 3 + 2] ?? 0) + (n[c * 3 + 2] ?? 0);
    if (fx * nx + fy * ny + fz * nz < 0) {
      indices[t + 1] = c;
      indices[t + 2] = b;
      flipped++;
    }
  }
  return { mesh: { ...mesh, indices }, flipped };
}
