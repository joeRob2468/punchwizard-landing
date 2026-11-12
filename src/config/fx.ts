/**
 * Optional effects explored on top of a look, toggled in development with the
 * style panel (`ui/StylePanel`). All start off; any that are kept become part of
 * the shipped look.
 */
export const FX = {
  /** Arcane parts glow past white and bloom into a soft halo. */
  bloom: { label: 'Bloom', emission: 1.8, intensity: 2.2, threshold: 0.95, smoothing: 0.3 },
  /** Shallow depth of field focused on the face, like a macro photograph. */
  focus: {
    label: 'Focus',
    target: [0, -0.05, 0.35] as const,
    worldFocusRange: 1.1,
    bokehScale: 2.5,
  },
  /** Camera lens: vignette, grain and slight chromatic aberration. */
  lens: { label: 'Lens', vignette: 0.55, grain: 0.06, aberration: 0.0012 },
} as const;

export type FxId = keyof typeof FX;
export const FX_IDS = Object.keys(FX) as readonly FxId[];
export type FxModes = Readonly<Record<FxId, boolean>>;
export const FX_OFF: FxModes = { bloom: false, focus: false, lens: false };

export function isFxId(value: unknown): value is FxId {
  return typeof value === 'string' && value in FX;
}
