/**
 * Tunables for the post effects every view gets (rendering/effects/PlateEffects).
 */
export const FX = {
  /** Arcane parts glow past white and bloom into a soft halo. */
  bloom: { emission: 2.4, intensity: 1.7, threshold: 0.95, smoothing: 0.3 },
  /** Camera lens: vignette, grain and slight chromatic aberration. */
  lens: { vignette: 0.55, grain: 0.06, aberration: 0.0012 },
} as const;
