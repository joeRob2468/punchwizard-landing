/**
 * Keeps the glow along the cut's edge current (materials/cut-glow.ts): when the
 * sectioning plane moves, slices the outer layer's meshes at it, turns the outline's
 * silhouette into a distance field in the plane's coordinates (exact near the
 * edge) and hands it to the cut faces.
 * Rebuilt at most every REBUILD_MS while the plane moves, and once it settles.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { DataTexture, LinearFilter, RedFormat, UnsignedByteType } from 'three';

import type { CutGlowUniforms } from '../rendering/materials/cut-glow.ts';
import { outlineDistance } from '../specimen/footprint.ts';
import { planeAxes, sliceByPlane } from '../specimen/ground-slice.ts';
import type { LoadedPart } from '../specimen/load-specimen.ts';
import { useClipPlane } from './clip-plane.tsx';

const SIZE = 256;
/** Distances outside this range (plane units) are clamped in the texture. */
const RANGE = [-0.1, 0.02] as const;
/** Within this of the edge the distance is exact (plane units). */
const EXACT_BAND = 0.045;
const MARGIN = 0.15;
const REBUILD_MS = 120;

interface CutGlowProps {
  readonly parts: readonly LoadedPart[];
  readonly uniforms: CutGlowUniforms;
}

export function CutGlow({ parts, uniforms }: CutGlowProps) {
  const { plane } = useClipPlane();
  const outer = useMemo(() => parts.filter(({ entry }) => entry.layer === 'integument'), [parts]);
  const texture = useMemo(() => {
    const data = new DataTexture(
      new Uint8Array(SIZE * SIZE),
      SIZE,
      SIZE,
      RedFormat,
      UnsignedByteType,
    );
    data.magFilter = LinearFilter;
    data.minFilter = LinearFilter;
    return data;
  }, []);
  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );

  const state = useRef({ key: '', built: '', last: 0 });
  useFrame(() => {
    const { normal, constant } = plane;
    const key = `${normal.x.toFixed(4)},${normal.y.toFixed(4)},${normal.z.toFixed(4)},${constant.toFixed(4)}`;
    const now = performance.now();
    const s = state.current;
    const moving = key !== s.key;
    s.key = key;
    // While it moves, at most every REBUILD_MS; then once more where it stops.
    if (key === s.built || (moving && now - s.last < REBUILD_MS)) return;
    s.built = key;
    s.last = now;
    rebuild(texture, uniforms, outer, [normal.x, normal.y, normal.z], constant);
  });

  return null;
}

function rebuild(
  texture: DataTexture,
  uniforms: CutGlowUniforms,
  parts: readonly LoadedPart[],
  normal: [number, number, number],
  constant: number,
): void {
  const { u, v } = planeAxes(normal);
  const segments: number[] = [];
  for (const { geometry } of parts) {
    const index = geometry.index;
    if (!index) continue;
    const positions = geometry.attributes.position?.array ?? [];
    for (const value of sliceByPlane(positions, index.array, normal, constant, u, v)) {
      segments.push(value);
    }
  }
  if (segments.length === 0) {
    uniforms.uCutGrid.value.z = 0;
    return;
  }
  let min = Infinity;
  let max = -Infinity;
  for (const value of segments) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const grid = { size: SIZE, min: min - MARGIN, max: max + MARGIN };
  const field = outlineDistance(segments, grid, EXACT_BAND);
  const bytes = texture.image.data as Uint8Array;
  const [lo, hi] = RANGE;
  for (let i = 0; i < field.length; i++) {
    bytes[i] = Math.round(Math.min(1, Math.max(0, ((field[i] ?? hi) - lo) / (hi - lo))) * 255);
  }
  texture.needsUpdate = true;
  uniforms.uCutDistance.value = texture;
  uniforms.uCutGrid.value.set(grid.min, grid.max, 1);
  uniforms.uCutRange.value.set(lo, hi, 0);
}
