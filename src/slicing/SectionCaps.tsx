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
import { DEFAULT_LOOK, LOOKS, washFor } from '../config/looks.ts';
import { RENDER } from '../config/render.ts';
import { CapMaterial } from '../rendering/materials/cap-material.ts';
import { partIdFor, partIds } from '../specimen/part-id.ts';
import type { GazeRig } from '../specimen/gaze.ts';
import { GazePivot } from '../specimen/GazePivot.tsx';
import {
  FLOW_ORIGIN,
  flowFronts,
  glowLevel,
  glowPulse,
  MANA_CARRIERS,
  SWAY,
} from '../specimen/idle.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import type { SeamUniforms } from '../rendering/materials/seam.ts';
import { addSway, type SwayUniforms } from '../rendering/materials/sway.ts';
import type { LoadedPart } from '../specimen/load-specimen.ts';
import { usePlateStore } from '../state/plate-store.ts';
import { useClipPlane } from './clip-plane.tsx';
import { partSphere, sphereSide } from './plane-math.ts';

/** Render orders below this are the specimen itself; caps come after. */
const CAP_RENDER_ORDER_BASE = 10;
const CAP_SIZE = 8;
const FORWARD = new Vector3(0, 0, 1);

interface SectionCapsProps {
  readonly parts: readonly LoadedPart[];
  /** Parts that follow the pointer turn here too, so their stencils match. */
  readonly gaze: GazeRig;
  /** The specimen's idle sway, applied to the stencils so cut faces follow it. */
  readonly sway: SwayUniforms;
  /** The ground seam's shared uniforms, so cut faces glow where they meet the ground. */
  readonly seam: SeamUniforms;
}

export function SectionCaps({ parts, gaze, sway, seam }: SectionCapsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { plane } = useClipPlane();
  const quad = useMemo(() => new PlaneGeometry(CAP_SIZE, CAP_SIZE), []);
  const capMeshes = useRef<(Mesh | null)[]>([]);
  const stencilMeshes = useRef<(Mesh | null)[]>([]);

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
          sphere: partSphere(entry.bounds, SWAY.amplitude + 0.005, entry.gazePivot),
          parity: addSway(stencilMaterial(plane), sway),
          cap: new CapMaterial({
            wash: washFor(LOOKS[DEFAULT_LOOK], entry.id, entry.look.wash),
            pattern: section.pattern,
            centre: section.centre,
            partId: ids[index] ?? partIdFor(index),
            carriesMana: MANA_CARRIERS.has(entry.id),
            flowOrigin: FLOW_ORIGIN,
            seam,
          }),
        };
      }),
    [parts, plane, ids, sway, seam],
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
  useEffect(() => {
    layers.forEach(({ id, wash, cap }) => {
      cap.paint({
        wash: washFor(look, id, wash),
        line: look.line,
        section: look.section,
        emission: FX.bloom.emission,
      });
    });
  }, [layers, look]);

  const point = useMemo(() => new Vector3(), []);
  const rotation = useMemo(() => new Quaternion(), []);
  const flares = useMemo(() => layers.map(() => 0), [layers]);
  useFrame(({ clock }, delta) => {
    plane.coplanarPoint(point);
    rotation.setFromUnitVectors(FORWARD, plane.normal);
    const t = clock.getElapsedTime();
    const { highlight, layers: modes } = usePlateStore.getState();
    const normal = [plane.normal.x, plane.normal.y, plane.normal.z] as const;
    // A part has a cut face only where the plane crosses it, and only if its layer
    // is solid (a ghosted or hidden layer shows what's inside); skip the rest.
    layers.forEach(({ layer, sphere }, i) => {
      const cut =
        modes[layer] === 'shown' &&
        sphereSide(normal, plane.constant, sphere.centre, sphere.radius) === 'crossing';
      const stencil = stencilMeshes.current[i];
      const capMesh = capMeshes.current[i];
      if (stencil) stencil.visible = cut;
      if (capMesh) {
        capMesh.visible = cut;
        capMesh.position.copy(point);
        capMesh.quaternion.copy(rotation);
      }
    });
    const [f1, f2] = reducedMotion ? [-1, -1] : flowFronts(t);
    const ease = 1 - Math.exp(-delta * RENDER.flareRate);
    layers.forEach(({ id, cap }, i) => {
      cap.time = t;
      cap.planeNormal = plane.normal;
      cap.pulse = glowPulse(id, i, t);
      cap.glowLevel = reducedMotion ? 1 : glowLevel(id, t);
      cap.setFlowFronts(f1, f2);
      const current = flares[i] ?? 0;
      const next = current + ((id === highlight ? 1 : 0) - current) * ease;
      flares[i] = next;
      cap.flare = next;
    });
  });

  return (
    <group name="section-caps">
      {layers.map(({ id, geometry, parity, cap, pivot }, i) => {
        const order = CAP_RENDER_ORDER_BASE + i * 2;
        // Visibility is set each frame (above).
        const stencils = (
          <mesh
            ref={(mesh) => {
              stencilMeshes.current[i] = mesh;
            }}
            geometry={geometry}
            material={parity}
            renderOrder={order}
            visible={false}
          />
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
              visible={false}
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
