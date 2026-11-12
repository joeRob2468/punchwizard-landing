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
  groundGlow: { strength: 1.0, spread: 0.3 },
  /** The ink-in once the specimen is ready: seconds for the front to sweep over it. */
  reveal: { seconds: 1.8, reducedMotionSeconds: 0.4 },
  /**
   * The colour grade (rendering/shaders/grade.frag.glsl): split-tone tints for
   * shadows and highlights, halation's colour, and how much S-curve contrast. How
   * strongly a view uses the split-toning and halation is set per view (looks.ts).
   */
  grade: {
    shadowTint: [0.82, 0.95, 1.2],
    /** A touch of blue added in the deepest darks, so they read cool, not grey. */
    shadowLift: [0.0, 0.002, 0.008],
    highlightTint: [1.07, 1.0, 0.9],
    halationTint: [1.0, 0.36, 0.14],
    halation: 0.9,
    contrast: 0.3,
    /** Film grain strength. */
    grain: 0.09,
    /** Extra gain on the brightest tones, before the shoulder. */
    highlightGain: 0.18,
  },
  /** Camera lens: vignette and slight chromatic aberration (grain is in the grade). */
  lens: { vignette: 0.55, aberration: 0.0012 },
} as const;
