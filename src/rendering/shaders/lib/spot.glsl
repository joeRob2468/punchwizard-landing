// The spotlight (Tabula view): a light in the scene, aimed at the head from above,
// that follows the viewer round lazily (specimen/SpotRig). uDrama blends the
// surface lighting from the even, camera-fixed lights to the spot with deep
// shadows (0 for the scan view). Shared by surfaces and cut faces.

uniform vec3 uSpotPosition; // world space
uniform vec3 uSpotDirection; // world space, normalised
uniform vec2 uSpotCone; // cosines: outer (no light), inner (full light)
uniform vec3 uSpotColour; // colour × intensity
uniform float uDrama; // 0–1
uniform sampler2D uShadowMap; // depth from the spot (specimen/SpotShadow)
uniform mat4 uShadowMatrix;
uniform float uShadowTexel;
uniform float uShadowOn;

// The spot's light reaching `p` (cone and falloff), before the surface's angle.
vec3 pwSpotLight(vec3 p) {
  vec3 toLight = uSpotPosition - p;
  float d = length(toLight);
  float cone = smoothstep(uSpotCone.x, uSpotCone.y, dot(-toLight / d, uSpotDirection));
  float falloff = 1.0 / (1.0 + 0.015 * d * d);
  return uSpotColour * cone * falloff;
}

// 0–1: how much of the spot reaches `p` past whatever stands between (1 = lit).
// `normal` pushes the lookup off the surface, so it doesn't shadow itself; a 3×3
// filter softens the edge.
float pwSpotShadow(vec3 p, vec3 normal) {
  if (uShadowOn < 0.5) return 1.0;
  vec4 clip = uShadowMatrix * vec4(p + normal * 0.012, 1.0);
  vec3 s = clip.xyz / clip.w * 0.5 + 0.5;
  if (s.x < 0.0 || s.y < 0.0 || s.x > 1.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  float lit = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      float depth = texture2D(uShadowMap, s.xy + vec2(float(i), float(j)) * uShadowTexel * 1.5).r;
      lit += step(s.z - 0.0006, depth);
    }
  }
  return lit / 9.0;
}
