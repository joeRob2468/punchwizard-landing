/**
 * Wraps a part that follows the pointer: a group at the eye's centre that takes
 * the gaze rig's rotation each frame, with the part offset back so it turns in place.
 */
import { useFrame } from '@react-three/fiber';
import { type ReactNode, useMemo, useRef } from 'react';
import type { Group } from 'three';

import type { Vec3 } from '../procedural/sdf/types.ts';
import type { GazeRig } from './gaze.ts';

interface GazePivotProps {
  readonly gaze: GazeRig;
  readonly pivot: Vec3;
  readonly children: ReactNode;
}

export function GazePivot({ gaze, pivot, children }: GazePivotProps) {
  const group = useRef<Group>(null);
  const key = useMemo(() => gaze.add(pivot), [gaze, pivot]);
  const back = useMemo(() => [-pivot[0], -pivot[1], -pivot[2]] as const, [pivot]);

  useFrame(() => {
    const rotation = gaze.rotation(key);
    group.current?.quaternion.copy(rotation);
  });

  return (
    <group ref={group} position={pivot}>
      <group position={back}>{children}</group>
    </group>
  );
}
