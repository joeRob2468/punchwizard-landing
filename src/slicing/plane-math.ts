/**
 * Pure helpers for the sectioning plane: offsets along an axis, the range the
 * plane can travel over the specimen, and mapping a pointer ray to an offset.
 */
import type { Ray } from 'three';
import { Vector3 } from 'three';

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

const scratchW = new Vector3();

/**
 * Offset for which the plane passes through the point on the axis line (through
 * `origin`, along `normal`) closest to the pointer `ray`. Returns null when the
 * ray is nearly parallel to the axis.
 */
export function offsetUnderRay(ray: Ray, origin: Vector3, normal: Vector3): number | null {
  // Closest points between two lines: origin + s·normal and ray.origin + t·ray.direction.
  const d = ray.direction;
  const b = normal.dot(d);
  const denom = 1 - b * b;
  if (denom < 1e-4) return null;
  const w = scratchW.subVectors(origin, ray.origin);
  const s = (b * d.dot(w) - normal.dot(w)) / denom;
  // The plane through origin + s·normal has offset -dot(n, point).
  return -(normal.dot(origin) + s);
}
