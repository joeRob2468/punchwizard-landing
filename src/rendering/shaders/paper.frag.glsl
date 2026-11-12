// Composites the scene onto dark aged paper. The scene is rendered as light on a
// black background and screened onto the paper, so empty areas become plain
// paper. Paper features are fixed to the screen: the specimen turns, the page
// doesn't.

uniform vec3 uPaper;
uniform vec3 uPaperShadow;
uniform vec3 uFoxing;
uniform float uTexture; // 0–1 strength of mottling, fibres, foxing, vignette, granulation

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  vec3 paper = uPaper;
  paper = mix(paper, uPaperShadow, 0.35 * uTexture * pwFbm2(q * 3.0 + 2.0));
  paper *= 1.0 - 0.035 * uTexture * pwNoise2(px * vec2(0.025, 0.4));
  paper *= 1.0 - 0.025 * uTexture * pwNoise2(px * 0.5);

  float fox = smoothstep(0.74, 0.84, pwFbm2(q * 9.0 + 9.0));
  paper = mix(paper, uFoxing, fox * 0.16 * uTexture);

  float vignette = smoothstep(0.45, 1.05, length(q));
  paper = mix(paper, uPaperShadow * 0.88, vignette * 0.55 * uTexture);

  // Granulation: pigment settles unevenly into the paper's tooth.
  vec3 marks = inputColor.rgb;
  float grain = pwNoise2(px * 0.45) * 0.6 + pwNoise2(px * 0.11 + 3.0) * 0.4;
  marks *= mix(1.0, 0.84 + 0.3 * grain, uTexture);

  outputColor = vec4(1.0 - (1.0 - paper) * (1.0 - marks), 1.0);
}
