/**
 * Beard, moustache, eyebrows and the hair that falls from under the hat, each a
 * solid core (so sections stay filled) covered in clumped locks that hang with
 * gravity and drape over the head, robe and shoulders (`growth/locks.ts`).
 */
import { segmentsBounds, segmentsField, type Segment } from '../growth/branches.ts';
import { growClump, type ClumpOptions } from '../growth/locks.ts';
import { between, createRandom, type Random } from '../growth/random.ts';
import { LANDMARKS as L } from '../landmarks.ts';
import { add, bezier, lerp } from '../sdf/math.ts';
import {
  displace,
  ellipsoid,
  fbm,
  halfSpace,
  intersect,
  mirrorX,
  roundCone,
  smoothUnion,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { hatField } from './hat.ts';
import { headSkinField } from './head.ts';
import type { PartDefinition } from './part.ts';
import { mantleField, robeField } from './robe.ts';
import { girdlePart } from './shoulders.ts';

const SEED = 37;

/** Grooves along y: noise stretched vertically reads as strands on the cores. */
const strands =
  (seed: number, amplitude: number): Sdf =>
  (x, y, z) =>
    fbm(seed, x * 14, y * 2.5, z * 14) * amplitude;

/** Head, robe, mantle, the Familiar's Perch and hat: what locks drape over. Built once; the head is costly. */
let colliders: { head: Sdf; body: Sdf; withHat: Sdf } | undefined;
function getColliders() {
  if (!colliders) {
    const head = headSkinField();
    const body = union(head, robeField(), mantleField(), girdlePart().field);
    colliders = { head, body, withHat: union(body, hatField()) };
  }
  return colliders;
}

const flipX = ([x, y, z]: Vec3): Vec3 => [-x, y, z];

/**
 * Grows clumps for both sides: `make` describes a left-side clump (+x); the right
 * side gets the same description mirrored, grown with its own random stream so
 * the two sides aren't exact copies.
 */
function bothSides(
  seed: number,
  count: number,
  make: (i: number, random: Random) => ClumpOptions,
): Segment[] {
  const segments: Segment[] = [];
  for (const side of [1, -1] as const) {
    const random = createRandom(seed + (side > 0 ? 0 : 1000));
    for (let i = 0; i < count; i++) {
      const o = make(i, random);
      const m = side > 0 ? o : mirrorClump(o);
      segments.push(...growClump(random, m));
    }
  }
  return segments;
}

function mirrorClump(o: ClumpOptions): ClumpOptions {
  return {
    ...o,
    root: flipX(o.root),
    direction: flipX(o.direction),
    ...(o.drift ? { drift: flipX(o.drift) } : {}),
    ...(o.target ? { target: flipX(o.target) } : {}),
    // Mirroring flips handedness, so the curl turns the other way about the mirrored axis.
    ...(o.curl ? { curl: { axis: flipX(o.curl.axis), rate: -o.curl.rate } } : {}),
  };
}

const aboveBustBase = halfSpace([0, L.bustBase[1] + 0.01, 0], [0, -1, 0]);

export function beardPart(): PartDefinition {
  const { body } = getColliders();
  // The core: a jaw mass and a tapering fall to the tip, slimmer than the locks
  // over it so it fills the gaps between them without showing.
  const fall: Sdf[] = [];
  const top: Vec3 = [0, -0.45, 0.3];
  const control: Vec3 = [0, -0.95, 0.44];
  for (let i = 0; i < 5; i++) {
    const a = bezier(top, control, L.beardTip, i / 5);
    const b = bezier(top, control, L.beardTip, (i + 1) / 5);
    fall.push(roundCone(a, b, 0.27 - i * 0.045, 0.27 - (i + 1) * 0.045));
  }
  const mass = smoothUnion(
    0.1,
    ellipsoid([0, -0.37, 0.25], [0.37, 0.26, 0.27]),
    mirrorX(ellipsoid([0.3, -0.27, 0.13], [0.1, 0.2, 0.15])),
    ...fall,
  );
  // Only outside the skin: the jaw and mouth inside belong to the head.
  const head = getColliders().head;
  const core: Sdf = (x, y, z) => {
    const m = mass(x, y, z);
    return m > 0.05 ? m : Math.max(m, -(head(x, y, z) + 0.015));
  };

  // Roots on a U around the jaw, from the sideburns to the chin, in three rows.
  // Every lock is drawn toward the tip; outer ones stop short, so the beard tapers
  // to a point.
  const rows = 4;
  const perSide = 9;
  const locks = bothSides(SEED, rows * perSide, (i, random) => {
    const row = Math.floor(i / perSide);
    const u = ((i % perSide) + between(random, 0.1, 0.9)) / perSide; // 0 at the chin, 1 at the ear
    const theta = u * 1.3;
    const root: Vec3 = [
      0.33 * Math.sin(theta),
      -0.44 + 0.24 * u ** 1.5 + row * 0.04,
      0.27 + 0.22 * Math.cos(theta) - row * 0.03,
    ];
    const target: Vec3 = add(L.beardTip, [
      between(random, -0.05, 0.1),
      0.12 * u + between(random, 0, 0.08),
      between(random, -0.06, 0.02),
    ]);
    const reach = Math.hypot(target[0] - root[0], target[1] - root[1], target[2] - root[2]);
    return {
      root,
      direction: [0.4 * Math.sin(theta), -1, 0.5 * Math.cos(theta)],
      target,
      pull: 2.2,
      gravity: 0.5,
      length: reach * (1.02 - 0.3 * u) * between(random, 0.88, 1),
      rootRadius: between(random, 0.06, 0.075),
      tipRadius: 0.014,
      steps: 14,
      wave: { amplitude: 0.08, frequency: 1.2 },
      collider: body,
      strands: 3,
      spread: 0.04,
    };
  });

  const field = intersect(
    smoothUnion(0.05, displace(core, strands(SEED, 0.02)), segmentsField(locks, 0.022, 0.07)),
    aboveBustBase,
  );
  return {
    id: 'beard',
    layer: 'integument',
    look: { wash: 'washBone', hatch: 'strands', section: { pattern: 'strands' } },
    field,
    bounds: segmentsBounds(locks, { min: [-0.48, -0.64, -0.05], max: [0.48, 0.05, 0.56] }),
    cellSize: 0.011,
  };
}

export function moustachePart(): PartDefinition {
  const { body } = getColliders();
  // Locks from under the nose sweep out and down past the mouth; the ends curl up.
  const locks = bothSides(SEED + 1, 8, (i, random) => {
    const x = 0.01 + i * 0.012;
    return {
      root: [x, -0.15 - between(random, 0, 0.025), 0.575 - x * 0.6],
      direction: [1, -0.5 - i * 0.05, -0.2],
      length: between(random, 0.42, 0.52) - i * 0.015,
      rootRadius: between(random, 0.045, 0.055),
      tipRadius: 0.01,
      steps: 14,
      gravity: 1.6,
      curl: { axis: [0, 0, 1], rate: between(random, 0.6, 1.1) },
      wave: { amplitude: 0.05, frequency: 1.5 },
      collider: body,
      clearance: 0.003,
      strands: 3,
      spread: 0.022,
    };
  });
  return {
    id: 'moustache',
    layer: 'integument',
    look: { wash: 'washBone', hatch: 'strands', section: { pattern: 'strands' } },
    field: segmentsField(locks, 0.018, 0.05),
    bounds: segmentsBounds(locks, { min: [0, -0.2, 0.5], max: [0, -0.1, 0.6] }),
    cellSize: 0.006,
  };
}

export function eyebrowsPart(): PartDefinition {
  const { body } = getColliders();
  // Bushy brows on the brow ridge: inner hairs rise, outer ones sweep out and droop.
  const inner: Vec3 = [0.05, 0.2, 0.51];
  const outer: Vec3 = [0.29, 0.19, 0.4];
  const locks = bothSides(SEED + 2, 18, (i, random) => {
    const u = (i + between(random, 0, 1)) / 18;
    return {
      root: add(lerp(inner, outer, u), [0, between(random, -0.01, 0.012), 0]),
      direction: [0.4 + 0.8 * u, 0.25 - 0.25 * u, 0.9 - 0.5 * u],
      length: 0.1 + 0.12 * u + between(random, 0, 0.03),
      rootRadius: between(random, 0.022, 0.027),
      tipRadius: 0.004,
      steps: 7,
      gravity: 0.8 + 1.4 * u,
      wave: { amplitude: 0.06, frequency: 3 },
      collider: body,
      clearance: 0.002,
      strands: 2,
      spread: 0.008,
    };
  });
  return {
    id: 'eyebrows',
    layer: 'integument',
    look: { wash: 'washBone', hatch: 'strands', section: { pattern: 'strands' } },
    field: segmentsField(locks, 0.01, 0.04),
    bounds: segmentsBounds(locks, { min: [0, 0.2, 0.4], max: [0, 0.3, 0.5] }),
    cellSize: 0.005,
  };
}

export function hairPart(): PartDefinition {
  const { withHat } = getColliders();
  const belowBrim = halfSpace([0, L.brimCentre[1] - 0.02, 0], [0, 1, 0]);

  // A cap of hair over the scalp under the brim, behind the temples.
  // A shell over the scalp, not a solid: the head's inside belongs to the head.
  const cap = intersect(
    ellipsoid([0, 0.17, -0.07], [0.455, 0.52, 0.54]),
    (x, y, z) => -ellipsoid([0, 0.17, -0.07], [0.4, 0.465, 0.485])(x, y, z),
    belowBrim,
    halfSpace([0, 0, 0.12], [0, 0, 1]),
    halfSpace([0, -0.12, 0], [0, -1, 0]),
  );

  // Two rows of roots around the back and sides of the head, just under the cap.
  // Side locks lean forward so some fall in front of the shoulders.
  const perSide = 16;
  const locks = bothSides(SEED + 3, perSide * 3, (i, random) => {
    const row = Math.floor(i / perSide);
    const v = ((i % perSide) + between(random, 0.1, 0.9)) / perSide; // 0 at the temple, 1 at the back
    const phi = 1.5 + v * (Math.PI - 1.5);
    const y = 0.32 - row * 0.1;
    const f = Math.sqrt(1 - ((y - 0.17) / 0.52) ** 2);
    const root: Vec3 = [0.43 * f * Math.sin(phi), y, -0.07 + 0.5 * f * Math.cos(phi)];
    const forward = (1 - v) ** 2 * 0.2;
    // Locks from the sides go out and then to the front of the shoulder (clear of
    // the face), the rest to the back.
    const front = v < 0.3;
    return {
      root,
      drift: front ? [0.25, 0, 0.75] : [0, 0, -0.4],
      direction: [0.3 * Math.sin(phi), -1, 0.3 * Math.cos(phi) + forward],
      length: between(random, 1.5, 1.9) - row * 0.12,
      rootRadius: between(random, 0.06, 0.075),
      tipRadius: 0.014,
      steps: 16,
      gravity: 2,
      wave: { amplitude: 0.1, frequency: 1.4 },
      collider: withHat,
      clearance: 0.008,
      strands: 3,
      spread: 0.04,
    };
  });

  const field = intersect(
    smoothUnion(0.06, displace(cap, strands(SEED + 5, 0.02)), segmentsField(locks, 0.022, 0.07)),
    aboveBustBase,
  );
  return {
    id: 'hair',
    layer: 'integument',
    look: { wash: 'washBone', hatch: 'strands', section: { pattern: 'strands' } },
    field,
    bounds: segmentsBounds(locks, { min: [-0.5, -0.17, -0.65], max: [0.5, 0.42, 0.15] }),
    cellSize: 0.013,
  };
}
