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
uniform vec3 uBlank; // the empty ground: white on paper, black on a dark ground
uniform float uSection; // 0–1 section pattern strength

varying vec3 vWorldPosition;

void main() {
  vec3 n = normalize(uNormal);
  vec3 t = normalize(abs(n.y) < 0.9 ? cross(n, vec3(0.0, 1.0, 0.0)) : cross(n, vec3(1.0, 0.0, 0.0)));
  vec3 b = cross(n, t);
  vec2 uv = vec2(dot(vWorldPosition, t), dot(vWorldPosition, b));

  vec3 colour = uWash * vec3(0.86, 0.8, 0.82);
  colour = mix(colour, uBlank, 0.12 * pwNoise2(uv * 3.0));
  float ink = 0.0;

  if (uPattern == 0) {
    float d = fract((uv.x + uv.y) * 16.0 + pwNoise2(uv * 9.0) * 0.3);
    ink = (1.0 - smoothstep(0.05, 0.12, abs(d - 0.5))) * 0.45;
  } else if (uPattern == 1) {
    vec2 cell = floor(uv * 42.0);
    vec2 local = fract(uv * 42.0) - 0.5;
    vec2 jitter = vec2(pwHash12(cell), pwHash12(cell + 7.0)) - 0.5;
    float radius = 0.12 + 0.16 * pwHash12(cell + 3.0);
    ink = (1.0 - smoothstep(radius - 0.06, radius, length(local - jitter * 0.5))) * 0.55;
  } else if (uPattern == 2) {
    vec2 r2 = (vWorldPosition - uCentre).xz;
    float r = length(r2) + (vWorldPosition.y - uCentre.y) * 0.18;
    float d = fract(r * 13.0 + pwNoise2(uv * 5.0) * 0.4);
    ink = (1.0 - smoothstep(0.06, 0.16, abs(d - 0.5))) * 0.5;
  } else if (uPattern == 4) {
    // Meandering folds, like the cortex in section.
    float w = uv.y * 22.0 + sin(uv.x * 26.0 + pwNoise2(uv * 6.0) * 4.0) * 1.4;
    float d = fract(w);
    ink = (1.0 - smoothstep(0.08, 0.2, abs(d - 0.5))) * 0.42;
  } else if (uPattern == 5) {
    // Long wavy strokes falling downward: hair in section.
    vec3 world = vWorldPosition;
    float w = dot(world, t) * 30.0 + sin(world.y * 9.0 + pwNoise2(uv * 4.0) * 3.0) * 0.8;
    float d = fract(w);
    ink = (1.0 - smoothstep(0.05, 0.13, abs(d - 0.5))) * 0.4;
  } else {
    float pulse = 0.5 + 0.5 * sin(uTime * 1.3);
    colour = mix(vec3(1.0), uWash, 0.45 + 0.2 * pulse);
  }

  colour = mix(colour, uInk, ink * uSection);
  gl_FragColor = vec4(colour, uPartId / 255.0);
  #include <colorspace_fragment>
}
