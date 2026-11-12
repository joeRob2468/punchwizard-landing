// Arcane haze: the specimen fades into a tinted haze with distance behind the
// focus, and slow wisps of mist drift up from the bottom of the frame. Runs
// before the paper composite, so on paper the haze is a pale pigment and on a
// dark ground it is faint light.

uniform vec3 uHaze;
uniform float uTime;
uniform vec2 uRange; // view distance where depth haze starts and is full
uniform float uDepthStrength;
uniform float uWispStrength;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float d = -getViewZ(readDepth(uv));
  bool background = d > cameraFar * 0.98;

  float depthHaze = background ? 0.0 : smoothstep(uRange.x, uRange.y, d) * uDepthStrength;

  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y);
  vec2 drift = vec2(uTime * 0.02, -uTime * 0.045);
  float w = pwFbm2(q * 2.2 + drift) * 0.65 + pwFbm2(q * 5.0 + drift * 1.8 + 7.0) * 0.35;
  float wisps = smoothstep(0.45, 0.8, w);
  float low = 1.0 - smoothstep(0.0, 0.75, uv.y);
  // Thinner in front of the specimen than over the empty ground.
  float wispHaze = wisps * mix(0.2, 1.0, low) * uWispStrength * (background ? 1.0 : 0.55);

  float amount = clamp(depthHaze + wispHaze * (1.0 - depthHaze), 0.0, 1.0);
  outputColor = vec4(mix(inputColor.rgb, uHaze, amount), inputColor.a);
}
