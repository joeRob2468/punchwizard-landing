/**
 * The arcane systems: Aetherial Vessels carrying mana from the core down the neck
 * to the shoulders and forward to the eyes, and the Conduit Lattice rising from
 * the Third Fontanelle through the hat to its tip.
 */
import { createRandom } from '../growth/random.ts';
import { curve, segmentsField, sprout } from '../growth/branches.ts';
import { LANDMARKS as L } from '../landmarks.ts';
import { intersectLazy, offset, union } from '../sdf/index.ts';
import { lerp, mirrorX } from '../sdf/math.ts';
import type { Vec3 } from '../sdf/types.ts';
import { headSkinField } from './head.ts';
import { hatField, hatSpine } from './hat.ts';
import type { PartDefinition } from './part.ts';
import { robeField } from './robe.ts';

const MANA = { wash: 'arcaneMana', glow: 0.85, section: { pattern: 'glow' } } as const;

export function vesselsPart(): PartDefinition {
  const random = createRandom(97);
  const core = L.aethericCore;
  const neck: Vec3 = [0, -0.55, -0.02];

  const trunks = [
    // Core down through the foramen into the neck.
    ...curve(core, [0, -0.1, -0.14], neck, 0.032, 0.03),
    // Neck out to each shoulder and down the arm.
    ...[L.shoulderLeft, mirrorX(L.shoulderLeft)].flatMap((shoulder) => {
      const elbowward: Vec3 = [shoulder[0] * 1.2, L.bustBase[1] + 0.05, shoulder[2] + 0.04];
      return [
        ...curve(neck, [shoulder[0] * 0.35, -1.0, 0.05], shoulder, 0.03, 0.026),
        ...curve(shoulder, lerp(shoulder, elbowward, 0.5), elbowward, 0.026, 0.022, 5),
      ];
    }),
    // Core forward to each eye.
    ...[L.eyeLeft, mirrorX(L.eyeLeft)].flatMap((eye) =>
      curve(core, [eye[0] * 0.6, 0.14, 0.12], [eye[0], eye[1], eye[2] - 0.06], 0.022, 0.016, 6),
    ),
  ];
  const branches = sprout(random, trunks, {
    count: 22,
    length: 0.24,
    radiusScale: 0.7,
    lean: 0.4,
    bias: [0, -0.25, 0],
    depth: 1,
  });

  // Keep everything inside the body.
  const body = offset(union(headSkinField(), robeField()), -0.03);
  return {
    id: 'vessels',
    layer: 'arcane',
    look: MANA,
    field: intersectLazy(segmentsField([...trunks, ...branches]), body, 0.05),
    bounds: { min: [-1.15, L.bustBase[1] - 0.02, -0.5], max: [1.15, 0.6, 0.72] },
    cellSize: 0.01,
  };
}

export function latticePart(): PartDefinition {
  const random = createRandom(131);
  const { points } = hatSpine();
  const tip = points[points.length - 1] ?? L.hatTip;
  const mid = points[Math.floor(points.length / 2)] ?? L.hatTip;

  const trunk = [
    ...curve(L.aethericCore, [0, 0.4, -0.06], L.fontanelle, 0.03, 0.03, 5),
    ...curve(L.fontanelle, mid, tip, 0.03, 0.014, 12),
  ];
  const branches = sprout(random, trunk.slice(5), {
    count: 26,
    length: 0.32,
    radiusScale: 0.65,
    lean: 0.55,
    bias: [0, 0.3, 0],
    depth: 1,
  });

  // The lattice lives inside the hat (and the stretch through skull and brain).
  const container = union(offset(hatField(), -0.035), offset(headSkinField(), -0.05));
  return {
    id: 'lattice',
    layer: 'arcane',
    look: MANA,
    field: intersectLazy(segmentsField([...trunk, ...branches]), container, 0.05),
    bounds: { min: [-0.7, -0.05, -0.75], max: [0.95, 2.15, 0.6] },
    cellSize: 0.01,
  };
}
