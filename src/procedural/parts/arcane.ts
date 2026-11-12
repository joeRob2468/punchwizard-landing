/**
 * The arcane systems: Aetherial Vessels carrying mana from the core down the
 * vertebral canal (behind the cord) and out to the shoulders and forward to the eyes, and the Conduit Lattice rising from
 * the Third Fontanelle through the hat to its tip.
 */
import { createRandom } from '../growth/random.ts';
import { curve, segmentsField, sprout } from '../growth/branches.ts';
import { LANDMARKS as L } from '../landmarks.ts';
import { intersectLazy, offset, union } from '../sdf/index.ts';
import { lerp, mirrorX } from '../sdf/math.ts';
import type { Vec3 } from '../sdf/types.ts';
import { headSkinField } from './head.ts';
import { hornTip } from './cranium.ts';
import { HEART_TOP } from './fantasy.ts';
import { hatSpine } from './hat-shape.ts';
import { hatField } from './hat.ts';
import type { PartDefinition } from './part.ts';
import { canalAt, FORAMEN_MAGNUM } from './spine-path.ts';
import { robeField } from './robe.ts';

const MANA = { wash: 'arcaneMana', glow: 1, section: { pattern: 'glow' } } as const;

export function vesselsPart(): PartDefinition {
  const random = createRandom(97);
  const core = L.aethericCore;
  // The main vessel runs down the vertebral canal behind the cord, protected like it.
  const inCanal = (y: number): Vec3 => {
    const [, cy, cz] = canalAt(y);
    return [0, cy, cz - 0.026];
  };
  const neck = inCanal(-0.78);
  const canal = [FORAMEN_MAGNUM[1], -0.3, -0.45, -0.6, -0.78].map(inCanal);
  const down = canal
    .slice(0, -1)
    .flatMap((a, i) =>
      curve(a, lerp(a, canal[i + 1] ?? a, 0.5), canal[i + 1] ?? a, 0.017, 0.017, 2),
    );

  const trunks = [
    // Core down behind the brainstem to the foramen magnum, then down the canal.
    ...curve(core, [0, -0.02, -0.16], inCanal(FORAMEN_MAGNUM[1]), 0.024, 0.017, 6),
    ...down,
    // Out of the canal at C7 to each shoulder and down the arm.
    ...[L.shoulderLeft, mirrorX(L.shoulderLeft)].flatMap((shoulder) => {
      const elbowward: Vec3 = [shoulder[0] * 1.2, L.bustBase[1] + 0.05, shoulder[2] + 0.04];
      return [
        ...curve(neck, [shoulder[0] * 0.35, -0.9, -0.12], shoulder, 0.02, 0.026),
        ...curve(shoulder, lerp(shoulder, elbowward, 0.5), elbowward, 0.026, 0.022, 5),
      ];
    }),
    // The mana heart's outflow, up behind the sternum to the vessels at the neck.
    ...curve(
      [HEART_TOP[0] - 0.01, HEART_TOP[1] + 0.04, HEART_TOP[2] - 0.03],
      [0.02, -1.05, 0.02],
      neck,
      0.018,
      0.016,
      8,
    ),
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

/** Where the lattice's trunk bends on its way up through the brain to the fontanelle. */
export const LATTICE_BEND: Vec3 = [0, 0.6, -0.1];

export function latticePart(): PartDefinition {
  const random = createRandom(131);
  const { points } = hatSpine();
  const tip = points[points.length - 1] ?? L.hatTip;
  const shoulder = points[6] ?? L.hatTip;
  const fontanelle = hornTip();

  // Up through the brain's lobe in the horn core, out of the fontanelle at its tip,
  // and on up the hat to its point.
  const trunk = [
    ...curve(L.aethericCore, LATTICE_BEND, fontanelle, 0.03, 0.028, 5),
    ...curve(fontanelle, shoulder, tip, 0.026, 0.014, 10),
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
