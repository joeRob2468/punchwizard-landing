/**
 * The crackling spark at the hat's tip (see spark.frag.glsl): additive, past
 * white so it blooms, clipped by the section plane.
 */
import { AddEquation, Color, CustomBlending, OneFactor, ShaderMaterial, ZeroFactor } from 'three';

import noise from '../shaders/lib/noise.glsl?raw';
import fragment from '../shaders/spark.frag.glsl?raw';
import vertex from '../shaders/spark.vert.glsl?raw';

export class SparkMaterial extends ShaderMaterial {
  readonly #time: { value: number };
  readonly #flash: { value: number };
  readonly #level: { value: number };
  readonly #colour: Color;

  constructor(colour: string) {
    const time = { value: 0 };
    const flash = { value: 0 };
    const level = { value: 1 };
    const tint = new Color(colour);
    super({
      vertexShader: vertex,
      fragmentShader: fragment.replace('#include <common>', `#include <common>\n${noise}`),
      clipping: true,
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
        uColour: { value: tint },
        uTime: time,
        uFlash: flash,
        uLevel: level,
      },
    });
    this.name = 'SparkMaterial';
    this.#time = time;
    this.#flash = flash;
    this.#level = level;
    this.#colour = tint;
  }

  set colour(css: string) {
    this.#colour.set(css);
  }

  set time(seconds: number) {
    this.#time.value = seconds;
  }

  /** 0–1: a mana pulse arriving. */
  set flash(amount: number) {
    this.#flash.value = amount;
  }

  /** 0–1: overall strength. */
  set level(amount: number) {
    this.#level.value = amount;
  }
}
