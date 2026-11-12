/**
 * The hat (Pileus arcanus): a wide, floppy brim with a rolled edge and a tall,
 * crumpled cone whose tip bends over, with a band and a gem buckle at its base.
 * Lore says it is a horn grown from the crown, so it is modelled solid.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { bezier } from '../sdf/math.ts';
import {
  displace,
  fbm,
  halfSpace,
  intersect,
  octahedron,
  roundBox,
  roundCone,
  roundedCylinder,
  smoothUnion,
  subtract,
  torus,
  warp,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { framesBounds, inFrame, surfaceFrame, type SurfaceFrame } from './frame.ts';
import type { PartDefinition } from './part.ts';

const SEED = 23;
const [BX, BY, BZ] = L.brimCentre;

/** Where the band sits on the cone, as heights above the brim centre. */
const BAND_LOW = 0.035;
const BAND_HIGH = 0.17;

/** Points along the hat's spine, base to tip, with the cone's radius at each. */
export function hatSpine(): { points: Vec3[]; radii: number[] } {
  const points: Vec3[] = [];
  const base: Vec3 = [BX, BY + 0.02, BZ - 0.02];
  const shoulder: Vec3 = [0.12, 1.65, -0.2];
  for (let i = 0; i <= 6; i++) points.push(bezier(base, [0.0, 1.15, -0.1], shoulder, i / 6));
  for (let i = 1; i <= 3; i++) points.push(bezier(shoulder, [0.38, 2.1, -0.25], L.hatTip, i / 3));
  const radii = points.map((_, i) => 0.47 * (1 - i / (points.length - 1)) ** 1.25 + 0.035);
  return { points, radii };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The cone: tapering segments along the spine, knocked sideways a little at
 * each height (crumpled felt) and pressed with slanting creases above the band.
 */
function crownField(): Sdf {
  const { points: spine, radii } = hatSpine();
  const segments: Sdf[] = [];
  for (let i = 0; i < spine.length - 1; i++) {
    const a = spine[i];
    const b = spine[i + 1];
    const ra = radii[i];
    const rb = radii[i + 1];
    if (a && b && ra !== undefined && rb !== undefined) segments.push(roundCone(a, b, ra, rb));
  }
  const cone = smoothUnion(0.04, ...segments);

  const crumpled = warp(cone, (_x, y, _z) => {
    const h = Math.max(0, y - BY - BAND_HIGH);
    return [fbm(SEED + 2, 0, y * 2.6, 0) * 0.16 * h, 0, fbm(SEED + 3, 0, y * 2.6, 5) * 0.12 * h];
  });

  const creases: Sdf = (x, y, z) => {
    const h = y - BY;
    const mask = smoothstep(BAND_HIGH + 0.02, BAND_HIGH + 0.12, h) * (1 - smoothstep(1.3, 1.6, h));
    if (mask <= 0) return 0;
    const angle = Math.atan2(x - BX, z - BZ);
    // Folds slant around the cone and fade in and out, like a hat that's been sat on.
    const phase =
      h * 9 + Math.sin(angle * 2 + h * 2) * 1.2 + fbm(SEED + 4, x * 3, y * 3, z * 3) * 3;
    const groove = Math.abs(Math.sin(phase)) ** 5;
    const fade = 0.55 + 0.45 * Math.sin(angle * 3 + h * 4);
    return groove * fade * 0.04 * mask;
  };
  return displace(crumpled, creases);
}

/**
 * The brim: a wide disc that droops unevenly in lobes, with a rolled edge. It
 * droops less over the face so the eyes stay visible at eye level.
 */
function brimField(): Sdf {
  const disc = roundedCylinder(L.brimCentre, 1.04, 0.0, 0.032);
  const lip = torus(L.brimCentre, 1.03, 0.034);
  return warp(smoothUnion(0.03, disc, lip), (x, _y, z) => {
    const dx = x - BX;
    const dz = z - BZ;
    const r2 = dx * dx + dz * dz;
    const angle = Math.atan2(dx, dz);
    const lobes = 0.05 * Math.sin(angle * 3 + 0.7) + 0.03 * Math.sin(angle * 5 + 2.1);
    const front = -0.05 * Math.max(0, Math.cos(angle)) ** 2;
    const ripple = fbm(SEED, x * 2.2, 0, z * 2.2) * 0.08 * r2;
    return [0, (0.11 + lobes + front) * r2 + ripple, 0];
  });
}

/** The hat as a field (also used to keep the conduit lattice inside it). */
export function hatField(): Sdf {
  const hat = smoothUnion(0.1, brimField(), crownField());
  // The cone's rounded base would bulge down into the head; stop it under the brim.
  const intoHead: Sdf = (x, y, z) => Math.max(y - (BY - 0.06), Math.hypot(x - BX, z - BZ) - 0.6);
  return subtract(
    displace(hat, (x, y, z) => fbm(SEED + 1, x * 4, y * 4, z * 4) * 0.015),
    intoHead,
  );
}

export function hatPart(): PartDefinition {
  return {
    id: 'hat',
    layer: 'integument',
    look: { wash: 'washVein', section: { pattern: 'rings', centre: L.brimCentre } },
    field: hatField(),
    bounds: { min: [-1.25, -0.25, -1.25], max: [1.25, 2.15, 1.2] },
    cellSize: 0.018,
  };
}

/** A band of cloth around the base of the cone, just proud of its surface. */
export function hatBandPart(): PartDefinition {
  const crown = crownField();
  const ring: Sdf = (x, y, z) => {
    const c = crown(x, y, z);
    return Math.max(c - 0.022, -c - 0.008);
  };
  const band = intersect(
    ring,
    halfSpace([0, BY + BAND_HIGH, 0], [0, 1, 0]),
    halfSpace([0, BY + BAND_LOW, 0], [0, -1, 0]),
  );
  return {
    id: 'hat-band',
    layer: 'integument',
    look: { wash: 'washUmber', section: { pattern: 'hatch' } },
    field: band,
    bounds: { min: [-0.62, BY - 0.05, -0.65], max: [0.62, BY + BAND_HIGH + 0.05, 0.6] },
    cellSize: 0.007,
    intendedHoles: 1, // the ring itself
  };
}

/** The front of the band, a little off-centre, where the buckle sits. */
const buckleFrame = (): SurfaceFrame =>
  surfaceFrame(crownField(), [0.12, BY + (BAND_LOW + BAND_HIGH) / 2, BZ + 0.6], 0.022);

/** A square metal buckle frame over the band. */
export function hatBucklePart(): PartDefinition {
  const frame = subtract(
    roundBox([0, 0, 0.004], [0.095, 0.085, 0.016], 0.01),
    roundBox([0, 0, 0.004], [0.06, 0.052, 0.05], 0.008),
  );
  return {
    id: 'hat-buckle',
    layer: 'integument',
    look: { wash: 'washOchre', section: { pattern: 'stipple' } },
    field: inFrame(frame, buckleFrame()),
    bounds: framesBounds([buckleFrame()], 0.13),
    cellSize: 0.004,
    intendedHoles: 1, // the frame's opening
  };
}

/** A cut gem set in the buckle: an octahedron with its top sliced into a table. */
export function hatGemPart(): PartDefinition {
  const gem = intersect(
    octahedron([0, 0, 0.0], 0.062),
    halfSpace([0, 0, 0.038], [0, 0, 1]),
    halfSpace([0, 0, -0.012], [0, 0, -1]),
  );
  return {
    id: 'hat-gem',
    layer: 'integument',
    look: { wash: 'arcaneMana', glow: 0.55, section: { pattern: 'glow' } },
    field: inFrame(gem, buckleFrame()),
    bounds: framesBounds([buckleFrame()], 0.1),
    cellSize: 0.003,
  };
}
