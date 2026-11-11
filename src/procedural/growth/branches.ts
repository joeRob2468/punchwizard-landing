/**
 * Branching tubes (vessels, nerves, the hat's conduit lattice) as lists of tapered
 * segments, plus an SDF for a whole list that stays fast with hundreds of
 * segments by skipping those whose bounding box is farther than the best hit.
 */
import { add, bezier, length, lerp, scale, sub } from '../sdf/math.ts';
import { smoothMin } from '../sdf/operators.ts';
import { roundCone } from '../sdf/primitives.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { between, type Random } from './random.ts';

export interface Segment {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly ra: number;
  readonly rb: number;
}

/** A tube along a quadratic Bézier, tapering from r0 to r1. */
export function curve(
  start: Vec3,
  control: Vec3,
  end: Vec3,
  r0: number,
  r1: number,
  steps = 8,
): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    segments.push({
      a: bezier(start, control, end, t0),
      b: bezier(start, control, end, t1),
      ra: r0 + (r1 - r0) * t0,
      rb: r0 + (r1 - r0) * t1,
    });
  }
  return segments;
}

export interface SproutOptions {
  /** Side branches to start from the parent segments. */
  readonly count: number;
  /** Length of each new branch. */
  readonly length: number;
  /** Starting radius as a fraction of the parent's radius there. */
  readonly radiusScale: number;
  /** Steps per branch; each step bends a little. */
  readonly steps?: number;
  /** How far branches lean from perpendicular toward the parent's direction (0–1). */
  readonly lean?: number;
  /** Optional constant pull on growth direction (e.g. downward). */
  readonly bias?: Vec3;
  /** Levels of further sprouting from the new branches. */
  readonly depth?: number;
}

/** Grows random side branches off `parents`. Returns only the new segments. */
export function sprout(
  random: Random,
  parents: readonly Segment[],
  options: SproutOptions,
): Segment[] {
  const { count, steps = 4, lean = 0.35, bias = [0, 0, 0], depth = 0 } = options;
  const grown: Segment[] = [];
  for (let n = 0; n < count && parents.length > 0; n++) {
    const parent = parents[Math.floor(random() * parents.length)];
    if (!parent) continue;
    const t = random();
    const origin = lerp(parent.a, parent.b, t);
    const parentRadius = parent.ra + (parent.rb - parent.ra) * t;
    const along = normalise(sub(parent.b, parent.a));
    let dir = normalise(
      add(add(scale(randomPerpendicular(random, along), 1 - lean), scale(along, lean)), bias),
    );
    let r = parentRadius * options.radiusScale;
    let p = origin;
    const step = options.length / steps;
    const branch: Segment[] = [];
    for (let s = 0; s < steps; s++) {
      const jitter: Vec3 = [
        between(random, -0.35, 0.35),
        between(random, -0.35, 0.35),
        between(random, -0.35, 0.35),
      ];
      dir = normalise(add(add(dir, jitter), scale(bias, 0.5)));
      const next = add(p, scale(dir, step));
      const rNext = r * 0.78;
      branch.push({ a: p, b: next, ra: r, rb: rNext });
      p = next;
      r = rNext;
    }
    grown.push(...branch);
    if (depth > 0) {
      grown.push(
        ...sprout(random, branch, {
          ...options,
          count: 1 + Math.floor(random() * 2),
          length: options.length * 0.55,
          depth: depth - 1,
        }),
      );
    }
  }
  return grown;
}

/**
 * Smooth union of all segments. Segments are bucketed into a uniform grid so a
 * sample only tests those near it; where none are within one bucket, the field
 * returns the bucket size, a safe lower bound on the distance (sign stays right,
 * which is all the narrow-band mesher needs away from the surface).
 */
export function segmentsField(segments: readonly Segment[], k = 0.012, bucket = 0.1): Sdf {
  const fields = segments.map((s) => roundCone(s.a, s.b, s.ra, s.rb));
  const lo: [number, number, number] = [Infinity, Infinity, Infinity];
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const boxes = segments.map((s) => {
    const r = Math.max(s.ra, s.rb) + k;
    const min: Vec3 = [
      Math.min(s.a[0], s.b[0]) - r,
      Math.min(s.a[1], s.b[1]) - r,
      Math.min(s.a[2], s.b[2]) - r,
    ];
    const max: Vec3 = [
      Math.max(s.a[0], s.b[0]) + r,
      Math.max(s.a[1], s.b[1]) + r,
      Math.max(s.a[2], s.b[2]) + r,
    ];
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i] ?? Infinity, min[i] ?? 0);
      hi[i] = Math.max(hi[i] ?? -Infinity, max[i] ?? 0);
    }
    return { min, max };
  });
  for (let i = 0; i < 3; i++) {
    lo[i] = (lo[i] ?? 0) - bucket;
    hi[i] = (hi[i] ?? 0) + bucket;
  }
  const n = [0, 1, 2].map((i) =>
    Math.max(1, Math.ceil(((hi[i] ?? 0) - (lo[i] ?? 0)) / bucket)),
  ) as [number, number, number];

  // Each bucket lists the segments whose box comes within one bucket of it.
  const buckets: number[][] = Array.from({ length: n[0] * n[1] * n[2] }, () => []);
  const cellOf = (v: number, axis: 0 | 1 | 2) =>
    Math.min(n[axis] - 1, Math.max(0, Math.floor((v - lo[axis]) / bucket)));
  boxes.forEach(({ min, max }, segment) => {
    const [x0, y0, z0] = [
      cellOf(min[0] - bucket, 0),
      cellOf(min[1] - bucket, 1),
      cellOf(min[2] - bucket, 2),
    ];
    const [x1, y1, z1] = [
      cellOf(max[0] + bucket, 0),
      cellOf(max[1] + bucket, 1),
      cellOf(max[2] + bucket, 2),
    ];
    for (let z = z0; z <= z1; z++) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) buckets[x + n[0] * (y + n[1] * z)]?.push(segment);
      }
    }
  });

  return (x, y, z) => {
    const outside = Math.hypot(
      Math.max(lo[0] - x, 0, x - hi[0]),
      Math.max(lo[1] - y, 0, y - hi[1]),
      Math.max(lo[2] - z, 0, z - hi[2]),
    );
    if (outside > 0) return outside + bucket;
    const list = buckets[cellOf(x, 0) + n[0] * (cellOf(y, 1) + n[1] * cellOf(z, 2))];
    if (!list || list.length === 0) return bucket;
    let d = Infinity;
    for (const i of list) {
      const fd = fields[i]?.(x, y, z) ?? Infinity;
      d = d === Infinity ? fd : smoothMin(d, fd, k);
    }
    return Math.min(d, bucket);
  };
}

function normalise(v: Vec3): Vec3 {
  const l = length(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function randomPerpendicular(random: Random, axis: Vec3): Vec3 {
  const r: Vec3 = [between(random, -1, 1), between(random, -1, 1), between(random, -1, 1)];
  const d = r[0] * axis[0] + r[1] * axis[1] + r[2] * axis[2];
  return normalise(sub(r, scale(axis, d)));
}
