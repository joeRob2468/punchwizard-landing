// Ink outlines from the depth buffer: silhouettes where depth jumps, creases where
// its curvature (Laplacian) spikes. Sample offsets wobble and width varies along
// the line so strokes look hand-inked.

uniform vec3 uInk;
uniform float uWidth;
uniform float uStrength;
uniform float uPartEdgeStrength;

float viewDistance(const in vec2 uv) {
  return -getViewZ(readDepth(uv));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  vec2 wobble = vec2(pwNoise2(px * 0.03), pwNoise2(px * 0.03 + 17.0)) - 0.5;
  vec2 c = uv + wobble * 1.6 * texelSize;
  vec2 o = texelSize * uWidth * (0.65 + 0.7 * pwNoise2(px * 0.012 + 5.0));

  float d = viewDistance(c);
  float dl = viewDistance(c - vec2(o.x, 0.0));
  float dr = viewDistance(c + vec2(o.x, 0.0));
  float du = viewDistance(c + vec2(0.0, o.y));
  float dd = viewDistance(c - vec2(0.0, o.y));

  float scale = 1.0 / max(d, 1e-3);
  float jump = max(max(abs(dl - d), abs(dr - d)), max(abs(du - d), abs(dd - d))) * scale;
  float curvature = abs(dl + dr + du + dd - 4.0 * d) * scale;

  // Part ids live in alpha (see InkWashMaterial): ink where they change, which
  // separates tissues on coplanar section caps and overlapping parts generally.
  float a = texture2D(inputBuffer, c).a;
  float idChange = max(
    max(abs(texture2D(inputBuffer, c - vec2(o.x, 0.0)).a - a), abs(texture2D(inputBuffer, c + vec2(o.x, 0.0)).a - a)),
    max(abs(texture2D(inputBuffer, c + vec2(0.0, o.y)).a - a), abs(texture2D(inputBuffer, c - vec2(0.0, o.y)).a - a))
  );
  float partEdge = step(0.5 / 255.0, idChange) * uPartEdgeStrength;

  float silhouette = smoothstep(0.015, 0.04, jump);
  float crease = smoothstep(0.004, 0.01, curvature) * 0.55;
  float ink = max(max(silhouette, crease), partEdge) * uStrength;

  outputColor = vec4(mix(inputColor.rgb, uInk, ink), inputColor.a);
}
