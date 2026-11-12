/**
 * The plate's views, which visitors switch between (`ui/ViewToggle`): the default
 * illustration and an MRI scan. Each is light laid onto a dark ground: a full
 * palette, line colours and strengths. The DOM side of each is mirrored in
 * src/styles/tokens.css (`:root` for the default, `[data-look=…]` for the
 * others); change both together.
 */
import type { Layer } from '../procedural/format/specimen-format.ts';
import { PALETTE, type PaletteKey } from './palette.ts';

/** The magical organs keep their glow colours in every view. */
const ORGAN_GLOWS = {
  arcaneViolet: PALETTE.arcaneViolet,
  arcaneRose: PALETTE.arcaneRose,
  arcaneLime: PALETTE.arcaneLime,
  arcaneMagenta: PALETTE.arcaneMagenta,
  arcaneGold: PALETTE.arcaneGold,
  arcaneSapphire: PALETTE.arcaneSapphire,
  arcaneEmerald: PALETTE.arcaneEmerald,
  arcaneLumen: PALETTE.arcaneLumen,
  arcaneEmber: PALETTE.arcaneEmber,
} as const;

export type Palette = Readonly<Record<PaletteKey, string>>;

export interface Look {
  /** Shown on the view toggle. */
  readonly label: string;
  /** 0–1 strength of the paper's mottling, fibres, foxing, vignette and granulation. */
  readonly paperTexture: number;
  /** Pigments, and paper / paper shadow / foxing for the ground. */
  readonly palette: Palette;
  /** Colour of section patterns on cut faces. */
  readonly line: string;
  /** Colour of outlines. */
  readonly outlineLine: string;
  /** 0–1 multipliers on the base outline and section-pattern strength. */
  readonly outline: number;
  readonly section: number;
  /** Washes for particular parts (by part id), overriding their palette key. */
  readonly partWash?: Readonly<Record<string, string>>;
  /** Colour and strength (0–1) of the marginalia drawn into the paper. */
  readonly chalk: string;
  readonly marginalia: number;
  /** Colour of the faint motes floating around the specimen. */
  readonly moteColour: string;
  /** Surface brightness per layer (cut faces unaffected); 1 where unset. */
  readonly layerGain?: Partial<Readonly<Record<Layer, number>>>;
}

/** Deyrolle washes on ink-black paper, with dark outlines and section lines. */
const NOCTURNE: Look = {
  label: 'Tabula',
  paperTexture: 0.8,
  palette: PALETTE,
  line: '#030304',
  outlineLine: '#050506',
  outline: 0.75,
  section: 0.8,
  moteColour: '#bfb59c',
  chalk: '#e8dcc0',
  marginalia: 0.035,
};

/**
 * A T2-weighted MRI: near-black, grey by tissue (fluid brightest, muscle and bone
 * dark), the outside dimmed so the cut faces carry the image; only the magical organs
 * keep their colours.
 */
const MRI: Look = {
  label: 'Resonantia',
  paperTexture: 0.6,
  palette: {
    paper: '#060607',
    paperShadow: '#000000',
    foxing: '#0b0c0d',
    ink: '#050505',
    washFlesh: '#7a7d7e',
    washMuscle: '#4a4c4e',
    washBone: '#5c5f61',
    washBrain: '#aeb3b5',
    washOchre: '#7d7f80',
    washVerdigris: '#8b9294',
    washVein: '#6a7276',
    washUmber: '#3e3f40',
    washPlum: '#4b4c4e',
    washCartilage: '#9aa1a4',
    washCsf: '#f2f6f8',
    arcaneMana: '#4fd8e0',
    arcaneGarnet: '#9a9ea0',
    ...ORGAN_GLOWS,
  },
  line: '#141617',
  outlineLine: '#141617',
  outline: 0.8,
  section: 0.45,
  moteColour: '#8f9a9e',
  chalk: '#c9d3d6',
  marginalia: 0.028,
  partWash: scanParts('#1a1c1e', '#8c9194', '#e8eef0'),
  layerGain: { integument: 0.25 },
};

export const LOOKS = { nocturne: NOCTURNE, mri: MRI } as const;
export type LookId = keyof typeof LOOKS;
export const LOOK_IDS = Object.keys(LOOKS) as readonly LookId[];
export const DEFAULT_LOOK: LookId = 'nocturne';

export function isLookId(value: unknown): value is LookId {
  return typeof value === 'string' && value in LOOKS;
}

/**
 * A part's wash under `look`: the look's override for the part, else its palette
 * key's colour, else the look's ink.
 */
export function washFor(look: Look, partId: string, key: string): string {
  const override = look.partWash?.[partId];
  if (override !== undefined) return override;
  return key in look.palette ? look.palette[key as PaletteKey] : look.palette.ink;
}

/** In a scan, hair and clothing give no signal; the eye's fluid is bright. */
function scanParts(noSignal: string, white: string, fluid: string): Record<string, string> {
  const parts: Record<string, string> = { callosum: white, eyes: fluid };
  for (const id of [
    'hair',
    'beard',
    'moustache',
    'eyebrows',
    'hat',
    'hat-band',
    'mantle',
    'robe',
  ]) {
    parts[id] = noSignal;
  }
  return parts;
}
