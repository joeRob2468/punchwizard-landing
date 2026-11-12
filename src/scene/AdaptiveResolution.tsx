/**
 * Keeps the frame rate up on weak devices by rendering at a lower pixel ratio.
 * drei's PerformanceMonitor samples the frame rate and says when it sags (decline)
 * or has headroom (incline); each moves the pixel ratio a quarter step between
 * RESOLUTION.min and the screen's own (capped). A device that sits on the edge
 * would bounce between two steps, resizing the buffers each time, so after a few
 * reversals it stops stepping back up (it can still step down).
 */
import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useMemo, useRef } from 'react';

import { RESOLUTION } from '../config/render.ts';
import { resolutionSteps } from './resolution-steps.ts';

/** Direction changes after which the pixel ratio only goes down. */
const MAX_REVERSALS = 3;

export function AdaptiveResolution() {
  const setDpr = useThree((state) => state.setDpr);
  const steps = useMemo(
    () => resolutionSteps(Math.min(window.devicePixelRatio || 1, RESOLUTION.max), RESOLUTION.min),
    [],
  );
  const state = useRef({ level: steps.length - 1, last: 0, reversals: 0 });

  const move = useCallback(
    (direction: 1 | -1) => {
      const s = state.current;
      if (direction > 0 && s.reversals >= MAX_REVERSALS) return;
      const level = Math.min(steps.length - 1, Math.max(0, s.level + direction));
      if (level === s.level) return;
      if (s.last !== 0 && s.last !== direction) s.reversals++;
      s.last = direction;
      s.level = level;
      setDpr(steps[level] ?? 1);
    },
    [setDpr, steps],
  );
  const onIncline = useCallback(() => {
    move(1);
  }, [move]);
  const onDecline = useCallback(() => {
    move(-1);
  }, [move]);

  return <PerformanceMonitor onIncline={onIncline} onDecline={onDecline} />;
}
