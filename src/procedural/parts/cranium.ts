/**
 * The cranial vault and the cavity inside it, shared by the skull (which is the
 * vault around the cavity), the brain (which fills it) and the head (which is
 * hollow there). Kept apart so those modules don't import each other.
 */
import { ellipsoid } from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';

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
export const cranialCavity: Sdf = (x, y, z) =>
  Math.max(vaultInner(x, y, z), (cranialFloor(x, z) - y) * 0.7);
