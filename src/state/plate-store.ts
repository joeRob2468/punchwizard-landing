/**
 * Shared state for the plate. Components subscribe to what they render; per-frame
 * code reads `usePlateStore.getState()` instead, so animation never re-renders React.
 */
import { create } from 'zustand';

import { SLICE, SLICE_AXES, type SliceAxis } from '../config/slice.ts';

interface SliceState {
  readonly axis: SliceAxis;
  /** Current plane offset (animated toward `targetOffset`). */
  readonly offset: number;
  readonly targetOffset: number;
  /** Travel range for the current axis: [fully cut, parked outside]. */
  readonly range: readonly [number, number];
  /** Pointer is over the handle or dragging it; camera controls stand down. */
  readonly handleActive: boolean;
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
  readonly setHandleActive: (active: boolean) => void;
  readonly resetSlice: () => void;
}

const clampTo = (value: number, [lo, hi]: readonly [number, number]) =>
  Math.min(hi, Math.max(lo, value));

export const usePlateStore = create<PlateState>()((set, get) => ({
  viewResets: 0,

  resetView: () => {
    set(({ viewResets }) => ({ viewResets: viewResets + 1 }));
    get().resetSlice();
  },

  slice: {
    axis: SLICE.initialAxis,
    offset: Infinity,
    targetOffset: Infinity,
    range: [-Infinity, Infinity],
    handleActive: false,
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

  setHandleActive: (active) => {
    set(({ slice }) => ({ slice: { ...slice, handleActive: active } }));
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
