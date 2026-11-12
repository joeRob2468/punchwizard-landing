/**
 * Where the Conduit Lattice vents surplus mana: a crackling spark just past the
 * hat's tip that sways with it and flares as each heartbeat's pulse arrives.
 * Part of the arcane layer (dim when it's see-through, gone when it's hidden).
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Mesh, PlaneGeometry, Vector3 } from 'three';

import { LOOKS } from '../config/looks.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import { hatSpine } from '../procedural/parts/hat-shape.ts';
import { SparkMaterial } from '../rendering/materials/spark-material.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import { usePlateStore } from '../state/plate-store.ts';
import { FLOW_ORIGIN, flowFronts, swayAtTip, swayWeight } from './idle.ts';

const SIZE = 0.34;
/** How far past the tip, along the hat's spine, the spark sits. */
const BEYOND_TIP = 0.05;

export function HatSpark() {
  const mesh = useRef<Mesh>(null);
  const { plane } = useClipPlane();
  const reducedMotion = usePrefersReducedMotion();
  const geometry = useMemo(() => new PlaneGeometry(SIZE, SIZE), []);
  const material = useMemo(() => {
    const m = new SparkMaterial(LOOKS.nocturne.palette.arcaneMana);
    m.clippingPlanes = [plane];
    return m;
  }, [plane]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const { tip, distance } = useMemo(() => {
    const points = hatSpine().points;
    const last = points[points.length - 1];
    const before = points[points.length - 2];
    if (!last || !before) throw new Error('hat spine too short');
    const end = new Vector3(...last);
    const out = end
      .clone()
      .sub(new Vector3(...before))
      .normalize();
    const at = end.addScaledVector(out, BEYOND_TIP);
    return { tip: at, distance: at.distanceTo(new Vector3(...FLOW_ORIGIN)) };
  }, []);

  const arcane = usePlateStore((state) => state.layers.arcane);
  const look = usePlateStore((state) => state.look);
  const painted = useRef<string | null>(null);

  useFrame(({ clock, camera }) => {
    const m = mesh.current;
    const spark = m?.material;
    if (!m || !(spark instanceof SparkMaterial)) return;
    const t = clock.getElapsedTime();
    const [sx, sz] = reducedMotion ? [0, 0] : swayAtTip(t);
    const lean = swayWeight(tip.y);
    m.position.set(tip.x + sx * lean, tip.y, tip.z + sz * lean);
    m.quaternion.copy(camera.quaternion);
    const [front] = reducedMotion ? [-1] : flowFronts(t);
    if (painted.current !== look) {
      spark.colour = LOOKS[look].palette.arcaneMana;
      painted.current = look;
    }
    spark.time = t;
    spark.flash = front < 0 ? 0 : Math.exp(-(((front - distance) / 0.15) ** 2));
    spark.level = arcane === 'ghost' ? 0.35 : 1;
  });

  return (
    <mesh
      ref={mesh}
      name="hat-spark"
      geometry={geometry}
      material={material}
      visible={arcane !== 'hidden'}
      renderOrder={2}
      frustumCulled={false}
    />
  );
}
