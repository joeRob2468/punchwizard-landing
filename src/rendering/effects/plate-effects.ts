/**
 * Post-processing effects for the plate: ink outlines and the paper composite.
 * Both replace the input colour outright (BlendFunction.SET); order matters, so
 * outlines are drawn before the paper multiplies everything.
 */
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import { Color, type Texture, Uniform, Vector2, Vector3 } from 'three';

import { PALETTE } from '../../config/palette.ts';
import { RENDER } from '../../config/render.ts';
import marginalia from '../shaders/marginalia.glsl?raw';
import noise from '../shaders/lib/noise.glsl?raw';
import outline from '../shaders/outline.frag.glsl?raw';
import reveal from '../shaders/lib/reveal.glsl?raw';
import paper from '../shaders/paper.frag.glsl?raw';
import grade from '../shaders/grade.frag.glsl?raw';
import { FX } from '../../config/fx.ts';

export class OutlineEffect extends Effect {
  /** Sets the line colour and scales the outline strengths (1 = as configured). */
  paint(line: string, strength: number) {
    colourUniform(this, 'uInk').set(line);
    numberUniform(this, 'uStrength').value = RENDER.outlineStrength * strength;
    numberUniform(this, 'uPartEdgeStrength').value = RENDER.partEdgeStrength * strength;
  }

  /** The ink-in on load: how far it has got (0–1) and where it spreads from (uv). */
  setReveal(value: number, centreU: number, centreV: number) {
    numberUniform(this, 'uReveal').value = value;
    (this.uniforms.get('uCentre')?.value as Vector2).set(centreU, centreV);
  }

  constructor() {
    super('OutlineEffect', `${noise}\n${reveal}\n${outline}`, {
      // Samples neighbouring pixels, so it must lead its own pass.
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uInk', new Uniform(new Color(PALETTE.ink))],
        ['uWidth', new Uniform(RENDER.outlineWidth)],
        ['uStrength', new Uniform(RENDER.outlineStrength)],
        ['uPartEdgeStrength', new Uniform(RENDER.partEdgeStrength)],
        ['uCentre', new Uniform(new Vector2(0.5, 0.5))],
        // Nothing inked until the specimen is ready (PlateEffects drives it).
        ['uReveal', new Uniform(0)],
      ]),
    });
  }
}

export class PaperEffect extends Effect {
  /** Sets the paper colours and how strongly its texture shows (0–1). */
  /** Marginalia colour and strength (0–1). */
  paintMarginalia(chalk: string, strength: number) {
    colourUniform(this, 'uChalk').set(chalk);
    numberUniform(this, 'uMarginalia').value = strength;
  }

  /** How far the ink-in on load has got (0–1; 1 = everything inked). */
  setReveal(value: number) {
    numberUniform(this, 'uReveal').value = value;
  }

  /** Centres the marginalia on the specimen (uv) and moves them on to `seconds`. */
  frame(centreU: number, centreV: number, seconds: number) {
    (this.uniforms.get('uCentre')?.value as Vector2).set(centreU, centreV);
    numberUniform(this, 'uTime').value = seconds;
  }

  paint(paper: string, shadow: string, foxing: string, texture: number) {
    numberUniform(this, 'uTexture').value = texture;
    colourUniform(this, 'uPaper').set(paper);
    colourUniform(this, 'uPaperShadow').set(shadow);
    colourUniform(this, 'uFoxing').set(foxing);
  }

  constructor() {
    super('PaperEffect', `${noise}\n${reveal}\n${marginalia}\n${paper}`, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uPaper', new Uniform(new Color(PALETTE.paper))],
        ['uPaperShadow', new Uniform(new Color(PALETTE.paperShadow))],
        ['uFoxing', new Uniform(new Color(PALETTE.foxing))],
        ['uTexture', new Uniform(1)],
        ['uChalk', new Uniform(new Color('#ffffff'))],
        ['uMarginalia', new Uniform(0)],
        // Nothing inked until the specimen is ready (PlateEffects drives it).
        ['uReveal', new Uniform(0)],
        ['uCentre', new Uniform(new Vector2(0.5, 0.5))],
        ['uTime', new Uniform(0)],
      ]),
    });
  }
}

/** The colour grade (shaders/grade.frag.glsl), last before the lens grain and vignette. */
export class GradeEffect extends Effect {
  /** The bloom's blurred highlights, for halation. */
  setBloom(texture: Texture | null) {
    const uniform = this.uniforms.get('uBloom');
    if (uniform) uniform.value = texture;
  }

  /** The current view's split-toning and halation (0–1 each). */
  paint(split: number, halation: number) {
    numberUniform(this, 'uSplit').value = split;
    numberUniform(this, 'uHalation').value = halation * FX.grade.halation;
  }

  /** 1 for the full grade, 0 for none (the dev build compares with G). */
  setAmount(amount: number) {
    numberUniform(this, 'uGrade').value = amount;
  }

  constructor() {
    super('GradeEffect', grade, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uBloom', new Uniform(null)],
        ['uGrade', new Uniform(1)],
        ['uSplit', new Uniform(1)],
        ['uHalation', new Uniform(FX.grade.halation)],
        ['uShadowTint', new Uniform(new Vector3(...FX.grade.shadowTint))],
        ['uShadowLift', new Uniform(new Vector3(...FX.grade.shadowLift))],
        ['uHighlightGain', new Uniform(FX.grade.highlightGain)],
        ['uHighlightTint', new Uniform(new Vector3(...FX.grade.highlightTint))],
        ['uHalationTint', new Uniform(new Vector3(...FX.grade.halationTint))],
        ['uContrast', new Uniform(FX.grade.contrast)],
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
