/**
 * Post-processing effects for the plate: ink outlines and the paper composite.
 * Both replace the input colour outright (BlendFunction.SET); order matters, so
 * outlines are drawn before the paper multiplies everything.
 */
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import { Color, Uniform, Vector2, type WebGLRenderer, type WebGLRenderTarget } from 'three';

import { PALETTE } from '../../config/palette.ts';
import { RENDER } from '../../config/render.ts';
import { FX } from '../../config/fx.ts';
import haze from '../shaders/haze.frag.glsl?raw';
import noise from '../shaders/lib/noise.glsl?raw';
import outline from '../shaders/outline.frag.glsl?raw';
import paper from '../shaders/paper.frag.glsl?raw';

export class OutlineEffect extends Effect {
  /** Sets the line colour and scales the outline strengths (1 = as configured). */
  paint(line: string, strength: number) {
    colourUniform(this, 'uInk').set(line);
    numberUniform(this, 'uStrength').value = RENDER.outlineStrength * strength;
    numberUniform(this, 'uPartEdgeStrength').value = RENDER.partEdgeStrength * strength;
  }

  constructor() {
    super('OutlineEffect', `${noise}\n${outline}`, {
      // Samples neighbouring pixels, so it must lead its own pass.
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uInk', new Uniform(new Color(PALETTE.ink))],
        ['uWidth', new Uniform(RENDER.outlineWidth)],
        ['uStrength', new Uniform(RENDER.outlineStrength)],
        ['uPartEdgeStrength', new Uniform(RENDER.partEdgeStrength)],
      ]),
    });
  }
}

/** Depth haze and drifting wisps (see haze.frag.glsl). */
export class HazeEffect extends Effect {
  constructor() {
    super('HazeEffect', `${noise}\n${haze}`, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uHaze', new Uniform(new Color('#ffffff'))],
        ['uTime', new Uniform(0)],
        ['uRange', new Uniform(new Vector2(...FX.haze.range))],
        ['uDepthStrength', new Uniform(FX.haze.depth)],
        ['uWispStrength', new Uniform(FX.haze.wisps)],
      ]),
    });
  }

  paint(haze: string) {
    colourUniform(this, 'uHaze').set(haze);
  }

  /** Places the depth haze relative to the distance to the specimen's centre. */
  focusAt(distance: number) {
    const range = this.uniforms.get('uRange')?.value as Vector2;
    range.set(distance + FX.haze.range[0], distance + FX.haze.range[1]);
  }

  override update(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget, deltaTime?: number) {
    super.update(renderer, inputBuffer, deltaTime);
    numberUniform(this, 'uTime').value += deltaTime ?? 0;
  }
}

export class PaperEffect extends Effect {
  /** Sets the paper colours, and whether the scene is pigment (multiplied) or light (screened). */
  paint(paper: string, shadow: string, foxing: string, dark: boolean) {
    colourUniform(this, 'uPaper').set(paper);
    colourUniform(this, 'uPaperShadow').set(shadow);
    colourUniform(this, 'uFoxing').set(foxing);
    numberUniform(this, 'uDark').value = dark ? 1 : 0;
  }

  constructor() {
    super('PaperEffect', `${noise}\n${paper}`, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uPaper', new Uniform(new Color(PALETTE.paper))],
        ['uPaperShadow', new Uniform(new Color(PALETTE.paperShadow))],
        ['uFoxing', new Uniform(new Color(PALETTE.foxing))],
        ['uDark', new Uniform(0)],
      ]),
    });
  }
}

function colourUniform(effect: Effect, name: string): Color {
  const value: unknown = effect.uniforms.get(name)?.value;
  if (!(value instanceof Color)) throw new Error(`${effect.name}: no colour uniform ${name}`);
  return value;
}

function numberUniform(effect: Effect, name: string): Uniform<number> {
  const uniform = effect.uniforms.get(name) as Uniform<number> | undefined;
  if (typeof uniform?.value !== 'number') throw new Error(`${effect.name}: no uniform ${name}`);
  return uniform;
}
