/**
 * The cranial vault and the cavity inside it, shared by the skull (which is the
 * vault around the cavity), the brain (which fills it) and the head (which is
 * hollow there). Kept apart so those modules don't import each other.
 *
 * The crown doesn't stop at the brim: the head grows up into the hat as a horn
 * core (keratin sheath over bone, as in a real horn), and the brain grows up into
 * that. Each layer is the hat's own crown shrunk by an inset, so it follows every
 * crumple and crease and the felt keeps an even wall.
 */
import { ellipsoid, smoothUnion } from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { crownField } from './hat-shape.ts';

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const VAULT_CENTRE: Vec3 = [0, 0.165, -0.06];
export const vaultOuter = ellipsoid(VAULT_CENTRE, [0.4, 0.46, 0.48]);
const vaultInner = ellipsoid([0, 0.17, -0.06], [0.355, 0.415, 0.435]);

/**
 * Height of the cranial floor under (x, z): the anterior fossa over the orbits
 * (lower at the midline cribriform plate), the sella and the middle fossae either
 * side of it, falling down the clivus to the posterior fossa.
 */
export function cranialFloor(x: number, z: number): number {
  const ax = Math.abs(x);
  const anterior = 0.165 + 0.045 * smoothstep(0.03, 0.13, ax);
  const middle = mix(0.065, -0.035, smoothstep(0.07, 0.15, ax));
  const posterior = -0.2;
  // The clivus: the floor falls from the sella down to the front of the foramen magnum.
  const backToMiddle = smoothstep(-0.11, 0.02, z);
  const middleToFront = smoothstep(0.13, 0.2, z);
  return mix(mix(posterior, middle, backToMiddle), anterior, middleToFront);
}

/** The cranial cavity (the brain fills it): the vault's inside above the floor. */
const baseCavity: Sdf = (x, y, z) => Math.max(vaultInner(x, y, z), (cranialFloor(x, z) - y) * 0.7);

/** Smooth maximum (rounded intersection). */
const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};

let crown: Sdf | undefined;
const hatCrown = (): Sdf => (crown ??= crownField());

/** Insets from the hat's outer crown (felt, then scalp, bone and cavity) and tops. */
export const HORN = {
  skin: { inset: 0.065, top: 1.3 },
  bone: { inset: 0.095, top: 1.27 },
  cavity: { inset: 0.135, top: 1.22 },
} as const;

/**
 * The horn core at one layer: the crown shrunk by `inset`, from just above the
 * vault up to `top`, its tip rounded. Only evaluated above the brim's height.
 */
export function hornCore({ inset, top }: { inset: number; top: number }): Sdf {
  const c = hatCrown();
  return (x, y, z) => {
    if (y < 0.25) return 0.3 - y;
    return smax(smax(c(x, y, z) + inset, y - top, 0.08), 0.3 - y, 0.05);
  };
}

/** The cranial cavity: the vault's inside above the floor, rising into the horn core. */
export const cranialCavity: Sdf = smoothUnion(0.06, baseCavity, hornCore(HORN.cavity));

/**
 * The tip of the horn core's cavity, where the Third Fontanelle opens into the
 * hat: a little below the cavity's top (found by sampling, since the crown is
 * crumpled).
 */
let tip: Vec3 | undefined;
export function hornTip(): Vec3 {
  return (tip ??= findHornTip());
}

function findHornTip(): Vec3 {
  // On the midline, so the fontanelle and the lattice through it show in a
  // midline section; the deepest point of the cavity there.
  const y = HORN.cavity.top - 0.07;
  let best: Vec3 = [0, y, 0];
  let bestD = Infinity;
  for (let z = -0.45; z <= 0.15; z += 0.005) {
    const d = cranialCavity(0, y, z);
    if (d < bestD) {
      bestD = d;
      best = [0, y, z];
    }
  }
  return best;
}
