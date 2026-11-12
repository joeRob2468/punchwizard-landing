/**
 * Solid cut faces for the sectioned specimen, using the stencil technique: for
 * each part, every surface crossing behind the plane (front or back face, clipped
 * by the plane) inverts the stencil, so it ends non-zero exactly where an odd
 * number of crossings lie behind the pixel: where the plane cuts the part's
 * interior. Counting parity rather than front minus back faces keeps a few badly
 * wound triangles (left by simplification) from leaving specks. A plane-sized quad
 * then fills those pixels with the part's CapMaterial and resets the stencil.
 *
 * Parts are capped in order, each later cap drawn over earlier coplanar ones
 * (LessEqual depth), so inner parts should come after outer ones.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AlwaysStencilFunc,
  DoubleSide,
  InvertStencilOp,
  type Mesh,
  MeshBasicMaterial,
  type Plane,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';

import { FX } from '../config/fx.ts';
import { LOOKS, washFor } from '../config/looks.ts';
import { CapMaterial } from '../rendering/materials/cap-material.ts';
import { partIdFor, partIds } from '../specimen/part-id.ts';
import type { GazeRig } from '../specimen/gaze.ts';
import { GazePivot } from '../specimen/GazePivot.tsx';
import type { LoadedPart } from '../specimen/load-specimen.ts';
import { usePlateStore } from '../state/plate-store.ts';
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
  const layerModes = usePlateStore((state) => state.layers);
  const quad = useMemo(() => new PlaneGeometry(CAP_SIZE, CAP_SIZE), []);
  const capMeshes = useRef<(Mesh | null)[]>([]);

  const ids = useMemo(() => partIds(parts.map((p) => p.entry)), [parts]);
  const layers = useMemo(
    () =>
      parts.map(({ entry, geometry }, index) => {
        const section = entry.look.section ?? { pattern: 'hatch' as const };
        return {
          id: entry.id,
          layer: entry.layer,
          wash: entry.look.wash,
          geometry,
          pivot: entry.gazePivot,
          parity: stencilMaterial(plane),
          cap: new CapMaterial({
            wash: washFor(LOOKS.plate, entry.id, entry.look.wash),
            pattern: section.pattern,
            centre: section.centre,
            partId: ids[index] ?? partIdFor(index),
          }),
        };
      }),
    [parts, plane, ids],
  );

  useEffect(
    () => () => {
      quad.dispose();
      layers.forEach(({ parity, cap }) => {
        parity.dispose();
        cap.dispose();
      });
    },
    [layers, quad],
  );

  const look = LOOKS[usePlateStore((state) => state.look)];
  const fx = usePlateStore((state) => state.fx);
  useEffect(() => {
    layers.forEach(({ id, wash, cap }) => {
      cap.paint({
        wash: washFor(look, id, wash),
        line: look.line,
        dark: look.ground === 'dark',
        section: look.section,
        emission: fx.bloom ? FX.bloom.emission : 0,
      });
    });
  }, [layers, look, fx]);

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
      {layers.map(({ id, layer, geometry, parity, cap, pivot }, i) => {
        // Only solid layers have cut faces: a ghosted or hidden layer shows what's inside.
        const solid = layerModes[layer] === 'shown';
        const order = CAP_RENDER_ORDER_BASE + i * 2;
        const stencils = (
          <mesh geometry={geometry} material={parity} renderOrder={order} visible={solid} />
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
              visible={solid}
            />
          </group>
        );
      })}
    </group>
  );
}

function stencilMaterial(plane: Plane): MeshBasicMaterial {
  return new MeshBasicMaterial({
    side: DoubleSide,
    clippingPlanes: [plane],
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    stencilWrite: true,
    stencilFunc: AlwaysStencilFunc,
    stencilFail: InvertStencilOp,
    stencilZFail: InvertStencilOp,
    stencilZPass: InvertStencilOp,
  });
}
