/**
 * Makes the irises (and pupils) follow the pointer, as if the wizard were looking
 * around. Each eye turns about its own centre toward a point on the pointer's ray,
 * part-way between camera and face, clamped to a natural range and smoothed. When
 * the pointer has been still for a while, the eyes settle on the viewer.
 */
import type { Camera, Vector2 } from 'three';
import { Quaternion, Raycaster, Vector3 } from 'three';

import type { Vec3 } from '../procedural/sdf/types.ts';

/** The eyes' rest direction in specimen space. */
const FORWARD = new Vector3(0, 0, 1);
/** Furthest the eyes turn from straight ahead (radians). */
const MAX_ANGLE = 0.5;
/** How quickly the eyes catch up (per second). */
const RESPONSIVENESS = 7;
/** Where along the pointer ray they look, as a fraction of the camera-to-eye distance. */
const FOCUS = 0.6;
/** After this long without pointer movement (ms), the eyes return to the viewer. */
const IDLE_MS = 5000;

export class GazeRig {
  readonly #rotations = new Map<string, Quaternion>();
  readonly #pivots = new Map<string, Vector3>();
  readonly #raycaster = new Raycaster();
  readonly #target = new Vector3();
  readonly #direction = new Vector3();
  readonly #desired = new Quaternion();
  #lastPointerMove = -Infinity;

  /** Registers a pivot (eye centre); returns its key. */
  add(pivot: Vec3): string {
    const key = pivot.join(',');
    if (!this.#pivots.has(key)) {
      this.#pivots.set(key, new Vector3(...pivot));
      this.#rotations.set(key, new Quaternion());
    }
    return key;
  }

  rotation(key: string): Quaternion | undefined {
    return this.#rotations.get(key);
  }

  pointerMoved(now: number): void {
    this.#lastPointerMove = now;
  }

  update(camera: Camera, pointer: Vector2, delta: number, now: number): void {
    const followPointer = now - this.#lastPointerMove < IDLE_MS;
    if (followPointer) this.#raycaster.setFromCamera(pointer, camera);
    const k = 1 - Math.exp(-delta * RESPONSIVENESS);

    for (const [key, pivot] of this.#pivots) {
      const current = this.#rotations.get(key);
      if (!current) continue;
      if (followPointer) {
        const reach = camera.position.distanceTo(pivot) * FOCUS;
        this.#raycaster.ray.at(reach, this.#target);
      } else {
        this.#target.copy(camera.position);
      }
      this.#direction.subVectors(this.#target, pivot).normalize();
      // Behind the head, or far off to the side: turn only as far as an eye can.
      this.#desired.setFromUnitVectors(FORWARD, this.#direction);
      const angle = 2 * Math.acos(Math.min(1, Math.abs(this.#desired.w)));
      if (angle > MAX_ANGLE)
        this.#desired.slerpQuaternions(new Quaternion(), this.#desired, MAX_ANGLE / angle);
      current.slerp(this.#desired, k);
    }
  }
}
