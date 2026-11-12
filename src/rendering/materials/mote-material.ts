/**
 * Faint floating motes (see motes.*.glsl): additive points, catching the
 * spotlight where they drift through its beam.
 */
import { AddEquation, CustomBlending, OneFactor, ShaderMaterial, ZeroFactor } from 'three';

import { LIGHTING } from '../../config/lighting.ts';
import fragment from '../shaders/motes.frag.glsl?raw';
import vertex from '../shaders/motes.vert.glsl?raw';
import spotChunk from '../shaders/lib/spot.glsl?raw';
import type { SpotUniforms } from './spot.ts';

export class MoteMaterial extends ShaderMaterial {
  readonly #time: { value: number };
  readonly #level: { value: number };

  constructor(pixelRatio: number, spot: SpotUniforms) {
    const time = { value: 0 };
    const level = { value: 1 };
    super({
      vertexShader: vertex.replace('#include <spot>', spotChunk),
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
      uniforms: {
        uTime: time,
        uLevel: level,
        uPixelRatio: { value: pixelRatio },
        uOutside: { value: LIGHTING.motes.outside },
        uInside: { value: LIGHTING.motes.inside },
        ...spot,
      },
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
