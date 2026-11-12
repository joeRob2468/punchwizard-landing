// Light on the ground around the bust where he stands in the rune circle. The
// footprint (a signed distance field, uDistance) is intersected with the kept side
// of the sectioning plane, so the light follows what's actually there, cut face
// included; then a bright wavering edge and a soft falloff outward, fading by the
// circle's rim. Added onto the scene; alpha (the outline effect's part ids) is kept.
// Shares lib/seam.glsl (its uniforms too) with the seam on the body.

uniform sampler2D uDistance; // footprint distance, encoded 0–1 over uDistanceRange
uniform vec2 uDistanceRange; // ground units at 0 and 1
uniform vec2 uGridRange; // the field's extent in x and z (min, max)
uniform vec4 uCut; // sectioning plane: normal, constant (kept where dot(n, p) + c > 0)
uniform vec3 uColour;
uniform float uSpread; // ground units: how far the light reaches outward
uniform float uFadeRadius; // ground units from the centre: the circle's rim

varying vec3 vWorld;

void main() {
  vec2 tc = (vWorld.xz - uGridRange.x) / (uGridRange.y - uGridRange.x);
  float foot = mix(uDistanceRange.x, uDistanceRange.y, texture2D(uDistance, tc).r);
  // Outside the kept half counts as outside the body: intersect the two shapes.
  float d = max(foot, -(dot(uCut.xyz, vWorld) + uCut.w));

  // The edge stays put, so it always glows; the waves (shared with the seam on the
  // body, lib/seam.glsl) change how far the light spreads out, and its brightness.
  float wave = pwUndulate(vWorld.xz);
  float shimmer = 0.78 + 0.22 * wave;

  float outside = max(d, 0.0);
  float edge = 1.0 - smoothstep(0.0, 0.045, abs(d));
  float spread = exp(-outside / (uSpread * (1.0 + 0.4 * wave))) * step(-0.01, d);
  float light = (edge * 1.4 + spread * 0.55) * shimmer;
  light *= 1.0 - smoothstep(uFadeRadius * 0.75, uFadeRadius, length(vWorld.xz));

  gl_FragColor = vec4(uColour * light, 1.0);
}
