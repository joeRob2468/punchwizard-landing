/**
 * Shared state for the plate. Components subscribe to what they render; per-frame
 * code reads `usePlateStore.getState()` instead, so animation never re-renders React.
 */
import { create } from 'zustand';

import { LAYER_MODES, LAYER_PRESETS, type LayerModes } from '../config/layers.ts';
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
  /** How each layer is drawn: shown, ghost (see-through) or hidden. */
  readonly layers: LayerModes;
  /** Steps one layer to its next mode. */
  readonly cycleLayer: (layer: Layer) => void;
  readonly setLayers: (modes: LayerModes) => void;
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

const firstPreset = LAYER_PRESETS[0]?.modes;
if (!firstPreset) throw new Error('no layer presets');

export const usePlateStore = create<PlateState>()((set, get) => ({
  viewResets: 0,

  layers: firstPreset,

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

  cycleLayer: (layer) => {
    set(({ layers }) => {
      const next = LAYER_MODES[(LAYER_MODES.indexOf(layers[layer]) + 1) % LAYER_MODES.length];
      return next ? { layers: { ...layers, [layer]: next } } : {};
    });
  },

  setLayers: (modes) => {
    set({ layers: modes });
  },

  cycleLayerPreset: () => {
    set(({ layers }) => {
      const at = LAYER_PRESETS.findIndex((p) =>
        Object.entries(p.modes).every(([k, v]) => layers[k as Layer] === v),
      );
      const next = LAYER_PRESETS[(at + 1) % LAYER_PRESETS.length];
      return next ? { layers: next.modes } : {};
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
