// The ground seam: where the specimen meets the rune circle on the ground, a band
// of light in the circle's colour, as if he stands up through it and the rest of
// him is below. Brightest in a thin core at the ground, fading up over uSeamWidth;
// it undulates gently. Goes past white, for bloom. The ground glow
// (ground-glow.frag.glsl) shares this file, so the two move together.
// Needs the noise toolkit (lib/noise.glsl).

uniform float uSeamY; // height of the ground (specimen space)
uniform vec3 uSeamColour;
uniform float uSeamWidth;
uniform float uSeamStrength; // 0 = no seam
uniform float uSeamTime; // seconds; held at 0 for reduced motion

// -1–1: gentle waves travelling round the base (by angle about its centre, so they
// wrap seamlessly), three of them at different counts and speeds, their phases
// pushed about by slow noise so the pattern never settles into a loop.
float pwUndulate(vec2 xz) {
  float t = uSeamTime;
  float a = atan(xz.y, xz.x);
  float drift = pwNoise3(vec3(xz * 1.6, t * 0.09));
  float drift2 = pwNoise3(vec3(xz * 2.9 + 5.0, t * 0.13));
  return 0.55 * sin(a * 4.0 + t * 0.42 + drift * 5.0)
    + 0.3 * sin(a * 9.0 - t * 0.63 + drift2 * 6.0)
    + 0.15 * sin(a * 17.0 + t * 0.95 + (drift + drift2) * 4.0);
}

vec3 pwGroundSeam(vec3 p) {
  if (uSeamStrength <= 0.0 || p.y - uSeamY > uSeamWidth * 1.6) return vec3(0.0);
  float wave = pwUndulate(p.xz);
  // The core stays at the ground, so there's always light at the edge; the waves
  // only raise and lower how far the band reaches up (never below 60%).
  float h = max(p.y - uSeamY, 0.0);
  float reach = uSeamWidth * (1.0 + 0.4 * wave);
  float band = 1.0 - smoothstep(0.0, reach, h);
  float core = 1.0 - smoothstep(0.0, uSeamWidth * 0.15, h);
  float shimmer = 0.78 + 0.22 * wave;
  return uSeamColour * (band * band * shimmer * 0.9 + core * 1.8) * uSeamStrength;
}
