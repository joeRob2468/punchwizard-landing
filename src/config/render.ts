/**
 * Tunables for the plate's rendering. Colours live in palette.ts.
 */
export const RENDER = {
  /** Key light in view space (x right, y up, z toward the viewer): upper left. */
  lightDirection: [-0.8, 0.55, 0.3] as const,
  /** Outline width in pixels, before per-stroke jitter. */
  outlineWidth: 2.1,
  /** 0–1: how dark outlines are drawn. */
  outlineStrength: 0.9,
  /** 0–1: lines between different parts (including tissues on a cut face). */
  partEdgeStrength: 0.75,
  /** How quickly a part's flare follows its label being hovered (per second). */
  flareRate: 10,
} as const;
