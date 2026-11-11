/**
 * Renders the baked specimen: one mesh per part, painted with the ink-and-wash
 * material its manifest entry asks for and clipped by the sectioning plane,
 * plus the section caps, plane controller and drag handle.
 */
import { useFrame } from '@react-three/fiber';
import { use, useEffect, useMemo } from 'react';

import { PALETTE, type PaletteKey } from '../config/palette.ts';
import { InkWashMaterial } from '../rendering/materials/ink-wash-material.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import { SectionCaps } from '../slicing/SectionCaps.tsx';
import { SliceController } from '../slicing/SliceController.tsx';
import { SliceHandle } from '../slicing/SliceHandle.tsx';
import type { LoadedSpecimen } from './load-specimen.ts';

interface SpecimenProps {
  readonly specimen: Promise<LoadedSpecimen>;
}

export function Specimen({ specimen }: SpecimenProps) {
  const { parts, bounds } = use(specimen);
  const { plane } = useClipPlane();

  const meshes = useMemo(
    () =>
      parts.map(({ entry, geometry }) => {
        const material = new InkWashMaterial({
          wash: isPaletteKey(entry.look.wash) ? PALETTE[entry.look.wash] : PALETTE.ink,
          glow: entry.look.glow ?? 0,
        });
        material.clippingPlanes = [plane];
        return { id: entry.id, geometry, material };
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

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    meshes.forEach(({ material }) => {
      material.time = t;
    });
  });

  return (
    <>
      <group name="specimen">
        {meshes.map(({ id, geometry, material }) => (
          <mesh key={id} name={id} geometry={geometry} material={material} />
        ))}
      </group>
      <SectionCaps parts={parts} />
      <SliceController bounds={bounds} />
      <SliceHandle bounds={bounds} />
    </>
  );
}

function isPaletteKey(key: string): key is PaletteKey {
  return key in PALETTE;
}
