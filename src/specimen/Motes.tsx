/**
 * Glowing motes of mana drifting up around the specimen. Most are the cyan of the
 * Conduit Lattice, spread around the whole bust; the rest gather near each magical
 * organ in its colour. Animated on the GPU (see motes.vert.glsl). Part of the
 * arcane layer: faint when it's see-through, gone when it's hidden. They hold
 * still for visitors who prefer reduced motion.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Color, type Points } from 'three';

import { LOOKS, type Palette } from '../config/looks.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import { between, createRandom } from '../procedural/growth/random.ts';
import { LANDMARKS as L } from '../procedural/landmarks.ts';
import { focusGemCentres } from '../procedural/parts/brain.ts';
import {
  COCHLEA_CENTRE,
  GANGLIA_CENTRES,
  HEART_TOP,
  LEXICON_CENTRE,
} from '../procedural/parts/fantasy.ts';
import { hatSpine } from '../procedural/parts/hat-shape.ts';
import type { Vec3 } from '../procedural/sdf/types.ts';
import { MoteMaterial } from '../rendering/materials/mote-material.ts';
import { usePlateStore } from '../state/plate-store.ts';

const COUNT = 420;
/** Share of motes in the general cyan cloud around the bust. */
const CLOUD_SHARE = 0.5;
const SEED = 71;

type GlowKey = keyof Palette & `arcane${string}`;

interface Source {
  readonly at: Vec3;
  readonly colour: GlowKey;
  readonly weight: number;
}

/** Magical organs motes gather around, with how many each draws. */
function sources(): Source[] {
  const [cx, cy, cz] = COCHLEA_CENTRE;
  const list: Source[] = [
    { at: L.aethericCore, colour: 'arcaneViolet', weight: 3 },
    { at: HEART_TOP, colour: 'arcaneRose', weight: 3 },
    { at: [cx, cy, cz], colour: 'arcaneMagenta', weight: 1.5 },
    { at: [-cx, cy, cz], colour: 'arcaneMagenta', weight: 1.5 },
    { at: LEXICON_CENTRE, colour: 'arcaneLumen', weight: 2 },
    { at: L.chin, colour: 'arcaneEmber', weight: 2 },
    { at: L.sinus, colour: 'arcaneEmerald', weight: 1.5 },
    { at: [0, 0.05, -0.12], colour: 'arcaneGold', weight: 1.5 },
  ];
  for (const at of focusGemCentres()) list.push({ at, colour: 'arcaneSapphire', weight: 0.6 });
  for (const at of GANGLIA_CENTRES) list.push({ at, colour: 'arcaneLime', weight: 0.4 });
  for (const at of hatSpine().points) list.push({ at, colour: 'arcaneMana', weight: 0.8 });
  return list;
}

interface Mote {
  readonly origin: Vec3;
  readonly colour: GlowKey;
  readonly seed: readonly [number, number, number, number];
}

function motes(): Mote[] {
  const random = createRandom(SEED);
  const list = sources();
  const total = list.reduce((sum, s) => sum + s.weight, 0);
  const pick = (): Source => {
    let r = random() * total;
    for (const s of list) {
      r -= s.weight;
      if (r <= 0) return s;
    }
    const last = list[list.length - 1];
    if (!last) throw new Error('no mote sources');
    return last;
  };
  return Array.from({ length: COUNT }, (): Mote => {
    const seed = [random(), random(), random(), random()] as const;
    if (random() < CLOUD_SHARE) {
      // Around the whole bust, narrowing toward the hat's tip.
      const y = between(random, -1.5, 1.9);
      const reach = y > 0.5 ? 0.9 - 0.3 * ((y - 0.5) / 1.4) : 1.15;
      const radius = between(random, 0.45, reach);
      const angle = random() * Math.PI * 2;
      return {
        origin: [Math.sin(angle) * radius, y, -0.05 + Math.cos(angle) * radius],
        colour: 'arcaneMana',
        seed,
      };
    }
    const source = pick();
    const u = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = between(random, 0.12, 0.6);
    const [x, y, z] = source.at;
    return {
      origin: [x + s * Math.cos(angle) * r, y + u * r, z + s * Math.sin(angle) * r],
      colour: source.colour,
      seed,
    };
  });
}

export function Motes() {
  const points = useRef<Points>(null);
  const pixelRatio = useThree((state) => state.gl.getPixelRatio());
  const reducedMotion = usePrefersReducedMotion();
  const list = useMemo(() => motes(), []);
  const look = usePlateStore((state) => state.look);
  const arcane = usePlateStore((state) => state.layers.arcane);

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
  const material = useMemo(() => new MoteMaterial(pixelRatio), [pixelRatio]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Colours follow the view's palette.
  useEffect(() => {
    const colours = geometry.getAttribute('aColour') as BufferAttribute;
    const c = new Color();
    list.forEach((m, i) => {
      c.set(LOOKS[look].palette[m.colour]);
      colours.setXYZ(i, c.r, c.g, c.b);
    });
    colours.needsUpdate = true;
  }, [geometry, list, look]);

  useFrame(({ clock }) => {
    const mat = points.current?.material;
    if (!(mat instanceof MoteMaterial)) return;
    mat.time = reducedMotion ? 3 : clock.getElapsedTime();
    mat.level = arcane === 'ghost' ? 0.45 : 1;
  });

  return (
    <points
      ref={points}
      name="motes"
      geometry={geometry}
      material={material}
      visible={arcane !== 'hidden'}
      frustumCulled={false}
      renderOrder={3}
    />
  );
}
