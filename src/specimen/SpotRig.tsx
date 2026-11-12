/**
 * Places the spotlight (materials/spot.ts) each frame. It turns with the camera
 * round the vertical axis, like a studio light: up and to the viewer's right,
 * aimed at the head, so orbiting feels like turning the specimen under it. Its
 * height stays fixed in the world, so raising or lowering the camera moves the
 * light across him. Also sets how strongly the current view uses it.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';

import { LIGHTING } from '../config/lighting.ts';
import { LOOKS } from '../config/looks.ts';
import { setDrama, type SpotUniforms } from '../rendering/materials/spot.ts';
import { usePlateStore } from '../state/plate-store.ts';

interface SpotRigProps {
  readonly spot: SpotUniforms;
}

export function SpotRig({ spot }: SpotRigProps) {
  const look = usePlateStore((state) => state.look);

  useEffect(() => {
    setDrama(spot, LOOKS[look].drama);
    spot.uSpotColour.value.set(LIGHTING.colour).multiplyScalar(LIGHTING.intensity);
    const outer = (LIGHTING.cone.outer * Math.PI) / 180;
    const inner = (LIGHTING.cone.inner * Math.PI) / 180;
    spot.uSpotCone.value.set(Math.cos(outer), Math.cos(inner));
  }, [spot, look]);

  useFrame(({ camera }) => {
    const { offset, elevation, distance, target } = LIGHTING.placement;
    const [tx, ty, tz] = target;
    // Turns with the camera round the vertical axis (no lag), but keeps its height
    // in the world, so raising or lowering the camera moves the light across him.
    const azimuth = Math.atan2(camera.position.x - tx, camera.position.z - tz) + offset;
    const flat = Math.cos(elevation) * distance;
    const x = tx + Math.sin(azimuth) * flat;
    const y = ty + Math.sin(elevation) * distance;
    const z = tz + Math.cos(azimuth) * flat;
    spot.uSpotPosition.value.set(x, y, z);
    spot.uSpotDirection.value.set(tx - x, ty - y, tz - z).normalize();
  });

  return null;
}
