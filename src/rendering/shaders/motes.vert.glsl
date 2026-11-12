// Glowing motes drifting up around the specimen, animated here from per-mote
// attributes so they cost nothing per frame on the CPU: each starts in a loose
// cloud around its organ, rises slowly with a waver, and fades in and out over its
// own cycle.

attribute vec3 aOrigin; // where the mote's cycle starts
attribute vec3 aColour;
attribute vec4 aSeed; // phase, rise speed, waver, size (all 0–1)

uniform float uTime;
uniform float uPixelRatio;

varying vec3 vColour;
varying float vFade;

const float CYCLE = 9.0; // seconds per rise
const float RISE = 0.9; // specimen units risen per cycle

void main() {
  float phase = fract(uTime / (CYCLE * mix(0.7, 1.4, aSeed.y)) + aSeed.x);
  vec3 p = aOrigin;
  p.y += phase * RISE * mix(0.6, 1.2, aSeed.y);
  float w = uTime * mix(0.4, 0.9, aSeed.z) + aSeed.x * 40.0;
  p.x += sin(w) * 0.06 * aSeed.z;
  p.z += cos(w * 0.8) * 0.06 * aSeed.z;

  vColour = aColour;
  vFade = smoothstep(0.0, 0.2, phase) * (1.0 - smoothstep(0.65, 1.0, phase));

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = mix(9.0, 20.0, aSeed.w) * uPixelRatio * (3.0 / -mvPosition.z);
}
