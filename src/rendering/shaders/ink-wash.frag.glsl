// Lit surface: a wrapped key light fixed in view space (upper left), so the
// specimen is always lit like an illustration whichever way it's turned, with warm
// translucency at the terminator (light scattering under skin), a cool fill from
// the lower right, a rim from behind and a soft highlight, all darkened by baked
// ambient occlusion. Pigment collects slightly in crevices and its density varies
// across the surface.
//
// The colour is light on black; the paper effect screens it onto dark paper.

#include <common>
#include <clipping_planes_pars_fragment>

uniform vec3 uWash;
uniform vec3 uLightDirection; // view space, normalised
uniform float uGlow; // 0 = ordinary pigment, 1 = self-lit arcane wash
uniform float uTime;
uniform float uPartId; // written to alpha for the outline effect's part edges
uniform float uGain; // surface brightness against the ground
uniform float uEmission; // how far past white self-lit parts glow (for bloom)

varying vec3 vViewNormal;
varying vec3 vObjectPosition;
varying float vOcclusion;

// A cool fill from the lower right and a rim from behind, in view space.
const vec3 FILL = vec3(0.6, -0.25, 0.75);
const vec3 RIM = vec3(0.3, 0.4, -0.85);

void main() {
  #include <clipping_planes_fragment>

  vec3 n = normalize(vViewNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 p = vObjectPosition;
  float occlusion = vOcclusion;

  float ndl = dot(n, uLightDirection);
  float wrapped = clamp((ndl + 0.45) / 1.45, 0.0, 1.0);
  float ao = mix(0.35, 1.0, occlusion);
  float fill = max(dot(n, normalize(FILL)), 0.0) * 0.28;
  float backRim = pow(1.0 - max(n.z, 0.0), 3.0) * max(dot(n, normalize(RIM)) + 0.6, 0.0) * 0.5;
  vec3 halfway = normalize(uLightDirection + vec3(0.0, 0.0, 1.0));
  float highlight = pow(max(dot(n, halfway), 0.0), 36.0) * 0.35 * occlusion;
  vec3 translucency = uWash * vec3(0.9, 0.3, 0.15) * (wrapped - max(ndl, 0.0)) * 0.6;
  vec3 colour = uWash * (0.12 + 0.95 * wrapped) * ao
    + uWash * vec3(0.8, 0.9, 1.1) * fill * ao
    + translucency * ao
    + vec3(backRim + highlight) * mix(vec3(1.0), uWash, 0.3);

  colour *= mix(0.82, 1.0, smoothstep(0.35, 0.9, occlusion));
  colour *= (1.0 - 0.1 * pwFbm3(p * 1.7 + 4.0)) * uGain;

  // Arcane parts are self-lit: pale at the heart, saturated at the rim, pulsing.
  // With emission the glow keeps its hue and goes past white, so only these parts
  // reach the bloom threshold and their halo is coloured.
  float pulse = 0.5 + 0.5 * sin(uTime * 1.3);
  float rimLight = 1.0 - abs(n.z);
  vec3 glow = mix(mix(vec3(1.0), uWash, 0.25 + 0.15 * pulse), uWash, smoothstep(0.2, 0.9, rimLight));
  vec3 emitted = uWash * (1.0 + uEmission * (0.6 + 0.4 * pulse));
  glow = mix(glow, emitted, 0.8 * min(uEmission, 1.0));
  colour = mix(colour, glow, uGlow);

  gl_FragColor = vec4(colour, uPartId / 255.0);
  #include <colorspace_fragment>
}
