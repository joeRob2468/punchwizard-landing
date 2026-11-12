/**
 * The idle sway for built-in materials (the section stencils), matching the
 * specimen's own material: injected into the vertex shader before compiling.
 */
import { type Material, Vector2 } from 'three';

import sway from '../shaders/lib/sway.glsl?raw';

export interface SwayUniforms {
  readonly uSway: { value: Vector2 };
  readonly uSwayRange: { value: Vector2 };
}

export function swayUniforms(from: number, to: number): SwayUniforms {
  return { uSway: { value: new Vector2() }, uSwayRange: { value: new Vector2(from, to) } };
}

/** Makes `material` sway with `uniforms` (shared, so updating them moves it). */
export function addSway<M extends Material>(material: M, uniforms: SwayUniforms): M {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${sway}`)
      .replace('#include <begin_vertex>', 'vec3 transformed = pwSway(vec3(position));');
  };
  material.customProgramCacheKey = () => 'sway';
  return material;
}
