/**
 * The brain and what is lodged in it: the Aetheric Core at its centre, the
 * Ethereal Gland just behind, and Focus Gems set in the cortex.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import {
  capsule,
  displace,
  ellipsoid,
  fbm,
  octahedron,
  smoothUnion,
  sphere,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import type { PartDefinition } from './part.ts';

const SEED = 71;

export function brainPart(): PartDefinition {
  const cerebrum = ellipsoid([0, 0.17, -0.06], [0.33, 0.38, 0.41]);
  const cerebellum = ellipsoid([0, -0.1, -0.3], [0.2, 0.1, 0.12]);
  const stem = capsule([0, 0.0, -0.12], [L.foramen[0], -0.3, L.foramen[2]], 0.045);
  const brain = smoothUnion(0.06, cerebrum, cerebellum, stem);
  // Folds: ridged noise pressed into the surface.
  const gyri = (x: number, y: number, z: number) =>
    -Math.abs(fbm(SEED, x * 11, y * 11, z * 11)) * 0.035;
  return {
    id: 'brain',
    layer: 'organs',
    look: { wash: 'washBrain', section: { pattern: 'gyri' } },
    field: displace(brain, gyri),
    bounds: { min: [-0.38, -0.36, -0.5], max: [0.38, 0.58, 0.38] },
    cellSize: 0.016,
  };
}

export function etherealGlandPart(): PartDefinition {
  const c = L.etherealGland;
  return {
    id: 'ethereal-gland',
    layer: 'organs',
    look: { wash: 'washOchre', glow: 0.3, section: { pattern: 'stipple' } },
    field: smoothUnion(0.02, sphere(c, 0.035), sphere([c[0], c[1] + 0.03, c[2] - 0.02], 0.022)),
    bounds: box(c, 0.09),
    cellSize: 0.006,
  };
}

export function aethericCorePart(): PartDefinition {
  const c = L.aethericCore;
  return {
    id: 'aetheric-core',
    layer: 'arcane',
    look: { wash: 'arcaneMana', glow: 1, section: { pattern: 'glow' } },
    field: sphere(c, 0.075),
    bounds: box(c, 0.11),
    cellSize: 0.008,
  };
}

/** Gems sit just under the cortex, mostly frontal and parietal. */
const GEM_DIRECTIONS: readonly Vec3[] = [
  [0.0, 0.55, 0.83],
  [0.45, 0.6, 0.66],
  [-0.5, 0.55, 0.67],
  [0.3, 0.9, 0.3],
  [-0.25, 0.92, 0.1],
];

export function focusGemsPart(): PartDefinition {
  const centre: Vec3 = [0, 0.17, -0.06];
  const radii: Vec3 = [0.3, 0.35, 0.38];
  const gems: Sdf[] = GEM_DIRECTIONS.map(([dx, dy, dz], i) => {
    const l = Math.hypot(dx, dy, dz);
    const p: Vec3 = [
      centre[0] + (dx / l) * radii[0],
      centre[1] + (dy / l) * radii[1],
      centre[2] + (dz / l) * radii[2],
    ];
    return octahedron(p, 0.045 + 0.012 * (i % 3));
  });
  return {
    id: 'focus-gems',
    layer: 'organs',
    look: { wash: 'arcaneGarnet', glow: 0.6, section: { pattern: 'glow' } },
    field: union(...gems),
    bounds: { min: [-0.4, 0.15, -0.3], max: [0.4, 0.62, 0.42] },
    cellSize: 0.008,
  };
}

function box(c: Vec3, r: number) {
  return {
    min: [c[0] - r, c[1] - r, c[2] - r] as Vec3,
    max: [c[0] + r, c[1] + r, c[2] + r] as Vec3,
  };
}
