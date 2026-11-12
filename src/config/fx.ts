/**
 * Post effects on top of either view. Both are on; the development style panel
 * (`ui/StylePanel`) can switch them off to compare.
 */
export const FX = {
  /** Arcane parts glow past white and bloom into a soft halo. */
  bloom: { label: 'Bloom', emission: 3.2, intensity: 2.6, threshold: 0.95, smoothing: 0.3 },
  /** Camera lens: vignette, grain and slight chromatic aberration. */
  lens: { label: 'Lens', vignette: 0.55, grain: 0.06, aberration: 0.0012 },
} as const;

export type FxId = keyof typeof FX;
export const FX_IDS = Object.keys(FX) as readonly FxId[];
export type FxModes = Readonly<Record<FxId, boolean>>;
export const FX_DEFAULT: FxModes = { bloom: true, lens: true };

export function isFxId(value: unknown): value is FxId {
  return typeof value === 'string' && value in FX;
}
