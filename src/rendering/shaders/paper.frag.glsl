// Composites the scene onto the dark page. The scene is rendered as light on a
// black background and screened onto the paper colour, so empty areas become
// plain page, darkening toward the corners. There's no paper texture: fixed to the
// screen it read as an overlay (the grade's film grain gives the surface instead).
// Marginalia (marginalia.glsl) are drawn into the page where there is nothing in
// front of it.
//
// On load the marks ink in (uReveal 0 → 1, lib/reveal.glsl); until the front
// arrives the paper (and its marginalia) shows through.

uniform vec3 uPaper;
uniform vec3 uPaperShadow;
uniform vec3 uChalk; // colour of the marginalia
uniform float uMarginalia; // 0–1 strength of the marginalia
uniform float uReveal; // 0–1: how far the ink-in on load has got (1 = all inked)

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  vec3 paper = uPaper;
  float vignette = smoothstep(0.45, 1.05, length(q));
  paper = mix(paper, uPaperShadow * 0.88, vignette * 0.45);

  // Marginalia, in the page itself: only where nothing is in front of it.
  // Ink-in (lib/reveal.glsl): the outline pass has already masked the marks; the
  // marginalia show through wherever the ink hasn't reached yet.
  float inked = pwInked(uv, uCentre, uReveal);
  float empty = max(step(0.9999, depth), 1.0 - inked);
  paper = mix(paper, uChalk, marginalia(uv) * uMarginalia * empty);

  vec3 marks = inputColor.rgb;
  outputColor = vec4(1.0 - (1.0 - paper) * (1.0 - marks), 1.0);
}
