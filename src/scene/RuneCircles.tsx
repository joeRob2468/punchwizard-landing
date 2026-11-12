/**
 * Rune circles in the Elder Futhark (ornament/rune-ring.ts): a summoning circle
 * on the ground just under the bust, its outer and inner rings turning opposite
 * ways, and a fainter ring that always stands behind the head, facing the
 * camera, like a halo. Drawn additively in the view's mana colour; they hold
 * still for visitors who prefer reduced motion.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AddEquation,
  CanvasTexture,
  Color,
  CustomBlending,
  DoubleSide,
  type Mesh,
  MeshBasicMaterial,
  OneFactor,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  ZeroFactor,
} from 'three';

import { LOOKS } from '../config/looks.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import { drawRuneRing, type RingDesign } from '../ornament/rune-ring.ts';
import { LANDMARKS as L } from '../procedural/landmarks.ts';
import { usePlateStore } from '../state/plate-store.ts';

const GROUND_Y = L.bustBase[1] - 0.01;
const GROUND_RADIUS = 1.6;
const HALO_RADIUS = 1.05;
/** The halo's centre, and how far behind it (away from the camera) it stands. */
const HALO_CENTRE = new Vector3(0, 0.15, -0.05);
const HALO_BEHIND = 0.8;

const OUTER: RingDesign = {
  circles: [0.98, 0.955, 0.79, 0.775],
  bands: [{ inner: 0.8, outer: 0.95, text: 'PUGNOMAGUS PILEATUS' }],
  ticks: { inner: 0.7, outer: 0.77 },
};
const INNER: RingDesign = {
  circles: [0.66, 0.5, 0.485],
  bands: [{ inner: 0.51, outer: 0.65, text: 'MANA FLUIT' }],
  valknut: 0.46,
};
const HALO: RingDesign = {
  circles: [0.97, 0.955, 0.8],
  bands: [{ inner: 0.81, outer: 0.95, text: 'SAPIENTIA ARCANA' }],
  ticks: { inner: 0.72, outer: 0.79 },
};

function ringMaterial(design: RingDesign, size: number, strength: number): MeshBasicMaterial {
  const texture = new CanvasTexture(drawRuneRing(size, design));
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    // Keep the part ids the outline effect reads from alpha.
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
  });
  material.userData.strength = strength;
  return material;
}

export function RuneCircles() {
  const outer = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const reducedMotion = usePrefersReducedMotion();
  const look = usePlateStore((state) => state.look);

  const { ground, haloPlane, materials } = useMemo(
    () => ({
      ground: new PlaneGeometry(GROUND_RADIUS * 2, GROUND_RADIUS * 2),
      haloPlane: new PlaneGeometry(HALO_RADIUS * 2, HALO_RADIUS * 2),
      materials: {
        outer: ringMaterial(OUTER, 2048, 0.55),
        inner: ringMaterial(INNER, 2048, 0.45),
        halo: ringMaterial(HALO, 1024, 0.22),
      },
    }),
    [],
  );
  useEffect(
    () => () => {
      ground.dispose();
      haloPlane.dispose();
      for (const m of Object.values(materials)) {
        m.map?.dispose();
        m.dispose();
      }
    },
    [ground, haloPlane, materials],
  );

  // Tinted with the view's mana colour.
  const tint = useMemo(() => new Color(LOOKS[look].palette.arcaneMana), [look]);

  const scratch = useMemo(
    () => ({ away: new Vector3(), spin: new Quaternion(), axis: new Vector3(0, 0, 1) }),
    [],
  );
  useFrame(({ clock, camera }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    for (const mesh of [outer.current, inner.current, halo.current]) {
      const material = mesh?.material;
      if (material instanceof MeshBasicMaterial) {
        material.color.copy(tint).multiplyScalar(material.userData.strength as number);
      }
    }
    if (outer.current) outer.current.rotation.z = t * 0.02;
    if (inner.current) inner.current.rotation.z = -t * 0.035;
    const h = halo.current;
    if (h) {
      scratch.away.copy(HALO_CENTRE).sub(camera.position).normalize();
      h.position.copy(HALO_CENTRE).addScaledVector(scratch.away, HALO_BEHIND);
      h.quaternion
        .copy(camera.quaternion)
        .multiply(scratch.spin.setFromAxisAngle(scratch.axis, t * 0.015));
    }
  });

  return (
    <group name="rune-circles">
      <group position={[0, GROUND_Y, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={outer} geometry={ground} material={materials.outer} renderOrder={1} />
        <mesh ref={inner} geometry={ground} material={materials.inner} renderOrder={1} />
      </group>
      <mesh ref={halo} geometry={haloPlane} material={materials.halo} renderOrder={1} />
    </group>
  );
}
