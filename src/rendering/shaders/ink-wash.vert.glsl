#include <common>
#include <clipping_planes_pars_vertex>

varying vec3 vViewNormal;
varying vec3 vObjectPosition;
varying vec3 vObjectNormal;

void main() {
  vObjectPosition = position;
  vObjectNormal = normal;
  vViewNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  #include <clipping_planes_vertex>
  gl_Position = projectionMatrix * mvPosition;
}
