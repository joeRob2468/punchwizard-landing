/**
 * The Incantatory Sinus: a resonance chamber behind the nose, where the sphenoid
 * sinus would be, holding a rank of graded pipes like a small organ that tunes
 * the voice for incantation. The tongue (Glossal Arcanum) is in throat.ts.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { capsule, ellipsoid, roundBox, shell, union } from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import type { PartDefinition } from './part.ts';

/** The chamber's inside, also kept hollow in the head's flesh. */
export const SINUS_CHAMBER: Sdf = ellipsoid(L.sinus, [0.06, 0.042, 0.064]);

const PIPE_X = L.sinus[0] - 0.02;

/** Middles of the sinus's pipes, back to front (tallest first). */
export const SINUS_PIPES: readonly Vec3[] = [0, 1, 2, 3].map((i) => [
  PIPE_X,
  L.sinus[1] + 0.002 - i * 0.004,
  L.sinus[2] - 0.045 + i * 0.03,
]);

export function sinusPart(): PartDefinition {
  const [x, y, z] = L.sinus;
  const wall = shell(SINUS_CHAMBER, 0.007);
  // Pipes in a row front to back, tallest at the back, standing on a wind-chest,
  // just to the right of the midline.
  const pipes = SINUS_PIPES.map(([px, py, pz], i) =>
    capsule([px, py - 0.03 + i * 0.004, pz], [px, py + 0.03 - i * 0.004, pz], 0.016),
  );
  const chest = roundBox([PIPE_X, y - 0.03, z], [0.018, 0.008, 0.06], 0.006);
  return {
    id: 'sinus',
    layer: 'organs',
    look: { wash: 'arcaneEmerald', glow: 1, section: { pattern: 'glow' } },
    field: union(wall, chest, ...pipes),
    bounds: { min: [x - 0.1, y - 0.08, z - 0.1], max: [x + 0.1, y + 0.08, z + 0.1] },
    cellSize: 0.003,
  };
}
