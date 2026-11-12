/**
 * Renders the baked specimen: one mesh per part, painted with the ink-and-wash
 * material its manifest entry asks for and clipped by the sectioning plane,
 * plus the section caps, plane controller and drag handle.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { use, useEffect, useMemo } from 'react';

import { GHOST_OPACITY } from '../config/layers.ts';
import { FX } from '../config/fx.ts';
import { DEFAULT_LOOK, LOOKS, washFor } from '../config/looks.ts';
import { surfaceFor } from '../config/surfaces.ts';
import { usePlateStore } from '../state/plate-store.ts';
import type { LabelChannel } from '../labels/label-channel.ts';
import { LabelTracker } from '../labels/LabelTracker.tsx';
import { InkWashMaterial } from '../rendering/materials/ink-wash-material.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import { SectionCaps } from '../slicing/SectionCaps.tsx';
import { SliceController } from '../slicing/SliceController.tsx';
import { GazePivot } from './GazePivot.tsx';
import { GazeRig } from './gaze.ts';
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
  const meshes = useMemo(
    () =>
      parts.map(({ entry, geometry }, index) => {
        const material = new InkWashMaterial({
          partId: ids[index] ?? partIdFor(index),
          useOcclusion: true,
          wash: washFor(LOOKS[DEFAULT_LOOK], entry.id, entry.look.wash),
          glow: entry.look.glow ?? 0,
          surface: surfaceFor(entry.id, entry.look.wash),
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
        };
      }),
    [parts, plane, ids],
  );

  useEffect(
    () => () => {
      meshes.forEach(({ material }) => {
        material.dispose();
      });
    },
    [meshes],
  );

  // Layers the viewer has ghosted are drawn see-through; hidden ones not at all.
  const layers = usePlateStore((state) => state.layers);
  useEffect(() => {
    meshes.forEach(({ layer, material }) => {
      material.ghost = layers[layer] === 'ghost' ? GHOST_OPACITY : null;
    });
  }, [meshes, layers]);

  const look = LOOKS[usePlateStore((state) => state.look)];
  useEffect(() => {
    meshes.forEach(({ id, layer, wash, material }) => {
      material.paint({
        wash: washFor(look, id, wash),
        gain: look.layerGain?.[layer] ?? 1,
        emission: FX.bloom.emission,
      });
    });
  }, [meshes, look]);

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

  useFrame(({ clock, camera }, delta) => {
    gaze.update(camera, delta);
    const t = clock.getElapsedTime();
    meshes.forEach(({ material }) => {
      material.time = t;
    });
  });

  return (
    <>
      <group name="specimen">
        {meshes.map(({ id, layer, glowing, geometry, material, pivot }) => {
          const mesh = (
            <mesh
              key={id}
              name={id}
              geometry={geometry}
              material={material}
              visible={layers[layer] !== 'hidden'}
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
      <SectionCaps parts={parts} gaze={gaze} />
      <SliceController bounds={bounds} />
      <LabelTracker specimen={loaded} channel={labels} />
    </>
  );
}
