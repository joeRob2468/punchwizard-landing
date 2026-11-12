/**
 * Light on the ground where the bust stands in the rune circle, following the
 * outline of his body there (the outer layer's meshes sliced at the ground) and
 * spreading a little past it, in the circle's colour: with the seam on the body
 * itself (shaders/lib/seam.glsl) he seems to rise up through the circle, the rest
 * of him below. Clipped by the sectioning plane, so the cut-away half leaves no
 * outline, and hidden with the outer layer.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AddEquation,
  CanvasTexture,
  Color,
  CustomBlending,
  DoubleSide,
  type Mesh,
  MeshBasicMaterial,
  OneFactor,
  PlaneGeometry,
  SRGBColorSpace,
  ZeroFactor,
} from 'three';

import { FX } from '../config/fx.ts';
import { LOOKS } from '../config/looks.ts';
import { GROUND_Y } from '../scene/ground.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import { usePlateStore } from '../state/plate-store.ts';
import { sliceAtHeight } from './ground-slice.ts';
import type { LoadedPart } from './load-specimen.ts';

/** Ground area covered (x, then z), around the base. */
const EXTENT = { minX: -1.9, maxX: 1.9, minZ: -1.9, maxZ: 1.9 } as const;
const PIXELS_PER_UNIT = 160;
/** The light fades out by the rune circle's rim (radius, ground units). */
const FADE_RADIUS = 1.8;
/** Sliced just above the ground, where the body is still whole. */
const SLICE_Y = GROUND_Y + 0.005;

interface GroundGlowProps {
  readonly parts: readonly LoadedPart[];
}

export function GroundGlow({ parts }: GroundGlowProps) {
  const { plane } = useClipPlane();
  const mesh = useRef<Mesh>(null);
  const look = usePlateStore((state) => state.look);
  const layers = usePlateStore((state) => state.layers);

  const { geometry, material } = useMemo(() => {
    const width = EXTENT.maxX - EXTENT.minX;
    const depth = EXTENT.maxZ - EXTENT.minZ;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * PIXELS_PER_UNIT);
    canvas.height = Math.round(depth * PIXELS_PER_UNIT);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Light is added (alpha ignored), so it's drawn as brightness on black.
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      for (const { entry, geometry } of parts) {
        if (entry.layer !== 'integument') continue;
        if (entry.bounds.min[1] > SLICE_Y || entry.bounds.max[1] < SLICE_Y) continue;
        const index = geometry.index;
        if (!index) continue;
        const s = sliceAtHeight(geometry.attributes.position?.array ?? [], index.array, SLICE_Y);
        for (let i = 0; i + 3 < s.length; i += 4) {
          ctx.moveTo(px(s[i] ?? 0), pz(s[i + 1] ?? 0));
          ctx.lineTo(px(s[i + 2] ?? 0), pz(s[i + 3] ?? 0));
        }
      }
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'round';
      ctx.shadowColor = '#fff';
      // Wide, faint washes of light spreading out across the ground, then tighter,
      // brighter ones, then the line itself at the body's edge. Blur in pixels.
      for (const [line, blur, alpha] of [
        [40, 150, 0.35],
        [20, 70, 0.45],
        [8, 24, 0.7],
        [2, 5, 1],
      ] as const) {
        ctx.globalAlpha = alpha;
        ctx.lineWidth = line;
        ctx.shadowBlur = blur;
        ctx.stroke();
      }
      // Fade out toward the circle's rim, so the light stays on the circle.
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'multiply';
      const r = FADE_RADIUS * PIXELS_PER_UNIT;
      const fade = ctx.createRadialGradient(px(0), pz(0), r * 0.35, px(0), pz(0), r);
      fade.addColorStop(0, '#fff');
      fade.addColorStop(1, '#000');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return {
      geometry: new PlaneGeometry(width, depth),
      material: new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
        clippingPlanes: [plane],
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: OneFactor,
        blendDst: OneFactor,
        // Keep the part ids the outline effect reads from alpha.
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneFactor,
      }),
    };
  }, [parts, plane]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const colour = useMemo(() => new Color(LOOKS[look].palette.arcaneMana), [look]);
  useFrame(() => {
    material.color.copy(colour).multiplyScalar(FX.groundGlow.strength);
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={[
        (EXTENT.minX + EXTENT.maxX) / 2,
        GROUND_Y + 0.004,
        (EXTENT.minZ + EXTENT.maxZ) / 2,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
      visible={layers.integument !== 'hidden'}
    />
  );
}

/** Canvas x for ground x (left to right). */
function px(x: number): number {
  return (x - EXTENT.minX) * PIXELS_PER_UNIT;
}

/** Canvas y for ground z: the plane is laid flat, so its top edge is at -z. */
function pz(z: number): number {
  return (z - EXTENT.minZ) * PIXELS_PER_UNIT;
}
