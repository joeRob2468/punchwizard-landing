/**
 * Ambient occlusion per vertex from a signed distance field: step out along the
 * normal and see how much nearer the surface is than the step (Inigo Quilez's
 * SDF occlusion). Crevices, the underside of the brim and gaps between locks of
 * hair come out darker. Baked once, so it costs nothing at runtime.
 */
import type { Sdf } from '../sdf/types.ts';
import type { MeshData } from './surface-nets.ts';

const STEPS = [0.02, 0.05, 0.09, 0.15, 0.22] as const;
const FALLOFF = 0.65;
const STRENGTH = 2.2;

/** Returns occlusion in [0, 1] per vertex: 1 = fully open, 0 = fully occluded. */
export function bakeOcclusion(mesh: MeshData, field: Sdf): Float32Array {
  const count = mesh.positions.length / 3;
  const out = new Float32Array(count);
  for (let v = 0; v < count; v++) {
    const px = mesh.positions[v * 3] ?? 0;
    const py = mesh.positions[v * 3 + 1] ?? 0;
    const pz = mesh.positions[v * 3 + 2] ?? 0;
    const nx = mesh.normals[v * 3] ?? 0;
    const ny = mesh.normals[v * 3 + 1] ?? 0;
    const nz = mesh.normals[v * 3 + 2] ?? 0;
    let occlusion = 0;
    let weight = 1;
    for (const h of STEPS) {
      const d = field(px + nx * h, py + ny * h, pz + nz * h);
      occlusion += Math.max(0, h - d) * weight;
      weight *= FALLOFF;
    }
    out[v] = Math.min(1, Math.max(0, 1 - (STRENGTH * occlusion) / STEPS.length / 0.05));
  }
  return out;
}
