// Marginalia drawn into the paper behind the specimen, like the construction work
// on a creature sheet and an astrologer's chart: a faint astrolabe centred on the
// specimen (rings with degree ticks turning very slowly one way, twelve spokes the
// other) inside a zodiac band of twelve houses, tilted planetary orbits with a
// planet creeping along each, great arcs sweeping out to the edges, compass arcs,
// constellations of linked stars, and dashed construction lines. Lengths are in
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

// Distance to the segment a–b.
float pwSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Approximate distance to an ellipse with semi-axes `ab`, tilted by `angle`.
float pwEllipse(vec2 p, vec2 ab, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  return (length(q / ab) - 1.0) * min(ab.x, ab.y);
}

// A planet on a tilted orbit, `phase` of the way round.
vec2 pwOrbitPoint(vec2 ab, float angle, float phase) {
  vec2 local = ab * vec2(cos(phase), sin(phase));
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * local.x - s * local.y, s * local.x + c * local.y);
}

// A constellation: stars at the points, joined in order.
float pwStars(vec2 q, vec2 a, vec2 b, vec2 c, vec2 d, vec2 e) {
  float lines = pwLine(pwSegment(q, a, b), 0.0005) + pwLine(pwSegment(q, b, c), 0.0005)
    + pwLine(pwSegment(q, c, d), 0.0005) + pwLine(pwSegment(q, d, e), 0.0005);
  float dots = 0.0;
  dots += 1.0 - smoothstep(0.003, 0.0045, length(q - a));
  dots += 1.0 - smoothstep(0.004, 0.0055, length(q - b));
  dots += 1.0 - smoothstep(0.003, 0.0045, length(q - c));
  dots += 1.0 - smoothstep(0.005, 0.0065, length(q - d));
  dots += 1.0 - smoothstep(0.003, 0.0045, length(q - e));
  return lines * 0.6 + dots * 1.5;
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

  // Zodiac band of twelve houses, outside the astrolabe.
  m += 0.7 * (pwLine(r - 0.74, 0.0006) + pwLine(r - 0.79, 0.0006));
  m += 0.7 * pwTicks(r, a + slow * 0.5, TAU / 12.0, 0.0007, 0.74, 0.79);
  m += 0.5 * pwTicks(r, a + slow * 0.5 + TAU / 24.0, TAU / 72.0, 0.0005, 0.765, 0.79);

  // Tilted planetary orbits, each with a planet creeping round.
  vec2 o1 = vec2(1.15, 0.36);
  vec2 o2 = vec2(1.5, 0.55);
  vec2 o3 = vec2(0.95, 0.26);
  m += 0.7 * pwLine(pwEllipse(q, o1, 0.32), 0.0006);
  m += 0.6 * pwLine(pwEllipse(q, o2, -0.5), 0.0006);
  m += 0.6 * pwLine(pwEllipse(q, o3, 1.2), 0.0006);
  m += 1.0 - smoothstep(0.006, 0.008, length(q - pwOrbitPoint(o1, 0.32, uTime * 0.01 + 1.0)));
  m += 1.0 - smoothstep(0.005, 0.007, length(q - pwOrbitPoint(o2, -0.5, uTime * 0.006 + 4.0)));
  m += 1.0 - smoothstep(0.004, 0.006, length(q - pwOrbitPoint(o3, 1.2, -uTime * 0.014 + 2.0)));

  // Great arcs sweeping out to the edges, struck from far off the plate.
  m += 0.6 * pwLine(length(q - vec2(0.2, -2.7)) - 2.45, 0.0006);
  m += 0.5 * pwLine(length(q - vec2(2.6, 1.9)) - 2.3, 0.0006);
  m += 0.5 * pwLine(length(q - vec2(-2.4, -1.7)) - 2.25, 0.0006);

  // Constellations in the margins.
  m += pwStars(q, vec2(-1.05, 0.42), vec2(-0.96, 0.5), vec2(-0.86, 0.47), vec2(-0.8, 0.38), vec2(-0.71, 0.41));
  m += pwStars(q, vec2(0.78, -0.3), vec2(0.86, -0.22), vec2(0.97, -0.25), vec2(1.02, -0.36), vec2(1.12, -0.33));
  m += pwStars(q, vec2(-0.9, -0.38), vec2(-0.98, -0.3), vec2(-1.1, -0.33), vec2(-1.14, -0.22), vec2(-1.25, -0.2));

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
