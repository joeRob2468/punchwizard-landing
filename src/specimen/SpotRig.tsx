/**
 * Moves the spotlight (materials/spot.ts) each frame: it follows the camera's
 * turn about the head lazily, keeping up and to the viewer's left, so shadows
 * slide across the specimen as it's turned, and drifts slowly on its own (not with
 * reduced motion). Sets how strongly the current view uses it.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

import { LIGHTING } from '../config/lighting.ts';
import { LOOKS } from '../config/looks.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import { setDrama, type SpotUniforms } from '../rendering/materials/spot.ts';
import { usePlateStore } from '../state/plate-store.ts';
import { easeAngle, spotPosition } from './spot-path.ts';

interface SpotRigProps {
  readonly spot: SpotUniforms;
}

export function SpotRig({ spot }: SpotRigProps) {
  const reducedMotion = usePrefersReducedMotion();
  const look = usePlateStore((state) => state.look);
  const azimuth = useRef<number | null>(null);

  useEffect(() => {
    setDrama(spot, LOOKS[look].drama);
    spot.uSpotColour.value.set(LIGHTING.colour).multiplyScalar(LIGHTING.intensity);
    const outer = (LIGHTING.cone.outer * Math.PI) / 180;
    const inner = (LIGHTING.cone.inner * Math.PI) / 180;
    spot.uSpotCone.value.set(Math.cos(outer), Math.cos(inner));
  }, [spot, look]);

  useFrame(({ camera, clock }, delta) => {
    const [tx, , tz] = LIGHTING.path.target;
    const cameraAzimuth = Math.atan2(camera.position.x - tx, camera.position.z - tz);
    const target = cameraAzimuth + LIGHTING.path.offset;
    const ease = 1 - Math.exp(-delta / LIGHTING.followSeconds);
    azimuth.current = azimuth.current === null ? target : easeAngle(azimuth.current, target, ease);
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    const [x, y, z] = spotPosition(LIGHTING.path, azimuth.current, t);
    const [ax, ay, az] = LIGHTING.path.target;
    spot.uSpotPosition.value.set(x, y, z);
    spot.uSpotDirection.value.set(ax - x, ay - y, az - z).normalize();
  });

  return null;
}
