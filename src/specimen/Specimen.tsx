/**
 * Renders the baked specimen: one mesh per part, painted with the ink-and-wash
 * material its manifest entry asks for and clipped by the sectioning plane,
 * plus the section caps, plane controller and drag handle.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { use, useEffect, useMemo } from 'react';

import { PALETTE, type PaletteKey } from '../config/palette.ts';
import type { LabelChannel } from '../labels/label-channel.ts';
import { LabelTracker } from '../labels/LabelTracker.tsx';
import { InkWashMaterial } from '../rendering/materials/ink-wash-material.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import { SectionCaps } from '../slicing/SectionCaps.tsx';
import { SliceController } from '../slicing/SliceController.tsx';
import { GazePivot } from './GazePivot.tsx';
import { GazeRig } from './gaze.ts';
import type { LoadedSpecimen } from './load-specimen.ts';
import { partIdFor } from './part-id.ts';

interface SpecimenProps {
  readonly specimen: Promise<LoadedSpecimen>;
  readonly labels: LabelChannel;
}

export function Specimen({ specimen, labels }: SpecimenProps) {
  const loaded = use(specimen);
  const { parts, bounds } = loaded;
  const { plane } = useClipPlane();

  const meshes = useMemo(
    () =>
      parts.map(({ entry, geometry }, index) => {
        const material = new InkWashMaterial({
          partId: partIdFor(index),
          useOcclusion: true,
          wash: isPaletteKey(entry.look.wash) ? PALETTE[entry.look.wash] : PALETTE.ink,
          glow: entry.look.glow ?? 0,
        });
        material.clippingPlanes = [plane];
        return { id: entry.id, geometry, material, pivot: entry.gazePivot };
      }),
    [parts, plane],
  );

  useEffect(
    () => () => {
      meshes.forEach(({ material }) => {
        material.dispose();
      });
    },
    [meshes],
  );

  // Irises and pupils follow the pointer.
  const gaze = useMemo(() => new GazeRig(), []);
  const domElement = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const onMove = () => {
      gaze.pointerMoved(performance.now());
    };
    domElement.addEventListener('pointermove', onMove);
    return () => {
      domElement.removeEventListener('pointermove', onMove);
    };
  }, [domElement, gaze]);

  useFrame(({ clock, camera, pointer }, delta) => {
    gaze.update(camera, pointer, delta, performance.now());
    const t = clock.getElapsedTime();
    meshes.forEach(({ material }) => {
      material.time = t;
    });
  });

  return (
    <>
      <group name="specimen">
        {meshes.map(({ id, geometry, material, pivot }) => {
          const mesh = <mesh key={id} name={id} geometry={geometry} material={material} />;
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

function isPaletteKey(key: string): key is PaletteKey {
  return key in PALETTE;
}
