/**
 * Tunables for the post effects every view gets (rendering/effects/PlateEffects).
 */
export const FX = {
  /** Arcane parts glow past white and bloom into a soft halo. */
  bloom: { emission: 2.4, intensity: 1.7, threshold: 0.95, smoothing: 0.3 },
  /**
   * The ground seam: light where the bust meets the rune circle, in its colour.
   * `width` in specimen units (how far up it fades), `strength` its brightness.
   */
  seam: { width: 0.14, strength: 1.2 },
  /** Light on the ground along the body's outline where he stands in the circle. */
  groundGlow: { strength: 1.4, spread: 0.13 },
  /** The ink-in once the specimen is ready: seconds for the front to sweep over it. */
  reveal: { seconds: 1.8, reducedMotionSeconds: 0.4 },
  /** Camera lens: vignette, grain and slight chromatic aberration. */
  lens: { vignette: 0.55, grain: 0.06, aberration: 0.0012 },
} as const;
