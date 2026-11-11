// Tonal watercolour with engraved hatching.
//
// - Tone: half-Lambert from a key light fixed in view space, darkened by baked
//   ambient occlusion, then laid down as four soft glazes (each glaze edge is
//   brushed by noise and pools a little darker pigment).
// - Colour: thin wash in the light, full wash in the mid-tones, a deeper and more
//   saturated version of it in shadow; pigment also collects in occluded crevices.
// - Hatching follows the form (cross-contour): rings of constant height on upright
//   surfaces, concentric rings on flat ones, and in deeper shadow a spiral
//   cross-hatch around the vertical axis. Lines thicken as the tone darkens, like
//   an engraving, and fade out where they would be denser than the screen can show.
//
// Colours are "pigment on white": the paper effect multiplies them onto paper.

#include <common>
#include <clipping_planes_pars_fragment>

uniform vec3 uWash;
uniform vec3 uInk;
uniform vec3 uLightDirection; // view space, normalised
uniform float uHatchScale; // hatch lines per object-space unit
uniform float uGlow; // 0 = ordinary pigment, 1 = self-lit arcane wash
uniform float uTime;
uniform float uPartId; // written to alpha for the outline effect's part edges

varying vec3 vViewNormal;
varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vOcclusion;

const float GLAZES = 4.0;
const float CROSS_LINES_PER_TURN = 56.0;

// Anti-aliased line mask for a coordinate whose integer values are line centres.
// `width` is the line's half-width in line spacings (0–0.5).
float lineMask(float v, float width) {
  float d = abs(fract(v + 0.5) - 0.5);
  float fw = fwidth(v);
  float mask = 1.0 - smoothstep(width - fw, width + fw, d);
  // Lines closer than ~3 px apart turn to mush: fade them out instead.
  return mask * (1.0 - smoothstep(0.18, 0.35, fw));
}

void main() {
  #include <clipping_planes_fragment>

  vec3 n = normalize(vViewNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 p = vObjectPosition;

  // Tone, occlusion and soft glazes.
  float light = dot(n, uLightDirection) * 0.5 + 0.5;
  float occlusion = vOcclusion;
  float tone = light * mix(0.5, 1.0, occlusion);
  float brushed = tone + (pwFbm3(p * 3.0) - 0.5) * 0.1;
  float g = clamp(brushed, 0.0, 0.999) * GLAZES;
  float step = floor(g);
  float edge = fract(g);
  float glazed = (step + smoothstep(0.3, 0.7, edge)) / GLAZES;

  vec3 lightWash = mix(vec3(1.0), uWash, 0.5);
  vec3 shadowWash = uWash * mix(vec3(1.0), uWash, 0.55) * 0.78;
  vec3 colour = glazed > 0.5
    ? mix(uWash, lightWash, (glazed - 0.5) * 2.0)
    : mix(shadowWash, uWash, glazed * 2.0);

  // A dried glaze leaves a darker rim; pigment also settles into crevices.
  float rim = 1.0 - smoothstep(0.0, 0.09, abs(edge - 0.5));
  colour *= 1.0 - 0.07 * rim;
  colour *= mix(0.82, 1.0, smoothstep(0.35, 0.9, occlusion));

  // Uneven wash density across the surface.
  colour = mix(colour, vec3(1.0), 0.1 * pwFbm3(p * 1.7 + 4.0));

  // Cross-contour hatching.
  vec3 an = abs(normalize(vObjectNormal));
  float upright = 1.0 - smoothstep(0.55, 0.85, an.y);
  float wobble = (pwNoise3(p * 7.0) - 0.5) * 0.35;
  float rings = p.y * uHatchScale + wobble;
  float radial = length(p.xz) * uHatchScale + wobble;
  float spiral = p.y * uHatchScale * 0.55 + atan(p.z, p.x) * (CROSS_LINES_PER_TURN / 6.2831853) + wobble;

  float darkness = 1.0 - tone;
  float firstLayer = smoothstep(0.38, 0.62, darkness);
  float secondLayer = smoothstep(0.58, 0.78, darkness);
  float width = mix(0.05, 0.2, darkness);
  float contour = mix(lineMask(radial, width), lineMask(rings, width), upright);
  float hatch = max(contour * firstLayer, lineMask(spiral, width * 0.8) * secondLayer);
  colour = mix(colour, uInk, hatch * 0.62);

  // Arcane parts are self-lit: pale at the heart, saturated at the rim, pulsing.
  float pulse = 0.5 + 0.5 * sin(uTime * 1.3);
  float rimLight = 1.0 - abs(n.z);
  vec3 glow = mix(mix(vec3(1.0), uWash, 0.25 + 0.15 * pulse), uWash, smoothstep(0.2, 0.9, rimLight));
  colour = mix(colour, glow, uGlow);

  gl_FragColor = vec4(colour, uPartId / 255.0);
  #include <colorspace_fragment>
}
