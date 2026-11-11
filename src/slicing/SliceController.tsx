/**
 * Drives the sectioning plane: keeps the travel range in step with the axis,
 * eases the offset toward its target, runs the one-time intro, and writes the
 * shared clip plane each frame. Also binds the slice keys and the scroll wheel
 * (scrolling down pushes the cut deeper; Ctrl/⌘ + wheel is left to the camera).
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';

import { SLICE } from '../config/slice.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import type { Bounds } from '../procedural/sdf/types.ts';
import { usePlateStore } from '../state/plate-store.ts';
import { useClipPlane } from './clip-plane.tsx';
import { offsetRange } from './plane-math.ts';

interface SliceControllerProps {
  readonly bounds: Bounds;
}

export function SliceController({ bounds }: SliceControllerProps) {
  const clip = useClipPlane();
  const domElement = useThree((state) => state.gl.domElement);
  const axis = usePlateStore((state) => state.slice.axis);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const normal = SLICE.axes[axis].normal;
    usePlateStore.getState().setSliceRange(offsetRange(bounds, normal, SLICE.parkMargin));
    clip.setNormal(normal);
  }, [axis, bounds, clip]);

  // Intro: once, slide in from parked to the resting cut.
  useEffect(() => {
    const { restingOffset } = SLICE.axes[SLICE.initialAxis];
    const store = usePlateStore.getState();
    if (reducedMotion) {
      store.setSliceOffset(restingOffset);
      return;
    }
    const timer = window.setTimeout(() => {
      usePlateStore.getState().setSliceTarget(restingOffset);
    }, SLICE.introDelay * 1000);
    return () => {
      window.clearTimeout(timer);
    };
    // Runs on mount only; reduced-motion changes later don't replay the intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey) return;
      const store = usePlateStore.getState();
      if (event.key === 's' || event.key === 'S') store.cycleSliceAxis();
      else if (event.key === '[') store.stepSlice(-1);
      else if (event.key === ']') store.stepSlice(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const { slice, setSliceTarget } = usePlateStore.getState();
      if (!Number.isFinite(slice.targetOffset)) return;
      setSliceTarget(slice.targetOffset - (wheelPixels(event) / 100) * SLICE.wheelStep);
    };
    domElement.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      domElement.removeEventListener('wheel', onWheel);
    };
  }, [domElement]);

  useFrame((_, delta) => {
    const { slice } = usePlateStore.getState();
    let { offset } = slice;
    if (!Number.isFinite(offset) || !Number.isFinite(slice.targetOffset)) return;
    if (offset !== slice.targetOffset) {
      const k = reducedMotion ? 1 : 1 - Math.exp((-3 * delta) / SLICE.easeTime);
      offset += (slice.targetOffset - offset) * k;
      if (Math.abs(slice.targetOffset - offset) < 1e-4) offset = slice.targetOffset;
      usePlateStore.setState({ slice: { ...slice, offset } });
    }
    clip.setOffset(offset);
  });

  return null;
}

/** Wheel distance in pixels, whatever unit the browser reports it in. */
function wheelPixels(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}
