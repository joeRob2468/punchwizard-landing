/**
 * Light on the ground where the bust stands in the rune circle, following the
 * outline of his body there (the outer layer's meshes sliced at the ground) and
 * spreading a little past it, in the circle's colour: with the seam on the body
 * itself (shaders/lib/seam.glsl) he seems to rise up through the circle, the rest
 * of him below. It fades out just past the sectioning plane, so the cut-away half
 * leaves no outline, and hides with the outer layer.
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
  Vector4,
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
/** How far past the cut (ground units) the light fades out on the cut-away side. */
const CUT_FADE = 0.3;
/** The light fades out by the rune circle's rim (radius, ground units). */
const FADE_RADIUS = 1.8;
/** Sliced this far above the outer layer's lowest point, where the body is whole. */
const SLICE_ABOVE_BASE = 0.006;

interface GroundGlowProps {
  readonly parts: readonly LoadedPart[];
}

export function GroundGlow({ parts }: GroundGlowProps) {
  const { plane } = useClipPlane();
  // The sectioning plane (normal, constant), kept current each frame.
  const cut = useMemo(() => ({ value: new Vector4() }), []);
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
      // The outer layer's real base (manifest bounds are padded).
      const outer = parts.filter(({ entry }) => entry.layer === 'integument');
      const sliceY = lowestPoint(outer) + SLICE_ABOVE_BASE;
      ctx.beginPath();
      for (const { geometry } of outer) {
        const index = geometry.index;
        if (!index) continue;
        const s = sliceAtHeight(geometry.attributes.position?.array ?? [], index.array, sliceY);
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
      // Thin lines with doubling blurs, so the falloff is smooth, not banded.
      for (const [line, blur, alpha] of [
        [3, 140, 0.3],
        [3, 80, 0.35],
        [3, 44, 0.4],
        [3, 22, 0.5],
        [3, 10, 0.7],
        [2, 4, 1],
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
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      // Keep the part ids the outline effect reads from alpha.
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
    });
    // Rather than clipped hard by the sectioning plane (a straight edge across the
    // faint wash), the light fades out over CUT_FADE on the cut-away side.
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uCut = cut;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGroundWorld;')
        .replace(
          '#include <project_vertex>',
          '#include <project_vertex>\nvGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nuniform vec4 uCut;\nvarying vec3 vGroundWorld;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `outgoingLight *= smoothstep(${(-CUT_FADE).toFixed(3)}, 0.02, dot(uCut.xyz, vGroundWorld) + uCut.w);\n#include <opaque_fragment>`,
        );
    };
    return { geometry: new PlaneGeometry(width, depth), material };
  }, [parts, cut]);

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
    cut.value.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
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

/** Canvas x for ground x (left to right). */
function px(x: number): number {
  return (x - EXTENT.minX) * PIXELS_PER_UNIT;
}

/** Canvas y for ground z: the plane is laid flat, so its top edge is at -z. */
function pz(z: number): number {
  return (z - EXTENT.minZ) * PIXELS_PER_UNIT;
}
