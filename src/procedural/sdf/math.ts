/** Small vector helpers for building SDFs (not used in per-sample hot paths). */
import type { Vec3 } from './types.ts';

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const mirrorX = (a: Vec3): Vec3 => [-a[0], a[1], a[2]];
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Quadratic Bézier point, handy for curved spines (hat, beard). */
export const bezier = (a: Vec3, control: Vec3, b: Vec3, t: number): Vec3 =>
  lerp(lerp(a, control, t), lerp(control, b, t), t);
