/**
 * Pure helpers for the spotlight's movement: it sits up and to the viewer's left
 * of the head, follows the camera's turn lazily, and drifts a little on its own.
 */
import type { Vec3 } from '../procedural/sdf/types.ts';

export interface SpotPath {
  /** Radians round the vertical axis from the camera (negative: to the viewer's left). */
  readonly offset: number;
  /** Radians above the horizontal. */
  readonly elevation: number;
  readonly distance: number;
  readonly target: Vec3;
  /** Drift: radians of azimuth and elevation, at these angular speeds (rad/s). */
  readonly drift: { readonly azimuth: number; readonly elevation: number; readonly speed: number };
}

/** Moves `current` toward `target` by `ease` (0–1), the short way round. */
export function easeAngle(current: number, target: number, ease: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * ease;
}

/** The spot's position for an azimuth (already eased) at time `t` (seconds). */
export function spotPosition(path: SpotPath, azimuth: number, t: number): Vec3 {
  const { drift } = path;
  const az = azimuth + drift.azimuth * Math.sin(t * drift.speed);
  const el = path.elevation + drift.elevation * Math.sin(t * drift.speed * 0.7 + 1.3);
  const [tx, ty, tz] = path.target;
  const flat = Math.cos(el) * path.distance;
  return [tx + Math.sin(az) * flat, ty + Math.sin(el) * path.distance, tz + Math.cos(az) * flat];
}
