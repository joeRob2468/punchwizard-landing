/**
 * The spotlight for the Tabula view (specimen/SpotRig, shaders/lib/spot.glsl):
 * where it sits, how it moves, its cone and colour. How strongly a view uses it is
 * `Look.drama`.
 */
import type { SpotPath } from '../specimen/spot-path.ts';

export const LIGHTING = {
  path: {
    // Up and to the viewer's left, aimed at the head.
    offset: -1.25,
    elevation: 0.85,
    distance: 5.2,
    target: [0, 0.55, 0],
    drift: { azimuth: 0.18, elevation: 0.08, speed: 0.12 },
  } satisfies SpotPath,
  /** Seconds for the spot to catch up with the camera's turn. */
  followSeconds: 2.5,
  /** Degrees: full light inside `inner`, none outside `outer`. */
  cone: { inner: 12, outer: 27 },
  colour: '#ffeedd',
  intensity: 4.5,
} as const;
