// Lit surface: a wrapped key light fixed in view space (upper left), so the
// specimen is always lit the same way whichever way it's turned, with a cool fill
// from the lower right and a rim from behind, all darkened by baked ambient
// occlusion. What the surface is made of (config/surfaces.ts) sets its highlight
// (strength, tightness, metallic tint, broken up by noise), sheen at grazing
// angles, warm light scattered under it at the terminator, a fine relief bumped
// into the normal (pores, nap, strands) and how much its colour varies, so
// nothing reads as smooth plastic.
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

uniform float uSpecular;
uniform float uGloss;
uniform float uMetallic;
uniform float uSheen;
uniform float uScatter;
uniform float uBump;
uniform float uGrain;
uniform vec3 uStretch;
uniform float uMottle;
uniform float uFlare; // 0–1: the part's label is hovered or pinned
uniform float uPulse; // 0–1: the glow's breath or heartbeat (specimen/idle.ts)
uniform float uGlowLevel; // 0–1: dims the glow (a blink)
uniform vec3 uFlowOrigin; // the Aetheric Core, where mana pulses start
uniform vec2 uFlowFronts; // radii of this beat's two wavefronts (negative: none)
uniform float uFlow; // 1 for parts that carry mana

varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vObjectPosition;
varying float vOcclusion;

// A cool fill from the lower right and a rim from behind, in view space.
const vec3 FILL = vec3(0.6, -0.25, 0.75);
const vec3 RIM = vec3(0.3, 0.4, -0.85);

// Tilts the normal by the screen-space slope of a height field (as three's
// bump mapping does), so relief needs no tangents or UVs.
vec3 bumped(vec3 n, float height) {
  vec3 pos = -vViewPosition;
  vec3 dpx = dFdx(pos);
  vec3 dpy = dFdy(pos);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(height) * r1 + dFdy(height) * r2);
  return normalize(abs(det) * n - grad);
}

// A heartbeat's mana pulses: two fronts expanding from the core, fading with
// distance (specimen/idle.ts).
float manaWave(vec3 p) {
  float d = distance(p, uFlowOrigin);
  vec2 off = (d - uFlowFronts) / 0.07;
  float wave = exp(-off.x * off.x) * step(0.0, uFlowFronts.x)
    + 0.7 * exp(-off.y * off.y) * step(0.0, uFlowFronts.y);
  return wave * uFlow * exp(-d * 0.5);
}

void main() {
  #include <clipping_planes_fragment>

  vec3 n = normalize(vViewNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 p = vObjectPosition;
  float occlusion = vOcclusion;

  // Fine relief, faded out where it would be finer than a pixel (it would shimmer).
  vec3 q = p * uGrain * uStretch;
  float tooFine = smoothstep(0.35, 0.9, length(fwidth(q)));
  float relief = (pwNoise3(q) * 0.65 + pwNoise3(q * 2.3 + 5.0) * 0.35) * uBump * (1.0 - tooFine);
  // Coarser undulation, always visible.
  relief += pwNoise3(p * 22.0 * uStretch) * uBump * 1.5;
  n = bumped(n, relief);

  // Colour varies in brightness and slightly in hue, at broad and fine scales.
  float broad = pwFbm3(p * 4.0) - 0.5;
  float fine = pwNoise3(p * 26.0 * uStretch + 3.0) - 0.5;
  vec3 hue = vec3(pwNoise3(p * 3.0 + 11.0), pwNoise3(p * 3.0 + 23.0), pwNoise3(p * 3.0 + 37.0)) - 0.5;
  vec3 albedo = uWash * (1.0 + uMottle * (broad * 0.45 + fine * 0.25)) * (1.0 + uMottle * hue * 0.22);

  float ndl = dot(n, uLightDirection);
  float wrapped = clamp((ndl + 0.45) / 1.45, 0.0, 1.0);
  float ao = mix(0.3, 1.0, occlusion);
  float fill = max(dot(n, normalize(FILL)), 0.0) * 0.28;
  float grazing = 1.0 - max(n.z, 0.0);
  float backRim = pow(grazing, 3.0) * max(dot(n, normalize(RIM)) + 0.6, 0.0) * 0.35;

  vec3 halfway = normalize(uLightDirection + vec3(0.0, 0.0, 1.0));
  float roughness = mix(0.35, 1.3, pwNoise3(p * 9.0 + 17.0));
  float highlight = pow(max(dot(n, halfway), 0.0), uGloss) * uSpecular * roughness * occlusion;
  vec3 highlightColour = mix(vec3(1.0), uWash * 1.6, uMetallic);

  vec3 translucency = albedo * vec3(0.9, 0.3, 0.15) * (wrapped - max(ndl, 0.0)) * 0.6 * uScatter;
  vec3 sheen = albedo * pow(grazing, 2.0) * wrapped * uSheen;

  vec3 colour = albedo * (0.12 + 0.95 * wrapped) * ao * (1.0 - 0.6 * uMetallic)
    + albedo * vec3(0.8, 0.9, 1.1) * fill * ao
    + translucency * ao
    + sheen * ao
    + backRim * mix(vec3(1.0), albedo, 0.7)
    + highlight * highlightColour;

  colour *= mix(0.78, 1.0, smoothstep(0.35, 0.9, occlusion));
  colour *= uGain;

  // Arcane parts are self-lit: pale at the heart, saturated at the rim, pulsing.
  // With emission the glow keeps its hue and goes past white, so only these parts
  // reach the bloom threshold and their halo is coloured.
  float pulse = uPulse;
  float rimLight = 1.0 - abs(n.z);
  vec3 glow = mix(mix(vec3(1.0), uWash, 0.25 + 0.15 * pulse), uWash, smoothstep(0.2, 0.9, rimLight));
  vec3 emitted = uWash * (1.0 + uEmission * (0.6 + 0.4 * pulse));
  glow = mix(glow, emitted, 0.8 * min(uEmission, 1.0));
  glow *= 1.0 + 2.2 * manaWave(p);
  colour = mix(colour, glow, uGlow * uGlowLevel);

  // Flare: brighter and lit from within in the part's own colour.
  colour = colour * (1.0 + 0.7 * uFlare) + mix(albedo, uWash, uGlow) * 0.3 * uFlare;

  gl_FragColor = vec4(colour, uPartId / 255.0);
  #include <colorspace_fragment>
}
