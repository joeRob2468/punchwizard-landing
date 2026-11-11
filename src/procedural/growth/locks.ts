/**
 * Locks of hair (beard, moustache, eyebrows, the hair under the hat) grown as
 * chains of tapered segments. Each lock starts at a root, is pulled by gravity and
 * optionally toward a target, waves a little, and is pushed out of collider fields
 * (head, robe, hat) so it drapes over them instead of passing through. A clump is
 * a guide lock with a few thinner strands around it that gather toward the tip,
 * which reads as a sculpted lock with grooves once the segments are blended.
 */
import { add, cross, dot, length, normalise, scale, sub } from '../sdf/math.ts';
import { normalAt } from '../sdf/surface.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import type { Segment } from './branches.ts';
import { between, type Random } from './random.ts';

export interface LockOptions {
  readonly root: Vec3;
  /** Starting direction (need not be unit length). */
  readonly direction: Vec3;
  readonly length: number;
  /** Radius at the root and at the tip. */
  readonly rootRadius: number;
  readonly tipRadius: number;
  readonly steps?: number;
  /** Downward pull added to the direction each step, per unit of length. */
  readonly gravity?: number;
  /**
   * Constant pull per unit of length besides gravity, e.g. forward so hair that
   * lands on a shoulder slides down the chest instead of off the arm.
   */
  readonly drift?: Vec3;
  /** Point the lock bends toward, and how strongly (per unit of length). */
  readonly target?: Vec3;
  readonly pull?: number;
  /**
   * Turn applied to the direction each unit of length about this axis (radians),
   * growing toward the tip: curls the end of a moustache or a lock.
   */
  readonly curl?: { readonly axis: Vec3; readonly rate: number };
  /** Sideways wave: amplitude (fraction of a step) and waves per unit of length. */
  readonly wave?: { readonly amplitude: number; readonly frequency: number };
  /** Fields the lock must stay outside of (union of head, robe, ...). */
  readonly collider?: Sdf;
  /** Extra gap kept from the collider beyond the lock's own radius. */
  readonly clearance?: number;
}

export interface Lock {
  /** Centre line, root first. */
  readonly points: Vec3[];
  readonly radii: number[];
}

/** Grows one lock's centre line. */
export function growLock(random: Random, options: LockOptions): Lock {
  const {
    root,
    length: total,
    rootRadius,
    tipRadius,
    steps = 12,
    gravity = 0,
    pull = 0,
    clearance = 0.004,
  } = options;
  const step = total / steps;
  let dir = normalise(options.direction);
  const side = normalise(perpendicular(dir, random));
  const phase = random() * Math.PI * 2;

  const points: Vec3[] = [root];
  const radii: number[] = [rootRadius];
  let p = root;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    let steer: Vec3 = [0, -gravity * step, 0];
    if (options.drift) steer = add(steer, scale(options.drift, step));
    if (options.target && pull > 0) {
      steer = add(steer, scale(normalise(sub(options.target, p)), pull * step));
    }
    if (options.wave) {
      const w = Math.sin(phase + s * step * options.wave.frequency * Math.PI * 2);
      steer = add(steer, scale(side, w * options.wave.amplitude));
    }
    dir = normalise(add(dir, steer));
    if (options.curl) dir = rotate(dir, options.curl.axis, options.curl.rate * step * t * 2);

    const r = rootRadius + (tipRadius - rootRadius) * t ** 0.8;
    let next = add(p, scale(dir, step));
    if (options.collider) {
      // Push the point out of the collider, then keep only the tangential part of
      // the direction so the lock slides along the surface rather than bouncing.
      const need = r + clearance;
      const d = options.collider(next[0], next[1], next[2]);
      if (d < need) {
        const n = normalAt(options.collider, next);
        next = add(next, scale(n, need - d));
        const into = dot(dir, n);
        if (into < 0) dir = normalise(sub(dir, scale(n, into)));
      }
    }
    points.push(next);
    radii.push(r);
    p = next;
  }
  return { points, radii };
}

export interface ClumpOptions extends LockOptions {
  /** Thinner strands around the guide lock. */
  readonly strands: number;
  /** How far strands sit from the guide's centre line at the root. */
  readonly spread: number;
  /** Strand radius as a fraction of the guide's. */
  readonly strandScale?: number;
}

/**
 * A guide lock plus strands that start spread around it and gather toward its
 * tip. The guide keeps clear of colliders by its radius plus the spread, so the
 * strands do too without testing them.
 */
export function growClump(random: Random, options: ClumpOptions): Segment[] {
  const { strands, spread, strandScale = 0.65 } = options;
  const guide = growLock(random, {
    ...options,
    clearance: (options.clearance ?? 0.004) + spread * 0.6,
  });
  const segments = toSegments(guide);
  for (let i = 0; i < strands; i++) {
    const angle = (i / strands) * Math.PI * 2 + between(random, -0.4, 0.4);
    const reach = spread * between(random, 0.7, 1.1);
    const lengthFraction = between(random, 0.8, 1);
    const wobble = random() * Math.PI * 2;
    const points: Vec3[] = [];
    const radii: number[] = [];
    const last = Math.max(1, Math.round((guide.points.length - 1) * lengthFraction));
    for (let k = 0; k <= last; k++) {
      const centre = guide.points[k];
      const r = guide.radii[k];
      if (!centre || r === undefined) break;
      const t = k / (guide.points.length - 1);
      const [u, v] = frame(guide.points, k);
      const a = angle + Math.sin(wobble + t * 5) * 0.4;
      const off = reach * (1 - 0.75 * t);
      points.push(add(centre, add(scale(u, Math.cos(a) * off), scale(v, Math.sin(a) * off))));
      radii.push(r * strandScale);
    }
    segments.push(...toSegments({ points, radii }));
  }
  return segments;
}

export function toSegments({ points, radii }: Lock): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const ra = radii[i];
    const rb = radii[i + 1];
    if (a && b && ra !== undefined && rb !== undefined) segments.push({ a, b, ra, rb });
  }
  return segments;
}

/** Two unit vectors perpendicular to the centre line at point k. */
function frame(points: readonly Vec3[], k: number): [Vec3, Vec3] {
  const a = points[Math.max(0, k - 1)] ?? [0, 0, 0];
  const b = points[Math.min(points.length - 1, k + 1)] ?? [0, -1, 0];
  const tangent = normalise(sub(b, a));
  const reference: Vec3 = Math.abs(tangent[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalise(cross(tangent, reference));
  return [u, cross(tangent, u)];
}

function perpendicular(v: Vec3, random: Random): Vec3 {
  const r: Vec3 = [between(random, -1, 1), between(random, -1, 1), between(random, -1, 1)];
  const p = sub(r, scale(v, dot(r, v)));
  return length(p) > 1e-6 ? p : cross(v, [0, 0, 1]);
}

/** Rodrigues rotation of v about a unit-ish axis. */
function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const k = normalise(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
}
