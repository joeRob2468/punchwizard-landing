/**
 * Makes the irises (and pupils) follow the pointer, as if the wizard were looking
 * around. Both eyes share one rotation, aimed from the point between them, so they
 * always move together. The target is a point on the pointer's ray part-way between
 * camera and face; the turn is clamped to a natural range and smoothed. While the
 * pointer is outside the window the eyes ease back to straight ahead.
 */
import type { Camera } from 'three';
import { Quaternion, Raycaster, Vector2, Vector3 } from 'three';

import type { Vec3 } from '../procedural/sdf/types.ts';

/** The eyes' rest direction in specimen space. */
const FORWARD = new Vector3(0, 0, 1);
/**
 * How far the eyes turn from straight ahead (radians). The limit is soft: turns
 * approach it gradually, so the eyes keep responding near it instead of freezing.
 */
const MAX_ANGLE = 0.8;
/** How quickly the eyes catch up (per second). */
const RESPONSIVENESS = 7;
/** Where along the pointer ray they look, as a fraction of the camera-to-eyes distance. */
const FOCUS = 0.6;
const IDENTITY = new Quaternion();

export class GazeRig {
  readonly #rotation = new Quaternion();
  readonly #pivots = new Map<string, Vector3>();
  readonly #between = new Vector3();
  readonly #pointer = new Vector2();
  #pointerInside = false;
  readonly #raycaster = new Raycaster();
  readonly #target = new Vector3();
  readonly #direction = new Vector3();
  readonly #desired = new Quaternion();
  readonly #limited = new Quaternion();

  /** Registers a pivot (eye centre); returns its key. */
  add(pivot: Vec3): string {
    const key = pivot.join(',');
    if (!this.#pivots.has(key)) {
      this.#pivots.set(key, new Vector3(...pivot));
      this.#between.set(0, 0, 0);
      for (const p of this.#pivots.values()) this.#between.add(p);
      this.#between.divideScalar(this.#pivots.size);
    }
    return key;
  }

  /** The shared rotation (the key is accepted so callers needn't care that it's shared). */
  rotation(_key: string): Quaternion {
    return this.#rotation;
  }

  /** Pointer position in normalised device coordinates of the canvas. */
  pointerAt(x: number, y: number): void {
    this.#pointer.set(x, y);
    this.#pointerInside = true;
  }

  pointerLeft(): void {
    this.#pointerInside = false;
  }

  update(camera: Camera, delta: number): void {
    if (this.#pivots.size === 0) return;
    if (this.#pointerInside) {
      this.#raycaster.setFromCamera(this.#pointer, camera);
      this.#raycaster.ray.at(camera.position.distanceTo(this.#between) * FOCUS, this.#target);
      this.#direction.subVectors(this.#target, this.#between).normalize();
      this.#desired.setFromUnitVectors(FORWARD, this.#direction);
      // Turn only as far as an eye can, even if the pointer is behind the head.
      // (Blend into a separate quaternion: slerpQuaternions copies its first
      // argument into the target before reading the second.)
      const angle = 2 * Math.acos(Math.min(1, Math.abs(this.#desired.w)));
      if (angle > 1e-4) {
        const limited = MAX_ANGLE * Math.tanh(angle / MAX_ANGLE);
        this.#limited.slerpQuaternions(IDENTITY, this.#desired, limited / angle);
        this.#desired.copy(this.#limited);
      }
    } else {
      this.#desired.identity();
    }
    this.#rotation.slerp(this.#desired, 1 - Math.exp(-delta * RESPONSIVENESS));
  }
}
