/**
 * Specimen layers the viewer can switch on and off, the one see-through switch,
 * and the presets the layer controls offer. Layer ids match the manifest's.
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

export interface LayerPreset {
  readonly label: string;
  readonly on: LayersOn;
  readonly seeThrough: boolean;
}

export const LAYER_PRESETS: readonly LayerPreset[] = [
  {
    label: 'Omnia',
    on: { integument: true, musculature: true, skeleton: true, organs: true, arcane: true },
    seeThrough: false,
  },
  {
    label: 'Ossa',
    on: { integument: true, musculature: false, skeleton: true, organs: false, arcane: false },
    seeThrough: true,
  },
  {
    label: 'Viscera',
    on: { integument: true, musculature: false, skeleton: true, organs: true, arcane: true },
    seeThrough: true,
  },
  {
    // The arcane organs alone, inside a see-through outline of the head and body.
    label: 'Arcana',
    on: { integument: true, musculature: false, skeleton: false, organs: false, arcane: true },
    seeThrough: true,
  },
];

/**
 * How each layer is drawn. Off layers are hidden. With see-through on, whatever
 * covers the deepest layer that's on is drawn see-through: the arcana are never
 * see-through (they glow), and the deepest other layer stays solid unless the
 * arcana are on and it isn't the organs they sit in.
 */
export function layerModes(on: LayersOn, seeThrough: boolean): LayerModes {
  const ordinary = LAYERS.filter((layer) => layer !== 'arcane' && on[layer]);
  const deepest = ordinary[ordinary.length - 1];
  const solid = new Set<Layer>(['arcane']);
  if (deepest && (!on.arcane || deepest === 'organs')) solid.add(deepest);
  const mode = (layer: Layer): LayerMode => {
    if (!on[layer]) return 'hidden';
    return !seeThrough || solid.has(layer) ? 'shown' : 'ghost';
  };
  return Object.fromEntries(LAYERS.map((layer) => [layer, mode(layer)])) as Record<
    Layer,
    LayerMode
  >;
}

/** Whether a choice of layers (those with controls) and see-through is a preset's. */
export function isPresetActive(preset: LayerPreset, on: LayersOn, seeThrough: boolean): boolean {
  return (
    preset.seeThrough === seeThrough && VIEWABLE_LAYERS.every(({ id }) => preset.on[id] === on[id])
  );
}

/** Opacity of a ghosted layer's wash. */
export const GHOST_OPACITY = 0.18;
