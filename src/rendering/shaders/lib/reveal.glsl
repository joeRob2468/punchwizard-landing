// The ink-in on load, shared by the outline pass (which masks the scene, so bloom
// and the paper only see what has inked in) and the paper pass (which shows its
// marginalia through what hasn't). A ragged front soaks outward from the
// specimen's centre as `reveal` goes 0 → 1. Uses the effects' `aspect` uniform.

// 0 where the front hasn't reached `uv` yet, 1 where it has (soft at the front).
float pwInked(vec2 uv, vec2 centre, float reveal) {
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  vec2 fromCentre = vec2((uv.x - centre.x) * aspect, uv.y - centre.y);
  // 0–1: noise for a ragged edge, plus nearness to the centre so it spreads outward.
  float n = 0.4 * pwFbm2(q * 5.0 + 31.0) + 0.6 * (1.0 - clamp(length(fromCentre) / 0.6, 0.0, 1.0));
  float front = mix(-0.15, 1.05, 1.0 - reveal);
  return smoothstep(front - 0.004, front + 0.08, n);
}
