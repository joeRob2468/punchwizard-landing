/**
 * Post-processing effects for the plate: ink outlines and the paper composite.
 * Both replace the input colour outright (BlendFunction.SET); order matters, so
 * outlines are drawn before the paper multiplies everything.
 */
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import { Color, Uniform } from 'three';

import { PALETTE } from '../../config/palette.ts';
import { RENDER } from '../../config/render.ts';
import noise from '../shaders/lib/noise.glsl?raw';
import outline from '../shaders/outline.frag.glsl?raw';
import paper from '../shaders/paper.frag.glsl?raw';

export class OutlineEffect extends Effect {
  constructor() {
    super('OutlineEffect', `${noise}\n${outline}`, {
      attributes: EffectAttribute.DEPTH,
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

export class PaperEffect extends Effect {
  constructor() {
    super('PaperEffect', `${noise}\n${paper}`, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uPaper', new Uniform(new Color(PALETTE.paper))],
        ['uPaperShadow', new Uniform(new Color(PALETTE.paperShadow))],
        ['uFoxing', new Uniform(new Color(PALETTE.foxing))],
      ]),
    });
  }
}
