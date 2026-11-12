/**
 * Optional effects explored on top of a look, toggled in development with the
 * style panel (`ui/StylePanel`). All start off; any that are kept become part of
 * the shipped look.
 */
export const FX = {
  /** Arcane parts glow past white and bloom into a soft halo. */
  bloom: { label: 'Bloom', emission: 1.8, intensity: 2.2, threshold: 0.95, smoothing: 0.3 },
  /** Depth haze behind the focus, plus slow wisps of mist rising from below. */
  haze: { label: 'Haze', depth: 0.55, wisps: 0.4, range: [0.15, 1.3] as const },
  /** Shallow depth of field focused on the face, like a macro photograph. */
  focus: {
    label: 'Focus',
    target: [0, -0.05, 0.35] as const,
    worldFocusRange: 1.1,
    bokehScale: 2.5,
  },
  /** Smooth lighting with highlights, rim and warm translucency instead of glazes and hatching. */
  lit: { label: 'Lit' },
  /** Camera lens: vignette, grain and slight chromatic aberration. */
  lens: { label: 'Lens', vignette: 0.55, grain: 0.35, aberration: 0.0012 },
} as const;

export type FxId = keyof typeof FX;
export const FX_IDS = Object.keys(FX) as readonly FxId[];
export type FxModes = Readonly<Record<FxId, boolean>>;
export const FX_OFF: FxModes = { bloom: false, haze: false, focus: false, lit: false, lens: false };

export function isFxId(value: unknown): value is FxId {
  return typeof value === 'string' && value in FX;
}
