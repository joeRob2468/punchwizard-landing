/**
 * Material for section caps: drawn only where the stencil marks the inside of a
 * part (see slicing/SectionCaps), filled with that part's section pattern.
 */
import {
  Color,
  DoubleSide,
  LessEqualDepth,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ShaderMaterial,
  Vector3,
} from 'three';

import { PALETTE } from '../../config/palette.ts';
import type { SectionPattern } from '../../procedural/format/specimen-format.ts';
import type { Vec3 } from '../../procedural/sdf/types.ts';
import fragment from '../shaders/cap.frag.glsl?raw';
import vertex from '../shaders/cap.vert.glsl?raw';
import noise from '../shaders/lib/noise.glsl?raw';

const PATTERN_IDS: Readonly<Record<SectionPattern, number>> = {
  hatch: 0,
  stipple: 1,
  rings: 2,
  glow: 3,
};

export interface CapOptions {
  readonly wash: string;
  readonly pattern: SectionPattern;
  readonly centre?: Vec3;
  /** Same id as the part's surface material (see InkWashOptions.partId). */
  readonly partId: number;
}

export class CapMaterial extends ShaderMaterial {
  readonly #time: { value: number };
  readonly #normal: { value: Vector3 };

  constructor({ wash, pattern, centre = [0, 0, 0], partId }: CapOptions) {
    const time = { value: 0 };
    const normal = { value: new Vector3(0, 0, 1) };
    super({
      vertexShader: vertex,
      fragmentShader: fragment.replace('#include <common>', `#include <common>\n${noise}`),
      side: DoubleSide,
      depthFunc: LessEqualDepth,
      // Draw only where the part's stencil count is non-zero, then reset it to 0.
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: NotEqualStencilFunc,
      stencilFail: ReplaceStencilOp,
      stencilZFail: ReplaceStencilOp,
      stencilZPass: ReplaceStencilOp,
      uniforms: {
        uWash: { value: new Color(wash) },
        uInk: { value: new Color(PALETTE.ink) },
        uNormal: normal,
        uCentre: { value: new Vector3(...centre) },
        uPattern: { value: PATTERN_IDS[pattern] },
        uTime: time,
        uPartId: { value: partId },
      },
    });
    this.name = 'CapMaterial';
    this.#time = time;
    this.#normal = normal;
  }

  set time(seconds: number) {
    this.#time.value = seconds;
  }

  set planeNormal(normal: Vector3) {
    this.#normal.value.copy(normal);
  }
}
