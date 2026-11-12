/**
 * A few faint motes floating in a loose shell around the specimen: pale specks
 * that drift slowly, there to give depth (parallax) as the camera moves. Animated
 * on the GPU (see motes.vert.glsl); they hold still for visitors who prefer
 * reduced motion. In the spotlight's beam they catch the light.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Color, type Points } from 'three';

import { LOOKS } from '../config/looks.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import { between, createRandom } from '../procedural/growth/random.ts';
import type { Vec3 } from '../procedural/sdf/types.ts';
import { MoteMaterial } from '../rendering/materials/mote-material.ts';
import type { SpotUniforms } from '../rendering/materials/spot.ts';
import { usePlateStore } from '../state/plate-store.ts';

const COUNT = 60;
const SEED = 71;

interface Mote {
  readonly origin: Vec3;
  readonly seed: readonly [number, number, number, number];
}

/** Scattered in a shell around the bust and hat, clear of the surface. */
function motes(): Mote[] {
  const random = createRandom(SEED);
  return Array.from({ length: COUNT }, (): Mote => {
    const seed = [random(), random(), random(), random()] as const;
    const y = between(random, -1.6, 2.0);
    const radius = between(random, 1.0, 1.9);
    const angle = random() * Math.PI * 2;
    return { origin: [Math.sin(angle) * radius, y, -0.05 + Math.cos(angle) * radius], seed };
  });
}

interface MotesProps {
  /** The spotlight: motes light up in its beam. */
  readonly spot: SpotUniforms;
}

export function Motes({ spot }: MotesProps) {
  const points = useRef<Points>(null);
  const pixelRatio = useThree((state) => state.gl.getPixelRatio());
  const reducedMotion = usePrefersReducedMotion();
  const list = useMemo(() => motes(), []);
  const look = usePlateStore((state) => state.look);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const origins = new Float32Array(list.flatMap((m) => [...m.origin]));
    g.setAttribute('position', new BufferAttribute(origins, 3));
    g.setAttribute('aOrigin', new BufferAttribute(origins, 3));
    g.setAttribute(
      'aSeed',
      new BufferAttribute(new Float32Array(list.flatMap((m) => [...m.seed])), 4),
    );
    g.setAttribute('aColour', new BufferAttribute(new Float32Array(list.length * 3), 3));
    return g;
  }, [list]);
  const material = useMemo(() => new MoteMaterial(pixelRatio, spot), [pixelRatio, spot]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Pale, in the view's chalk.
  useEffect(() => {
    const colours = geometry.getAttribute('aColour') as BufferAttribute;
    const c = new Color(LOOKS[look].moteColour);
    list.forEach((_, i) => {
      colours.setXYZ(i, c.r, c.g, c.b);
    });
    colours.needsUpdate = true;
  }, [geometry, list, look]);

  useFrame(({ clock }) => {
    const mat = points.current?.material;
    if (!(mat instanceof MoteMaterial)) return;
    mat.time = reducedMotion ? 3 : clock.getElapsedTime();
  });

  return (
    <points
      ref={points}
      name="motes"
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={3}
    />
  );
}
