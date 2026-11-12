/**
 * What each kind of surface is made of, for the surface shader: how it takes the
 * light (highlight, sheen, light scattered under the surface), its fine relief
 * (a bump from noise, optionally stretched along one axis) and how much its colour
 * varies. These keep the specimen from looking like one smooth plastic.
 */
import type { PaletteKey } from './palette.ts';

export interface Surface {
  /** Highlight strength and tightness (Blinn exponent). */
  readonly specular: number;
  readonly gloss: number;
  /** 0–1: the highlight takes the surface's colour (gilt), rather than white. */
  readonly metallic: number;
  /** Soft brightening at grazing angles, like velvet or felt. */
  readonly sheen: number;
  /** Warm light scattered under the surface at the terminator (skin, tissue). */
  readonly scatter: number;
  /** Relief height, in specimen units, and its frequency (bumps per unit). */
  readonly bump: number;
  readonly grain: number;
  /** Scales the relief's frequency per axis; a small y stretches it into strands. */
  readonly stretch: readonly [number, number, number];
  /** 0–1: how much the colour varies across the surface. */
  readonly mottle: number;
}

const SKIN: Surface = {
  specular: 0.16,
  gloss: 18,
  metallic: 0,
  sheen: 0.06,
  scatter: 1,
  bump: 0.0014,
  grain: 130,
  stretch: [1, 1, 1],
  mottle: 1,
};

/** Felt and wool: no real highlight, a soft sheen, a fine nap. */
const CLOTH: Surface = {
  specular: 0.02,
  gloss: 6,
  metallic: 0,
  sheen: 0.4,
  scatter: 0.1,
  bump: 0.0005,
  grain: 280,
  stretch: [1, 1, 1],
  mottle: 0.8,
};

const LEATHER: Surface = {
  specular: 0.22,
  gloss: 26,
  metallic: 0,
  sheen: 0.05,
  scatter: 0,
  bump: 0.0008,
  grain: 120,
  stretch: [1, 1, 1],
  mottle: 0.9,
};

/** Fine streaks along the strands (stretched relief), a soft hair highlight. */
const HAIR: Surface = {
  specular: 0.22,
  gloss: 30,
  metallic: 0,
  sheen: 0.15,
  scatter: 0.3,
  bump: 0.003,
  grain: 140,
  stretch: [1, 0.05, 1],
  mottle: 0.7,
};

const BONE: Surface = {
  specular: 0.08,
  gloss: 12,
  metallic: 0,
  sheen: 0,
  scatter: 0.25,
  bump: 0.0005,
  grain: 110,
  stretch: [1, 1, 1],
  mottle: 0.9,
};

/** Wet organs: a tight bright highlight and strong scattering. */
const TISSUE: Surface = {
  specular: 0.4,
  gloss: 55,
  metallic: 0,
  sheen: 0,
  scatter: 0.8,
  bump: 0.0004,
  grain: 90,
  stretch: [1, 1, 1],
  mottle: 0.7,
};

/** Gilt trim and fittings: a strong highlight in the metal's own colour. */
const METAL: Surface = {
  specular: 0.9,
  gloss: 45,
  metallic: 1,
  sheen: 0,
  scatter: 0,
  bump: 0.0003,
  grain: 200,
  stretch: [1, 1, 1],
  mottle: 0.5,
};

export const SURFACES = { SKIN, CLOTH, LEATHER, HAIR, BONE, TISSUE, METAL } as const;

const HAIR_PARTS = new Set(['hair', 'beard', 'moustache', 'eyebrows']);

const BY_WASH: Partial<Readonly<Record<PaletteKey, Surface>>> = {
  washFlesh: SKIN,
  washVein: CLOTH,
  washPlum: CLOTH,
  washUmber: LEATHER,
  washOchre: METAL,
  washBone: BONE,
};

/** The surface a part is made of, from its id (hair) or its wash. */
export function surfaceFor(partId: string, wash: string): Surface {
  if (HAIR_PARTS.has(partId)) return HAIR;
  if (partId === 'eyes') return TISSUE;
  return BY_WASH[wash as PaletteKey] ?? TISSUE;
}
