/**
 * Stylised organs with no counterpart in us, set into the real anatomy:
 *
 * - Lexicon Lamellae: leaves of tissue stacked like the pages of a book in the
 *   frontal lobe, where spells are kept.
 * - Ganglia arcana: beads of light strung down the front of the spinal cord.
 * - Cochlea arcana: a second, glowing spiral by each ear that hears the hum of
 *   enchantment.
 * - Cor aethericum: a chambered mana heart behind the sternum that drives the
 *   Aetherial Vessels.
 * - Radix barbae: the root plexus along the jaw from which the Mnemonic Beard grows.
 */
import { curve, segmentsField, sprout, type Segment } from '../growth/branches.ts';
import { createRandom } from '../growth/random.ts';
import { LANDMARKS as L } from '../landmarks.ts';
import { mirrorX as mirrorPoint } from '../sdf/math.ts';
import {
  displace,
  ellipsoid,
  intersect,
  mirrorX,
  roundCone,
  smoothUnion,
  sphere,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import type { PartDefinition } from './part.ts';
import { canalAt, CORD_RADIUS, levels } from './spine-path.ts';

const box = (c: Vec3, r: number) => ({
  min: [c[0] - r, c[1] - r, c[2] - r] as Vec3,
  max: [c[0] + r, c[1] + r, c[2] + r] as Vec3,
});

/** Where the Lexicon Lamellae sit, in the frontal lobe behind the brow. */
export const LEXICON_CENTRE: Vec3 = [0, 0.3, 0.1];
/** Radius of the leaves' binding, round the axis they fan from. */
export const LEXICON_BINDING = 0.083;

/** Leaves curving round a horizontal axis, fanned like the edge of a closed book. */
export function lexiconPart(): PartDefinition {
  const [, cy, cz] = LEXICON_CENTRE;
  const axisZ = cz - 0.12;
  const leaves: Sdf = (x, y, z) => {
    const r = Math.hypot(y - cy, z - axisZ);
    // Concentric shells every 1.4 cm, each about 7 mm thick.
    const k = (r - 0.08) / 0.014;
    const leaf = Math.abs(k - Math.round(k)) * 0.014 - 0.0035;
    const inStack = Math.max(r - 0.165, 0.08 - r);
    // The binding: a thicker band along the inner edge holding the leaves together.
    const binding = Math.abs(r - LEXICON_BINDING) - 0.008;
    return Math.max(
      Math.min(Math.max(leaf, inStack), binding),
      Math.abs(x) - 0.07,
      Math.abs(y - cy) - 0.055,
      axisZ + 0.05 - z,
    );
  };
  return {
    id: 'lexicon',
    layer: 'organs',
    look: { wash: 'washOchre', glow: 0.25, section: { pattern: 'strands' } },
    field: leaves,
    bounds: box(LEXICON_CENTRE, 0.12),
    cellSize: 0.003,
  };
}

/** Centres of the Ganglia arcana: one at each vertebral level, on the front of the cord. */
export const GANGLIA_CENTRES: readonly Vec3[] = levels().map((l) => {
  const [, y, z] = canalAt(l.canal[1]);
  return [0, y, z + 0.008 + CORD_RADIUS * 0.75];
});

export function gangliaPart(): PartDefinition {
  const beads = GANGLIA_CENTRES.map((c) => sphere(c, 0.022));
  return {
    id: 'ganglia',
    layer: 'arcane',
    look: { wash: 'arcaneMana', glow: 0.9, section: { pattern: 'glow' } },
    field: union(...beads),
    bounds: { min: [-0.04, L.bustBase[1] - 0.02, -0.3], max: [0.04, -0.15, 0.0] },
    cellSize: 0.004,
  };
}

/** Where each Cochlea arcana coils, inside the temporal bone in front of the ear. */
export const COCHLEA_CENTRE: Vec3 = [0.31, -0.01, 0.0];

/** A tapering spiral of two and a half turns, rising as it winds in. */
export function cochleaPart(): PartDefinition {
  const [cx, cy, cz] = COCHLEA_CENTRE;
  const points: Vec3[] = [];
  const turns = 2.5;
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const r = 0.038 * (1 - 0.75 * t);
    // The spiral lies in a plane facing out of the head (x), coiling in y and z.
    points.push([cx + t * 0.025, cy + Math.sin(angle) * r, cz + Math.cos(angle) * r]);
  }
  const segments: Segment[] = points.slice(0, -1).map((a, i) => ({
    a,
    b: points[i + 1] ?? a,
    ra: 0.01 * (1 - 0.5 * (i / steps)),
    rb: 0.01 * (1 - 0.5 * ((i + 1) / steps)),
  }));
  return {
    id: 'cochlea',
    layer: 'arcane',
    look: { wash: 'arcaneMana', glow: 0.6, section: { pattern: 'glow' } },
    field: mirrorX(segmentsField(segments, 0.006, 0.04)),
    bounds: {
      min: [-cx - 0.07, cy - 0.07, cz - 0.07],
      max: [cx + 0.07, cy + 0.07, cz + 0.07],
    },
    cellSize: 0.003,
    intendedHoles: 2, // the turns touch where the spiral tightens
  };
}

/** Where the mana heart lies, behind the sternum, straddling the midline. */
export const HEART_TOP: Vec3 = [0.02, -1.33, 0.13];

/**
 * The Cor aethericum: four rounded chambers and a pointed apex, ribbed with
 * crystal facets, its outflow rising to join the vessels at the neck.
 */
export function heartPart(): PartDefinition {
  const [hx, hy, hz] = HEART_TOP;
  const chambers = smoothUnion(
    0.025,
    ellipsoid([hx - 0.035, hy - 0.05, hz], [0.05, 0.055, 0.045]),
    ellipsoid([hx + 0.04, hy - 0.06, hz - 0.005], [0.048, 0.058, 0.043]),
    ellipsoid([hx - 0.02, hy - 0.11, hz + 0.01], [0.045, 0.05, 0.042]),
    ellipsoid([hx + 0.035, hy - 0.115, hz + 0.008], [0.043, 0.05, 0.04]),
    roundCone([hx + 0.01, hy - 0.14, hz + 0.01], [hx + 0.05, hy - 0.22, hz + 0.02], 0.04, 0.008),
    roundCone([hx, hy - 0.03, hz - 0.005], [hx - 0.01, hy + 0.04, hz - 0.03], 0.02, 0.016),
  );
  // Facets: shallow ridges across the chambers, like a cut stone.
  const facets: Sdf = (x, y, z) =>
    -Math.abs(Math.sin((x * 1.3 + y) * 55) * Math.sin((z - y * 0.5) * 48)) * 0.004;
  return {
    id: 'heart',
    layer: 'arcane',
    look: { wash: 'arcaneGarnet', glow: 0.55, section: { pattern: 'glow' } },
    field: intersect(displace(chambers, facets), (_x, y) => L.bustBase[1] + 0.01 - y),
    bounds: {
      min: [hx - 0.12, L.bustBase[1] - 0.02, hz - 0.1],
      max: [hx + 0.14, hy + 0.08, hz + 0.1],
    },
    cellSize: 0.005,
  };
}

/**
 * The Radix barbae: a root plexus along the inside of the jaw, with rootlets
 * reaching down to the skin of the chin and cheeks where the beard grows.
 */
export function beardRootsPart(): PartDefinition {
  const random = createRandom(211);
  // In the flesh between the jaw and the skin (measured: about 2 cm at the chin).
  const chin: Vec3 = [0, -0.43, 0.433];
  const jaw: Vec3 = [0.26, -0.36, 0.3];
  const bend: Vec3 = [0.16, -0.435, 0.39];
  const trunks = [
    ...curve(chin, bend, jaw, 0.017, 0.007, 10),
    ...curve(mirrorPoint(chin), mirrorPoint(bend), mirrorPoint(jaw), 0.017, 0.007, 10),
  ];
  const rootlets = sprout(random, trunks, {
    count: 46,
    length: 0.05,
    radiusScale: 0.6,
    steps: 3,
    lean: 0.2,
    bias: [0, -0.3, 0.5],
    depth: 1,
  });
  return {
    id: 'beard-roots',
    layer: 'organs',
    look: { wash: 'washOchre', glow: 0.2, section: { pattern: 'strands' } },
    field: segmentsField([...trunks, ...rootlets], 0.005, 0.05),
    bounds: { min: [-0.36, -0.58, -0.02], max: [0.36, -0.26, 0.5] },
    cellSize: 0.003,
  };
}
