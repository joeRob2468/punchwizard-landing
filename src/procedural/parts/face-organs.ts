/**
 * The Incantatory Sinus: a resonance chamber behind the nose, where the sphenoid
 * sinus would be. The tongue (Glossal Arcanum) is in throat.ts.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { ellipsoid, smoothUnion } from '../sdf/index.ts';
import type { PartDefinition } from './part.ts';

export function sinusPart(): PartDefinition {
  const [x, y, z] = L.sinus;
  // In the sphenoid body (slightly smaller than the chamber carved in the skull),
  // with a lobe reaching forward toward each eye.
  const chamber = smoothUnion(
    0.03,
    ellipsoid(L.sinus, [0.062, 0.042, 0.066]),
    ellipsoid([x + 0.045, y + 0.02, z + 0.035], [0.025, 0.022, 0.035]),
    ellipsoid([x - 0.045, y + 0.02, z + 0.035], [0.025, 0.022, 0.035]),
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
