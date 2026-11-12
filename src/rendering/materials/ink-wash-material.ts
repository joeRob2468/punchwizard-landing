/**
 * The plate's surface material: flat watercolour washes with ink hatching in deep
 * shadow. Supports the renderer's clipping planes so the specimen can be sectioned.
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
import { PALETTE } from '../../config/palette.ts';
import { RENDER } from '../../config/render.ts';

export interface InkWashOptions {
  /** Wash colour as a CSS colour string (usually from PALETTE). */
  readonly wash: string;
  /** 0 for ordinary pigment, 1 for a self-lit arcane wash. */
  readonly glow?: number;
  /** Hatch lines per object-space unit. */
  readonly hatchScale?: number;
  /**
   * 1–254, unique per part. Written to the alpha channel so the outline effect can
   * ink boundaries between parts; 255 is reserved for the background and helpers.
   */
  readonly partId?: number;
  /** Read the baked `occlusion` vertex attribute (specimen parts have it). */
  readonly useOcclusion?: boolean;
  /** Hatch along hanging strands (hair) instead of across the form. */
  readonly strands?: boolean;
}

export class InkWashMaterial extends ShaderMaterial {
  readonly #time: { value: number };

  constructor({
    wash,
    glow = 0,
    hatchScale = RENDER.hatchScale,
    partId = 255,
    useOcclusion = false,
    strands = false,
  }: InkWashOptions) {
    const time = { value: 0 };
    super({
      vertexShader: vertex,
      fragmentShader: insertAfterCommon(fragment, noise),
      clipping: true,
      uniforms: {
        uWash: { value: new Color(wash) },
        uInk: { value: new Color(PALETTE.ink) },
        uLightDirection: { value: new Vector3(...RENDER.lightDirection).normalize() },
        uHatchScale: { value: hatchScale },
        uGlow: { value: glow },
        uTime: time,
        uPartId: { value: partId },
        uUseOcclusion: { value: useOcclusion ? 1 : 0 },
        uStrands: { value: strands ? 1 : 0 },
      },
    });
    this.name = 'InkWashMaterial';
    this.#time = time;
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
