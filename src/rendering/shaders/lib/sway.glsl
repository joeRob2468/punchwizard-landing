// Idle sway (specimen/idle.ts): points above the hat's brim lean by up to uSway
// (x, z) at the tip, smoothly more the higher they are.
uniform vec2 uSway;
uniform vec2 uSwayRange; // heights where the sway starts and is full

vec3 pwSway(vec3 p) {
  float s = smoothstep(uSwayRange.x, uSwayRange.y, p.y);
  return p + vec3(uSway.x, 0.0, uSway.y) * s * s;
}
