/**
 * The vertebral column from C1 down to the bust base, after the midline MRI and
 * the lateral radiograph: C1 (atlas) is a ring with no body and C2's dens rises
 * into it; below, each vertebra is a body in front of the canal with an arch
 * behind (pedicles, laminae), articular pillars at the sides, transverse
 * processes and a spinous process sloping down (long at C7, steep in the thorax).
 * Discs sit between the bodies.
 */
import {
  capsule,
  mirrorX,
  roundBox,
  roundCone,
  smoothUnion,
  subtract,
  torus,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { LANDMARKS as L } from '../landmarks.ts';
import type { PartDefinition } from './part.ts';
import { CANAL_RADIUS, levels, type Level } from './spine-path.ts';

const BONE = { wash: 'washBone', section: { pattern: 'stipple' } } as const;
/** Gap between the canal and the back of a vertebral body. */
const BODY_GAP = 0.012;
const ARCH = 0.013;

const bodyCentre = (l: Level): Vec3 => [
  0,
  l.canal[1],
  l.canal[2] + CANAL_RADIUS + BODY_GAP + l.depth / 2,
];

function vertebra(l: Level): Sdf {
  const [, y, z] = l.canal;
  const ring = torus(l.canal, CANAL_RADIUS + ARCH, ARCH);
  // The arch is taller than a torus: stack two rings.
  const arch = union(ring, torus([0, y - l.halfHeight * 0.5, z], CANAL_RADIUS + ARCH, ARCH));
  const pillars = mirrorX(
    capsule(
      [CANAL_RADIUS + 0.008, y + l.halfHeight * 0.9, z - 0.005],
      [CANAL_RADIUS + 0.008, y - l.halfHeight * 0.9, z - 0.01],
      0.017,
    ),
  );
  const spinous = roundCone(
    [0, y - 0.005, z - CANAL_RADIUS - ARCH],
    [0, y - l.spineDrop, z - CANAL_RADIUS - ARCH - l.spine],
    0.018,
    l.name === 'C7' ? 0.016 : 0.011,
  );
  const transverse = mirrorX(
    roundCone(
      [CANAL_RADIUS + 0.01, y, z + 0.012],
      [CANAL_RADIUS + 0.06, y - 0.01, z + 0.02],
      0.015,
      0.01,
    ),
  );
  const parts = [arch, pillars, spinous, transverse];

  if (l.name === 'C1') {
    // The atlas: an anterior arch in front of the dens, lateral masses, a small tubercle behind.
    const front: Vec3 = [0, y, z + CANAL_RADIUS + 0.045];
    parts.push(
      torus([0, y, z + 0.012], CANAL_RADIUS + 0.03, 0.014),
      roundBox(front, [0.03, 0.016, 0.012], 0.008),
      mirrorX(roundBox([CANAL_RADIUS + 0.02, y, z + 0.02], [0.02, 0.022, 0.03], 0.012)),
    );
  } else {
    const c = bodyCentre(l);
    parts.push(roundBox(c, [l.halfWidth, l.halfHeight, l.depth / 2], 0.016));
    if (l.name === 'C2') {
      // The dens rises from the body of the axis up into the ring of the atlas.
      parts.push(
        capsule([0, c[1], c[2] - 0.005], [0, c[1] + l.halfHeight + 0.075, c[2] - 0.012], 0.019),
      );
    }
  }
  const solid = smoothUnion(0.012, ...parts);
  return subtract(solid, capsule([0, y + 0.1, z], [0, y - 0.1, z], CANAL_RADIUS));
}

export function spinePart(): PartDefinition {
  const all = levels();
  const field = union(...all.map(vertebra));
  return {
    id: 'spine',
    layer: 'skeleton',
    look: BONE,
    field,
    bounds: { min: [-0.16, L.bustBase[1] - 0.04, -0.42], max: [0.16, -0.12, 0.12] },
    // Each ring around the canal is a hole; the atlas adds a second ring.
    intendedHoles: all.length * 2 + 1,
    cellSize: 0.006,
  };
}

/** Intervertebral discs between consecutive bodies (none between C1 and C2). */
export function discsPart(): PartDefinition {
  const all = levels();
  const discs: Sdf[] = [];
  for (let i = 1; i < all.length - 1; i++) {
    const a = all[i];
    const b = all[i + 1];
    if (!a || !b) continue;
    const ca = bodyCentre(a);
    const cb = bodyCentre(b);
    const top = ca[1] - a.halfHeight;
    const bottom = cb[1] + b.halfHeight;
    const centre: Vec3 = [0, (top + bottom) / 2, (ca[2] + cb[2]) / 2];
    const half = Math.max(0.006, (top - bottom) / 2 + 0.003);
    discs.push(roundBox(centre, [a.halfWidth - 0.006, half, a.depth / 2 - 0.006], 0.005));
  }
  return {
    id: 'discs',
    layer: 'skeleton',
    look: { wash: 'washCartilage', section: { pattern: 'hatch' } },
    field: union(...discs),
    bounds: { min: [-0.12, L.bustBase[1] - 0.04, -0.2], max: [0.12, -0.2, 0.12] },
    cellSize: 0.005,
  };
}
