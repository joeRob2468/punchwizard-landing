// Marginalia drawn into the paper behind the specimen, like the construction work
// on a creature sheet: a faint astrolabe centred on the specimen (rings with
// degree ticks turning very slowly one way, twelve spokes the other), two large
// compass arcs off to the sides, and dashed construction lines. Lengths are in
// units of the screen's height, centred on uCentre.

uniform vec2 uCentre; // the specimen's centre, in uv
uniform float uTime;

const float TAU = 6.2831853;

// Anti-aliased line of half-width `w` (same units as `d`, the distance to it).
float pwLine(float d, float w) {
  float fw = max(fwidth(d), 1e-5);
  return 1.0 - smoothstep(w - fw, w + fw, abs(d));
}

// Ticks every `pitch` radians around a circle, `w` wide (arc length), between radii.
float pwTicks(float r, float a, float pitch, float w, float r0, float r1) {
  float d = (fract(a / pitch + 0.5) - 0.5) * pitch * r;
  return pwLine(d, w) * step(r0, r) * step(r, r1);
}

// Dashes along a line: `along` is position on it, dashes `dash` long, `gap` apart.
float pwDashes(float along, float dash, float gap) {
  return step(fract(along / (dash + gap)), dash / (dash + gap));
}

float marginalia(vec2 uv) {
  vec2 q = vec2((uv.x - uCentre.x) * aspect, uv.y - uCentre.y);
  float r = length(q);
  float a = atan(q.y, q.x);
  float m = 0.0;

  // Astrolabe.
  float slow = uTime * 0.004;
  m += pwLine(r - 0.58, 0.0011) + pwLine(r - 0.562, 0.0007) + 0.6 * pwLine(r - 0.425, 0.0007);
  m += pwTicks(r, a + slow, TAU / 180.0, 0.0007, 0.562, 0.576);
  m += pwTicks(r, a + slow, TAU / 36.0, 0.0009, 0.548, 0.58);
  m += 0.6 * pwTicks(r, a - slow * 1.6, TAU / 12.0, 0.0008, 0.425, 0.545);

  // Compass arcs, struck from points off to the sides; only part of each shows.
  vec2 c1 = q - vec2(-1.05, 0.25);
  vec2 c2 = q - vec2(1.0, -0.45);
  m += pwLine(length(c1) - 0.9, 0.0008) * smoothstep(-0.2, 0.3, c1.x) * step(abs(c1.y), 0.55);
  m += pwLine(length(c2) - 0.75, 0.0008) * smoothstep(0.2, -0.3, c2.x) * step(abs(c2.y), 0.5);

  // Dashed construction lines: a baseline and two diagonals through the centre.
  m += pwLine(q.y + 0.56, 0.0007) * pwDashes(q.x, 0.03, 0.015) * step(abs(q.x), 0.95);
  vec2 d1 = vec2(0.5, 0.866);
  vec2 d2 = vec2(-0.5, 0.866);
  float far = smoothstep(0.6, 0.64, r) * (1.0 - smoothstep(1.1, 1.2, r));
  m += pwLine(dot(q, vec2(-d1.y, d1.x)), 0.0006) * pwDashes(dot(q, d1), 0.02, 0.02) * far;
  m += pwLine(dot(q, vec2(-d2.y, d2.x)), 0.0006) * pwDashes(dot(q, d2), 0.02, 0.02) * far;

  return min(m, 1.0);
}
