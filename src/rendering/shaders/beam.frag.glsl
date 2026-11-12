// The spotlight's beam: light scattered by dust in the air, drawn on the cone of
// the spot's reach. Each fragment marches its view ray on from the cone's near
// surface, summing at each step the spot's light there (cone, falloff), whether the
// spot can see the point (its shadow map, so the hat and head cut shafts into the
// beam) and slowly drifting dust. Points inside the specimen read as shadowed, so
// the march can run on through it. Added onto the scene; alpha is left alone.
// Needs lib/noise.glsl, lib/seam.glsl (its clock) and lib/spot.glsl.

uniform float uBeamStrength;
uniform float uBeamLength; // world units marched past the cone's surface

varying vec3 vWorld;

const int STEPS = 20;

void main() {
  if (uDrama <= 0.0) discard;
  vec3 dir = normalize(vWorld - cameraPosition);
  float stepLength = uBeamLength / float(STEPS);
  // A per-pixel offset hides the steps as fine grain rather than bands.
  float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < STEPS; i++) {
    vec3 p = vWorld + dir * (float(i) + jitter) * stepLength;
    vec3 light = pwSpotLight(p);
    if (light.r + light.g + light.b < 0.001) continue;
    float dust = 0.55 + 0.45 * pwNoise3(p * 3.2 + vec3(0.0, uSeamTime * 0.05, uSeamTime * 0.03));
    sum += light * dust * pwSpotShadowHard(p);
  }
  vec3 colour = sum * stepLength * uBeamStrength * uDrama;
  gl_FragColor = vec4(colour, 0.0);
}
