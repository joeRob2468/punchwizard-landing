/** Helpers for working on a field's surface: gradients and snapping points onto it. */
import type { Sdf, Vec3 } from './types.ts';

/** Field gradient (unnormalised) by central differences. */
export function gradient(field: Sdf, [x, y, z]: Vec3, e = 0.002): Vec3 {
  return [
    field(x + e, y, z) - field(x - e, y, z),
    field(x, y + e, z) - field(x, y - e, z),
    field(x, y, z + e) - field(x, y, z - e),
  ];
}

/** Unit surface normal (direction of increasing distance). */
export function normalAt(field: Sdf, p: Vec3): Vec3 {
  const g = gradient(field, p);
  const l = Math.hypot(g[0], g[1], g[2]) || 1;
  return [g[0] / l, g[1] / l, g[2] / l];
}

/** Moves a point onto the field's surface with a few Newton steps. */
export function snapToSurface(field: Sdf, start: Vec3, steps = 12): Vec3 {
  let p: Vec3 = start;
  for (let i = 0; i < steps; i++) {
    const d = field(p[0], p[1], p[2]);
    if (Math.abs(d) < 1e-4) break;
    const n = normalAt(field, p);
    p = [p[0] - n[0] * d, p[1] - n[1] * d, p[2] - n[2] * d];
  }
  return p;
}
