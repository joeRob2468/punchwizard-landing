/**
 * The mouth and throat, after the midline MRI: the tongue filling the floor of
 * the mouth (its back curving down into the oropharynx), the soft palate hanging
 * from the hard palate with the uvula, the hyoid bone, the larynx (epiglottis,
 * thyroid and cricoid cartilages, vocal folds) and the C-shaped rings of the
 * trachea, and the oesophagus between the trachea and the spine. The air spaces
 * themselves are in airways.ts.
 */
import { segmentsField, type Segment } from '../growth/branches.ts';
import { LANDMARKS as L } from '../landmarks.ts';
import { lerp } from '../sdf/math.ts';
import {
  displace,
  ellipsoid,
  intersect,
  mirrorX,
  roundCone,
  smoothUnion,
  subtract,
  torus,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { AIRWAY_PATH, PALATE_TOP } from './airways.ts';
import type { PartDefinition } from './part.ts';

const CARTILAGE = { wash: 'washCartilage', section: { pattern: 'hatch' } } as const;

/** Airway centre and radius at height y (linear along AIRWAY_PATH). */
function airwayAt(y: number): { p: Vec3; r: number } {
  for (let i = 0; i < AIRWAY_PATH.length - 1; i++) {
    const a = AIRWAY_PATH[i];
    const b = AIRWAY_PATH[i + 1];
    if (!a || !b) continue;
    if (y <= a.p[1] && y >= b.p[1]) {
      const t = (y - a.p[1]) / (b.p[1] - a.p[1]);
      return { p: lerp(a.p, b.p, t), r: a.r + (b.r - a.r) * t };
    }
  }
  const last = AIRWAY_PATH[AIRWAY_PATH.length - 1];
  return { p: last?.p ?? [0, y, 0], r: last?.r ?? 0.02 };
}

/** Samples a field flattened side to side (x scaled), for sheet-like shapes. */
const wide =
  (field: Sdf, factor: number): Sdf =>
  (x, y, z) =>
    field(x * factor, y, z) / Math.max(1, factor);

/**
 * The Glossal Arcanum: the tongue as a curved body filling the mouth under the
 * palate, its root turning down into the throat, with sigil ridges along it.
 */
export function tonguePart(): PartDefinition {
  const body = smoothUnion(
    0.05,
    ellipsoid([0, -0.26, 0.34], [0.08, 0.035, 0.08]), // blade, behind the lower incisors
    ellipsoid([0, -0.275, 0.24], [0.095, 0.075, 0.14]), // dorsum, a dome up under the palate
    ellipsoid([0, -0.34, 0.155], [0.075, 0.075, 0.05]), // root, turning down to the hyoid
  );
  const ridges: Sdf = (_x, y, z) => (y > -0.27 ? Math.sin(z * 70) * 0.004 : 0);
  return {
    id: 'tongue',
    layer: 'organs',
    look: { wash: 'washMuscle', section: { pattern: 'hatch' } },
    field: displace(body, ridges),
    bounds: { min: [-0.13, -0.44, 0.06], max: [0.13, -0.17, 0.46] },
    cellSize: 0.007,
  };
}

/** The soft palate and uvula, hanging back and down from the hard palate. */
export function softPalatePart(): PartDefinition {
  const sheet = smoothUnion(
    0.02,
    roundCone([0, PALATE_TOP - 0.02, 0.19], [0, -0.215, 0.13], 0.018, 0.014),
    roundCone([0, -0.215, 0.13], [0, -0.26, 0.112], 0.014, 0.009), // uvula
  );
  // Broad side to side except the uvula, which stays narrow.
  const palate: Sdf = (x, y, z) => (y > -0.22 ? wide(sheet, 0.3)(x, y, z) : sheet(x, y, z));
  return {
    id: 'soft-palate',
    layer: 'organs',
    look: { wash: 'washBrain', section: { pattern: 'hatch' } },
    field: palate,
    bounds: { min: [-0.09, -0.29, 0.08], max: [0.09, -0.15, 0.22] },
    cellSize: 0.005,
  };
}

/** The hyoid: a U of bone under the tongue, open toward the back. */
export function hyoidPart(): PartDefinition {
  const y = -0.46;
  const hyoid = smoothUnion(
    0.012,
    roundCone([0.0, y, 0.15], [0.04, y, 0.145], 0.012, 0.011),
    roundCone([0.04, y, 0.145], [0.085, y + 0.015, 0.075], 0.011, 0.007),
  );
  return {
    id: 'hyoid',
    layer: 'skeleton',
    look: { wash: 'washBone', section: { pattern: 'stipple' } },
    field: mirrorX(hyoid),
    bounds: { min: [-0.11, y - 0.04, 0.05], max: [0.11, y + 0.05, 0.18] },
    cellSize: 0.004,
  };
}

/**
 * The larynx and trachea in cartilage: the epiglottis rising behind the tongue,
 * the thyroid cartilage (two plates meeting in front), the cricoid ring, the
 * vocal folds narrowing the airway, and C-shaped tracheal rings open at the back.
 */
export function larynxPart(): PartDefinition {
  const epiglottis = wide(roundCone([0, -0.46, 0.108], [0, -0.37, 0.088], 0.006, 0.01), 0.4);

  // Thyroid: two thin plates meeting at an angle in front (the Adam's apple).
  const thyroid: Sdf = (x, y, z) =>
    Math.max(
      Math.abs(z - (0.14 - 0.95 * Math.abs(x))) * 0.72 - 0.006,
      // A rounded shield in outline, with the notch at the top in the middle.
      (Math.hypot(x / 0.068, (y + 0.552) / 0.052) - 1) * 0.05,
      y + 0.5 + 0.012 * (1 - Math.min(1, Math.abs(x) / 0.02)),
    );

  const cricoidAt = airwayAt(-0.64);
  const cricoid = torus(cricoidAt.p, cricoidAt.r + 0.012, 0.009);

  // Vocal folds: shelves along each side wall, leaving the slit of the glottis.
  const folds = mirrorX(roundCone([0.017, -0.555, 0.065], [0.013, -0.555, 0.105], 0.009, 0.007));

  // Tracheal rings, open at the back where the oesophagus presses against them.
  const rings: Sdf[] = [];
  for (let y = -0.69; y > L.bustBase[1] + 0.02; y -= 0.035) {
    const { p, r } = airwayAt(y);
    rings.push(torus(p, r + 0.009, 0.0065));
  }
  const openBack: Sdf = (x, y, z) => {
    const { p } = airwayAt(y);
    return Math.max(p[2] - 0.006 - z, Math.abs(x) - 0.018);
  };
  const trachea = subtract(union(...rings), openBack);

  return {
    id: 'larynx',
    layer: 'organs',
    look: CARTILAGE,
    field: union(epiglottis, thyroid, cricoid, folds, trachea),
    bounds: { min: [-0.1, L.bustBase[1] - 0.02, -0.06], max: [0.1, -0.34, 0.17] },
    cellSize: 0.004,
  };
}

/** The oesophagus: a flattened muscular tube between the trachea and the spine. */
export function oesophagusPart(): PartDefinition {
  const path: Vec3[] = [
    [0, -0.6, 0.048],
    [0, -0.75, 0.05],
    [0, -0.9, 0.032],
    [0, -1.1, 0.002],
    [0, L.bustBase[1] - 0.04, -0.04],
  ];
  const segments: Segment[] = path.slice(0, -1).map((a, i) => ({
    a,
    b: path[i + 1] ?? a,
    ra: 0.015,
    rb: 0.015,
  }));
  const tube = segmentsField(segments, 0.01, 0.06);
  // Wider than deep, with a slit of a lumen down the middle.
  const flat: Sdf = (x, y, z) => tube(x * 0.65, y, z);
  const lumen: Sdf = (x, y, z) => tube(x * 0.65, y, z) + 0.011;
  return {
    id: 'oesophagus',
    layer: 'organs',
    look: { wash: 'washMuscle', section: { pattern: 'hatch' } },
    field: intersect(subtract(flat, lumen), (_x, y) => L.bustBase[1] - y),
    bounds: { min: [-0.05, L.bustBase[1] - 0.02, -0.08], max: [0.05, -0.56, 0.09] },
    cellSize: 0.004,
  };
}
