/**
 * Pure helpers for the glows at the bust's edges: where a mesh crosses a plane,
 * as line segments in the plane's own 2D coordinates.
 */
import type { Vec3 } from '../procedural/sdf/types.ts';

/**
 * Segments where the triangles of an indexed mesh cross the plane
 * dot(normal, p) + constant = 0, in the plane's coordinates (dot(p, u), dot(p, v)):
 * a flat array of a0, b0, a1, b1 for each segment.
 */
export function sliceByPlane(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  normal: Vec3,
  constant: number,
  u: Vec3,
  v: Vec3,
): number[] {
  const [nx, ny, nz] = normal;
  // Each vertex's height above the plane, once; most triangles don't cross it.
  const count = Math.floor(positions.length / 3);
  const side = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    side[i] =
      (positions[i * 3] ?? 0) * nx +
      (positions[i * 3 + 1] ?? 0) * ny +
      (positions[i * 3 + 2] ?? 0) * nz +
      constant;
  }
  const segments: number[] = [];
  const crossing = (i: number, j: number) => {
    const di = side[i] ?? 0;
    const s = di / (di - (side[j] ?? 0));
    const x = (positions[i * 3] ?? 0) + ((positions[j * 3] ?? 0) - (positions[i * 3] ?? 0)) * s;
    const y =
      (positions[i * 3 + 1] ?? 0) + ((positions[j * 3 + 1] ?? 0) - (positions[i * 3 + 1] ?? 0)) * s;
    const z =
      (positions[i * 3 + 2] ?? 0) + ((positions[j * 3 + 2] ?? 0) - (positions[i * 3 + 2] ?? 0)) * s;
    segments.push(x * u[0] + y * u[1] + z * u[2], x * v[0] + y * v[1] + z * v[2]);
  };
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t] ?? 0;
    const b = indices[t + 1] ?? 0;
    const c = indices[t + 2] ?? 0;
    const pa = (side[a] ?? 0) > 0;
    const pb = (side[b] ?? 0) > 0;
    const pc = (side[c] ?? 0) > 0;
    if (pa === pb && pb === pc) continue;
    if (pa !== pb) crossing(a, b);
    if (pb !== pc) crossing(b, c);
    if (pc !== pa) crossing(c, a);
  }
  return segments;
}

/** Segments where a mesh crosses the plane y = `height`, as x, z pairs. */
export function sliceAtHeight(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  height: number,
): number[] {
  return sliceByPlane(positions, indices, [0, 1, 0], -height, [1, 0, 0], [0, 0, 1]);
}

/** The plane's 2D axes, as the cut faces use them (shaders/cap.frag.glsl). */
export function planeAxes(normal: Vec3): { u: Vec3; v: Vec3 } {
  const [nx, ny, nz] = normal;
  // u = normalize(cross(n, up)), or cross(n, x) when n is nearly vertical.
  const [ax, ay, az] = Math.abs(ny) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u: Vec3 = [ny * az - nz * ay, nz * ax - nx * az, nx * ay - ny * ax];
  const length = Math.hypot(u[0], u[1], u[2]) || 1;
  u = [u[0] / length, u[1] / length, u[2] / length];
  const v: Vec3 = [ny * u[2] - nz * u[1], nz * u[0] - nx * u[2], nx * u[1] - ny * u[0]];
  return { u, v };
}
