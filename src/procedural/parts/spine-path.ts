/**
 * Where the spine runs: the centre of the vertebral canal at each level, from the
 * foramen magnum down the cervical curve (convex forward, after the lateral
 * radiograph) and back into the thoracic curve. Vertebrae, discs, the spinal cord
 * and the vessels that run with it are all placed from here.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { capsule, union } from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';

/** Centre of the foramen magnum, where the brainstem becomes the cord. */
export const FORAMEN_MAGNUM: Vec3 = [0, -0.17, -0.15];

/** Radius of the vertebral canal and of the cord in it. */
export const CANAL_RADIUS = 0.045;
export const CORD_RADIUS = 0.027;

export interface Level {
  readonly name: string;
  /** Centre of the canal at this level (mid-body height). */
  readonly canal: Vec3;
  /** Body height (half), from the canal to the body's centre, and its half-width. */
  readonly halfHeight: number;
  readonly depth: number;
  readonly halfWidth: number;
  /** Spinous process length; C7 (vertebra prominens) is long, thoracic ones slope down. */
  readonly spine: number;
  readonly spineDrop: number;
}

const canalZ: readonly (readonly [y: number, z: number])[] = [
  [FORAMEN_MAGNUM[1], FORAMEN_MAGNUM[2]],
  [-0.25, -0.13],
  [-0.4, -0.105],
  [-0.55, -0.095],
  [-0.7, -0.105],
  [-0.82, -0.125],
  [-1.0, -0.16],
  [-1.3, -0.2],
  [L.bustBase[1] - 0.1, -0.23],
];

/** Canal centre at height y (linear between the control heights above). */
export function canalAt(y: number): Vec3 {
  for (let i = 0; i < canalZ.length - 1; i++) {
    const a = canalZ[i];
    const b = canalZ[i + 1];
    if (!a || !b) continue;
    if (y <= a[0] && y >= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0]);
      return [0, y, a[1] + (b[1] - a[1]) * t];
    }
  }
  const last = y > (canalZ[0]?.[0] ?? 0) ? canalZ[0] : canalZ[canalZ.length - 1];
  return [0, y, last?.[1] ?? 0];
}

/** The vertebral canal as a field: a tube from the foramen magnum down past the base. */
export function canalField(radius = CANAL_RADIUS): Sdf {
  const ys: number[] = [];
  for (let y = FORAMEN_MAGNUM[1] + 0.06; y > L.bustBase[1] - 0.12; y -= 0.05) ys.push(y);
  const points = ys.map(canalAt);
  return union(...points.slice(0, -1).map((a, i) => capsule(a, points[i + 1] ?? a, radius)));
}

/** The vertebrae from C1 down to the bust base, each a little taller than the last. */
export function levels(): Level[] {
  const result: Level[] = [];
  let y = -0.245;
  const names = [
    'C1',
    'C2',
    'C3',
    'C4',
    'C5',
    'C6',
    'C7',
    'T1',
    'T2',
    'T3',
    'T4',
    'T5',
    'T6',
    'T7',
    'T8',
    'T9',
    'T10',
  ];
  for (const [i, name] of names.entries()) {
    const thoracic = i >= 7;
    const halfHeight = name === 'C2' ? 0.045 : thoracic ? 0.04 : 0.033;
    const disc = 0.012;
    if (i > 0) y -= halfHeight + disc;
    if (y < L.bustBase[1] + 0.03) break;
    result.push({
      name,
      canal: canalAt(y),
      halfHeight,
      depth: thoracic ? 0.085 : 0.07,
      halfWidth: thoracic ? 0.065 : 0.055,
      spine: name === 'C7' ? 0.11 : thoracic ? 0.1 : name === 'C1' ? 0.03 : 0.075,
      spineDrop: thoracic ? 0.07 : name === 'C7' ? 0.03 : 0.025,
    });
    y -= halfHeight;
  }
  return result;
}
