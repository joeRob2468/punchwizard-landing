/**
 * Shared uniforms for the ground seam (shaders/lib/seam.glsl): the light where the
 * specimen meets the rune circle on the ground. One set is shared by every part's
 * surface and cut face, so a change of view recolours them all together.
 */
import { Color } from 'three';

export interface SeamUniforms {
  readonly uSeamY: { value: number };
  readonly uSeamColour: { value: Color };
  readonly uSeamWidth: { value: number };
  readonly uSeamStrength: { value: number };
}

export function seamUniforms(y: number, width: number, strength: number): SeamUniforms {
  return {
    uSeamY: { value: y },
    uSeamColour: { value: new Color('#ffffff') },
    uSeamWidth: { value: width },
    uSeamStrength: { value: strength },
  };
}

/** For materials that never touch the ground. */
export const NO_SEAM: SeamUniforms = seamUniforms(-1e9, 1, 0);
