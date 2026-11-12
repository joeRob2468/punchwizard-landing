// A crackling spark where mana vents (the hat's tip): a hot core, a soft halo and
// a few jagged arcs that re-roll many times a second. Colour goes past white so
// it blooms; drawn additively, leaving the part ids in alpha alone.

#include <common>
#include <clipping_planes_pars_fragment>

uniform vec3 uColour;
uniform float uTime;
uniform float uFlash; // 0–1: a mana pulse arriving
uniform float uLevel; // 0–1: overall strength (layer shown or see-through)

varying vec2 vUv;

const float ARC_RATE = 12.0; // arc patterns per second

void main() {
  #include <clipping_planes_fragment>

  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float core = exp(-r * r * 60.0);
  float halo = exp(-r * 5.0) * 0.35;

  float slot = floor(uTime * ARC_RATE);
  float arcs = 0.0;
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    if (pwHash12(vec2(slot, fk + 5.0)) < 0.4) continue; // not every arc every time
    float angle = pwHash12(vec2(slot, fk)) * 6.2831853;
    vec2 dir = vec2(cos(angle), sin(angle));
    float along = dot(p, dir);
    float across = dot(p, vec2(-dir.y, dir.x));
    float len = 0.35 + 0.55 * pwHash12(vec2(slot, fk + 9.0));
    float jag = (pwNoise2(vec2(along * 10.0, slot * 1.7 + fk * 3.0)) - 0.5) * 0.25 * along;
    float d = (across - jag) / 0.014;
    arcs += exp(-d * d) * step(0.0, along) * (1.0 - smoothstep(len * 0.5, len, along));
  }

  float flicker = 0.7 + 0.3 * pwNoise2(vec2(uTime * 23.0, 1.0));
  float energy = (core * 3.0 + halo + arcs * 1.6) * flicker * (1.0 + 2.5 * uFlash);
  // Fade out before the quad's edge, or its square shows.
  float edge = 1.0 - smoothstep(0.75, 1.0, r);
  vec3 colour = (uColour * energy + vec3(core * 2.0)) * uLevel * edge;
  gl_FragColor = vec4(colour, 0.0);
  #include <colorspace_fragment>
}
