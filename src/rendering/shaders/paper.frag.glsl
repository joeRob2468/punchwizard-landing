// Composites the scene onto aged paper. The scene is rendered as pigment on a white
// background, so multiplying it by the paper makes washes and ink look absorbed.
// On a dark ground (uDark) the scene is light on black and is screened onto the
// paper instead. Paper features are fixed to the screen: the specimen turns, the
// page doesn't.

uniform vec3 uPaper;
uniform vec3 uPaperShadow;
uniform vec3 uFoxing;
uniform float uDark;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  vec3 paper = uPaper;
  paper = mix(paper, uPaperShadow, 0.35 * pwFbm2(q * 3.0 + 2.0));
  paper *= 1.0 - 0.035 * pwNoise2(px * vec2(0.025, 0.4));
  paper *= 1.0 - 0.025 * pwNoise2(px * 0.5);

  float fox = smoothstep(0.74, 0.84, pwFbm2(q * 9.0 + 9.0));
  paper = mix(paper, uFoxing, fox * 0.16);

  float vignette = smoothstep(0.45, 1.05, length(q));
  paper = mix(paper, uPaperShadow * 0.88, vignette * 0.55);

  // Granulation: pigment settles unevenly into the paper's tooth.
  vec3 marks = mix(1.0 - inputColor.rgb, inputColor.rgb, uDark);
  float grain = pwNoise2(px * 0.45) * 0.6 + pwNoise2(px * 0.11 + 3.0) * 0.4;
  marks *= 0.84 + 0.3 * grain;

  vec3 multiplied = paper * (1.0 - marks);
  vec3 screened = 1.0 - (1.0 - paper) * (1.0 - marks);
  outputColor = vec4(mix(multiplied, screened, uDark), 1.0);
}
