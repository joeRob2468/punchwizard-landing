/**
 * Drives the sectioning plane: keeps the travel range in step with the axis,
 * eases the offset toward its target, runs the one-time intro, and writes the
 * shared clip plane each frame. Also binds the slice keys, the scroll wheel
 * (scrolling down pushes the cut deeper; Ctrl/⌘ + wheel is left to the camera) and
 * two-finger touch drags.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

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

  // Intro: once the specimen has appeared (and inked in), wait, then slide slowly
  // from parked to the resting cut. Anything the visitor does first wins.
  const intro = useRef<{ from: number; to: number; start: number } | null>(null);
  const ready = usePlateStore((state) => state.specimenReady);
  const introDone = useRef(false);
  useEffect(() => {
    if (!ready || introDone.current) return;
    introDone.current = true;
    const { restingOffset } = SLICE.axes[SLICE.initialAxis];
    if (reducedMotion) {
      usePlateStore.getState().setSliceOffset(restingOffset);
      return;
    }
    const parkedTarget = usePlateStore.getState().slice.targetOffset;
    const timer = window.setTimeout(() => {
      const { slice, setSliceTarget } = usePlateStore.getState();
      // The visitor has already moved the cut, or changed axis: leave it be.
      if (slice.targetOffset !== parkedTarget || slice.axis !== SLICE.initialAxis) return;
      intro.current = { from: slice.offset, to: restingOffset, start: performance.now() };
      setSliceTarget(restingOffset);
    }, SLICE.introDelay * 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [ready, reducedMotion]);

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

  // Touch: two fingers dragged up or down move the cut, like scrolling (fingers up
  // pushes it deeper). Pinching is left to the camera, which zooms.
  useEffect(() => {
    const touches = new Map<number, number>();
    let lastMidY: number | null = null;
    const midY = () => [...touches.values()].reduce((sum, y) => sum + y, 0) / touches.size;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      touches.set(event.pointerId, event.clientY);
      lastMidY = touches.size === 2 ? midY() : null;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !touches.has(event.pointerId)) return;
      touches.set(event.pointerId, event.clientY);
      if (touches.size !== 2 || lastMidY === null) return;
      const y = midY();
      const { slice, setSliceTarget } = usePlateStore.getState();
      if (Number.isFinite(slice.targetOffset)) {
        setSliceTarget(slice.targetOffset + ((y - lastMidY) / 100) * SLICE.touchStep);
      }
      lastMidY = y;
    };
    const onUp = (event: PointerEvent) => {
      touches.delete(event.pointerId);
      lastMidY = touches.size === 2 ? midY() : null;
    };

    domElement.addEventListener('pointerdown', onDown);
    domElement.addEventListener('pointermove', onMove);
    domElement.addEventListener('pointerup', onUp);
    domElement.addEventListener('pointercancel', onUp);
    return () => {
      domElement.removeEventListener('pointerdown', onDown);
      domElement.removeEventListener('pointermove', onMove);
      domElement.removeEventListener('pointerup', onUp);
      domElement.removeEventListener('pointercancel', onUp);
    };
  }, [domElement]);

  useFrame((_, delta) => {
    const { slice } = usePlateStore.getState();
    let { offset } = slice;
    if (!Number.isFinite(offset) || !Number.isFinite(slice.targetOffset)) return;
    const slide = intro.current;
    if (slide?.to === slice.targetOffset) {
      // The intro's slow slide, eased in and out.
      const t = Math.min(1, (performance.now() - slide.start) / (SLICE.introDuration * 1000));
      offset = slide.from + (slide.to - slide.from) * easeInOut(t);
      if (t >= 1) intro.current = null;
      usePlateStore.setState({ slice: { ...slice, offset } });
    } else if (offset !== slice.targetOffset) {
      intro.current = null;
      const k = reducedMotion ? 1 : 1 - Math.exp((-3 * delta) / SLICE.easeTime);
      offset += (slice.targetOffset - offset) * k;
      if (Math.abs(slice.targetOffset - offset) < 1e-4) offset = slice.targetOffset;
      usePlateStore.setState({ slice: { ...slice, offset } });
    }
    clip.setOffset(offset);
  });

  return null;
}

/** Cubic ease in and out, 0–1. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Wheel distance in pixels, whatever unit the browser reports it in. */
function wheelPixels(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}
