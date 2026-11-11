/**
 * Organs of the face: the Incantatory Sinus (a resonance chamber behind the nose)
 * and the Glossal Arcanum (the tongue).
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { displace, ellipsoid, rotateX, smoothUnion } from '../sdf/index.ts';
import type { PartDefinition } from './part.ts';

export function sinusPart(): PartDefinition {
  const [x, y, z] = L.sinus;
  // Slightly smaller than the chamber carved in the skull, with a lobe toward each eye.
  const chamber = smoothUnion(
    0.04,
    ellipsoid(L.sinus, [0.075, 0.065, 0.09]),
    ellipsoid([x + 0.06, y + 0.04, z - 0.02], [0.04, 0.035, 0.05]),
    ellipsoid([x - 0.06, y + 0.04, z - 0.02], [0.04, 0.035, 0.05]),
  );
  return {
    id: 'sinus',
    layer: 'organs',
    look: { wash: 'washVerdigris', section: { pattern: 'rings', centre: L.sinus } },
    field: chamber,
    bounds: { min: [x - 0.15, y - 0.12, z - 0.15], max: [x + 0.15, y + 0.15, z + 0.15] },
    cellSize: 0.008,
  };
}

export function tonguePart(): PartDefinition {
  const [x, y, z] = L.tongue;
  const body = rotateX(ellipsoid(L.tongue, [0.085, 0.04, 0.16]), -0.15, L.tongue);
  // Sigil ridges: a ripple along the tongue's length.
  const ridges = (_x: number, _y: number, pz: number) => Math.sin(pz * 70) * 0.004;
  return {
    id: 'tongue',
    layer: 'organs',
    look: { wash: 'washMuscle', section: { pattern: 'hatch' } },
    field: displace(body, ridges),
    bounds: { min: [x - 0.12, y - 0.1, z - 0.22], max: [x + 0.12, y + 0.1, z + 0.22] },
    cellSize: 0.008,
  };
}
