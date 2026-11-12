/**
 * Shared uniforms for the spotlight (shaders/lib/spot.glsl): one set for every
 * surface and cut face, moved each frame by specimen/SpotRig.
 */
import { Color, Matrix4, type Texture, Vector2, Vector3 } from 'three';

export interface SpotUniforms {
  readonly uSpotPosition: { value: Vector3 };
  readonly uSpotDirection: { value: Vector3 };
  readonly uSpotCone: { value: Vector2 };
  readonly uSpotColour: { value: Color };
  readonly uDrama: { value: number };
  /** The spot's depth map (specimen/SpotShadow) and its view-projection matrix. */
  readonly uShadowMap: { value: Texture | null };
  readonly uShadowMatrix: { value: Matrix4 };
  /** One texel of the depth map, in uv. */
  readonly uShadowTexel: { value: number };
  /** 1 once the depth map has been drawn. */
  readonly uShadowOn: { value: number };
}

export function spotUniforms(): SpotUniforms {
  return {
    uSpotPosition: { value: new Vector3(0, 5, 3) },
    uSpotDirection: { value: new Vector3(0, -1, 0) },
    uSpotCone: { value: new Vector2(0.8, 0.95) },
    uSpotColour: { value: new Color('#ffffff') },
    uDrama: { value: 0 },
    uShadowMap: { value: null },
    uShadowMatrix: { value: new Matrix4() },
    uShadowTexel: { value: 1 / 1024 },
    uShadowOn: { value: 0 },
  };
}

/** For materials the spotlight doesn't touch. */
export const NO_SPOT: SpotUniforms = spotUniforms();

/** How strongly the view uses the spotlight (0–1). */
export function setDrama(spot: SpotUniforms, amount: number): void {
  spot.uDrama.value = amount;
}

/** Hands the materials the spot's depth map and where it was drawn from. */
export function setShadow(spot: SpotUniforms, map: Texture, matrix: Matrix4, size: number): void {
  spot.uShadowMap.value = map;
  spot.uShadowMatrix.value.copy(matrix);
  spot.uShadowTexel.value = 1 / size;
  spot.uShadowOn.value = 1;
}
