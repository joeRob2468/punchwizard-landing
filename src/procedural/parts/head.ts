/**
 * The skin of the head and neck: cranium, face, a generous nose, ears, brow and
 * eye sockets. Low detail by design; the wash style and the beard do the rest.
 */
import { EYE_RADIUS, LANDMARKS as L } from '../landmarks.ts';
import { mirrorPoint } from './mirror.ts';
import {
  capsule,
  displace,
  ellipsoid,
  fbm,
  mirrorX,
  roundCone,
  smoothSubtract,
  smoothUnion,
  sphere,
} from '../sdf/index.ts';
import type { PartDefinition } from './part.ts';

const SEED = 11;

export function headPart(): PartDefinition {
  const cranium = ellipsoid([0, 0.17, -0.05], [0.45, 0.52, 0.54]);
  const face = ellipsoid([0, -0.13, 0.15], [0.35, 0.42, 0.37]);
  const cheek = mirrorX(ellipsoid([0.21, -0.02, 0.32], [0.13, 0.1, 0.12]));
  const brow = capsule([-0.2, 0.19, 0.42], [0.2, 0.19, 0.42], 0.065);
  const nose = smoothUnion(
    0.05,
    roundCone(L.noseBridge, L.noseTip, 0.045, 0.07),
    mirrorX(sphere([0.055, -0.1, 0.55], 0.045)),
  );
  const ear = mirrorX(ellipsoid(L.earLeft, [0.05, 0.13, 0.085]));
  const neck = capsule(L.neckTop, L.neckBase, 0.2);

  const solid = smoothUnion(0.06, smoothUnion(0.2, cranium, face, neck), cheek, brow, nose, ear);
  const sockets = mirrorX(
    sphere([L.eyeLeft[0], L.eyeLeft[1], L.eyeLeft[2] + 0.02], EYE_RADIUS + 0.03),
  );
  const skin = smoothSubtract(0.05, solid, sockets);

  return {
    id: 'head',
    layer: 'integument',
    look: { wash: 'washFlesh' },
    field: displace(skin, (x, y, z) => fbm(SEED, x * 9, y * 9, z * 9) * 0.012),
    bounds: { min: [-0.6, -1.15, -0.7], max: [0.6, 0.78, 0.75] },
    cellSize: 0.02,
  };
}

export function eyesPart(): PartDefinition {
  return {
    id: 'eyes',
    layer: 'organs',
    look: { wash: 'arcaneMana', glow: 0.4 },
    field: mirrorX(sphere(L.eyeLeft, EYE_RADIUS)),
    bounds: {
      min: [-L.eyeLeft[0] - 0.1, L.eyeLeft[1] - 0.1, L.eyeLeft[2] - 0.1],
      max: [L.eyeLeft[0] + 0.1, L.eyeLeft[1] + 0.1, L.eyeLeft[2] + 0.1],
    },
    cellSize: 0.012,
  };
}

/** Right-hand eye position, for consumers that need both. */
export const EYE_RIGHT = mirrorPoint(L.eyeLeft);
