/**
 * Renders the baked specimen: one mesh per part, painted with the ink-and-wash
 * material its manifest entry asks for and clipped by the sectioning plane,
 * plus the section caps, plane controller and drag handle.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { use, useEffect, useMemo, useRef } from 'react';
import type { Mesh } from 'three';

import { GHOST_OPACITY } from '../config/layers.ts';
import { FX } from '../config/fx.ts';
import { DEFAULT_LOOK, LOOKS, washFor } from '../config/looks.ts';
import { RENDER } from '../config/render.ts';
import { surfaceFor } from '../config/surfaces.ts';
import { usePlateStore } from '../state/plate-store.ts';
import type { LabelChannel } from '../labels/label-channel.ts';
import { LabelTracker } from '../labels/LabelTracker.tsx';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import { InkWashMaterial } from '../rendering/materials/ink-wash-material.ts';
import { swayUniforms } from '../rendering/materials/sway.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import { SectionCaps } from '../slicing/SectionCaps.tsx';
import { SliceController } from '../slicing/SliceController.tsx';
import { partSphere, sphereSide } from '../slicing/plane-math.ts';
import { GazePivot } from './GazePivot.tsx';
import { Motes } from './Motes.tsx';
import { GazeRig } from './gaze.ts';
import {
  FLOW_ORIGIN,
  flowFronts,
  glowLevel,
  glowPulse,
  MANA_CARRIERS,
  SWAY,
  swayAtTip,
} from './idle.ts';
import type { LoadedSpecimen } from './load-specimen.ts';
import { partIdFor, partIds } from './part-id.ts';

/** Above see-through parts (0); section caps use their own, in the opaque pass. */
const GLOW_RENDER_ORDER = 1;

interface SpecimenProps {
  readonly specimen: Promise<LoadedSpecimen>;
  readonly labels: LabelChannel;
}

export function Specimen({ specimen, labels }: SpecimenProps) {
  const loaded = use(specimen);
  const { parts, bounds } = loaded;
  const { plane } = useClipPlane();

  const ids = useMemo(() => partIds(parts.map((p) => p.entry)), [parts]);
  // Shared by every part and the section stencils, so they all sway together.
  const sway = useMemo(() => swayUniforms(SWAY.from, SWAY.to), []);
  const reducedMotion = usePrefersReducedMotion();
  const meshes = useMemo(
    () =>
      parts.map(({ entry, geometry }, index) => {
        const material = new InkWashMaterial({
          partId: ids[index] ?? partIdFor(index),
          useOcclusion: true,
          wash: washFor(LOOKS[DEFAULT_LOOK], entry.id, entry.look.wash),
          glow: entry.look.glow ?? 0,
          surface: surfaceFor(entry.id, entry.look.wash),
          sway,
          carriesMana: MANA_CARRIERS.has(entry.id),
          flowOrigin: FLOW_ORIGIN,
        });
        material.clippingPlanes = [plane];
        return {
          id: entry.id,
          layer: entry.layer,
          wash: entry.look.wash,
          glowing: (entry.look.glow ?? 0) > 0,
          geometry,
          material,
          pivot: entry.gazePivot,
          sphere: partSphere(entry.bounds, SWAY.amplitude + 0.005, entry.gazePivot),
        };
      }),
    [parts, plane, ids, sway],
  );

  useEffect(
    () => () => {
      meshes.forEach(({ material }) => {
        material.dispose();
      });
    },
    [meshes],
  );

  const meshRefs = useRef<(Mesh | null)[]>([]);

  // Layers the viewer has ghosted are drawn see-through; hidden ones not at all
  // (visibility is set each frame, below).
  const layers = usePlateStore((state) => state.layers);
  useEffect(() => {
    meshes.forEach(({ layer, material }) => {
      material.ghost = layers[layer] === 'ghost' ? GHOST_OPACITY : null;
    });
  }, [meshes, layers]);

  const look = LOOKS[usePlateStore((state) => state.look)];
  useEffect(() => {
    const colours: Record<string, string> = {};
    meshes.forEach(({ id, layer, wash, material }) => {
      colours[id] = washFor(look, id, wash);
      material.paint({
        wash: colours[id],
        gain: look.layerGain?.[layer] ?? 1,
        emission: FX.bloom.emission,
      });
    });
    usePlateStore.getState().setPartColours(colours);
  }, [meshes, look]);

  // The part whose label is hovered or pinned flares, easing in and out.
  const flares = useMemo(() => meshes.map(() => 0), [meshes]);

  // Irises and pupils follow the pointer.
  const gaze = useMemo(() => new GazeRig(), []);
  const domElement = useThree((state) => state.gl.domElement);
  // Tracked over the whole page (labels included), relative to the canvas; the eyes
  // return to neutral when the pointer leaves the window.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const rect = domElement.getBoundingClientRect();
      gaze.pointerAt(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };
    const onLeave = () => {
      gaze.pointerLeft();
    };
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) gaze.pointerLeft();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerout', onOut);
    window.addEventListener('blur', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [domElement, gaze]);

  // The first frame with the specimen in it: the preloader can go.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      usePlateStore.getState().setSpecimenReady();
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, []);

  useFrame(({ clock, camera }, delta) => {
    gaze.update(camera, delta);
    const t = clock.getElapsedTime();
    const { highlight, layers: modes } = usePlateStore.getState();
    const ease = 1 - Math.exp(-delta * RENDER.flareRate);
    // Hidden layers, and parts wholly on the cut-away side, aren't drawn at all.
    const normal = [plane.normal.x, plane.normal.y, plane.normal.z] as const;
    meshes.forEach(({ layer, sphere }, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      mesh.visible =
        modes[layer] !== 'hidden' &&
        sphereSide(normal, plane.constant, sphere.centre, sphere.radius) !== 'removed';
    });
    const [sx, sz] = reducedMotion ? [0, 0] : swayAtTip(t);
    const [f1, f2] = reducedMotion ? [-1, -1] : flowFronts(t);
    sway.uSway.value.set(sx, sz);
    meshes.forEach(({ id, material }, i) => {
      material.time = t;
      material.pulse = glowPulse(id, i, t);
      material.glowLevel = reducedMotion ? 1 : glowLevel(id, t);
      material.setFlowFronts(f1, f2);
      const current = flares[i] ?? 0;
      const next = current + ((id === highlight ? 1 : 0) - current) * ease;
      flares[i] = next;
      material.flare = next;
    });
  });

  return (
    <>
      <group name="specimen">
        {meshes.map(({ id, glowing, geometry, material, pivot }, i) => {
          const mesh = (
            <mesh
              key={id}
              ref={(m) => {
                meshRefs.current[i] = m;
              }}
              name={id}
              geometry={geometry}
              material={material}
              // Glowing parts draw after see-through ones (see InkWashMaterial.ghost).
              renderOrder={glowing ? GLOW_RENDER_ORDER : 0}
            />
          );
          return pivot ? (
            <GazePivot key={id} gaze={gaze} pivot={pivot}>
              {mesh}
            </GazePivot>
          ) : (
            mesh
          );
        })}
      </group>
      <Motes />
      <SectionCaps parts={parts} gaze={gaze} sway={sway} />
      <SliceController bounds={bounds} />
      <LabelTracker specimen={loaded} channel={labels} />
    </>
  );
}
