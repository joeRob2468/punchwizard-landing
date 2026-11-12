// The ground seam: where the specimen meets the rune circle on the ground, a band
// of light in the circle's colour, as if he stands up through it and the rest of
// him is below. Brightest in a thin core at the ground, fading up over
// uSeamWidth, with a slow uneven shimmer around it. Goes past white, for bloom.
// Needs the noise toolkit (lib/noise.glsl).

uniform float uSeamY; // height of the ground (specimen space)
uniform vec3 uSeamColour;
uniform float uSeamWidth;
uniform float uSeamStrength; // 0 = no seam

vec3 pwGroundSeam(vec3 p, float time) {
  float h = p.y - uSeamY;
  if (h > uSeamWidth * 1.2 || uSeamStrength <= 0.0) return vec3(0.0);
  float band = 1.0 - smoothstep(0.0, uSeamWidth, max(h, 0.0));
  float core = 1.0 - smoothstep(0.0, uSeamWidth * 0.15, max(h, 0.0));
  float shimmer = 0.65 + 0.35 * pwNoise3(vec3(p.x * 9.0, p.z * 9.0, time * 0.5));
  return uSeamColour * (band * band * shimmer * 0.9 + core * 1.8) * uSeamStrength;
}
