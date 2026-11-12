/**
 * The brain and what is lodged in it, after a midline MRI: the cerebrum filling
 * the cranial cavity above the tentorium, split by the longitudinal fissure and
 * bridged by the corpus callosum, with the lateral ventricles under it; the
 * brainstem (midbrain, pons, medulla) running down the clivus to the foramen
 * magnum; the cerebellum in the posterior fossa; and the spinal cord continuing
 * down the canal. Lodged in it: the Aetheric Core at its centre (where the third
 * ventricle would be), the Ethereal Gland just behind (the pineal's place), and
 * Focus Gems in the cortex.
 */
import { segmentsField } from '../growth/branches.ts';
import { between, createRandom } from '../growth/random.ts';
import { LANDMARKS as L } from '../landmarks.ts';
import { add, cross, dot, normalise, scale, sub } from '../sdf/math.ts';
import {
  capsule,
  displace,
  ellipsoid,
  fbm,
  intersect,
  mirrorX,
  octahedron,
  offset,
  rotateX,
  rotateZ,
  roundCone,
  smoothUnion,
  sphere,
  subtract,
  torus,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import type { PartDefinition } from './part.ts';
import { cranialCavity } from './cranium.ts';
import { CANAL_RADIUS, canalAt, canalField, CORD_RADIUS, FORAMEN_MAGNUM } from './spine-path.ts';

const SEED = 71;

/** Height of the tentorium (the dural sheet over the cerebellum) at depth z. */
const tentorium = (z: number) => -0.04 + 0.12 * Math.max(0, z + 0.12);

/** Space below the tentorium at the back of the head: the posterior fossa. */
const belowTentorium: Sdf = (_x, y, z) => Math.max(y - tentorium(z), z + 0.1);

/** The brainstem: midbrain under the cerebrum, the pons bulging forward, the medulla. */
function brainstem(): Sdf {
  return smoothUnion(
    0.03,
    roundCone([0, 0.06, -0.08], [0, -0.03, -0.07], 0.05, 0.045), // midbrain
    ellipsoid([0, -0.06, -0.055], [0.055, 0.048, 0.05]), // pons
    roundCone([0, -0.09, -0.085], FORAMEN_MAGNUM, 0.036, CORD_RADIUS + 0.004), // medulla
  );
}

/** The corpus callosum: a broad arch of white matter from genu to splenium. */
function callosumField(): Sdf {
  const arch: Vec3[] = [
    [0, 0.085, 0.15],
    [0, 0.16, 0.12],
    [0, 0.215, 0.03],
    [0, 0.225, -0.08],
    [0, 0.19, -0.19],
    [0, 0.12, -0.235],
  ];
  const radii = [0.022, 0.024, 0.015, 0.015, 0.02, 0.028];
  const segments = arch.slice(0, -1).map((a, i) => ({
    a,
    b: arch[i + 1] ?? a,
    ra: radii[i] ?? 0.015,
    rb: radii[i + 1] ?? 0.015,
  }));
  const sheet = segmentsField(segments, 0.02);
  // Broad side to side: sample x compressed so the arch spreads into a sheet.
  return (x, y, z) => Math.max(sheet(x * 0.2, y, z), Math.abs(x) - 0.13);
}

/** The lateral ventricles: a C-shaped cavity in each hemisphere, under the callosum. */
const ventricles: Sdf = mirrorX(
  segmentsField(
    [
      { a: [0.028, 0.1, 0.12], b: [0.032, 0.16, 0.05], ra: 0.016, rb: 0.02 }, // frontal horn
      { a: [0.032, 0.16, 0.05], b: [0.035, 0.17, -0.1], ra: 0.02, rb: 0.018 }, // body
      { a: [0.035, 0.17, -0.1], b: [0.06, 0.1, -0.2], ra: 0.018, rb: 0.024 }, // atrium
      { a: [0.06, 0.1, -0.2], b: [0.12, -0.0, -0.08], ra: 0.022, rb: 0.014 }, // temporal horn
    ],
    0.015,
  ),
);

export function brainPart(): PartDefinition {
  const space = offset(cranialCavity, -0.012); // room for the meninges
  const cerebrum = intersect(space, (x, y, z) => -belowTentorium(x, y, z) + 0.008);
  // The longitudinal fissure: between the hemispheres, down to the callosum in the
  // middle and right down in front of the genu and behind the splenium.
  // Only near the surface: a cut on the midline should show the inner face of the
  // hemisphere, not the gap.
  const fissure: Sdf = (x, y, z) => {
    const floor = z > 0.17 || z < -0.25 ? -1 : 0.245;
    return Math.max(Math.abs(x) - 0.006, floor - y, -cerebrum(x, y, z) - 0.03);
  };
  // Folds pressed into the cortex; shallower than the gap to the skull.
  const gyri = (x: number, y: number, z: number) =>
    -Math.abs(fbm(SEED, x * 11, y * 11, z * 11)) * 0.028;
  const cortex = displace(subtract(cerebrum, fissure), gyri);

  const cerebellum = displace(
    intersect(
      ellipsoid([0, -0.1, -0.29], [0.24, 0.1, 0.15]),
      offset(cranialCavity, -0.01),
      (x, y, z) => belowTentorium(x, y, z) + 0.008,
    ),
    // Fine parallel folia.
    (x, y, z) =>
      -Math.abs(Math.sin((y * 1.0 - z * 0.4) * 140 + fbm(SEED + 2, x * 8, y * 8, z * 8) * 2)) *
      0.006,
  );
  const brain = subtract(
    smoothUnion(0.02, cortex, callosumField(), brainstem(), cerebellum),
    union(ventricles, ellipsoid([0, -0.06, -0.11], [0.02, 0.03, 0.025])), // + fourth ventricle
  );
  return {
    id: 'brain',
    layer: 'organs',
    look: { wash: 'washBrain', section: { pattern: 'gyri' } },
    field: brain,
    bounds: { min: [-0.37, -0.25, -0.5], max: [0.37, 1.3, 0.4] },
    cellSize: 0.009,
  };
}

/** The corpus callosum, white matter drawn in its own wash so it reads in section. */
export function callosumPart(): PartDefinition {
  return {
    id: 'callosum',
    layer: 'organs',
    look: { wash: 'washBone', section: { pattern: 'strands' } },
    field: callosumField(),
    bounds: { min: [-0.16, 0.04, -0.29], max: [0.16, 0.27, 0.2] },
    cellSize: 0.006,
  };
}

/**
 * The meninges and the fluid under them: everything in the cranial cavity and the
 * vertebral canal that the brain, cord and vessels don't fill, bright as in an MRI.
 */
export function meningesPart(): PartDefinition {
  return {
    id: 'meninges',
    // With the bones it lines, so it goes see-through with them and doesn't
    // wrap the brain in an opaque shell when only the viscera are shown.
    layer: 'skeleton',
    look: { wash: 'washCsf', section: { pattern: 'hatch' } },
    field: intersect(
      union(offset(cranialCavity, -0.002), canalField(CANAL_RADIUS - 0.002)),
      (_x, y) => L.bustBase[1] - y,
    ),
    bounds: { min: [-0.37, L.bustBase[1] - 0.02, -0.52], max: [0.37, 1.3, 0.42] },
    cellSize: 0.009,
  };
}

/** The spinal cord: continues the medulla down the vertebral canal. */
export function spinalCordPart(): PartDefinition {
  const points: Vec3[] = [FORAMEN_MAGNUM];
  for (let y = FORAMEN_MAGNUM[1] - 0.06; y > L.bustBase[1]; y -= 0.06) points.push(canalAt(y));
  points.push(canalAt(L.bustBase[1] - 0.05));
  const cord = union(
    ...points.slice(0, -1).map((a, i) => capsule(a, points[i + 1] ?? a, CORD_RADIUS)),
  );
  // Lies toward the front of the canal, as in the MRI.
  const shifted: Sdf = (x, y, z) => cord(x, y, z - 0.008);
  return {
    id: 'spinal-cord',
    layer: 'organs',
    look: { wash: 'washBrain', section: { pattern: 'strands' } },
    field: intersect(shifted, (_x, y) => L.bustBase[1] - y),
    bounds: { min: [-0.05, L.bustBase[1] - 0.02, -0.3], max: [0.05, -0.1, -0.05] },
    cellSize: 0.006,
  };
}

/**
 * The Ethereal Gland, where the pineal would be: a small pine cone of a gland,
 * pointing back and up, its surface in overlapping scales.
 */
export function etherealGlandPart(): PartDefinition {
  const c = L.etherealGland;
  const cone = rotateX(ellipsoid(c, [0.032, 0.05, 0.034]), -0.7, c);
  const scales: Sdf = (x, y, z) => {
    const angle = Math.atan2(x - c[0], z - c[2]);
    return -Math.abs(Math.sin(angle * 5 + (y - c[1]) * 70) * Math.sin((y - c[1]) * 90)) * 0.005;
  };
  return {
    id: 'ethereal-gland',
    layer: 'organs',
    look: { wash: 'arcaneGold', glow: 1, section: { pattern: 'glow' } },
    field: displace(cone, scales),
    bounds: box(c, 0.09),
    cellSize: 0.004,
  };
}

/**
 * The Aetheric Core: a faceted nucleus of crystallised mana in an armillary of
 * two crossed rings, like a small orrery at the centre of the brain.
 */
export function aethericCorePart(): PartDefinition {
  const c = L.aethericCore;
  // A rhombic-ish crystal: an octahedron with its points ground off by a sphere.
  const crystal = intersect(octahedron(c, 0.085), sphere(c, 0.06));
  const ring = torus(c, 0.085, 0.006);
  const rings = union(rotateX(ring, 0.6, c), rotateZ(rotateX(ring, -0.6, c), 1.1, c));
  return {
    id: 'aetheric-core',
    layer: 'arcane',
    look: { wash: 'arcaneViolet', glow: 1, section: { pattern: 'glow' } },
    field: union(crystal, rings),
    bounds: box(c, 0.11),
    cellSize: 0.004,
    intendedHoles: 3, // the two rings, linked through each other
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

/** Centres of the Focus Gems. */
export function focusGemCentres(): Vec3[] {
  const centre: Vec3 = [0, 0.17, -0.06];
  const radii: Vec3 = [0.3, 0.35, 0.38];
  return GEM_DIRECTIONS.map(([dx, dy, dz]) => {
    const l = Math.hypot(dx, dy, dz);
    return [
      centre[0] + (dx / l) * radii[0],
      centre[1] + (dy / l) * radii[1],
      centre[2] + (dz / l) * radii[2],
    ];
  });
}

/** A double-pointed crystal (a stretched octahedron) along `dir`, centred on `c`. */
function crystal(c: Vec3, dir: Vec3, length: number, width: number): Sdf {
  const w = normalise(dir);
  const u = normalise(cross(Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], w));
  const v = cross(w, u);
  return (x, y, z) => {
    const d: Vec3 = [x - c[0], y - c[1], z - c[2]];
    const a = Math.abs(dot(d, u)) / width;
    const b = Math.abs(dot(d, v)) / width;
    const h = Math.abs(dot(d, w)) / length;
    return (a + b + h - 1) * Math.min(width, length) * 0.5;
  };
}

/**
 * The Focus Gems: a cluster of cut crystals at each site, each pointing out from
 * the brain's centre, of uneven sizes, one for each discipline mastered.
 */
export function focusGemsPart(): PartDefinition {
  const random = createRandom(53);
  const gems: Sdf[] = [];
  focusGemCentres().forEach((c, i) => {
    const out = normalise(sub(c, [0, 0.17, -0.06]));
    const count = 2 + (i % 2);
    for (let k = 0; k < count; k++) {
      const tilt: Vec3 = [
        between(random, -0.5, 0.5),
        between(random, -0.5, 0.5),
        between(random, -0.5, 0.5),
      ];
      const dir = normalise(add(out, tilt));
      const size = k === 0 ? between(random, 0.06, 0.075) : between(random, 0.028, 0.042);
      const offsetBy = k === 0 ? 0 : 0.03;
      const at = add(c, scale(normalise(cross(dir, [0.3, 1, 0.2])), offsetBy * (k % 2 ? 1 : -1)));
      gems.push(crystal(at, dir, size, size * 0.5));
    }
  });
  return {
    id: 'focus-gems',
    layer: 'organs',
    look: { wash: 'arcaneSapphire', glow: 1, section: { pattern: 'glow' } },
    field: union(...gems),
    bounds: { min: [-0.42, 0.1, -0.35], max: [0.42, 0.68, 0.46] },
    cellSize: 0.004,
  };
}

function box(c: Vec3, r: number) {
  return {
    min: [c[0] - r, c[1] - r, c[2] - r] as Vec3,
    max: [c[0] + r, c[1] + r, c[2] + r] as Vec3,
  };
}
