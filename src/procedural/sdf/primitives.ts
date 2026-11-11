/**
 * SDF primitives. Formulas follow Inigo Quilez's reference distance functions
 * (https://iquilezles.org/articles/distfunctions/). Ellipsoid and round-cone
 * distances are bounds rather than exact, which is fine for meshing.
 */
import type { Sdf, Vec3 } from './types.ts';

export function sphere([cx, cy, cz]: Vec3, r: number): Sdf {
  return (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r;
}

export function ellipsoid([cx, cy, cz]: Vec3, [rx, ry, rz]: Vec3): Sdf {
  return (x, y, z) => {
    const px = x - cx;
    const py = y - cy;
    const pz = z - cz;
    const k0 = Math.hypot(px / rx, py / ry, pz / rz);
    const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
}

/** Capsule from a to b with radius r. */
export function capsule(a: Vec3, b: Vec3, r: number): Sdf {
  return roundCone(a, b, r, r);
}

/** Cone with rounded ends: radius r1 at a, r2 at b. */
export function roundCone([ax, ay, az]: Vec3, [bx, by, bz]: Vec3, r1: number, r2: number): Sdf {
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - ax;
    const pay = y - ay;
    const paz = z - az;
    const yv = pax * bax + pay * bay + paz * baz;
    const zv = yv - l2;
    const qx = pax * l2 - bax * yv;
    const qy = pay * l2 - bay * yv;
    const qz = paz * l2 - baz * yv;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yv * yv * l2;
    const z2 = zv * zv * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zv) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yv) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - r1;
  };
}

/** Box centred on c with half-extents h and corner rounding r. */
export function roundBox([cx, cy, cz]: Vec3, [hx, hy, hz]: Vec3, r: number): Sdf {
  return (x, y, z) => {
    const qx = Math.abs(x - cx) - hx + r;
    const qy = Math.abs(y - cy) - hy + r;
    const qz = Math.abs(z - cz) - hz + r;
    const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
    return outside + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
}

/** Disc around the y axis: radius, half-height, and edge rounding. */
export function roundedCylinder(
  [cx, cy, cz]: Vec3,
  radius: number,
  halfHeight: number,
  rounding: number,
): Sdf {
  return (x, y, z) => {
    const dx = Math.hypot(x - cx, z - cz) - radius + rounding;
    const dy = Math.abs(y - cy) - halfHeight;
    return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - rounding;
  };
}

/** Regular octahedron centred on c; `size` is the centre-to-vertex distance (bound, not exact). */
export function octahedron([cx, cy, cz]: Vec3, size: number): Sdf {
  return (x, y, z) => (Math.abs(x - cx) + Math.abs(y - cy) + Math.abs(z - cz) - size) * 0.57735027;
}

/** Torus around the y axis: major radius R, tube radius r. */
export function torus([cx, cy, cz]: Vec3, major: number, minor: number): Sdf {
  return (x, y, z) => {
    const q = Math.hypot(x - cx, z - cz) - major;
    return Math.hypot(q, y - cy) - minor;
  };
}

/** Half-space below the plane through `point` with outward `normal` (normalised). */
export function halfSpace([px, py, pz]: Vec3, [nx, ny, nz]: Vec3): Sdf {
  return (x, y, z) => (x - px) * nx + (y - py) * ny + (z - pz) * nz;
}
