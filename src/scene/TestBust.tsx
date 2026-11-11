/**
 * Placeholder bust built from primitives, used to tune the render pipeline (M1)
 * before procedural parts exist. Replaced by the specimen in M2.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';

import { PALETTE } from '../config/palette.ts';
import { InkWashMaterial } from '../rendering/materials/ink-wash-material.ts';

export function TestBust() {
  const materials = useMemo(
    () => ({
      skin: new InkWashMaterial({ wash: PALETTE.washFlesh }),
      hat: new InkWashMaterial({ wash: PALETTE.washVein }),
      beard: new InkWashMaterial({ wash: PALETTE.washBone }),
      robe: new InkWashMaterial({ wash: PALETTE.washOchre }),
      mana: new InkWashMaterial({ wash: PALETTE.arcaneMana, glow: 1 }),
      gem: new InkWashMaterial({ wash: PALETTE.arcaneGarnet, glow: 0.6 }),
    }),
    [],
  );

  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => {
        m.dispose();
      });
    },
    [materials],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    Object.values(materials).forEach((m) => {
      m.time = t;
    });
  });

  return (
    <group>
      {/* Head and nose */}
      <mesh position={[0, 0.55, 0]} scale={[0.82, 1, 0.9]} material={materials.skin}>
        <sphereGeometry args={[0.55, 64, 48]} />
      </mesh>
      <mesh position={[0, 0.5, 0.5]} rotation={[0.5, 0, 0]} material={materials.skin}>
        <coneGeometry args={[0.1, 0.32, 24]} />
      </mesh>
      {/* Hat: brim and cone with a bent tip */}
      <mesh position={[0, 1.0, 0]} material={materials.hat}>
        <cylinderGeometry args={[1.05, 1.1, 0.06, 64]} />
      </mesh>
      <mesh position={[0, 1.65, 0]} rotation={[0, 0, 0.08]} material={materials.hat}>
        <coneGeometry args={[0.55, 1.3, 64, 1, true]} />
      </mesh>
      <mesh position={[0.18, 2.35, 0]} rotation={[0, 0, -0.9]} material={materials.hat}>
        <coneGeometry args={[0.16, 0.45, 32]} />
      </mesh>
      {/* Beard */}
      <mesh position={[0, -0.25, 0.3]} rotation={[Math.PI + 0.25, 0, 0]} material={materials.beard}>
        <coneGeometry args={[0.45, 1.3, 48]} />
      </mesh>
      {/* Shoulders */}
      <mesh
        position={[0, -0.75, -0.1]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[1, 1, 0.6]}
        material={materials.robe}
      >
        <capsuleGeometry args={[0.5, 1.6, 16, 48]} />
      </mesh>
      {/* Arcane test pieces */}
      <mesh position={[0, 0.92, 0.42]} material={materials.gem}>
        <octahedronGeometry args={[0.08]} />
      </mesh>
      <mesh position={[1.6, 0.2, 0.4]} material={materials.mana}>
        <icosahedronGeometry args={[0.18, 2]} />
      </mesh>
    </group>
  );
}
