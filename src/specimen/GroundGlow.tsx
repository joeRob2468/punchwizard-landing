/**
 * Light on the ground where the bust stands in the rune circle, in the circle's
 * colour: with the seam on the body itself (shaders/lib/seam.glsl) he seems to
 * rise up through it, the rest of him below. The footprint is the outer layer's
 * meshes sliced just above their base, turned into a distance field
 * (footprint.ts) once at load; the shader intersects it with the kept side of the
 * sectioning plane each frame, so the light wraps whatever is there (cut face
 * included), and draws a wavering edge with a soft glow outward. Hidden with the
 * outer layer.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  AddEquation,
  Color,
  CustomBlending,
  DataTexture,
  DoubleSide,
  LinearFilter,
  OneFactor,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector4,
  ZeroFactor,
} from 'three';

import { FX } from '../config/fx.ts';
import { LOOKS } from '../config/looks.ts';
import fragment from '../rendering/shaders/ground-glow.frag.glsl?raw';
import vertex from '../rendering/shaders/ground-glow.vert.glsl?raw';
import noise from '../rendering/shaders/lib/noise.glsl?raw';
import seamChunk from '../rendering/shaders/lib/seam.glsl?raw';
import type { SeamUniforms } from '../rendering/materials/seam.ts';
import { GROUND_Y } from '../scene/ground.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import { usePlateStore } from '../state/plate-store.ts';
import { footprintDistance, type GroundGrid } from './footprint.ts';
import { sliceAtHeight } from './ground-slice.ts';
import type { LoadedPart } from './load-specimen.ts';

/** The ground around the base the field covers (x and z alike). */
const GRID: GroundGrid = { size: 256, min: -1.9, max: 1.9 };
/** Distances outside this range (ground units) are clamped in the texture. */
const DISTANCE_RANGE = [-0.3, 1.5] as const;
/** Sliced this far above the outer layer's lowest point, where the body is whole. */
const SLICE_ABOVE_BASE = 0.006;
/** The light fades out by the rune circle's rim (radius, ground units). */
const FADE_RADIUS = 1.8;

interface GroundGlowProps {
  readonly parts: readonly LoadedPart[];
  /** The body seam's shared uniforms (its clock drives both). */
  readonly seam: SeamUniforms;
}

export function GroundGlow({ parts, seam }: GroundGlowProps) {
  const { plane } = useClipPlane();
  const look = usePlateStore((state) => state.look);
  const layers = usePlateStore((state) => state.layers);

  const texture = useMemo(() => {
    // The outer layer's real base (manifest bounds are padded).
    const outer = parts.filter(({ entry }) => entry.layer === 'integument');
    const sliceY = lowestPoint(outer) + SLICE_ABOVE_BASE;
    const segments: number[] = [];
    for (const { geometry } of outer) {
      const index = geometry.index;
      if (!index) continue;
      for (const v of sliceAtHeight(geometry.attributes.position?.array ?? [], index.array, sliceY))
        segments.push(v);
    }
    const field = footprintDistance(segments, GRID);
    const [lo, hi] = DISTANCE_RANGE;
    const bytes = new Uint8Array(field.length);
    for (let i = 0; i < field.length; i++) {
      bytes[i] = Math.round(Math.min(1, Math.max(0, ((field[i] ?? hi) - lo) / (hi - lo))) * 255);
    }
    const data = new DataTexture(bytes, GRID.size, GRID.size, RedFormat, UnsignedByteType);
    data.magFilter = LinearFilter;
    data.minFilter = LinearFilter;
    data.needsUpdate = true;
    return data;
  }, [parts]);

  const { geometry, material } = useMemo(() => {
    const extent = GRID.max - GRID.min;
    return {
      geometry: new PlaneGeometry(extent, extent),
      material: new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: `${noise}\n${seamChunk}\n${fragment}`,
        uniforms: {
          uDistance: { value: texture },
          uDistanceRange: { value: new Vector2(...DISTANCE_RANGE) },
          uGridRange: { value: new Vector2(GRID.min, GRID.max) },
          uCut: { value: new Vector4() },
          uColour: { value: new Color() },
          // The seam's, shared: one clock and one undulation for both lights.
          ...seam,
          uSpread: { value: FX.groundGlow.spread },
          uFadeRadius: { value: FADE_RADIUS },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: OneFactor,
        blendDst: OneFactor,
        // Keep the part ids the outline effect reads from alpha.
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneFactor,
      }),
    };
  }, [texture, seam]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
    [geometry, material, texture],
  );

  const colour = useMemo(() => new Color(LOOKS[look].palette.arcaneMana), [look]);
  useFrame(() => {
    const u = material.uniforms;
    (u.uCut?.value as Vector4).set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    (u.uColour?.value as Color).copy(colour).multiplyScalar(FX.groundGlow.strength);
  });

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[(GRID.min + GRID.max) / 2, GROUND_Y + 0.004, (GRID.min + GRID.max) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
      visible={layers.integument !== 'hidden'}
    />
  );
}

/** The lowest vertex height among these parts. */
function lowestPoint(parts: readonly LoadedPart[]): number {
  let lowest = Infinity;
  for (const { geometry } of parts) {
    const positions = geometry.attributes.position?.array ?? [];
    for (let i = 1; i < positions.length; i += 3)
      lowest = Math.min(lowest, positions[i] ?? Infinity);
  }
  return lowest;
}
