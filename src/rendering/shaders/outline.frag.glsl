// Ink outlines from the depth buffer and the part ids in alpha.
//
// - Silhouettes: where a neighbour is clearly farther away. Only the near side of
//   the jump is inked, so each line sits on the object it outlines.
// - Creases: spikes in depth curvature (Laplacian), fainter.
// - Part edges: where the part id (alpha, see InkWashMaterial) changes, which
//   separates tissues on coplanar section caps and overlapping parts.
//
// Depth and part ids hold one sample per pixel (there's no MSAA), so a
// sub-pixel sliver (a thin edge at a grazing angle, a stray cap sample) can show up
// in depth or alpha as a single odd pixel. Inking around it drew flickering `+`
// specks. Two guards stop that: a difference only counts if it persists one step
// further out in the same direction, and a pixel nearer than almost all of its
// neighbours (an isolated sliver) is never inked.
//
// Sample offsets wobble and line width varies along the line so strokes look
// hand-inked.

uniform vec3 uInk;
uniform float uWidth;
uniform float uStrength;
uniform float uPartEdgeStrength;

const float SILHOUETTE_FROM = 0.015; // relative depth step where ink starts…
const float SILHOUETTE_TO = 0.04; // …and is full
const float ID_EPSILON = 0.5 / 255.0;

float viewDistance(const in vec2 uv) {
  return -getViewZ(readDepth(uv));
}

bool isBackground(const in float distance) {
  return distance > cameraFar * 0.98;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  vec2 wobble = vec2(pwNoise2(px * 0.03), pwNoise2(px * 0.03 + 17.0)) - 0.5;
  vec2 c = uv + wobble * 1.6 * texelSize;
  vec2 o = texelSize * uWidth * (0.65 + 0.7 * pwNoise2(px * 0.012 + 5.0));

  float d = viewDistance(c);
  float a = texture2D(inputBuffer, c).a;
  float scale = 1.0 / max(d, 1e-3);
  bool centreIsBackground = isBackground(d);

  vec2 dirs[4];
  dirs[0] = vec2(o.x, 0.0);
  dirs[1] = vec2(-o.x, 0.0);
  dirs[2] = vec2(0.0, o.y);
  dirs[3] = vec2(0.0, -o.y);

  float farther = 0.0;
  float laplacian = -4.0 * d;
  float partEdge = 0.0;
  int fartherCount = 0;

  for (int i = 0; i < 4; i++) {
    float d1 = viewDistance(c + dirs[i]);
    float d2 = viewDistance(c + 2.0 * dirs[i]);
    laplacian += d1;

    // Farther one and two steps out: a real edge, not a one-pixel sliver.
    farther = max(farther, (min(d1, d2) - d) * scale);
    if ((d1 - d) * scale > SILHOUETTE_FROM) fartherCount++;

    float a1 = texture2D(inputBuffer, c + dirs[i]).a;
    float a2 = texture2D(inputBuffer, c + 2.0 * dirs[i]).a;
    bool idChanges = abs(a1 - a) > ID_EPSILON && abs(a2 - a1) < ID_EPSILON;
    bool againstPart = !centreIsBackground && !isBackground(d1);
    bool nearSide = d <= d1 * 1.002;
    if (idChanges && againstPart && nearSide) partEdge = 1.0;
  }

  // Diagonals only feed the isolation test.
  vec2 diag = o * 0.7071;
  if ((viewDistance(c + diag) - d) * scale > SILHOUETTE_FROM) fartherCount++;
  if ((viewDistance(c - diag) - d) * scale > SILHOUETTE_FROM) fartherCount++;
  if ((viewDistance(c + vec2(diag.x, -diag.y)) - d) * scale > SILHOUETTE_FROM) fartherCount++;
  if ((viewDistance(c + vec2(-diag.x, diag.y)) - d) * scale > SILHOUETTE_FROM) fartherCount++;
  float keep = fartherCount >= 7 ? 0.0 : 1.0;

  float silhouette = smoothstep(SILHOUETTE_FROM, SILHOUETTE_TO, farther);
  float crease = smoothstep(0.004, 0.01, abs(laplacian) * scale) * 0.55;
  float ink = max(max(silhouette, crease), partEdge * uPartEdgeStrength) * uStrength * keep;

  outputColor = vec4(mix(inputColor.rgb, uInk, ink), inputColor.a);
}
