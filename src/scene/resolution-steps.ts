/**
 * The pixel ratios AdaptiveResolution moves between: quarter steps from `min` up
 * to the screen's own ratio `max`, lowest first.
 */
export function resolutionSteps(max: number, min: number): number[] {
  const steps: number[] = [];
  for (let dpr = Math.min(min, max); dpr < max - 0.01; dpr += 0.25) steps.push(dpr);
  steps.push(max);
  return steps;
}
