/**
 * Candidate looks for the plate, compared in development with the style panel
 * (`ui/StylePanel`); one will ship. A look is a full palette plus how marks sit
 * on the ground: pigment multiplied onto pale paper, or light laid onto a dark
 * ground. The DOM side of each look is mirrored in src/styles/tokens.css
 * (`[data-look=…]`); change both together.
 */
import type { Layer } from '../procedural/format/specimen-format.ts';
import { PALETTE, type PaletteKey } from './palette.ts';

export type Palette = Readonly<Record<PaletteKey, string>>;

export interface Look {
  readonly label: string;
  /** Pigment on paper (multiplied), or light on a dark ground (screened). */
  readonly ground: 'paper' | 'dark';
  /** 0–1 strength of the paper's mottling, fibres, foxing, vignette and granulation. */
  readonly paperTexture: number;
  /** Pigments, and paper / paper shadow / foxing for the ground. */
  readonly palette: Palette;
  /** Colour of outlines and section patterns. */
  readonly line: string;
  /** 0–1 multipliers on the base outline and section-pattern strength. */
  readonly outline: number;
  readonly section: number;
  /** Washes for particular parts (by part id), overriding their palette key. */
  readonly partWash?: Readonly<Record<string, string>>;
  /** Surface brightness per layer (cut faces unaffected); 1 where unset. */
  readonly layerGain?: Partial<Readonly<Record<Layer, number>>>;
}

const PLATE: Look = {
  label: 'Plate',
  ground: 'paper',
  paperTexture: 0.35,
  palette: PALETTE,
  line: PALETTE.ink,
  outline: 1,
  section: 1,
};

/** The plate's colours on ink-black paper, with dark lines. */
const NOCTURNE: Look = {
  label: 'Nocturne',
  ground: 'dark',
  paperTexture: 0.8,
  palette: {
    paper: '#17181c',
    paperShadow: '#09090b',
    foxing: '#2b2620',
    ink: '#0b0b0d',
    washFlesh: '#c98f76',
    washMuscle: '#a8483f',
    washBone: '#d8ccb0',
    washBrain: '#c0898c',
    washOchre: '#c8963f',
    washVerdigris: '#5f9e84',
    washVein: '#5577b8',
    washUmber: '#8a6446',
    washPlum: '#7e5a8a',
    washCartilage: '#9fbaba',
    washCsf: '#bcd6dc',
    arcaneMana: '#5fe0e6',
    arcaneGarnet: '#c0304a',
  },
  line: '#050506',
  outline: 0.75,
  section: 0.5,
};

/**
 * A T2-weighted MRI: near-black, grey by tissue (fluid brightest, muscle and bone
 * dark), the outside dimmed so the cut faces carry the image; mana is the only colour.
 */
const MRI: Look = {
  label: 'MRI',
  ground: 'dark',
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
  },
  line: '#141617',
  outline: 0.8,
  section: 0.45,
  partWash: scanParts('#1a1c1e', '#8c9194', '#e8eef0'),
  layerGain: { integument: 0.25 },
};

export const LOOKS = {
  plate: PLATE,
  nocturne: NOCTURNE,
  mri: MRI,
} as const;
export type LookId = keyof typeof LOOKS;
export const LOOK_IDS = Object.keys(LOOKS) as readonly LookId[];
export const DEFAULT_LOOK: LookId = 'plate';

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
