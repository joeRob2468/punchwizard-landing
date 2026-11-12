// A mote: a soft round point, past white at its centre so it blooms, drawn
// additively and leaving the part ids in alpha alone.

uniform float uLevel; // 0–1: overall strength

varying vec3 vColour;
varying float vFade;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  float glow = exp(-r2 * 5.0);
  vec3 colour = (vColour * 1.8 + vec3(0.5) * exp(-r2 * 20.0)) * glow * vFade * uLevel;
  gl_FragColor = vec4(colour, 0.0);
  #include <colorspace_fragment>
}
