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
  Vector2,
  Vector3,
} from 'three';

import { PALETTE } from '../../config/palette.ts';
import type { SectionPattern } from '../../procedural/format/specimen-format.ts';
import type { Vec3 } from '../../procedural/sdf/types.ts';
import fragment from '../shaders/cap.frag.glsl?raw';
import vertex from '../shaders/cap.vert.glsl?raw';
import noise from '../shaders/lib/noise.glsl?raw';
import seamChunk from '../shaders/lib/seam.glsl?raw';
import spotChunk from '../shaders/lib/spot.glsl?raw';
import cutGlowChunk from '../shaders/lib/cut-glow.glsl?raw';
import { type CutGlowUniforms, NO_CUT_GLOW } from './cut-glow.ts';
import { NO_SPOT, type SpotUniforms } from './spot.ts';
import { NO_SEAM, type SeamUniforms } from './seam.ts';

const PATTERN_IDS: Readonly<Record<SectionPattern, number>> = {
  hatch: 0,
  stipple: 1,
  rings: 2,
  glow: 3,
  gyri: 4,
  strands: 5,
};

export interface CapOptions {
  readonly wash: string;
  readonly pattern: SectionPattern;
  readonly centre?: Vec3;
  /** Same id as the part's surface material (see InkWashOptions.partId). */
  readonly partId: number;
  /** Whether pulses of mana run through the part, and where they start. */
  readonly carriesMana?: boolean;
  readonly flowOrigin?: Vec3;
  /** The ground seam's shared uniforms (materials/seam.ts); none if unset. */
  readonly seam?: SeamUniforms;
  /** The spotlight's shared uniforms (materials/spot.ts); none if unset. */
  readonly spot?: SpotUniforms;
  /** The cut edge's glow (materials/cut-glow.ts); none if unset. */
  readonly cutGlow?: CutGlowUniforms;
}

/** How a cut face is painted under the current look (see config/looks.ts). */
export interface CapPaint {
  readonly wash: string;
  /** Colour of the section pattern. */
  readonly line: string;
  /** 0–1 multiplier on the section pattern. */
  readonly section: number;

  /** How far past white glowing caps go (0 = not at all), for bloom. */
  readonly emission: number;
}

export class CapMaterial extends ShaderMaterial {
  readonly #time: { value: number };
  readonly #normal: { value: Vector3 };
  readonly #wash: Color;
  readonly #line: Color;
  readonly #section: { value: number };
  readonly #emission: { value: number };
  readonly #flare: { value: number };
  readonly #pulse: { value: number };
  readonly #glowLevel: { value: number };
  readonly #flowFronts: { value: Vector2 };

  constructor({
    wash,
    pattern,
    centre = [0, 0, 0],
    partId,
    carriesMana = false,
    flowOrigin = [0, 0, 0],
    seam = NO_SEAM,
    spot = NO_SPOT,
    cutGlow = NO_CUT_GLOW,
  }: CapOptions) {
    const time = { value: 0 };
    const normal = { value: new Vector3(0, 0, 1) };
    const washColour = new Color(wash);
    const line = new Color(PALETTE.ink);
    const section = { value: 1 };
    const emission = { value: 0 };
    const flare = { value: 0 };
    const pulse = { value: 0.5 };
    const glowLevel = { value: 1 };
    const flowFronts = { value: new Vector2(-1, -1) };
    super({
      vertexShader: vertex,
      fragmentShader: fragment.replace(
        '#include <common>',
        `#include <common>\n${noise}\n${seamChunk}\n${spotChunk}\n${cutGlowChunk}`,
      ),
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
        uWash: { value: washColour },
        uInk: { value: line },
        uSection: section,
        uEmission: emission,
        uFlare: flare,
        uPulse: pulse,
        uGlowLevel: glowLevel,
        uFlowFronts: flowFronts,
        uFlowOrigin: { value: new Vector3(...flowOrigin) },
        uFlow: { value: carriesMana ? 1 : 0 },

        uNormal: normal,
        uCentre: { value: new Vector3(...centre) },
        uPattern: { value: PATTERN_IDS[pattern] },
        uTime: time,
        uPartId: { value: partId },
        ...seam,
        ...spot,
        ...cutGlow,
      },
    });
    this.name = 'CapMaterial';
    this.#time = time;
    this.#normal = normal;
    this.#wash = washColour;
    this.#line = line;
    this.#section = section;
    this.#emission = emission;
    this.#flare = flare;
    this.#pulse = pulse;
    this.#glowLevel = glowLevel;
    this.#flowFronts = flowFronts;
  }

  paint({ wash, line, section, emission }: CapPaint) {
    this.#emission.value = emission;
    this.#wash.set(wash);
    this.#line.set(line);
    this.#section.value = section;
  }

  set time(seconds: number) {
    this.#time.value = seconds;
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

  /** 0–1: dims a glowing cut face (a blink). */
  set glowLevel(amount: number) {
    this.#glowLevel.value = amount;
  }

  set planeNormal(normal: Vector3) {
    this.#normal.value.copy(normal);
  }
}
