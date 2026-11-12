/**
 * The specimen's surface material: lit washes (see ink-wash.frag.glsl), self-lit
 * glow for arcane parts. Supports the renderer's clipping planes so the specimen
 * can be sectioned.
 */
import {
  AddEquation,
  Color,
  ConstantAlphaFactor,
  CustomBlending,
  NormalBlending,
  OneFactor,
  OneMinusConstantAlphaFactor,
  ShaderMaterial,
  Vector3,
  ZeroFactor,
} from 'three';

import noise from '../shaders/lib/noise.glsl?raw';
import fragment from '../shaders/ink-wash.frag.glsl?raw';
import vertex from '../shaders/ink-wash.vert.glsl?raw';
import { RENDER } from '../../config/render.ts';

export interface InkWashOptions {
  /** Wash colour as a CSS colour string (usually from PALETTE). */
  readonly wash: string;
  /** 0 for ordinary pigment, 1 for a self-lit arcane wash. */
  readonly glow?: number;
  /**
   * 1–254, unique per part. Written to the alpha channel so the outline effect can
   * ink boundaries between parts; 255 is reserved for the background and helpers.
   */
  readonly partId?: number;
  /** Read the baked `occlusion` vertex attribute (specimen parts have it). */
  readonly useOcclusion?: boolean;
}

/** How a part is painted under the current look (see config/looks.ts). */
export interface SurfacePaint {
  readonly wash: string;
  /** Light laid on a dark ground rather than pigment on white. */
  readonly dark: boolean;
  /** Brightness of the surface against the ground (1 = as painted). */
  readonly gain: number;
  /** How far past white self-lit parts glow (0 = not at all), for bloom. */
  readonly emission: number;
}

export class InkWashMaterial extends ShaderMaterial {
  readonly #time: { value: number };
  readonly #wash: Color;
  readonly #blank: Color;
  readonly #gain: { value: number };
  readonly #emission: { value: number };

  constructor({ wash, glow = 0, partId = 255, useOcclusion = false }: InkWashOptions) {
    const time = { value: 0 };
    const washColour = new Color(wash);
    const blank = new Color(1, 1, 1);
    const gain = { value: 1 };
    const emission = { value: 0 };
    super({
      vertexShader: vertex,
      fragmentShader: insertAfterCommon(fragment, noise),
      clipping: true,
      uniforms: {
        uWash: { value: washColour },
        uBlank: { value: blank },
        uGain: gain,
        uEmission: emission,
        uLightDirection: { value: new Vector3(...RENDER.lightDirection).normalize() },
        uGlow: { value: glow },
        uTime: time,
        uPartId: { value: partId },
        uUseOcclusion: { value: useOcclusion ? 1 : 0 },
      },
    });
    this.name = 'InkWashMaterial';
    this.#time = time;
    this.#wash = washColour;
    this.#blank = blank;
    this.#gain = gain;
    this.#emission = emission;
  }

  paint({ wash, dark, gain, emission }: SurfacePaint) {
    this.#wash.set(wash);
    this.#blank.setScalar(dark ? 0 : 1);
    this.#gain.value = gain;
    this.#emission.value = emission;
  }

  set time(seconds: number) {
    this.#time.value = seconds;
  }

  /**
   * Draws the part see-through at `opacity` (null for solid). Colour blends at a
   * constant opacity while the destination's alpha (the part id the outline effect
   * reads) is kept, and depth isn't written, so what's behind stays visible and
   * keeps its ink.
   */
  set ghost(opacity: number | null) {
    const on = opacity !== null;
    this.transparent = on;
    this.depthWrite = !on;
    this.blending = on ? CustomBlending : NormalBlending;
    this.blendEquation = AddEquation;
    this.blendSrc = ConstantAlphaFactor;
    this.blendDst = OneMinusConstantAlphaFactor;
    this.blendSrcAlpha = ZeroFactor;
    this.blendDstAlpha = OneFactor;
    this.blendAlpha = opacity ?? 1;
  }
}

/** Shader chunks must follow three's `#include <common>`, which defines helpers they use. */
function insertAfterCommon(shader: string, chunk: string): string {
  return shader.replace('#include <common>', `#include <common>\n${chunk}`);
}
