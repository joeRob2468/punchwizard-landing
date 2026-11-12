/**
 * The air spaces of the head and neck, as one field (negative inside the air):
 * the nasal cavity on either side of the septum, scrolled by the conchae, opening
 * at the back into the pharynx, which runs down behind the tongue into the larynx
 * and trachea. Every tissue that would otherwise fill these spaces (skin, bone,
 * robe) subtracts this field, so a section shows them open.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { capsule, ellipsoid, mirrorX, roundCone, smoothUnion, union } from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Top of the hard palate (floor of the nose) and the choanae (back of the nose). */
export const PALATE_TOP = -0.155;
export const CHOANAE_Z = 0.17;
/** Smooth maximum (rounded intersection), k the rounding radius. */
const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};

/**
 * The nasal cavity before the septum and conchae: in profile a half-oval from the
 * aperture back to the choanae, tallest under the cribriform plate, on a flat
 * palate floor; narrow at the top and widening toward the floor.
 */
/**
 * The nasal cavity's outline in profile as (z, y) corners, front to back along the
 * floor and round over the roof: the long flat floor on the hard palate, the
 * near-vertical back edge at the choanae, the face of the sphenoid sloping up to
 * the narrow roof under the cribriform plate, the nasal bones sloping down to the
 * aperture in front.
 */
const NASAL_OUTLINE: readonly (readonly [z: number, y: number])[] = [
  [0.445, PALATE_TOP],
  [CHOANAE_Z, PALATE_TOP],
  [CHOANAE_Z - 0.005, -0.035],
  [0.2, 0.075],
  [0.24, 0.128],
  [0.33, 0.135],
  [0.385, 0.095],
  [0.445, 0.0],
  [0.468, -0.075],
  [0.455, -0.13],
];

/** Signed distance to a closed polygon in 2D (after Inigo Quilez). */
function polygon2d(corners: readonly (readonly [number, number])[], u: number, v: number): number {
  const first = corners[0];
  if (!first) return Infinity;
  let d = (u - first[0]) ** 2 + (v - first[1]) ** 2;
  let sign = 1;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i, i++) {
    const a = corners[i];
    const b = corners[j];
    if (!a || !b) continue;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const wx = u - a[0];
    const wy = v - a[1];
    const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, (wx - ex * t) ** 2 + (wy - ey * t) ** 2);
    const c1 = v >= a[1];
    const c2 = v < b[1];
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sign = -sign;
  }
  return sign * Math.sqrt(d);
}

/** The nasal cavity's outline in profile (y, z), negative inside, corners softened. */
const nasalProfile = (y: number, z: number) => polygon2d(NASAL_OUTLINE, z, y) + 0.004;

/** Each side of the nose: wide over the floor, narrowing to a slit under the roof. */
const nasalHalfWidth = (y: number) => 0.024 + 0.048 * smoothstep(0.13, -0.06, y);

const nasalSpace: Sdf = (x, y, z) =>
  smax(nasalProfile(y, z), Math.abs(x) - nasalHalfWidth(y), 0.012);

/** The septum: a thin midline plate filling the nasal outline, short of the choanae. */
export const septum: Sdf = (x, y, z) =>
  Math.max(Math.abs(x) - 0.005, nasalProfile(y, z) + 0.004, 0.2 - z);

/**
 * The three conchae on each lateral wall, scrolls hanging into the cavity with a
 * meatus under each: the inferior longest, along the floor; the middle and the
 * short superior higher up and further back.
 */
const scroll = (a: Vec3, b: Vec3, r: number): Sdf => {
  const tube = roundCone(a, b, r, r * 0.7);
  // Taller than wide: a curled shelf rather than a round rod.
  return (x, y, z) => tube(a[0] + (x - a[0]) * 1.6, y, z) / 1.6;
};
export const conchae: Sdf = mirrorX(
  union(
    scroll([0.064, -0.1, 0.2], [0.064, -0.098, 0.425], 0.022), // inferior
    scroll([0.06, -0.025, 0.21], [0.06, -0.02, 0.37], 0.019), // middle
    scroll([0.034, 0.05, 0.225], [0.032, 0.055, 0.305], 0.012), // superior
  ),
);

/** The frontal sinus: an air cell in the frontal bone above the root of the nose. */
const frontalSinus: Sdf = ellipsoid([0, 0.205, 0.415], [0.05, 0.028, 0.019]);

/**
 * Centre line of the pharynx and the airway below it, top to bottom, with the
 * lumen's radius: from the nasopharynx behind the choanae, down behind the soft
 * palate and tongue, through the larynx, into the trachea.
 */
export const AIRWAY_PATH: readonly { p: Vec3; r: number }[] = [
  { p: [0, -0.07, 0.12], r: 0.035 }, // nasopharynx, under the sphenoid
  { p: [0, -0.2, 0.085], r: 0.032 }, // behind the soft palate
  { p: [0, -0.34, 0.07], r: 0.03 }, // oropharynx, behind the tongue
  { p: [0, -0.48, 0.075], r: 0.026 }, // laryngopharynx / laryngeal inlet
  { p: [0, -0.6, 0.095], r: 0.022 }, // larynx
  { p: [0, -0.75, 0.09], r: 0.024 }, // trachea
  { p: [0, -1.05, 0.05], r: 0.026 },
  { p: [0, L.bustBase[1] - 0.05, 0.0], r: 0.026 },
];

/** The pharynx and trachea lumen: flattened front to back like the real airway. */
function throatLumen(): Sdf {
  const segments: Sdf[] = [];
  for (let i = 0; i < AIRWAY_PATH.length - 1; i++) {
    const a = AIRWAY_PATH[i];
    const b = AIRWAY_PATH[i + 1];
    if (!a || !b) continue;
    segments.push(roundCone(a.p, b.p, a.r, b.r));
  }
  const tube = smoothUnion(0.02, ...segments);
  // Wider side to side than front to back in the pharynx (scale x down before sampling).
  return (x, y, z) => tube(x * (y > -0.5 ? 0.6 : 0.9), y, z);
}

/** Opening from the back of the nose into the nasopharynx. */
const choanae = capsule([0, -0.08, CHOANAE_Z + 0.03], [0, -0.07, 0.11], 0.04);

/** Thickness of the mucosa lining the nose. */
const MUCOSA = 0.01;

/**
 * The air spaces as the bone carves them: a little larger than the air, since
 * mucosa lines them (the septum and conchae are added back as bone).
 */
export function boneAirway(): Sdf {
  // Every space grows by the lining, so bone walls never coincide with the head's.
  const air = union(nasalSpace, frontalSinus, choanae, throatLumen());
  return (x, y, z) => air(x, y, z) - MUCOSA;
}

/**
 * The air spaces as the head's soft tissue carves them: the true air, with the
 * mucosa wrapping the septum and conchae, so the walls seen in section are lining.
 */
export function mucosaAirway(): Sdf {
  const lined: Sdf = (x, y, z) =>
    Math.max(nasalSpace(x, y, z), -(septum(x, y, z) - MUCOSA), -(conchae(x, y, z) - MUCOSA));
  return union(lined, frontalSinus, choanae, throatLumen());
}

/**
 * The air spaces as soft tissue carves them: without the septum and conchae (bone
 * owns those) and grown by `grow`, so the tissue's walls sit just behind the bone's
 * instead of on the same surface, which would flicker. Give each tissue that
 * overlaps another a different `grow`.
 */
export function tissueAirway(grow: number): Sdf {
  const air = union(nasalSpace, choanae, throatLumen());
  return (x, y, z) => air(x, y, z) - grow;
}
