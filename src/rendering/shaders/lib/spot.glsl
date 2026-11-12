// The spotlight (Tabula view): a light in the scene, aimed at the head from above,
// that follows the viewer round lazily (specimen/SpotRig). uDrama blends the
// surface lighting from the even, camera-fixed lights to the spot with deep
// shadows (0 for the scan view). Shared by surfaces and cut faces.

uniform vec3 uSpotPosition; // world space
uniform vec3 uSpotDirection; // world space, normalised
uniform vec2 uSpotCone; // cosines: outer (no light), inner (full light)
uniform vec3 uSpotColour; // colour × intensity
uniform float uDrama; // 0–1

// The spot's light reaching `p` (cone and falloff), before the surface's angle.
vec3 pwSpotLight(vec3 p) {
  vec3 toLight = uSpotPosition - p;
  float d = length(toLight);
  float cone = smoothstep(uSpotCone.x, uSpotCone.y, dot(-toLight / d, uSpotDirection));
  float falloff = 1.0 / (1.0 + 0.015 * d * d);
  return uSpotColour * cone * falloff;
}
