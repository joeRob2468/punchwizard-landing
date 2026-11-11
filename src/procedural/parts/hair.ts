/**
 * Beard, moustache, eyebrows and the hair that falls from under the hat. Big
 * soft masses with vertical grooves suggesting strands.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { bezier } from '../sdf/math.ts';
import {
  displace,
  ellipsoid,
  fbm,
  halfSpace,
  intersect,
  mirrorX,
  roundCone,
  smoothUnion,
} from '../sdf/index.ts';
import type { Sdf } from '../sdf/types.ts';
import type { PartDefinition } from './part.ts';

const SEED = 37;

/** Grooves along y: noise stretched vertically reads as locks of hair. */
const strands =
  (seed: number, amplitude: number): Sdf =>
  (x, y, z) =>
    fbm(seed, x * 14, y * 2.5, z * 14) * amplitude;

export function beardPart(): PartDefinition {
  const jaw = ellipsoid([0, -0.33, 0.24], [0.41, 0.3, 0.3]);
  const sides = mirrorX(ellipsoid([0.3, -0.18, 0.12], [0.13, 0.26, 0.17]));

  // The fall of the beard: a tapering curve down the chest toward the tip.
  const top = [0, -0.45, 0.34] as const;
  const control = [0.0, -0.95, 0.52] as const;
  const fall: Sdf[] = [];
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const a = bezier(top, control, L.beardTip, i / steps);
    const b = bezier(top, control, L.beardTip, (i + 1) / steps);
    fall.push(roundCone(a, b, 0.34 - i * 0.055, 0.34 - (i + 1) * 0.055));
  }

  const moustache = mirrorX(roundCone([0.03, -0.17, 0.57], [0.27, -0.34, 0.45], 0.05, 0.022));
  const eyebrow = mirrorX(roundCone([0.06, 0.23, 0.5], [0.34, 0.3, 0.38], 0.055, 0.03));

  const beard = smoothUnion(0.03, smoothUnion(0.12, jaw, sides, ...fall), moustache, eyebrow);
  return {
    id: 'beard',
    layer: 'integument',
    look: { wash: 'washBone' },
    field: displace(beard, strands(SEED, 0.035)),
    bounds: { min: [-0.62, -1.5, -0.2], max: [0.62, 0.38, 0.78] },
    cellSize: 0.02,
  };
}

export function hairPart(): PartDefinition {
  // A thick mantle around the back of the head, below the brim, down to the shoulders.
  const mantle = smoothUnion(
    0.15,
    ellipsoid([0, 0.0, -0.12], [0.53, 0.45, 0.5]),
    ellipsoid([0, -0.45, -0.22], [0.48, 0.42, 0.3]),
  );
  const behindFace = halfSpace([0, 0, 0.1], [0, 0, 1]);
  const belowBrim = halfSpace([0, L.brimCentre[1] - 0.02, 0], [0, 1, 0]);
  const hair = intersect(mantle, behindFace, belowBrim);
  return {
    id: 'hair',
    layer: 'integument',
    look: { wash: 'washBone' },
    field: displace(hair, strands(SEED + 5, 0.04)),
    bounds: { min: [-0.65, -0.95, -0.75], max: [0.65, 0.45, 0.2] },
    cellSize: 0.024,
  };
}
