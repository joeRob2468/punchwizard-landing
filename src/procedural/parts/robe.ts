/**
 * Shoulders and upper chest in a heavy robe, cut flat at the base like a bust,
 * with sloping shoulders, a rolled collar and loose vertical folds.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import {
  displace,
  ellipsoid,
  fbm,
  halfSpace,
  intersect,
  mirrorX,
  roundCone,
  smoothUnion,
  torus,
} from '../sdf/index.ts';
import type { PartDefinition } from './part.ts';

const SEED = 53;

export function robePart(): PartDefinition {
  const [, baseY] = L.bustBase;
  const [sx, sy, sz] = L.shoulderLeft;

  // Trapezius slope from the neck out to the shoulder, then the upper arm.
  const slope = mirrorX(roundCone([0.1, L.neckBase[1] + 0.04, sz], [sx, sy, sz], 0.2, 0.26));
  const arm = mirrorX(roundCone([sx, sy, sz], [sx + 0.12, baseY - 0.1, sz + 0.02], 0.27, 0.25));
  const chest = ellipsoid([0, -1.5, 0.0], [0.7, 0.6, 0.4]);
  const collar = torus([0, L.neckBase[1] + 0.06, L.neckBase[2] + 0.02], 0.25, 0.075);

  const body = smoothUnion(0.06, smoothUnion(0.22, slope, arm, chest), collar);
  const cut = halfSpace([0, baseY, 0], [0, -1, 0]);
  const folds = (x: number, y: number, z: number) => fbm(SEED, x * 6, y * 1.2, z * 6) * 0.05;

  return {
    id: 'robe',
    layer: 'integument',
    look: { wash: 'washOchre' },
    field: intersect(displace(body, folds), cut),
    bounds: { min: [-1.3, baseY - 0.02, -0.55], max: [1.3, -0.6, 0.5] },
    cellSize: 0.03,
  };
}
