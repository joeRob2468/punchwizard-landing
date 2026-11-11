// Small value-noise toolkit shared by the plate shaders. Cheap and stable rather
// than high quality: it only has to make ink and pigment look uneven.

float pwHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float pwHash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float pwNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(pwHash12(i), pwHash12(i + vec2(1.0, 0.0)), u.x),
    mix(pwHash12(i + vec2(0.0, 1.0)), pwHash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float pwNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(pwHash13(i), pwHash13(i + vec3(1.0, 0.0, 0.0)), u.x);
  float b = mix(pwHash13(i + vec3(0.0, 1.0, 0.0)), pwHash13(i + vec3(1.0, 1.0, 0.0)), u.x);
  float c = mix(pwHash13(i + vec3(0.0, 0.0, 1.0)), pwHash13(i + vec3(1.0, 0.0, 1.0)), u.x);
  float d = mix(pwHash13(i + vec3(0.0, 1.0, 1.0)), pwHash13(i + vec3(1.0, 1.0, 1.0)), u.x);
  return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
}

float pwFbm2(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * pwNoise2(p);
    p = p * 2.03 + 11.7;
    amp *= 0.5;
  }
  return sum / 0.9375;
}

float pwFbm3(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * pwNoise3(p);
    p = p * 2.03 + 11.7;
    amp *= 0.5;
  }
  return sum / 0.9375;
}
