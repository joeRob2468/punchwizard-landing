// The glow along the cut's edge: a thin, faint cousin of the ground glow, just
// inside the outline of the outer layer where the plane cuts it (slicing/CutGlow),
// undulating with the seam (lib/seam.glsl, which must come first).

uniform sampler2D uCutDistance; // distance to the outline, encoded 0–1
uniform vec3 uCutGrid; // min, max of the field's square (plane coordinates); z = 1 when drawn
uniform vec3 uCutRange; // distances at 0 and 1 (x, y)

// Light to add at plane coordinates `uv`.
vec3 pwCutGlow(vec2 uv) {
  if (uCutGrid.z < 0.5 || uSeamStrength <= 0.0) return vec3(0.0);
  vec2 tc = (uv - uCutGrid.x) / (uCutGrid.y - uCutGrid.x);
  if (tc.x < 0.0 || tc.y < 0.0 || tc.x > 1.0 || tc.y > 1.0) return vec3(0.0);
  float d = mix(uCutRange.x, uCutRange.y, texture2D(uCutDistance, tc).r);
  float inside = max(-d, 0.0);
  float wave = pwUndulate(uv);
  // Cut faces only draw inside the outline, so the edge is just its inner side.
  // The line itself swells and thins with the waves, as well as its haze.
  float edge = 1.0 - smoothstep(0.0, 0.016 * (1.0 + 0.45 * wave), abs(d));
  float spread = exp(-inside / (0.035 * (1.0 + 0.5 * wave)));
  float shimmer = 0.7 + 0.3 * wave;
  return uSeamColour * (edge * 0.8 + spread * 0.22) * shimmer * uSeamStrength;
}
