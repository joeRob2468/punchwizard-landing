/**
 * Named reference points of the specimen, in specimen space: origin near the
 * centre of the head, y up, the face looking along +z, +x on the wizard's left.
 * Unit ≈ one head height. Parts are positioned from these so they move together,
 * and label anchors (M5) refer to them by name.
 *
 * Only left-side points are listed for paired features; mirror x for the right.
 */
import type { Vec3 } from './sdf/types.ts';

export const LANDMARKS = {
  crown: [0, 0.68, -0.05],
  browCentre: [0, 0.2, 0.47],
  eyeLeft: [0.16, 0.1, 0.365],
  noseBridge: [0, 0.12, 0.49],
  noseTip: [0, -0.06, 0.64],
  mouth: [0, -0.27, 0.45],
  chin: [0, -0.47, 0.36],
  earLeft: [0.45, 0.02, -0.02],
  neckTop: [0, -0.25, -0.08],
  neckBase: [0, -0.9, -0.05],
  shoulderLeft: [0.74, -1.24, -0.06],
  sternum: [0, -1.1, 0.3],
  brimCentre: [0, 0.4, -0.03],
  hatTip: [0.78, 1.98, -0.22],
  beardTip: [0.04, -1.32, 0.46],
  bustBase: [0, -1.65, 0],
  aethericCore: [0, 0.1, -0.06],
  etherealGland: [0, 0.0, -0.17],
  fontanelle: [0, 0.6, -0.06],
  foramen: [0, -0.2, -0.13],
  sinus: [0, 0.03, 0.3],
  tongue: [0, -0.31, 0.22],
  familiarsPerch: [0.5, -0.9, -0.02],
} as const satisfies Record<string, Vec3>;

export type LandmarkName = keyof typeof LANDMARKS;

/** Eye radius, shared by the eyeball part and the head's eye sockets. */
export const EYE_RADIUS = 0.08;
