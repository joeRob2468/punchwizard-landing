/**
 * Shared uniforms for the glow along the cut's edge (shaders/lib/cut-glow.glsl):
 * a distance field of the cut outline in the plane's coordinates, rebuilt by
 * slicing/CutGlow when the cut moves.
 */
import { type Texture, Vector3 } from 'three';

export interface CutGlowUniforms {
  /** Distance to the outline (negative inside), encoded 0–1 over `uCutRange`. */
  readonly uCutDistance: { value: Texture | null };
  /** The field's square in plane coordinates: min, max (x), and 1 once drawn (z). */
  readonly uCutGrid: { value: Vector3 };
  readonly uCutRange: { value: Vector3 };
}

export function cutGlowUniforms(): CutGlowUniforms {
  return {
    uCutDistance: { value: null },
    uCutGrid: { value: new Vector3(0, 1, 0) },
    uCutRange: { value: new Vector3(-0.2, 0.2, 0) },
  };
}

export const NO_CUT_GLOW: CutGlowUniforms = cutGlowUniforms();
