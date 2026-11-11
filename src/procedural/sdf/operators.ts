/**
 * Combining and transforming SDFs. Smooth variants use the polynomial smooth
 * minimum; `k` is roughly the blend radius in world units.
 */
import type { Sdf, Vec3 } from './types.ts';

export function union(...fields: Sdf[]): Sdf {
  return (x, y, z) => {
    let d = Infinity;
    for (const f of fields) d = Math.min(d, f(x, y, z));
    return d;
  };
}

export function smoothMin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export function smoothUnion(k: number, ...fields: Sdf[]): Sdf {
  return (x, y, z) => {
    let d = Infinity;
    for (const f of fields) {
      const fd = f(x, y, z);
      d = d === Infinity ? fd : smoothMin(d, fd, k);
    }
    return d;
  };
}

export function subtract(base: Sdf, cut: Sdf): Sdf {
  return (x, y, z) => Math.max(base(x, y, z), -cut(x, y, z));
}

export function smoothSubtract(k: number, base: Sdf, cut: Sdf): Sdf {
  return (x, y, z) => -smoothMin(-base(x, y, z), cut(x, y, z), k);
}

export function intersect(...fields: Sdf[]): Sdf {
  return (x, y, z) => {
    let d = -Infinity;
    for (const f of fields) d = Math.max(d, f(x, y, z));
    return d;
  };
}

export function smoothIntersect(k: number, a: Sdf, b: Sdf): Sdf {
  return (x, y, z) => -smoothMin(-a(x, y, z), -b(x, y, z), k);
}

/** Grows (positive) or shrinks (negative) a field by `amount`. */
export function offset(field: Sdf, amount: number): Sdf {
  return (x, y, z) => field(x, y, z) - amount;
}

/** A hollow layer of the given thickness, centred on the surface. */
export function shell(field: Sdf, thickness: number): Sdf {
  const half = thickness / 2;
  return (x, y, z) => Math.abs(field(x, y, z)) - half;
}

export function translate(field: Sdf, [tx, ty, tz]: Vec3): Sdf {
  return (x, y, z) => field(x - tx, y - ty, z - tz);
}

/** Mirrors the field across the x = 0 plane (left/right symmetry). */
export function mirrorX(field: Sdf): Sdf {
  return (x, y, z) => field(Math.abs(x), y, z);
}

/** Rotation about the x axis by `angle` radians, around `pivot`. */
export function rotateX(field: Sdf, angle: number, [, py, pz]: Vec3 = [0, 0, 0]): Sdf {
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  return (x, y, z) => {
    const ly = y - py;
    const lz = z - pz;
    return field(x, py + ly * c - lz * s, pz + ly * s + lz * c);
  };
}

/** Rotation about the z axis by `angle` radians, around `pivot`. */
export function rotateZ(field: Sdf, angle: number, [px, py]: Vec3 = [0, 0, 0]): Sdf {
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  return (x, y, z) => {
    const lx = x - px;
    const ly = y - py;
    return field(px + lx * c - ly * s, py + lx * s + ly * c, z);
  };
}

/**
 * Adds a displacement to the surface. Keep amplitudes small relative to feature
 * size: large displacements break the distance property and the mesher's accuracy.
 */
export function displace(field: Sdf, by: Sdf): Sdf {
  return (x, y, z) => field(x, y, z) + by(x, y, z);
}

/** Warps space before sampling the field (domain warp). */
export function warp(field: Sdf, by: (x: number, y: number, z: number) => Vec3): Sdf {
  return (x, y, z) => {
    const [wx, wy, wz] = by(x, y, z);
    return field(x + wx, y + wy, z + wz);
  };
}
