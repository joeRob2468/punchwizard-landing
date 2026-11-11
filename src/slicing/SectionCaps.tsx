/**
 * Solid cut faces for the sectioned specimen, using the stencil technique: for
 * each part, its back faces increment and its front faces decrement the stencil
 * (both clipped by the plane), leaving a non-zero count exactly where the plane
 * cuts through the part's interior. A plane-sized quad then fills those pixels
 * with the part's CapMaterial and resets the stencil for the next part.
 *
 * Parts are capped in order, each later cap drawn over earlier coplanar ones
 * (LessEqual depth), so inner parts should come after outer ones.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AlwaysStencilFunc,
  BackSide,
  DecrementWrapStencilOp,
  FrontSide,
  IncrementWrapStencilOp,
  type Mesh,
  MeshBasicMaterial,
  type Plane,
  PlaneGeometry,
  Quaternion,
  type Side,
  type StencilOp,
  Vector3,
} from 'three';

import { PALETTE, type PaletteKey } from '../config/palette.ts';
import { CapMaterial } from '../rendering/materials/cap-material.ts';
import { partIdFor } from '../specimen/part-id.ts';
import type { GazeRig } from '../specimen/gaze.ts';
import { GazePivot } from '../specimen/GazePivot.tsx';
import type { LoadedPart } from '../specimen/load-specimen.ts';
import { useClipPlane } from './clip-plane.tsx';

/** Render orders below this are the specimen itself; caps come after. */
const CAP_RENDER_ORDER_BASE = 10;
const CAP_SIZE = 8;
const FORWARD = new Vector3(0, 0, 1);

interface SectionCapsProps {
  readonly parts: readonly LoadedPart[];
  /** Parts that follow the pointer turn here too, so their stencils match. */
  readonly gaze: GazeRig;
}

export function SectionCaps({ parts, gaze }: SectionCapsProps) {
  const { plane } = useClipPlane();
  const quad = useMemo(() => new PlaneGeometry(CAP_SIZE, CAP_SIZE), []);
  const capMeshes = useRef<(Mesh | null)[]>([]);

  const layers = useMemo(
    () =>
      parts.map(({ entry, geometry }, index) => {
        const section = entry.look.section ?? { pattern: 'hatch' as const };
        const wash = isPaletteKey(entry.look.wash) ? PALETTE[entry.look.wash] : PALETTE.ink;
        return {
          id: entry.id,
          geometry,
          pivot: entry.gazePivot,
          back: stencilMaterial(plane, BackSide, IncrementWrapStencilOp),
          front: stencilMaterial(plane, FrontSide, DecrementWrapStencilOp),
          cap: new CapMaterial({
            wash,
            pattern: section.pattern,
            centre: section.centre,
            partId: partIdFor(index),
          }),
        };
      }),
    [parts, plane],
  );

  useEffect(
    () => () => {
      quad.dispose();
      layers.forEach(({ back, front, cap }) => {
        back.dispose();
        front.dispose();
        cap.dispose();
      });
    },
    [layers, quad],
  );

  const point = useMemo(() => new Vector3(), []);
  const rotation = useMemo(() => new Quaternion(), []);
  useFrame(({ clock }) => {
    plane.coplanarPoint(point);
    rotation.setFromUnitVectors(FORWARD, plane.normal);
    const t = clock.getElapsedTime();
    capMeshes.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.position.copy(point);
      mesh.quaternion.copy(rotation);
    });
    layers.forEach(({ cap }) => {
      cap.time = t;
      cap.planeNormal = plane.normal;
    });
  });

  return (
    <group name="section-caps">
      {layers.map(({ id, geometry, back, front, cap, pivot }, i) => {
        const order = CAP_RENDER_ORDER_BASE + i * 2;
        const stencils = (
          <>
            <mesh geometry={geometry} material={back} renderOrder={order} />
            <mesh geometry={geometry} material={front} renderOrder={order} />
          </>
        );
        return (
          <group key={id}>
            {pivot ? (
              <GazePivot gaze={gaze} pivot={pivot}>
                {stencils}
              </GazePivot>
            ) : (
              stencils
            )}
            <mesh
              ref={(mesh) => {
                capMeshes.current[i] = mesh;
              }}
              geometry={quad}
              material={cap}
              renderOrder={order + 1}
              frustumCulled={false}
            />
          </group>
        );
      })}
    </group>
  );
}

function stencilMaterial(plane: Plane, side: Side, op: StencilOp): MeshBasicMaterial {
  return new MeshBasicMaterial({
    side,
    clippingPlanes: [plane],
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    stencilWrite: true,
    stencilFunc: AlwaysStencilFunc,
    stencilFail: op,
    stencilZFail: op,
    stencilZPass: op,
  });
}

function isPaletteKey(key: string): key is PaletteKey {
  return key in PALETTE;
}
