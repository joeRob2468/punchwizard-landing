/**
 * The shape of the hat's cone, shared by the hat (its felt) and the head and skull
 * (which grow up inside it as a horn core): the spine it bends along, its radius
 * along that spine, and the crumpled, creased crown.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { bezier } from '../sdf/math.ts';
import { displace, fbm, roundCone, smoothUnion, warp } from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';

const SEED = 23;
const [BX, BY, BZ] = L.brimCentre;

/** Where the band sits on the cone, as heights above the brim centre. */
export const BAND_LOW = 0.035;
export const BAND_HIGH = 0.17;

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
export function crownField(): Sdf {
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
