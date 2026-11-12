#include <common>
#include <clipping_planes_pars_vertex>

varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vObjectPosition;
varying float vOcclusion;

// Baked per vertex (1 = open). Geometry without it reads 0 here, so the material
// tells the shader whether to use it.
attribute float occlusion;
uniform float uUseOcclusion;

void main() {
  vObjectPosition = position;
  vOcclusion = mix(1.0, occlusion, uUseOcclusion);
  vViewNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  #include <clipping_planes_vertex>
  gl_Position = projectionMatrix * mvPosition;
}
