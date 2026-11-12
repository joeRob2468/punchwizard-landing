/**
 * Specimen layers the viewer can switch on and off, the see-through switch for the
 * layers that are off, and the presets the layer controls offer. Layer ids match
 * the manifest's.
 *
 * The renderer draws each layer shown, ghost (see-through) or hidden; `layerModes`
 * derives that from which layers are on and whether see-through is on.
 */
import { LAYERS, type Layer } from '../procedural/format/specimen-format.ts';

export type LayerMode = 'shown' | 'ghost' | 'hidden';
export type LayerModes = Readonly<Record<Layer, LayerMode>>;
export type LayersOn = Readonly<Record<Layer, boolean>>;

/** The layers offered in the controls, outside in, with their plate labels. */
export const VIEWABLE_LAYERS: readonly { readonly id: Layer; readonly label: string }[] = [
  { id: 'integument', label: 'Integumentum' },
  { id: 'skeleton', label: 'Sceleton' },
  { id: 'organs', label: 'Viscera' },
  { id: 'arcane', label: 'Arcana' },
];

/** A preset switches layers on and off; see-through is left as it is. */
export interface LayerPreset {
  readonly label: string;
  readonly on: LayersOn;
}

export const LAYER_PRESETS: readonly LayerPreset[] = [
  {
    label: 'Omnia',
    on: { integument: true, musculature: true, skeleton: true, organs: true, arcane: true },
  },
  {
    label: 'Ossa',
    on: { integument: false, musculature: false, skeleton: true, organs: false, arcane: false },
  },
  {
    label: 'Viscera',
    on: { integument: false, musculature: false, skeleton: false, organs: true, arcane: true },
  },
  {
    label: 'Arcana',
    on: { integument: false, musculature: false, skeleton: false, organs: false, arcane: true },
  },
];

/** Whether see-through starts on (layers that are off show as a faint outline). */
export const SEE_THROUGH_DEFAULT = true;

/** How each layer is drawn: on layers solid; off layers see-through or hidden. */
export function layerModes(on: LayersOn, seeThrough: boolean): LayerModes {
  const mode = (layer: Layer): LayerMode => {
    if (on[layer]) return 'shown';
    return seeThrough ? 'ghost' : 'hidden';
  };
  return Object.fromEntries(LAYERS.map((layer) => [layer, mode(layer)])) as Record<
    Layer,
    LayerMode
  >;
}

/** Whether the layers that have controls are switched as in a preset. */
export function isPresetActive(preset: LayerPreset, on: LayersOn): boolean {
  return VIEWABLE_LAYERS.every(({ id }) => preset.on[id] === on[id]);
}

/** Opacity of a ghosted layer's wash. */
export const GHOST_OPACITY = 0.18;
