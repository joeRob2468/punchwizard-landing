// Flat watercolour washes in three tone bands, with painted (noisy) band edges,
// pigment pooling along those edges and sparse ink hatching in the deepest shadow.
// Colours are "pigment on white": the paper effect multiplies them onto paper.

#include <common>
#include <clipping_planes_pars_fragment>

uniform vec3 uWash;
uniform vec3 uInk;
uniform vec3 uLightDirection; // view space, normalised
uniform float uHatchScale; // hatch lines per object-space unit
uniform float uGlow; // 0 = ordinary pigment, 1 = self-lit arcane wash
uniform float uTime;

varying vec3 vViewNormal;
varying vec3 vObjectPosition;
varying vec3 vObjectNormal;

// Tone thresholds between bands (light | mid | shadow | deep shadow).
const float LIGHT_EDGE = 0.66;
const float SHADOW_EDGE = 0.44;
const float DEEP_EDGE = 0.28;

float hatchLines(vec2 p) {
  float wobble = pwNoise2(p * 6.0) * 0.35;
  float d = fract((p.x + p.y) * uHatchScale + wobble);
  return 1.0 - smoothstep(0.06, 0.14, abs(d - 0.5));
}

void main() {
  #include <clipping_planes_fragment>

  vec3 n = normalize(vViewNormal);
  if (!gl_FrontFacing) n = -n;

  float tone = dot(n, uLightDirection) * 0.5 + 0.5;
  // Break band edges up so they read as brushed, not computed.
  float t = tone + (pwFbm3(vObjectPosition * 3.0) - 0.5) * 0.16;

  float lightMask = smoothstep(LIGHT_EDGE - 0.015, LIGHT_EDGE + 0.015, t);
  float midMask = smoothstep(SHADOW_EDGE - 0.015, SHADOW_EDGE + 0.015, t);

  vec3 lightWash = mix(vec3(1.0), uWash, 0.8);
  vec3 shadowWash = uWash * vec3(0.66, 0.6, 0.62);
  vec3 colour = mix(shadowWash, mix(uWash, lightWash, lightMask), midMask);

  // Pigment pools where a wash dried: darker rims along band boundaries.
  float pool = max(
    1.0 - smoothstep(0.0, 0.03, abs(t - LIGHT_EDGE)),
    1.0 - smoothstep(0.0, 0.03, abs(t - SHADOW_EDGE))
  );
  colour *= 1.0 - 0.12 * pool;

  // Uneven wash density across the surface.
  colour = mix(colour, vec3(1.0), 0.14 * pwFbm3(vObjectPosition * 1.7 + 4.0));

  // Ink hatching only in the deepest shadow, projected triplanar in object space.
  float deep = 1.0 - smoothstep(DEEP_EDGE - 0.04, DEEP_EDGE + 0.02, t);
  vec3 w = abs(normalize(vObjectNormal));
  w /= (w.x + w.y + w.z);
  float hatch = hatchLines(vObjectPosition.yz) * w.x
    + hatchLines(vObjectPosition.zx) * w.y
    + hatchLines(vObjectPosition.xy) * w.z;
  colour = mix(colour, uInk, hatch * deep * 0.7);

  // Arcane parts are self-lit: pale at the heart, saturated at the rim, pulsing.
  float pulse = 0.5 + 0.5 * sin(uTime * 1.3);
  float rim = 1.0 - abs(n.z);
  vec3 glow = mix(mix(vec3(1.0), uWash, 0.25 + 0.15 * pulse), uWash, smoothstep(0.2, 0.9, rim));
  colour = mix(colour, glow, uGlow);

  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
