/**
 * Shared uniforms for the spotlight (shaders/lib/spot.glsl): one set for every
 * surface and cut face, moved each frame by specimen/SpotRig.
 */
import { Color, Vector2, Vector3 } from 'three';

export interface SpotUniforms {
  readonly uSpotPosition: { value: Vector3 };
  readonly uSpotDirection: { value: Vector3 };
  readonly uSpotCone: { value: Vector2 };
  readonly uSpotColour: { value: Color };
  readonly uDrama: { value: number };
}

export function spotUniforms(): SpotUniforms {
  return {
    uSpotPosition: { value: new Vector3(0, 5, 3) },
    uSpotDirection: { value: new Vector3(0, -1, 0) },
    uSpotCone: { value: new Vector2(0.8, 0.95) },
    uSpotColour: { value: new Color('#ffffff') },
    uDrama: { value: 0 },
  };
}

/** For materials the spotlight doesn't touch. */
export const NO_SPOT: SpotUniforms = spotUniforms();

/** How strongly the view uses the spotlight (0–1). */
export function setDrama(spot: SpotUniforms, amount: number): void {
  spot.uDrama.value = amount;
}
