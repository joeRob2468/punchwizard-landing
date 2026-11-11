/**
 * Pure geometry for placing label anchors: snapping a guess onto a part's surface,
 * finding where the cut passes through a part, and where a sight line crosses the
 * cut plane.
 */
import type { Sdf, Vec3 } from '../procedural/sdf/types.ts';

/** A plane as `dot(normal, p) + constant`, positive on the kept side. */
export interface PlaneLike {
  readonly normal: Vec3;
  readonly constant: number;
}

export const signedDistance = ({ normal: n, constant }: PlaneLike, p: Vec3): number =>
  n[0] * p[0] + n[1] * p[1] + n[2] * p[2] + constant;

export function projectOntoPlane(plane: PlaneLike, p: Vec3): Vec3 {
  const d = signedDistance(plane, p);
  const n = plane.normal;
  return [p[0] - n[0] * d, p[1] - n[1] * d, p[2] - n[2] * d];
}

/**
 * First candidate whose projection onto the plane lies inside the part (by at least
 * `inset`), i.e. a point on the part's cut face. Null if the cut misses it.
 */
export function sectionAnchor(
  candidates: readonly Vec3[],
  field: Sdf,
  plane: PlaneLike,
  inset = 0.006,
): Vec3 | null {
  for (const candidate of candidates) {
    const p = projectOntoPlane(plane, candidate);
    if (field(p[0], p[1], p[2]) < -inset) return p;
  }
  return null;
}

/** Field gradient (unnormalised) by central differences. */
export function gradient(field: Sdf, [x, y, z]: Vec3, e = 0.002): Vec3 {
  return [
    field(x + e, y, z) - field(x - e, y, z),
    field(x, y + e, z) - field(x, y - e, z),
    field(x, y, z + e) - field(x, y, z - e),
  ];
}

/** Moves a point onto the field's surface with a few Newton steps. */
export function snapToSurface(field: Sdf, start: Vec3, steps = 12): Vec3 {
  let p: Vec3 = start;
  for (let i = 0; i < steps; i++) {
    const d = field(p[0], p[1], p[2]);
    if (Math.abs(d) < 1e-4) break;
    const g = gradient(field, p);
    const len = Math.hypot(g[0], g[1], g[2]) || 1;
    p = [p[0] - (g[0] / len) * d, p[1] - (g[1] / len) * d, p[2] - (g[2] / len) * d];
  }
  return p;
}

/** Where the segment a→b crosses the plane, or null if both ends are on one side. */
export function planeCrossing(plane: PlaneLike, a: Vec3, b: Vec3): Vec3 | null {
  const da = signedDistance(plane, a);
  const db = signedDistance(plane, b);
  if (da * db > 0 || da === db) return null;
  const t = da / (da - db);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
