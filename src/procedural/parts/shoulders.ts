/**
 * The shoulders and upper chest, after the lateral radiograph: S-curved clavicles
 * from the sternum to the acromion (the left one carrying the Familiar's Perch),
 * the sternum, the scapulae behind the ribs with their spine, acromion and
 * coracoid, the head of each humerus in its socket, and the upper ribs curving
 * from the spine around to the sternum on cartilage. Also the flesh of the torso
 * under the robe, so the bones sit in a body rather than in cloth.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import { cross, dot, length, scale, sub } from '../sdf/math.ts';
import {
  capsule,
  intersect,
  mirrorX,
  offset,
  roundBox,
  roundCone,
  smoothUnion,
  sphere,
  subtract,
  union,
} from '../sdf/index.ts';
import type { Bounds, Sdf, Vec3 } from '../sdf/types.ts';
import { segmentsBounds, segmentsField, type Segment } from '../growth/branches.ts';
import { tissueAirway } from './airways.ts';
import { headSkinField } from './head.ts';
import type { PartDefinition } from './part.ts';
import { robeField } from './robe.ts';
import { CANAL_RADIUS, canalField, levels } from './spine-path.ts';

const BONE = { wash: 'washBone', section: { pattern: 'stipple' } } as const;
const aboveBase: Sdf = (_x, y) => L.bustBase[1] + 0.01 - y;

/** A tube through a list of points with per-point radii. */
function polyline(points: readonly Vec3[], radii: readonly number[]): Segment[] {
  return points.slice(0, -1).map((a, i) => ({
    a,
    b: points[i + 1] ?? a,
    ra: radii[i] ?? 0.01,
    rb: radii[i + 1] ?? 0.01,
  }));
}

/** A smooth Catmull-Rom curve through `points`, as `steps` points per span. */
function spline(points: readonly Vec3[], steps: number): Vec3[] {
  const out: Vec3[] = [];
  const at = (i: number): Vec3 => points[Math.max(0, Math.min(points.length - 1, i))] ?? [0, 0, 0];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        [0, 1, 2].map(
          (k) =>
            0.5 *
            (2 * (p1[k] ?? 0) +
              (-(p0[k] ?? 0) + (p2[k] ?? 0)) * t +
              (2 * (p0[k] ?? 0) - 5 * (p1[k] ?? 0) + 4 * (p2[k] ?? 0) - (p3[k] ?? 0)) * t2 +
              (-(p0[k] ?? 0) + 3 * (p1[k] ?? 0) - 3 * (p2[k] ?? 0) + (p3[k] ?? 0)) * t3),
        ) as unknown as Vec3,
      );
    }
  }
  out.push(at(points.length - 1));
  return out;
}

/** Unsigned distance to a triangle (after Inigo Quilez), for flat bones. */
function triangle(a: Vec3, b: Vec3, c: Vec3, thickness: number): Sdf {
  const ba = sub(b, a);
  const cb = sub(c, b);
  const ac = sub(a, c);
  const n = cross(ba, ac);
  const clampDot = (v: Vec3, w: Vec3) => Math.min(1, Math.max(0, dot(v, w) / dot(w, w)));
  return (x, y, z) => {
    const p: Vec3 = [x, y, z];
    const pa = sub(p, a);
    const pb = sub(p, b);
    const pc = sub(p, c);
    const outside =
      Math.sign(dot(cross(ba, n), pa)) +
        Math.sign(dot(cross(cb, n), pb)) +
        Math.sign(dot(cross(ac, n), pc)) <
      2;
    const d = outside
      ? Math.min(
          length(sub(scale(ba, clampDot(pa, ba)), pa)),
          length(sub(scale(cb, clampDot(pb, cb)), pb)),
          length(sub(scale(ac, clampDot(pc, ac)), pc)),
        )
      : Math.abs(dot(n, pa)) / length(n);
    return d - thickness;
  };
}

const ACROMION: Vec3 = [0.64, -0.99, -0.08];

/** Clavicles, and on the left one the Familiar's Perch, poking out through the mantle. */
export function girdlePart(): PartDefinition {
  const clavicle = segmentsField(
    polyline(
      [
        [0.05, -0.99, 0.158],
        [0.2, -0.975, 0.15],
        [0.4, -0.96, 0.085],
        [0.57, -0.975, -0.03],
        ACROMION,
      ],
      [0.02, 0.017, 0.016, 0.017, 0.02],
    ),
    0.01,
  );
  const [px, py, pz] = L.familiarsPerch;
  const perch = smoothUnion(
    0.04,
    roundCone([0.6, -0.985, -0.05], [px, py - 0.03, pz], 0.045, 0.035), // strut from the clavicle's end
    roundBox([px + 0.02, py, pz], [0.13, 0.02, 0.09], 0.016), // the shelf, clear of mantle and hair
  );
  return {
    id: 'girdle',
    layer: 'skeleton',
    look: BONE,
    field: smoothUnion(0.03, mirrorX(clavicle), perch),
    bounds: { min: [-0.72, -1.05, -0.16], max: [1.05, -0.6, 0.22] },
    cellSize: 0.007,
  };
}

/** The sternum: the manubrium at the top and the long body below it. */
export function sternumPart(): PartDefinition {
  const manubrium = roundBox([0, -1.055, 0.165], [0.05, 0.065, 0.014], 0.01);
  const body: Sdf = (x, y, z) =>
    roundCone([0, -1.13, 0.18], [0, -1.62, 0.25], 0.03, 0.026)(x * 0.7, y, z);
  const flat = intersect(
    body,
    (_x, y, z) => Math.abs(z - (0.18 + (0.07 * (-1.13 - y)) / 0.49)) - 0.013,
  );
  return {
    id: 'sternum',
    layer: 'skeleton',
    look: BONE,
    field: intersect(union(manubrium, flat), aboveBase),
    bounds: { min: [-0.08, L.bustBase[1] - 0.02, 0.1], max: [0.08, -0.96, 0.3] },
    cellSize: 0.005,
  };
}

/** The scapulae: a flat triangle of bone behind the ribs, its spine ending in the acromion. */
export function scapulaePart(): PartDefinition {
  const superior: Vec3 = [0.22, -0.99, -0.26];
  const inferior: Vec3 = [0.3, -1.5, -0.29];
  const glenoid: Vec3 = [0.62, -1.13, -0.14];
  const blade = triangle(superior, inferior, glenoid, 0.007);
  const rims = union(
    capsule(superior, inferior, 0.011),
    capsule(inferior, glenoid, 0.013),
    capsule(glenoid, superior, 0.01),
  );
  const spine = smoothUnion(
    0.02,
    roundCone([0.24, -1.1, -0.29], [0.58, -1.0, -0.14], 0.01, 0.018),
    roundCone([0.58, -1.0, -0.14], ACROMION, 0.018, 0.02),
  );
  const coracoid = roundCone([0.53, -1.07, -0.12], [0.55, -1.06, 0.0], 0.014, 0.01);
  const socket = roundBox(glenoid, [0.02, 0.045, 0.035], 0.015);
  return {
    id: 'scapulae',
    layer: 'skeleton',
    look: BONE,
    field: mirrorX(smoothUnion(0.015, blade, rims, spine, coracoid, socket)),
    bounds: { min: [-0.72, -1.56, -0.36], max: [0.72, -0.94, 0.04] },
    cellSize: 0.006,
  };
}

/** The humerus: its round head in the glenoid and the shaft down the arm. */
export function humeriPart(): PartDefinition {
  const head: Vec3 = [0.7, -1.15, -0.1];
  const humerus = smoothUnion(
    0.03,
    sphere(head, 0.068),
    roundCone([0.74, -1.12, -0.06], [0.75, -1.25, -0.05], 0.03, 0.04), // greater tubercle
    roundCone([0.73, -1.22, -0.08], [0.86, L.bustBase[1] - 0.05, -0.05], 0.04, 0.032),
  );
  return {
    id: 'humeri',
    layer: 'skeleton',
    look: BONE,
    field: intersect(mirrorX(humerus), aboveBase),
    bounds: { min: [-0.95, L.bustBase[1] - 0.02, -0.2], max: [0.95, -1.06, 0.04] },
    cellSize: 0.008,
  };
}

/**
 * The upper ribs: each from its thoracic vertebra, back and out at the angle,
 * around the side and forward and down to the sternum; the last stretch is
 * costal cartilage (its own part).
 */
function ribPaths(): { bone: Segment[]; cartilage: Segment[] } {
  const bone: Segment[] = [];
  const cartilage: Segment[] = [];
  const thoracic = levels().filter((l) => l.name.startsWith('T'));
  thoracic.forEach((l, i) => {
    const n = i + 1;
    const [, y, zc] = l.canal;
    const reach = Math.min(0.5, 0.24 + 0.045 * n);
    const front = Math.min(0.27, 0.15 + 0.016 * n);
    const drop = 0.13 + 0.012 * n;
    const sternalY = Math.max(-1.6, -0.995 - 0.07 * (n - 1));
    // Control points: head at the vertebra, the angle, round the side, the front.
    const control: Vec3[] = [
      [0.05, y, zc + 0.012],
      [0.15, y + 0.004, zc - 0.03],
      [reach * 0.85, y - drop * 0.3, zc * 0.4 - 0.02],
      [reach, y - drop * 0.55, (zc + front) * 0.5],
      [reach * 0.78, y - drop * 0.8, front - 0.04],
      [reach * 0.55, y - drop * 0.95, front - 0.01],
    ];
    const points = spline(control, 4);
    const r = n === 1 ? 0.014 : 0.012;
    bone.push(
      ...polyline(
        points,
        points.map(() => r),
      ),
    );
    const last = points[points.length - 1];
    if (last) {
      const joint: Vec3 = [last[0] * 0.55, (last[1] + sternalY) / 2, front + 0.02];
      const cart = spline([last, joint, [0.06, sternalY, front + 0.01]], 4);
      cartilage.push(
        ...polyline(
          cart,
          cart.map(() => r * 0.85),
        ),
      );
    }
  });
  return { bone, cartilage };
}

/** Bounds of left-side segments mirrored to both sides. */
function mirroredBounds(segments: readonly Segment[]): Bounds {
  const b = segmentsBounds(segments, { min: [0, -1, 0], max: [0, -1, 0] }, 0.03);
  const x = Math.max(Math.abs(b.min[0]), Math.abs(b.max[0]));
  return {
    min: [-x, Math.max(b.min[1], L.bustBase[1] - 0.03), b.min[2]],
    max: [x, b.max[1], b.max[2]],
  };
}

export function ribsPart(): PartDefinition {
  const { bone } = ribPaths();
  return {
    id: 'ribs',
    layer: 'skeleton',
    look: BONE,
    field: intersect(mirrorX(segmentsField(bone, 0.006, 0.06)), aboveBase),
    bounds: mirroredBounds(bone),
    cellSize: 0.006,
  };
}

export function costalCartilagePart(): PartDefinition {
  const { cartilage } = ribPaths();
  return {
    id: 'costal-cartilage',
    layer: 'skeleton',
    look: { wash: 'washCartilage', section: { pattern: 'hatch' } },
    field: intersect(mirrorX(segmentsField(cartilage, 0.006, 0.06)), aboveBase),
    bounds: mirroredBounds(cartilage),
    cellSize: 0.006,
  };
}

/**
 * The flesh of the shoulders and chest under the robe, below the neck (where the
 * head's flesh takes over), with the airway and canal open.
 */
export function torsoPart(): PartDefinition {
  const body = offset(robeField(), -0.05);
  const head = headSkinField();
  const outsideHead: Sdf = (x, y, z) => {
    const b = body(x, y, z);
    return b > 0.05 ? b : Math.max(b, -head(x, y, z));
  };
  return {
    id: 'torso',
    layer: 'integument',
    look: { wash: 'washFlesh', inkAs: 'head', section: { pattern: 'hatch' } },
    field: subtract(
      intersect(outsideHead, aboveBase),
      union(tissueAirway(0.006), canalField(CANAL_RADIUS)),
    ),
    bounds: { min: [-1.25, L.bustBase[1] - 0.02, -0.5], max: [1.25, -0.7, 0.45] },
    cellSize: 0.02,
  };
}
