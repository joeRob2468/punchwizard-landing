/**
 * The specimen's idle life, as pure functions of time so the shaders, the section
 * stencils and the label anchors all agree: glows that breathe each on their own
 * rhythm, the Cor Aethericum's heartbeat (which also drives the mana pulses), an
 * occasional blink of the Crystalline Eyes, and a slow sway of everything above
 * the hat's brim, growing toward the tip.
 */
import { LANDMARKS as L } from '../procedural/landmarks.ts';

/** Seconds per heartbeat. */
export const BEAT_PERIOD = 1.6;

/** Sway: everything above `from` leans, by up to `amplitude` at `to` (specimen units). */
export const SWAY = { from: L.brimCentre[1] + 0.1, to: L.hatTip[1], amplitude: 0.03 } as const;

/** 0–1: a slow breath for a glowing part, with its own phase and pace from `seed`. */
export function breathe(t: number, seed: number): number {
  const rate = 0.9 + 0.5 * fract(seed * 0.618);
  return 0.5 + 0.5 * Math.sin(t * rate + seed * 2.399);
}

/** 0–1: the heart's lub-dub, peaking twice at the start of each beat. */
export function heartbeat(t: number): number {
  const phase = (t % BEAT_PERIOD) / BEAT_PERIOD;
  const bump = (centre: number, width: number) => Math.exp(-(((phase - centre) / width) ** 2));
  return Math.min(1, bump(0.04, 0.035) + 0.7 * bump(0.18, 0.04));
}

/** Seconds since the last beat began. */
export function sinceBeat(t: number): number {
  return t % BEAT_PERIOD;
}

/** Where each heartbeat's mana pulses start: the Aetheric Core. */
export const FLOW_ORIGIN = L.aethericCore;
/** Parts the pulses run through. */
export const MANA_CARRIERS: ReadonlySet<string> = new Set([
  'aetheric-core',
  'lattice',
  'vessels',
  'ganglia',
]);
/** Speed of the pulses (specimen units per second). */
const FLOW_SPEED = 1.6;

/** Radii of this beat's two wavefronts (lub, then dub) from the core; negative: not yet. */
export function flowFronts(t: number): readonly [number, number] {
  const s = sinceBeat(t);
  const dub = s - 0.14 * BEAT_PERIOD;
  return [s * FLOW_SPEED, dub >= 0 ? dub * FLOW_SPEED : -1];
}

/** 1 with the eyes open, falling to 0 for a blink every few seconds. */
export function eyesOpen(t: number): number {
  const slot = 5.5;
  const n = Math.floor(t / slot);
  const at = n * slot + 1 + 3 * fract(Math.sin(n * 12.9898) * 43758.5453);
  const d = Math.abs(t - at);
  return Math.min(1, d / 0.09);
}

/** The sway at the hat's tip, [x, z], at time `t`. */
export function swayAtTip(t: number): readonly [number, number] {
  return [SWAY.amplitude * Math.sin(t * 0.55), SWAY.amplitude * 0.6 * Math.sin(t * 0.41 + 1.3)];
}

/** How much of the tip's sway a point at height `y` takes (0 below the brim). */
export function swayWeight(y: number): number {
  const s = Math.min(1, Math.max(0, (y - SWAY.from) / (SWAY.to - SWAY.from)));
  const smooth = s * s * (3 - 2 * s);
  return smooth * smooth;
}

/** 0–1: a glowing part's pulse at `t`: the heart beats, everything else breathes. */
export function glowPulse(partId: string, seed: number, t: number): number {
  return partId === 'heart' ? heartbeat(t) : breathe(t, seed);
}

/** 0–1: how lit a part's glow is at `t` (the Crystalline Eyes blink). */
export function glowLevel(partId: string, t: number): number {
  return partId.startsWith('iris-') ? eyesOpen(t) : 1;
}

function fract(x: number): number {
  return x - Math.floor(x);
}
