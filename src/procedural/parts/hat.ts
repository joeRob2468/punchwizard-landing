/**
 * The hat (Pileus arcanus): a wide, floppy brim with a rolled edge and a tall,
 * crumpled cone whose tip bends over, with a band and a gem buckle at its base.
 * Lore says it is a horn grown from the crown, so it is modelled solid.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import {
  displace,
  fbm,
  halfSpace,
  intersect,
  octahedron,
  roundBox,
  roundedCylinder,
  smoothUnion,
  subtract,
  torus,
  warp,
} from '../sdf/index.ts';
import type { Sdf } from '../sdf/types.ts';
import { framesBounds, inFrame, surfaceFrame, type SurfaceFrame } from './frame.ts';
import { headSkinField } from './head.ts';
import { BAND_HIGH, BAND_LOW, crownField } from './hat-shape.ts';
import type { PartDefinition } from './part.ts';

const SEED = 23;
const [BX, BY, BZ] = L.brimCentre;

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
  // Hollow where it sits on the head: the cone's rounded base and the brim's disc
  // would otherwise run through the head (and show in its sections).
  const intoHead: Sdf = (x, y, z) => Math.max(y - (BY + 0.06), Math.hypot(x - BX, z - BZ) - 0.42);
  return subtract(
    displace(hat, (x, y, z) => fbm(SEED + 1, x * 4, y * 4, z * 4) * 0.015),
    intoHead,
  );
}

/** A field kept outside the head's skin, which is only evaluated near its surface. */
function outsideHead(field: Sdf): Sdf {
  const head = headSkinField();
  return (x, y, z) => {
    const d = field(x, y, z);
    return d > 0.03 ? d : Math.max(d, -(head(x, y, z) - 0.004));
  };
}

export function hatPart(): PartDefinition {
  return {
    id: 'hat',
    layer: 'integument',
    look: { wash: 'washVein', section: { pattern: 'rings', centre: L.brimCentre } },
    // Where the hat sits on the head, the head is inside it, not the hat.
    field: outsideHead(hatField()),
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
