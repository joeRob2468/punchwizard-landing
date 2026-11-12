/**
 * Faint floating motes (see motes.*.glsl): additive points.
 */
import { AddEquation, CustomBlending, OneFactor, ShaderMaterial, ZeroFactor } from 'three';

import fragment from '../shaders/motes.frag.glsl?raw';
import vertex from '../shaders/motes.vert.glsl?raw';

export class MoteMaterial extends ShaderMaterial {
  readonly #time: { value: number };
  readonly #level: { value: number };

  constructor(pixelRatio: number) {
    const time = { value: 0 };
    const level = { value: 1 };
    super({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      // Keep the part ids the outline effect reads from alpha.
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
      uniforms: { uTime: time, uLevel: level, uPixelRatio: { value: pixelRatio } },
    });
    this.name = 'MoteMaterial';
    this.#time = time;
    this.#level = level;
  }

  set time(seconds: number) {
    this.#time.value = seconds;
  }

  /** 0–1: overall strength. */
  set level(amount: number) {
    this.#level.value = amount;
  }
}
