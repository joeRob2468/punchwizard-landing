/**
 * The spotlight's beam (shaders/beam.*.glsl): an open cone from the spot along
 * its axis, past the head, whose shader marches through the light scattered in
 * the air, shadows included. Follows the spot each frame; drawn only in views
 * that use it.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AddEquation,
  ConeGeometry,
  CustomBlending,
  FrontSide,
  type Mesh,
  OneFactor,
  ShaderMaterial,
  Vector3,
  ZeroFactor,
} from 'three';

import { LIGHTING } from '../config/lighting.ts';
import { LOOKS } from '../config/looks.ts';
import type { SeamUniforms } from '../rendering/materials/seam.ts';
import type { SpotUniforms } from '../rendering/materials/spot.ts';
import fragment from '../rendering/shaders/beam.frag.glsl?raw';
import vertex from '../rendering/shaders/beam.vert.glsl?raw';
import noise from '../rendering/shaders/lib/noise.glsl?raw';
import seamChunk from '../rendering/shaders/lib/seam.glsl?raw';
import spotChunk from '../rendering/shaders/lib/spot.glsl?raw';
import { usePlateStore } from '../state/plate-store.ts';

/** How far the cone reaches from the spot (world units). */
const CONE_LENGTH = 9;
const DOWN = new Vector3(0, -1, 0);

interface SpotBeamProps {
  readonly spot: SpotUniforms;
  readonly seam: SeamUniforms;
}

export function SpotBeam({ spot, seam }: SpotBeamProps) {
  const mesh = useRef<Mesh>(null);
  const look = usePlateStore((state) => state.look);

  const { geometry, material } = useMemo(() => {
    const radius = Math.tan((LIGHTING.cone.outer * Math.PI) / 180) * CONE_LENGTH;
    const cone = new ConeGeometry(radius, CONE_LENGTH, 48, 1, true);
    // Apex at the origin, opening down -y.
    cone.translate(0, -CONE_LENGTH / 2, 0);
    return {
      geometry: cone,
      material: new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: `${noise}\n${seamChunk}\n${spotChunk}\n${fragment}`,
        uniforms: {
          ...spot,
          ...seam,
          uBeamStrength: { value: LIGHTING.beam.strength },
          uBeamLength: { value: LIGHTING.beam.length },
        },
        side: FrontSide,
        transparent: true,
        depthWrite: false,
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: OneFactor,
        blendDst: OneFactor,
        // Keep the part ids the outline effect reads from alpha.
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneFactor,
      }),
    };
  }, [spot, seam]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const direction = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.position.copy(spot.uSpotPosition.value);
    direction.copy(spot.uSpotDirection.value);
    m.quaternion.setFromUnitVectors(DOWN, direction);
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={2}
      visible={LOOKS[look].drama > 0}
    />
  );
}
