/**
 * Pure helpers for the sectioning plane: the range of offsets it can travel over
 * the specimen, and which side of it a part lies on (to skip drawing what it
 * doesn't touch).
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

/** Where a sphere lies against the plane: all kept, all cut away, or crossing it. */
export type PlaneSide = 'kept' | 'removed' | 'crossing';

/** Kept side: dot(normal, p) + constant ≥ 0, as three.js clipping planes keep. */
export function sphereSide(
  normal: Vec3,
  constant: number,
  centre: Vec3,
  radius: number,
): PlaneSide {
  const d = normal[0] * centre[0] + normal[1] * centre[1] + normal[2] * centre[2] + constant;
  if (d > radius) return 'kept';
  if (d < -radius) return 'removed';
  return 'crossing';
}

/**
 * A sphere that holds a part wherever it moves: its bounds, grown by `margin` (for
 * the idle sway) and, for a part that turns about a pivot (the eyes), centred on the
 * pivot so any turn stays inside.
 */
export function partSphere(
  bounds: Bounds,
  margin: number,
  pivot?: Vec3,
): { centre: Vec3; radius: number } {
  const centre: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const radius = Math.hypot(
    bounds.max[0] - centre[0],
    bounds.max[1] - centre[1],
    bounds.max[2] - centre[2],
  );
  if (!pivot) return { centre, radius: radius + margin };
  const offset = Math.hypot(centre[0] - pivot[0], centre[1] - pivot[1], centre[2] - pivot[2]);
  return { centre: pivot, radius: offset + radius + margin };
}
