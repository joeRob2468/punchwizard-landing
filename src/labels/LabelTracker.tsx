/**
 * Decides, every frame, where each anatomy label's anchor is on screen and whether
 * it can be seen, and publishes that to the DOM overlay through a LabelChannel.
 *
 * - Section anchors: when the cut is in and the camera looks at the cut face, a
 *   candidate is projected onto the plane and kept if the part's own SDF says the
 *   part is there. Anchors follow the cut face as the plane moves.
 * - Surface anchors (features seen from outside): snapped onto the part's surface
 *   at start-up; visible when the surface faces the camera, the sight line does not
 *   pass through a cut face, and no kept geometry is in the way (BVH raycasts,
 *   throttled).
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { DoubleSide, Ray, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';

import { ANATOMY } from '../anatomy/registry.ts';
import type { Layer } from '../procedural/format/specimen-format.ts';
import { specimenParts } from '../procedural/specimen.ts';
import type { Sdf, Vec3 } from '../procedural/sdf/types.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import type { LoadedSpecimen } from '../specimen/load-specimen.ts';
import { usePlateStore } from '../state/plate-store.ts';
import {
  gradient,
  type PlaneLike,
  planeCrossing,
  sectionAnchor,
  signedDistance,
  snapToSurface,
} from './anchors.ts';
import type { LabelChannel } from './label-channel.ts';

/**
 * A part's raycasting structure, with its layer. Every part can hide a surface
 * anchor, but only while its layer is shown: ghost or hide the skin and the bones
 * and organs labels appear; leave only the arcana and theirs do.
 */
interface Occluder {
  readonly bvh: MeshBVH;
  readonly layer: Layer;
}

/** Surface visibility is re-checked every this many frames. */
const SURFACE_CHECK_INTERVAL = 6;

interface LabelTrackerProps {
  readonly specimen: LoadedSpecimen;
  readonly channel: LabelChannel;
}

export function LabelTracker({ specimen, channel }: LabelTrackerProps) {
  const { plane } = useClipPlane();
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const fields = useMemo(() => new Map(specimenParts().map((p) => [p.id, p.field] as const)), []);

  const layerOf = useMemo(
    () => new Map(specimen.parts.map(({ entry }) => [entry.id, entry.layer] as const)),
    [specimen],
  );

  const outerFields = useMemo(
    () =>
      specimen.parts.flatMap(({ entry }) => {
        const field = fields.get(entry.id);
        return field ? [{ field, layer: entry.layer }] : [];
      }),
    [specimen, fields],
  );

  const surfaceAnchors = useMemo(
    () =>
      ANATOMY.map((entry) => {
        const field = fields.get(entry.part);
        if (!field) return [];
        return entry.surface.map((guess) => {
          const point = snapToSurface(field, guess);
          const g = gradient(field, point);
          const len = Math.hypot(g[0], g[1], g[2]) || 1;
          return { point, normal: [g[0] / len, g[1] / len, g[2] / len] as Vec3 };
        });
      }),
    [fields],
  );

  // BVHs for raycasting every part, built a part at a time after start-up.
  const occluders = useRef<Occluder[]>([]);
  useEffect(() => {
    const queue = [...specimen.parts];
    // Filled in as they're built, so occlusion starts working part by part.
    const built: Occluder[] = [];
    occluders.current = built;
    let timer = 0;
    const buildNext = () => {
      const next = queue.shift();
      if (!next) return;
      built.push({ bvh: new MeshBVH(next.geometry), layer: next.entry.layer });
      timer = window.setTimeout(buildNext, 30);
    };
    timer = window.setTimeout(buildNext, 500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [specimen]);

  const frame = useRef(0);
  const surfaceVisible = useRef<(Vec3 | null)[]>(ANATOMY.map(() => null));
  const scratch = useMemo(() => ({ v: new Vector3(), ray: new Ray(), dir: new Vector3() }), []);

  useFrame(() => {
    const { slice, layers } = usePlateStore.getState();
    // Only solid layers hide what's behind them.
    const solidFields = outerFields.filter((o) => layers[o.layer] === 'shown').map((o) => o.field);
    const solidOccluders = occluders.current
      .filter((o) => layers[o.layer] === 'shown')
      .map((o) => o.bvh);
    const cutIn = Number.isFinite(slice.offset) && slice.offset < slice.range[1] - 0.01;
    const planeLike: PlaneLike = {
      normal: [plane.normal.x, plane.normal.y, plane.normal.z],
      constant: plane.constant,
    };
    const cam: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
    const facingCut = cutIn && signedDistance(planeLike, cam) < 0;
    const checkSurface = frame.current++ % SURFACE_CHECK_INTERVAL === 0;

    ANATOMY.forEach((entry, i) => {
      let anchor: Vec3 | null = null;
      const layer = layerOf.get(entry.part);
      if (layer && layers[layer] === 'hidden') {
        channel.setSample(i, false);
        return;
      }

      const field = fields.get(entry.part);
      if (facingCut && field && entry.section.length > 0) {
        anchor = sectionAnchor(entry.section, field, planeLike);
      }
      if (!anchor) {
        if (checkSurface) {
          surfaceVisible.current[i] = firstVisibleSurface(
            surfaceAnchors[i] ?? [],
            cam,
            cutIn ? planeLike : null,
            solidFields,
            solidOccluders,
            scratch,
          );
        }
        anchor = surfaceVisible.current[i] ?? null;
      }

      if (!anchor) {
        channel.setSample(i, false);
        return;
      }
      scratch.v.set(...anchor).project(camera);
      channel.setSample(
        i,
        scratch.v.z < 1,
        ((scratch.v.x + 1) / 2) * size.width,
        ((1 - scratch.v.y) / 2) * size.height,
      );
    });
    scratch.v.set(0, 0.2, 0).project(camera);
    channel.setViewport(size.width, size.height, ((scratch.v.x + 1) / 2) * size.width);
    channel.publish();
  });

  return null;
}

function firstVisibleSurface(
  anchors: readonly { point: Vec3; normal: Vec3 }[],
  cam: Vec3,
  plane: PlaneLike | null,
  outerFields: readonly Sdf[],
  occluders: readonly MeshBVH[],
  scratch: { ray: Ray; dir: Vector3 },
): Vec3 | null {
  for (const { point, normal } of anchors) {
    const toCam: Vec3 = [cam[0] - point[0], cam[1] - point[1], cam[2] - point[2]];
    const distance = Math.hypot(toCam[0], toCam[1], toCam[2]);
    // Must face the camera.
    if (normal[0] * toCam[0] + normal[1] * toCam[1] + normal[2] * toCam[2] <= 0.15 * distance)
      continue;
    if (plane) {
      // Cut away, or seen through a cut face?
      if (signedDistance(plane, point) < 0) continue;
      const crossing = planeCrossing(plane, cam, point);
      if (crossing && outerFields.some((f) => f(crossing[0], crossing[1], crossing[2]) < 0))
        continue;
    }
    // Anything kept in the way?
    scratch.dir.set(point[0] - cam[0], point[1] - cam[1], point[2] - cam[2]).normalize();
    scratch.ray.origin.set(...cam);
    scratch.ray.direction.copy(scratch.dir);
    const blocked = occluders.some((bvh) =>
      bvh
        .raycast(scratch.ray, DoubleSide, 0, distance - 0.03)
        .some(
          (hit) => !plane || signedDistance(plane, [hit.point.x, hit.point.y, hit.point.z]) >= 0,
        ),
    );
    if (!blocked) return point;
  }
  return null;
}
