/**
 * Specimen layers the viewer can show, ghost (see-through) or hide, and the
 * presets the layer controls offer. Layer ids match the manifest's.
 */
import type { Layer } from '../procedural/format/specimen-format.ts';

export const LAYER_MODES = ['shown', 'ghost', 'hidden'] as const;
export type LayerMode = (typeof LAYER_MODES)[number];

/** The layers offered in the controls, outside in, with their plate labels. */
export const VIEWABLE_LAYERS: readonly { readonly id: Layer; readonly label: string }[] = [
  { id: 'integument', label: 'Integumentum' },
  { id: 'skeleton', label: 'Sceleton' },
  { id: 'organs', label: 'Viscera' },
  { id: 'arcane', label: 'Arcana' },
];

export type LayerModes = Readonly<Record<Layer, LayerMode>>;

export const LAYER_PRESETS: readonly { readonly label: string; readonly modes: LayerModes }[] = [
  {
    label: 'Omnia',
    modes: {
      integument: 'shown',
      musculature: 'shown',
      skeleton: 'shown',
      organs: 'shown',
      arcane: 'shown',
    },
  },
  {
    label: 'Ossa',
    modes: {
      integument: 'ghost',
      musculature: 'hidden',
      skeleton: 'shown',
      organs: 'hidden',
      arcane: 'hidden',
    },
  },
  {
    label: 'Viscera',
    modes: {
      integument: 'ghost',
      musculature: 'hidden',
      skeleton: 'ghost',
      organs: 'shown',
      arcane: 'shown',
    },
  },
  {
    // The arcane organs alone, inside a faint outline of the head and body.
    label: 'Arcana',
    modes: {
      integument: 'ghost',
      musculature: 'hidden',
      skeleton: 'hidden',
      organs: 'hidden',
      arcane: 'shown',
    },
  },
];

/** Opacity of a ghosted layer's wash. */
export const GHOST_OPACITY = 0.18;
