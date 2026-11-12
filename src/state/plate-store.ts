/**
 * Shared state for the plate. Components subscribe to what they render; per-frame
 * code reads `usePlateStore.getState()` instead, so animation never re-renders React.
 */
import { create } from 'zustand';

import {
  isPresetActive,
  LAYER_PRESETS,
  SEE_THROUGH_DEFAULT,
  type LayerModes,
  type LayerPreset,
  layerModes,
  type LayersOn,
} from '../config/layers.ts';
import { FX_DEFAULT, type FxId, type FxModes } from '../config/fx.ts';
import { DEFAULT_LOOK, type LookId } from '../config/looks.ts';
import { SLICE, SLICE_AXES, type SliceAxis } from '../config/slice.ts';
import type { Layer } from '../procedural/format/specimen-format.ts';

interface SliceState {
  readonly axis: SliceAxis;
  /** Current plane offset (animated toward `targetOffset`). */
  readonly offset: number;
  readonly targetOffset: number;
  /** Travel range for the current axis: [fully cut, parked outside]. */
  readonly range: readonly [number, number];
}

interface PlateState {
  readonly slice: SliceState;
  /** Incremented to ask the camera rig to return to its initial view. */
  readonly viewResets: number;
  /** Resets the camera and eases the plane back to its resting cut. */
  readonly resetView: () => void;
  readonly setSliceRange: (range: readonly [number, number]) => void;
  readonly setSliceTarget: (offset: number) => void;
  /** Sets offset immediately (dragging); target follows. */
  readonly setSliceOffset: (offset: number) => void;
  readonly stepSlice: (direction: 1 | -1) => void;
  readonly cycleSliceAxis: () => void;
  readonly resetSlice: () => void;
  /** Which layers are switched on. */
  readonly layersOn: LayersOn;
  /** Whether layers that are off are drawn see-through (rather than hidden). */
  readonly seeThrough: boolean;
  /** How each layer is drawn (shown, ghost or hidden), derived from the two above. */
  readonly layers: LayerModes;
  readonly toggleLayer: (layer: Layer) => void;
  readonly toggleSeeThrough: () => void;
  readonly applyPreset: (preset: LayerPreset) => void;
  /** Applies the next preset (keyboard). */
  readonly cycleLayerPreset: () => void;
  /** The view: the default illustration or the MRI scan. */
  readonly look: LookId;
  readonly setLook: (look: LookId) => void;
  /** Post effects; only switched off in development. */
  readonly fx: FxModes;
  readonly setFx: (fx: FxModes) => void;
  readonly toggleFx: (id: FxId) => void;
}

const clampTo = (value: number, [lo, hi]: readonly [number, number]) =>
  Math.min(hi, Math.max(lo, value));

const firstPreset = LAYER_PRESETS[0];
if (!firstPreset) throw new Error('no layer presets');

/** The layer state for a choice of layers and see-through. */
const layerState = (layersOn: LayersOn, seeThrough: boolean) => ({
  layersOn,
  seeThrough,
  layers: layerModes(layersOn, seeThrough),
});

export const usePlateStore = create<PlateState>()((set, get) => ({
  viewResets: 0,

  ...layerState(firstPreset.on, SEE_THROUGH_DEFAULT),

  look: DEFAULT_LOOK,

  setLook: (look) => {
    set({ look });
  },

  fx: FX_DEFAULT,

  setFx: (fx) => {
    set({ fx });
  },

  toggleFx: (id) => {
    set(({ fx }) => ({ fx: { ...fx, [id]: !fx[id] } }));
  },

  toggleLayer: (layer) => {
    set(({ layersOn, seeThrough }) =>
      layerState({ ...layersOn, [layer]: !layersOn[layer] }, seeThrough),
    );
  },

  toggleSeeThrough: () => {
    set(({ layersOn, seeThrough }) => layerState(layersOn, !seeThrough));
  },

  applyPreset: (preset) => {
    set(({ seeThrough }) => layerState(preset.on, seeThrough));
  },

  cycleLayerPreset: () => {
    set(({ layersOn, seeThrough }) => {
      const at = LAYER_PRESETS.findIndex((p) => isPresetActive(p, layersOn));
      const next = LAYER_PRESETS[(at + 1) % LAYER_PRESETS.length];
      return next ? layerState(next.on, seeThrough) : {};
    });
  },

  resetView: () => {
    set(({ viewResets }) => ({ viewResets: viewResets + 1 }));
    get().resetSlice();
  },

  slice: {
    axis: SLICE.initialAxis,
    offset: Infinity,
    targetOffset: Infinity,
    range: [-Infinity, Infinity],
  },

  setSliceRange: (range) => {
    set(({ slice }) => ({
      slice: {
        ...slice,
        range,
        // First range: start parked just outside the specimen.
        offset: Number.isFinite(slice.offset) ? clampTo(slice.offset, range) : range[1],
        targetOffset: Number.isFinite(slice.targetOffset)
          ? clampTo(slice.targetOffset, range)
          : range[1],
      },
    }));
  },

  setSliceTarget: (offset) => {
    set(({ slice }) => ({ slice: { ...slice, targetOffset: clampTo(offset, slice.range) } }));
  },

  setSliceOffset: (offset) => {
    set(({ slice }) => {
      const value = clampTo(offset, slice.range);
      return { slice: { ...slice, offset: value, targetOffset: value } };
    });
  },

  stepSlice: (direction) => {
    set(({ slice }) => ({
      slice: {
        ...slice,
        targetOffset: clampTo(slice.targetOffset + direction * SLICE.keyboardStep, slice.range),
      },
    }));
  },

  cycleSliceAxis: () => {
    set(({ slice }) => {
      const next = SLICE_AXES[(SLICE_AXES.indexOf(slice.axis) + 1) % SLICE_AXES.length];
      if (!next) return {};
      // The new axis starts parked, then eases in to its resting cut.
      return {
        slice: {
          ...slice,
          axis: next,
          offset: Infinity,
          targetOffset: SLICE.axes[next].restingOffset,
          range: [-Infinity, Infinity],
        },
      };
    });
  },

  resetSlice: () => {
    set(({ slice }) => ({
      slice: {
        ...slice,
        targetOffset: clampTo(SLICE.axes[slice.axis].restingOffset, slice.range),
      },
    }));
  },
}));
