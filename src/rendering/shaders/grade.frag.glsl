// The plate's colour grade, after bloom (so it sees the glows' full brightness):
//
// - Halation: a faint warm fringe around the brightest things, as film gives,
//   from a widened sample of the bloom's blurred highlights, mostly where the
//   image itself is dark (around the light, not on it).
// - Split-toning: shadows blue (a touch of it added in the deepest darks),
//   highlights a little warm.
// - Tone: an S-curve (darker shadows, brighter highlights, with a little extra
//   gain at the top), then a soft shoulder so bright glows roll off smoothly
//   instead of clipping flat.
//
// uGrade blends it in (0 = off; the dev build toggles it with G).

uniform sampler2D uBloom;
uniform float uGrade;
uniform float uSplit; // 0–1 split-toning strength (0 for the scan)
uniform float uHalation; // 0–1 halation strength (0 for the scan)
uniform vec3 uShadowTint;
uniform vec3 uShadowLift; // added in the deepest darks (scaled by uSplit)
uniform float uHighlightGain; // extra gain on the brightest tones
uniform vec3 uHighlightTint;
uniform vec3 uHalationTint;
uniform float uContrast; // 0–1: how much of the S-curve to mix in

float pwLuma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Identity below the knee; above it eases toward 1 with matching slope.
vec3 pwShoulder(vec3 c) {
  const float knee = 0.72;
  vec3 over = max(c - knee, 0.0);
  return min(c, vec3(knee)) + (1.0 - knee) * (1.0 - exp(-over / (1.0 - knee)));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = max(inputColor.rgb, 0.0);
  vec3 graded = c;

  vec2 o = texelSize * 16.0;
  vec3 wide = 0.36 * texture2D(uBloom, uv).rgb
    + 0.16 * (texture2D(uBloom, uv + vec2(o.x, 0.0)).rgb + texture2D(uBloom, uv - vec2(o.x, 0.0)).rgb
      + texture2D(uBloom, uv + vec2(0.0, o.y)).rgb + texture2D(uBloom, uv - vec2(0.0, o.y)).rgb);
  // The blurred highlights are faint once thresholded; scale them up.
  float halo = 3.0 * pwLuma(wide) * (1.0 - smoothstep(0.3, 1.0, pwLuma(c)));
  graded += uHalationTint * halo * uHalation;

  float l = pwLuma(graded);
  vec3 tint = mix(uShadowTint, uHighlightTint, smoothstep(0.04, 0.6, l));
  graded *= mix(vec3(1.0), tint, uSplit);
  graded += uShadowLift * uSplit * (1.0 - smoothstep(0.0, 0.25, l));

  l = pwLuma(graded);
  float s = clamp(l, 0.0, 1.0);
  float curved = mix(s, s * s * (3.0 - 2.0 * s), uContrast) + max(l - 1.0, 0.0);
  graded *= (curved + 1e-4) / (l + 1e-4);
  graded *= 1.0 + uHighlightGain * smoothstep(0.45, 0.95, l);
  graded = pwShoulder(graded);

  outputColor = vec4(mix(c, graded, uGrade), inputColor.a);
}
