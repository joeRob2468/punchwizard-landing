/**
 * Pure helpers for the sectioning plane: the range of offsets it can travel over
 * the specimen.
 */
import type { Bounds, Vec3 } from '../procedural/sdf/types.ts';

/** Offsets that put the plane just outside the specimen on each side of `normal`. */
export function offsetRange(bounds: Bounds, normal: Vec3, margin: number): [number, number] {
  // Kept side: dot(n, p) + offset > 0. Every corner kept ⇔ offset > max(-dot(n, corner)).
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const d = -(normal[0] * x + normal[1] * y + normal[2] * z);
        lo = Math.min(lo, d);
        hi = Math.max(hi, d);
      }
    }
  }
  return [lo - margin, hi + margin];
}
