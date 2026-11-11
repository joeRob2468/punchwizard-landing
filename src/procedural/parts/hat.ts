/**
 * The hat (Pileus arcanus): a drooping brim and a tall cone whose tip bends over.
 * Lore says it is a horn grown from the crown, so it is modelled solid.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { bezier } from '../sdf/math.ts';
import { displace, fbm, roundCone, roundedCylinder, smoothUnion, warp } from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import type { PartDefinition } from './part.ts';

const SEED = 23;

/** Points along the hat's spine, base to tip, with the cone's radius at each. */
export function hatSpine(): { points: Vec3[]; radii: number[] } {
  const [bx, by, bz] = L.brimCentre;
  const points: Vec3[] = [];
  const base: Vec3 = [bx, by + 0.02, bz - 0.02];
  const shoulder: Vec3 = [0.12, 1.65, -0.2];
  for (let i = 0; i <= 6; i++) points.push(bezier(base, [0.0, 1.15, -0.1], shoulder, i / 6));
  for (let i = 1; i <= 3; i++) points.push(bezier(shoulder, [0.38, 2.1, -0.25], L.hatTip, i / 3));
  const radii = points.map((_, i) => 0.47 * (1 - i / (points.length - 1)) ** 1.25 + 0.035);
  return { points, radii };
}

/** The hat as a field (also used to keep the conduit lattice inside it). */
export function hatField(): Sdf {
  const [bx, , bz] = L.brimCentre;

  // Brim: a flat disc whose edge droops and ripples.
  const flatBrim = roundedCylinder(L.brimCentre, 1.0, 0.0, 0.045);
  const brim = warp(flatBrim, (x, _y, z) => {
    const r2 = (x - bx) ** 2 + (z - bz) ** 2;
    const ripple = fbm(SEED, x * 2.2, 0, z * 2.2) * 0.08 * r2;
    return [0, 0.11 * r2 + ripple, 0];
  });

  // Cone: tapering round-cone segments along a curved spine that bends at the tip.
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

  const hat = smoothUnion(0.12, brim, cone);
  return displace(hat, (x, y, z) => fbm(SEED + 1, x * 4, y * 4, z * 4) * 0.02);
}

export function hatPart(): PartDefinition {
  return {
    id: 'hat',
    layer: 'integument',
    look: { wash: 'washVein', section: { pattern: 'rings', centre: L.brimCentre } },
    field: hatField(),
    bounds: { min: [-1.2, -0.2, -1.2], max: [1.2, 2.15, 1.15] },
    cellSize: 0.024,
  };
}
