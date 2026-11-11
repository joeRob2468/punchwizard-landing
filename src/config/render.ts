/**
 * Tunables for the ink-and-wash look. Colours live in palette.ts.
 */
export const RENDER = {
  /** Key light in view space (x right, y up, z toward the viewer): upper left. */
  lightDirection: [-0.8, 0.55, 0.3] as const,
  /** Hatch lines per object-space unit (the head is about one unit tall). */
  hatchScale: 46,
  /** Outline width in pixels, before per-stroke jitter. */
  outlineWidth: 2.1,
  /** 0–1: how dark outlines are drawn. */
  outlineStrength: 0.9,
  /** 0–1: lines between different parts (including tissues on a cut face). */
  partEdgeStrength: 0.75,
} as const;
