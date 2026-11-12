/**
 * Local frames on a surface, for small fittings (buckles, brooches, gems) that are
 * easier to build flat around the origin and then set onto a curved part.
 */
import { add, cross, dot, normalise, scale, sub } from '../sdf/math.ts';
import { normalAt, snapToSurface } from '../sdf/surface.ts';
import type { Bounds, Sdf, Vec3 } from '../sdf/types.ts';

/** A point on a surface with u across, v up along it and w out of it. */
export interface SurfaceFrame {
  readonly origin: Vec3;
  readonly u: Vec3;
  readonly v: Vec3;
  readonly w: Vec3;
}

/** The frame at the surface point nearest `near`, lifted `lift` off the surface. */
export function surfaceFrame(field: Sdf, near: Vec3, lift = 0): SurfaceFrame {
  const onSurface = snapToSurface(field, near);
  const w = normalAt(field, onSurface);
  const u = normalise(cross([0, 1, 0], w));
  const v = cross(w, u);
  return { origin: add(onSurface, scale(w, lift)), u, v, w };
}

/** Evaluates a field built around the origin (+z out of the surface) in the frame. */
export function inFrame(local: Sdf, { origin, u, v, w }: SurfaceFrame): Sdf {
  return (x, y, z) => {
    const d = sub([x, y, z], origin);
    return local(dot(d, u), dot(d, v), dot(d, w));
  };
}

/** A cube of half-size r around each frame's origin. */
export function framesBounds(frames: readonly SurfaceFrame[], r: number): Bounds {
  const xs = frames.map((f) => f.origin);
  const lo = (i: 0 | 1 | 2) => Math.min(...xs.map((p) => p[i])) - r;
  const hi = (i: 0 | 1 | 2) => Math.max(...xs.map((p) => p[i])) + r;
  return { min: [lo(0), lo(1), lo(2)], max: [hi(0), hi(1), hi(2)] };
}
