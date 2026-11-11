/**
 * The visible sectioning plane: a faint ink rectangle where it crosses the
 * specimen, and a knob on its top edge that can be dragged along the plane's
 * normal. Hovering the knob stands the camera controls down.
 */
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  CustomBlending,
  Float32BufferAttribute,
  type Group,
  LineBasicMaterial,
  LineLoop,
  OneFactor,
  OneMinusSrcAlphaFactor,
  SrcAlphaFactor,
  Vector3,
  ZeroFactor,
} from 'three';

import { PALETTE } from '../config/palette.ts';
import { SLICE, type SliceAxis } from '../config/slice.ts';
import type { Bounds } from '../procedural/sdf/types.ts';
import { InkWashMaterial } from '../rendering/materials/ink-wash-material.ts';
import { usePlateStore } from '../state/plate-store.ts';
import { offsetUnderRay } from './plane-math.ts';

interface SliceHandleProps {
  readonly bounds: Bounds;
}

const MARGIN = 0.12;
const KNOB_RADIUS = 0.07;

export function SliceHandle({ bounds }: SliceHandleProps) {
  const axis = usePlateStore((state) => state.slice.axis);
  const group = useRef<Group>(null);
  const dragging = useRef(false);

  const { outline, knobPosition, axisIndex } = useMemo(
    () => rectangleFor(axis, bounds),
    [axis, bounds],
  );
  const lineMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: PALETTE.ink,
        transparent: true,
        opacity: 0.35,
        // Keep out of depth and alpha (part ids) so the outline effect ignores the lines.
        depthWrite: false,
        blending: CustomBlending,
        blendSrc: SrcAlphaFactor,
        blendDst: OneMinusSrcAlphaFactor,
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneFactor,
      }),
    [],
  );
  const loop = useMemo(() => new LineLoop(outline, lineMaterial), [outline, lineMaterial]);
  const knobMaterial = useMemo(() => new InkWashMaterial({ wash: PALETTE.arcaneGarnet }), []);

  useEffect(
    () => () => {
      outline.dispose();
    },
    [outline],
  );
  useEffect(
    () => () => {
      lineMaterial.dispose();
      knobMaterial.dispose();
    },
    [lineMaterial, knobMaterial],
  );

  // The rectangle is built at offset 0; slide the group along the axis.
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { offset } = usePlateStore.getState().slice;
    const visible = Number.isFinite(offset);
    g.visible = visible;
    if (visible) g.position.setComponent(axisIndex, offset);
    for (let i = 0; i < 3; i++) if (i !== axisIndex) g.position.setComponent(i, 0);
  });

  const scratchOrigin = useMemo(() => new Vector3(), []);
  const scratchNormal = useMemo(() => new Vector3(), []);

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    dragging.current = true;
    (event.target as Element).setPointerCapture(event.pointerId);
    usePlateStore.getState().setHandleActive(true);
  };
  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    scratchOrigin.set(...knobPosition);
    scratchNormal.set(...SLICE.axes[axis].normal);
    const offset = offsetUnderRay(event.ray, scratchOrigin, scratchNormal);
    if (offset !== null) usePlateStore.getState().setSliceOffset(offset);
  };
  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    dragging.current = false;
    (event.target as Element).releasePointerCapture(event.pointerId);
    usePlateStore.getState().setHandleActive(false);
    document.body.style.cursor = '';
  };

  return (
    <group ref={group} name="slice-handle">
      <primitive object={loop} />
      <mesh
        position={knobPosition}
        material={knobMaterial}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'grab';
          usePlateStore.getState().setHandleActive(true);
        }}
        onPointerOut={() => {
          if (dragging.current) return;
          document.body.style.cursor = '';
          usePlateStore.getState().setHandleActive(false);
        }}
      >
        <sphereGeometry args={[KNOB_RADIUS, 24, 16]} />
      </mesh>
    </group>
  );
}

/**
 * Rectangle (at plane offset 0) spanning the specimen's bounds in the two axes
 * the plane lies in, plus the knob position on its top edge.
 */
function rectangleFor(
  axis: SliceAxis,
  bounds: Bounds,
): { outline: BufferGeometry; knobPosition: [number, number, number]; axisIndex: number } {
  const normal = SLICE.axes[axis].normal;
  const axisIndex = normal.findIndex((c) => c !== 0);
  const [u, v] = [0, 1, 2].filter((i) => i !== axisIndex) as [number, number];
  const lo = (i: number) => (bounds.min[i] ?? 0) - MARGIN;
  const hi = (i: number) => (bounds.max[i] ?? 0) + MARGIN;

  const corner = (a: number, b: number): [number, number, number] => {
    const p: [number, number, number] = [0, 0, 0];
    p[u] = a;
    p[v] = b;
    return p;
  };
  const corners = [
    corner(lo(u), lo(v)),
    corner(hi(u), lo(v)),
    corner(hi(u), hi(v)),
    corner(lo(u), hi(v)),
  ];
  const outline = new BufferGeometry();
  outline.setAttribute('position', new Float32BufferAttribute(corners.flat(), 3));

  // Knob on the "top" edge: max y where the plane is vertical, front edge (max z) otherwise.
  const up = v === 1 || u === 1 ? 1 : 2;
  const across = up === u ? v : u;
  const knob: [number, number, number] = [0, 0, 0];
  knob[up] = hi(up);
  knob[across] = (lo(across) + hi(across)) / 2;
  return { outline, knobPosition: knob, axisIndex };
}
