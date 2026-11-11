/**
 * The skeleton: skull (with the Third Fontanelle, orbits, nasal aperture and the
 * Incantatory Sinus as a chamber), mandible, cervical spine, and the clavicles
 * carrying the Familiar's Perch.
 */
import { EYE_RADIUS, LANDMARKS as L } from '../landmarks.ts';
import {
  capsule,
  ellipsoid,
  mirrorX,
  roundBox,
  roundCone,
  roundedCylinder,
  smoothSubtract,
  smoothUnion,
  sphere,
  subtract,
  union,
} from '../sdf/index.ts';
import type { Sdf } from '../sdf/types.ts';
import type { PartDefinition } from './part.ts';
import { mirrorPoint } from './mirror.ts';

const BONE = { wash: 'washBone', section: { pattern: 'stipple' } } as const;

/** Outer surface of the cranial vault. */
const vaultOuter = ellipsoid([0, 0.16, -0.06], [0.4, 0.46, 0.48]);
/** The cranial cavity (the brain sits inside it). */
export const cranialCavity = ellipsoid([0, 0.17, -0.06], [0.35, 0.41, 0.43]);

export function skullPart(): PartDefinition {
  const face = smoothUnion(
    0.08,
    ellipsoid([0, -0.07, 0.2], [0.27, 0.2, 0.25]),
    mirrorX(ellipsoid([0.24, 0.0, 0.18], [0.09, 0.06, 0.16])), // zygomatic arches
    ellipsoid([0, -0.2, 0.22], [0.2, 0.08, 0.18]), // maxilla
  );
  const solid = smoothUnion(0.1, vaultOuter, face);

  const orbits = mirrorX(
    sphere([L.eyeLeft[0], L.eyeLeft[1], L.eyeLeft[2] - 0.02], EYE_RADIUS + 0.035),
  );
  const nasal = ellipsoid([0, -0.04, 0.44], [0.05, 0.08, 0.08]);
  const fontanelle = capsule(
    [L.fontanelle[0], 0.45, L.fontanelle[2]],
    [L.fontanelle[0], 0.8, L.fontanelle[2]],
    0.08,
  );
  const foramen = capsule(
    [L.foramen[0], 0.0, L.foramen[2]],
    [L.foramen[0], -0.4, L.foramen[2]],
    0.06,
  );
  const sinusChamber = ellipsoid(L.sinus, [0.085, 0.075, 0.1]);

  const skull = subtract(
    smoothSubtract(0.03, smoothSubtract(0.03, solid, orbits), nasal),
    union(cranialCavity, fontanelle, foramen, sinusChamber),
  );
  return {
    id: 'skull',
    layer: 'skeleton',
    look: BONE,
    field: skull,
    bounds: { min: [-0.48, -0.42, -0.6], max: [0.48, 0.68, 0.55] },
    // Fontanelle, foramen, nasal aperture and two orbits all open into one cavity.
    intendedHoles: 4,
    cellSize: 0.016,
  };
}

export function mandiblePart(): PartDefinition {
  const angle: [number, number, number] = [0.27, -0.3, 0.02];
  const condyle: [number, number, number] = [0.29, -0.08, -0.02];
  const chin: [number, number, number] = [0.07, -0.43, 0.3];
  const mandible = smoothUnion(
    0.04,
    mirrorX(roundCone(angle, chin, 0.05, 0.045)),
    mirrorX(roundCone(condyle, angle, 0.035, 0.05)),
    capsule(chin, mirrorPoint(chin), 0.05),
  );
  return {
    id: 'mandible',
    layer: 'skeleton',
    look: BONE,
    field: mandible,
    bounds: { min: [-0.4, -0.55, -0.12], max: [0.4, 0.0, 0.42] },
    cellSize: 0.012,
  };
}

export function spinePart(): PartDefinition {
  const vertebrae: Sdf[] = [];
  const [fx, , fz] = L.foramen;
  for (let y = -0.32; y > L.bustBase[1] + 0.05; y -= 0.11) {
    const z = fz + 0.04 * (y + 0.3); // gentle cervical curve
    vertebrae.push(roundedCylinder([fx, y, z], 0.065, 0.03, 0.018));
    vertebrae.push(roundCone([fx, y, z - 0.04], [fx, y - 0.03, z - 0.16], 0.03, 0.018)); // spinous process
    vertebrae.push(mirrorX(roundCone([0.04, y, z - 0.02], [0.11, y, z - 0.03], 0.022, 0.016))); // transverse
  }
  return {
    id: 'spine',
    layer: 'skeleton',
    look: BONE,
    field: union(...vertebrae),
    bounds: { min: [-0.2, L.bustBase[1] - 0.05, -0.4], max: [0.2, -0.2, 0.05] },
    cellSize: 0.013,
  };
}

/** Clavicles, and on the left one the Familiar's Perch, poking out through the robe. */
export function girdlePart(): PartDefinition {
  const sternal: [number, number, number] = [0.07, -1.02, 0.22];
  const mid: [number, number, number] = [0.36, -1.0, 0.16];
  const acromial: [number, number, number] = [0.64, -1.08, -0.02];
  const clavicles = mirrorX(
    smoothUnion(0.02, roundCone(sternal, mid, 0.04, 0.035), roundCone(mid, acromial, 0.035, 0.04)),
  );

  const [px, py, pz] = L.familiarsPerch;
  const perch = smoothUnion(
    0.04,
    roundCone([px - 0.06, -1.0, pz + 0.04], [px, py - 0.03, pz], 0.045, 0.035), // strut from the clavicle
    roundBox([px, py, pz], [0.13, 0.018, 0.08], 0.016), // the shelf
  );
  return {
    id: 'girdle',
    layer: 'skeleton',
    look: BONE,
    field: smoothUnion(0.03, clavicles, perch),
    bounds: { min: [-0.75, -1.2, -0.15], max: [0.75, -0.82, 0.32] },
    cellSize: 0.012,
  };
}
