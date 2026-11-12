// Fills a part's cut face: a deeper wash of the part's colour with a section
// pattern drawn in ink, as in sectioned anatomical and technical plates.

#include <common>

uniform vec3 uWash;
uniform vec3 uInk;
uniform vec3 uNormal; // plane normal, world space
uniform vec3 uCentre; // rings centre
uniform int uPattern; // 0 hatch, 1 stipple, 2 rings, 3 glow, 4 gyri, 5 strands
uniform float uTime;
uniform float uPartId;
uniform float uSection; // 0–1 section pattern strength
uniform float uFlare; // 0–1: the part's label is hovered or pinned
uniform float uPulse; // 0–1: the glow's breath or heartbeat (specimen/idle.ts)
uniform float uGlowLevel; // 0–1: dims the glow (a blink)
uniform float uEmission; // how far past white glowing caps go (for bloom)

varying vec3 vWorldPosition;

// Anti-aliased line for a coordinate whose integer values are line centres;
// `width` is the half-width in line spacings. Fades to its average where lines
// get closer than a pixel, so fine patterns don't shimmer.
float stripe(float v, float width) {
  float d = abs(fract(v + 0.5) - 0.5);
  float fw = fwidth(v);
  float line = 1.0 - smoothstep(width - fw, width + fw, d);
  return mix(line, width * 2.0, smoothstep(0.25, 0.6, fw));
}

void main() {
  vec3 n = normalize(uNormal);
  vec3 t = normalize(abs(n.y) < 0.9 ? cross(n, vec3(0.0, 1.0, 0.0)) : cross(n, vec3(1.0, 0.0, 0.0)));
  vec3 b = cross(n, t);
  vec2 uv = vec2(dot(vWorldPosition, t), dot(vWorldPosition, b));

  vec3 colour = uWash * vec3(0.86, 0.8, 0.82);
  colour *= 1.0 - 0.12 * pwNoise2(uv * 3.0);
  float ink = 0.0;

  if (uPattern == 0) {
    ink = stripe((uv.x + uv.y) * 34.0 + pwNoise2(uv * 9.0) * 0.3, 0.07) * 0.45;
  } else if (uPattern == 1) {
    vec2 cell = floor(uv * 54.0);
    vec2 local = fract(uv * 54.0) - 0.5;
    vec2 jitter = vec2(pwHash12(cell), pwHash12(cell + 7.0)) - 0.5;
    float radius = 0.13 + 0.15 * pwHash12(cell + 3.0);
    float aa = fwidth(uv.x) * 54.0;
    ink = (1.0 - smoothstep(radius - aa, radius + aa, length(local - jitter * 0.5))) * 0.55;
  } else if (uPattern == 2) {
    vec2 r2 = (vWorldPosition - uCentre).xz;
    float r = length(r2) + (vWorldPosition.y - uCentre.y) * 0.18;
    ink = stripe(r * 32.0 + pwNoise2(uv * 5.0) * 0.4, 0.06) * 0.5;
  } else if (uPattern == 4) {
    // Meandering folds, like the cortex in section.
    float w = uv.y * 30.0 + sin(uv.x * 32.0 + pwNoise2(uv * 6.0) * 4.0) * 1.8;
    ink = stripe(w, 0.11) * 0.5;
  } else if (uPattern == 5) {
    // Long wavy strokes falling downward: hair in section.
    vec3 world = vWorldPosition;
    float w = dot(world, t) * 56.0 + sin(world.y * 9.0 + pwNoise2(uv * 4.0) * 3.0) * 1.5;
    ink = stripe(w, 0.06) * 0.4;
  } else {
    float pulse = uPulse;
    colour = mix(vec3(1.0), uWash, 0.45 + 0.2 * pulse);
    vec3 emitted = uWash * (1.0 + uEmission * (0.6 + 0.4 * pulse));
    colour = mix(colour, emitted, 0.8 * min(uEmission, 1.0));
    colour *= mix(0.15, 1.0, uGlowLevel);
  }

  colour = mix(colour, uInk, ink * uSection);
  colour = colour * (1.0 + 0.7 * uFlare) + uWash * 0.3 * uFlare;
  gl_FragColor = vec4(colour, uPartId / 255.0);
  #include <colorspace_fragment>
}
