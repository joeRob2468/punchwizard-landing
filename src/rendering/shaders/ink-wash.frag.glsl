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
//   an engraving, and keep a steady on-screen spacing at any zoom. Hair hatches
//   along its strands instead: wavy, roughly vertical lines that start in the
//   mid-tones and crowd together in shadow.
//
// Colours are "pigment on white": the paper effect multiplies them onto paper. On a
// dark ground (uDark) they are light on black instead: the wash builds up from
// black where lit, hatch lines are pale, and the paper effect screens them on.

#include <common>
#include <clipping_planes_pars_fragment>

uniform vec3 uWash;
uniform vec3 uInk;
uniform vec3 uLightDirection; // view space, normalised
uniform float uHatchScale; // hatch lines per object-space unit
uniform float uGlow; // 0 = ordinary pigment, 1 = self-lit arcane wash
uniform float uTime;
uniform float uPartId; // written to alpha for the outline effect's part edges
uniform float uStrands; // 1 = hatch along hanging strands (hair)
uniform vec3 uBlank; // the empty ground: white on paper, black on a dark ground
uniform float uDark; // 1 = light on a dark ground
uniform float uHatch; // 0–1 hatching strength
uniform float uGain; // surface brightness against the ground
uniform float uLit; // 1 = smooth photographic lighting instead of glazes and hatching
uniform float uEmission; // how far past white self-lit parts glow (for bloom)

varying vec3 vViewNormal;
varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vOcclusion;

const float GLAZES = 4.0;
// Lit mode: a cool fill from the lower right and a rim from behind, in view space.
const vec3 FILL = vec3(0.6, -0.25, 0.75);
const vec3 RIM = vec3(0.3, 0.4, -0.85);
const float CROSS_LINES_PER_TURN = 8.0;
// Target spacing of hatch lines, in device pixels.
const float HATCH_SPACING_PX = 9.0;

// Anti-aliased line mask for a coordinate whose integer values are line centres.
// `width` is the line's half-width in line spacings (0–0.5).
float lineMask(float v, float width) {
  float d = abs(fract(v + 0.5) - 0.5);
  float fw = fwidth(v);
  return 1.0 - smoothstep(width - fw, width + fw, d);
}

// Lines at a steady on-screen spacing whatever the zoom, like an engraving: the
// density doubles or halves in octaves, cross-fading between neighbouring octaves.
// `v` is the coordinate at base density, `perPixel` how many base-density lines
// one pixel spans (taken from position, so the spiral's angle seam can't spike it);
// `wobble` is added after scaling.
float engravedLines(float v, float perPixel, float wobble, float width) {
  float level = log2(1.0 / (HATCH_SPACING_PX * perPixel));
  float l0 = floor(level);
  float a = lineMask(v * exp2(l0) + wobble, width);
  float b = lineMask(v * exp2(l0 + 1.0) + wobble, width);
  return mix(a, b, level - l0);
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
  vec3 pigment = glazed > 0.5
    ? mix(uWash, lightWash, (glazed - 0.5) * 2.0)
    : mix(shadowWash, uWash, glazed * 2.0);
  // On a dark ground, light builds up from black: the full wash only where lit.
  vec3 lit = mix(uWash * 0.08, mix(uWash, vec3(1.0), 0.15), smoothstep(0.15, 1.0, glazed));
  vec3 colour = mix(pigment, lit, uDark);

  // Lit: wrapped key light with warm translucency at the terminator (light
  // scattering under skin), a cool fill, a rim, and a soft highlight.
  float ndl = dot(n, uLightDirection);
  float wrapped = clamp((ndl + 0.45) / 1.45, 0.0, 1.0);
  float ao = mix(0.35, 1.0, occlusion);
  float fill = max(dot(n, normalize(FILL)), 0.0) * 0.28;
  float backRim = pow(1.0 - max(n.z, 0.0), 3.0) * max(dot(n, normalize(RIM)) + 0.6, 0.0) * 0.5;
  vec3 halfway = normalize(uLightDirection + vec3(0.0, 0.0, 1.0));
  float highlight = pow(max(dot(n, halfway), 0.0), 36.0) * 0.35 * occlusion;
  vec3 translucency = uWash * vec3(0.9, 0.3, 0.15) * (wrapped - max(ndl, 0.0)) * 0.6;
  vec3 photo = uWash * (0.12 + 0.95 * wrapped) * ao
    + uWash * vec3(0.8, 0.9, 1.1) * fill * ao
    + translucency * ao
    + vec3(backRim + highlight) * mix(vec3(1.0), uWash, 0.3);
  colour = mix(colour, photo, uLit);

  // A dried glaze leaves a darker rim; pigment also settles into crevices.
  float rim = 1.0 - smoothstep(0.0, 0.09, abs(edge - 0.5));
  colour *= 1.0 - 0.07 * rim * (1.0 - uLit);
  colour *= mix(0.82, 1.0, smoothstep(0.35, 0.9, occlusion));

  // Uneven wash density across the surface.
  colour = mix(colour, uBlank, 0.1 * pwFbm3(p * 1.7 + 4.0));

  // Cross-contour hatching.
  vec3 an = abs(normalize(vObjectNormal));
  float upright = 1.0 - smoothstep(0.55, 0.85, an.y);
  float wobble = (pwNoise3(p * 7.0) - 0.5) * 0.35;
  float perPixel = max(length(fwidth(p)) * uHatchScale, 1e-5);
  float rings = p.y * uHatchScale;
  float radial = length(p.xz) * uHatchScale;
  float spiral = p.y * uHatchScale * 0.55 + atan(p.z, p.x) * (CROSS_LINES_PER_TURN / 6.2831853);

  float darkness = 1.0 - tone;
  float firstLayer = smoothstep(0.45, 0.7, darkness);
  float secondLayer = smoothstep(0.62, 0.82, darkness);
  float width = mix(0.06, 0.24, darkness);
  float contour = mix(
    engravedLines(radial, perPixel, wobble, width),
    engravedLines(rings, perPixel, wobble, width),
    upright
  );
  float hatch = max(contour * firstLayer, engravedLines(spiral, perPixel, wobble, width * 0.8) * secondLayer);

  // Strands: lines of constant x on surfaces facing front or back, constant z on
  // those facing the sides (sharp blend, so the two sets barely cross), bent by
  // noise stretched along y so they wave like hair.
  vec3 sn = pow(an, vec3(4.0));
  float facingSide = sn.x / max(sn.x + sn.z, 1e-4);
  float bend = (pwFbm3(p * vec3(5.0, 1.2, 5.0)) - 0.5) * 0.35;
  float across = (facingSide > 0.5 ? p.z : p.x) * uHatchScale * 1.4 + bend * uHatchScale * 0.15;
  float strandWidth = mix(0.08, 0.3, darkness);
  float strandLines = engravedLines(across, perPixel, wobble * 0.5, strandWidth)
    * smoothstep(0.3, 0.6, darkness);
  hatch = mix(hatch, strandLines, uStrands);
  colour = mix(colour, uInk, hatch * 0.62 * uHatch * (1.0 - uLit));
  colour = mix(uBlank, colour, uGain);

  // Arcane parts are self-lit: pale at the heart, saturated at the rim, pulsing.
  float pulse = 0.5 + 0.5 * sin(uTime * 1.3);
  float rimLight = 1.0 - abs(n.z);
  vec3 glow = mix(mix(vec3(1.0), uWash, 0.25 + 0.15 * pulse), uWash, smoothstep(0.2, 0.9, rimLight));
  // With emission the glow keeps its hue and goes past white, so only these
  // parts reach the bloom threshold and their halo is coloured.
  vec3 emitted = uWash * (1.0 + uEmission * (0.6 + 0.4 * pulse));
  glow = mix(glow, emitted, 0.8 * min(uEmission, 1.0));
  colour = mix(colour, glow, uGlow);

  gl_FragColor = vec4(colour, uPartId / 255.0);
  #include <colorspace_fragment>
}
