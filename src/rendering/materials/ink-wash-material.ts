/**
 * The specimen's surface material: lit washes with per-surface highlight, sheen,
 * scattering, relief and colour variation (see ink-wash.frag.glsl), self-lit glow
 * for arcane parts. Supports the renderer's clipping planes so the specimen
 * can be sectioned.
 */
import {
  AddEquation,
  Color,
  ConstantAlphaFactor,
  CustomBlending,
  NoBlending,
  OneFactor,
  OneMinusConstantAlphaFactor,
  ShaderMaterial,
  Vector2,
  Vector3,
  ZeroFactor,
} from 'three';

import noise from '../shaders/lib/noise.glsl?raw';
import fragment from '../shaders/ink-wash.frag.glsl?raw';
import vertex from '../shaders/ink-wash.vert.glsl?raw';
import { RENDER } from '../../config/render.ts';
import type { Vec3 } from '../../procedural/sdf/types.ts';
import { SURFACES, type Surface } from '../../config/surfaces.ts';
import seamChunk from '../shaders/lib/seam.glsl?raw';
import spotChunk from '../shaders/lib/spot.glsl?raw';
import { NO_SPOT, type SpotUniforms } from './spot.ts';
import swayChunk from '../shaders/lib/sway.glsl?raw';
import { NO_SEAM, type SeamUniforms } from './seam.ts';
import { type SwayUniforms, swayUniforms } from './sway.ts';

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
  /** What the part is made of; plain tissue if unset. */
  readonly surface?: Surface;
  /** The idle sway's shared uniforms (see materials/sway.ts); none if unset. */
  readonly sway?: SwayUniforms;
  /** Whether pulses of mana run through the part, and where they start. */
  readonly carriesMana?: boolean;
  readonly flowOrigin?: Vec3;
  /** The ground seam's shared uniforms (materials/seam.ts); none if unset. */
  readonly seam?: SeamUniforms;
  /** The spotlight's shared uniforms (materials/spot.ts); none if unset. */
  readonly spot?: SpotUniforms;
}

/** How a part is painted under the current look (see config/looks.ts). */
export interface SurfacePaint {
  readonly wash: string;
  /** Brightness of the surface against the ground (1 = as painted). */
  readonly gain: number;
  /** How far past white self-lit parts glow (0 = not at all), for bloom. */
  readonly emission: number;
}

export class InkWashMaterial extends ShaderMaterial {
  readonly #time: { value: number };
  readonly #wash: Color;
  readonly #gain: { value: number };
  readonly #emission: { value: number };
  readonly #glowing: boolean;
  readonly #flare: { value: number };
  readonly #pulse: { value: number };
  readonly #glowLevel: { value: number };
  readonly #flowFronts: { value: Vector2 };

  constructor({
    wash,
    glow = 0,
    partId = 255,
    useOcclusion = false,
    surface = SURFACES.TISSUE,
    sway = swayUniforms(1e9, 2e9),
    carriesMana = false,
    flowOrigin = [0, 0, 0],
    seam = NO_SEAM,
    spot = NO_SPOT,
  }: InkWashOptions) {
    const time = { value: 0 };
    const washColour = new Color(wash);
    const gain = { value: 1 };
    const emission = { value: 0 };
    const flare = { value: 0 };
    const pulse = { value: 0.5 };
    const glowLevel = { value: 1 };
    const flowFronts = { value: new Vector2(-1, -1) };
    super({
      vertexShader: vertex.replace('#include <sway>', swayChunk),
      fragmentShader: insertAfterCommon(fragment, `${noise}\n${seamChunk}\n${spotChunk}`),
      clipping: true,
      uniforms: {
        uWash: { value: washColour },
        uGain: gain,
        uEmission: emission,
        uLightDirection: { value: new Vector3(...RENDER.lightDirection).normalize() },
        uGlow: { value: glow },
        uTime: time,
        uPartId: { value: partId },
        uUseOcclusion: { value: useOcclusion ? 1 : 0 },
        uSpecular: { value: surface.specular },
        uGloss: { value: surface.gloss },
        uMetallic: { value: surface.metallic },
        uSheen: { value: surface.sheen },
        uScatter: { value: surface.scatter },
        uBump: { value: surface.bump },
        uGrain: { value: surface.grain },
        uStretch: { value: new Vector3(...surface.stretch) },
        uMottle: { value: surface.mottle },
        uFlare: flare,
        uPulse: pulse,
        uGlowLevel: glowLevel,
        uFlowFronts: flowFronts,
        uFlowOrigin: { value: new Vector3(...flowOrigin) },
        uFlow: { value: carriesMana ? 1 : 0 },

        ...sway,
        ...seam,
        ...spot,
      },
    });
    this.name = 'InkWashMaterial';
    this.#time = time;
    this.#wash = washColour;
    this.#gain = gain;
    this.#emission = emission;
    this.#glowing = glow > 0;
    this.#flare = flare;
    this.#pulse = pulse;
    this.#glowLevel = glowLevel;
    this.#flowFronts = flowFronts;
    this.ghost = null;
  }

  paint({ wash, gain, emission }: SurfacePaint) {
    this.#wash.set(wash);
    this.#gain.value = gain;
    this.#emission.value = emission;
  }

  /** 0–1: how strongly the part flares (its label is hovered or pinned). */
  set flare(amount: number) {
    this.#flare.value = amount;
  }

  /** 0–1: the glow's breath or heartbeat this frame (specimen/idle.ts). */
  set pulse(amount: number) {
    this.#pulse.value = amount;
  }

  /** Radii of the two latest mana pulses' fronts from the core (negative: none). */
  setFlowFronts(first: number, second: number) {
    this.#flowFronts.value.set(first, second);
  }

  /** 0–1: dims the glow (1 normally; a blink takes it to 0). */
  set glowLevel(amount: number) {
    this.#glowLevel.value = amount;
  }

  set time(seconds: number) {
    this.#time.value = seconds;
  }

  /**
   * Draws the part see-through at `opacity` (null for solid). Colour blends at a
   * constant opacity while the destination's alpha (the part id the outline effect
   * reads) is kept, and depth isn't written, so what's behind stays visible and
   * keeps its ink.
   *
   * Solid glowing parts are drawn with the see-through ones, after them (their
   * meshes need a higher `renderOrder`), but without blending: since see-through
   * parts write no depth, the glow isn't dimmed by the shell over it and still
   * blooms.
   */
  set ghost(opacity: number | null) {
    const on = opacity !== null;
    this.transparent = on || this.#glowing;
    this.depthWrite = !on;
    this.blending = on ? CustomBlending : NoBlending;
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
