/**
 * Candidate looks for the plate, compared in development with the look switcher
 * (`ui/LookSwitcher`); one will ship. A look is a full palette plus how marks sit
 * on the ground: pigment multiplied onto pale paper, or light laid onto a dark
 * ground. The DOM side of each look is mirrored in src/styles/tokens.css
 * (`[data-look=…]`); change both together.
 */
import { Color } from 'three';

import type { Layer } from '../procedural/format/specimen-format.ts';
import { PALETTE, type PaletteKey } from './palette.ts';

export type Palette = Readonly<Record<PaletteKey, string>>;

export interface Look {
  readonly label: string;
  /** Pigment on paper (multiplied), or light on a dark ground (screened). */
  readonly ground: 'paper' | 'dark';
  /** Pigments, and paper / paper shadow / foxing for the ground. */
  readonly palette: Palette;
  /** Colour of outlines, hatching and section patterns. */
  readonly line: string;
  /** 0–1 multipliers on the base hatching, outline and section-pattern strength. */
  readonly hatch: number;
  readonly outline: number;
  readonly section: number;
  /** Surface brightness per layer (cut faces unaffected); 1 where unset. */
  readonly layerGain?: Partial<Readonly<Record<Layer, number>>>;
}

const PLATE: Look = {
  label: 'Plate',
  ground: 'paper',
  palette: PALETTE,
  line: PALETTE.ink,
  hatch: 1,
  outline: 1,
  section: 1,
};

/** The plate's colours on ink-black paper, drawn in pale chalk. */
const NOCTURNE: Look = {
  label: 'Nocturne',
  ground: 'dark',
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
  line: '#e8dcc0',
  hatch: 0.55,
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
  hatch: 0,
  outline: 0.8,
  section: 0.45,
  layerGain: { integument: 0.25 },
};

/** One brown ink on parchment, like a sketch sheet: every wash becomes a sepia tone. */
const SEPIA: Look = {
  label: 'Sepia',
  ground: 'paper',
  palette: {
    ...monochrome(PALETTE, '#4a2e1a', '#f3e4c6'),
    paper: '#f1e6cf',
    paperShadow: '#dcc9a6',
    foxing: '#b3854f',
    ink: '#3a2414',
  },
  line: '#3a2414',
  hatch: 1,
  outline: 1,
  section: 1,
};

export const LOOKS = { plate: PLATE, nocturne: NOCTURNE, mri: MRI, sepia: SEPIA } as const;
export type LookId = keyof typeof LOOKS;
export const LOOK_IDS = Object.keys(LOOKS) as readonly LookId[];
export const DEFAULT_LOOK: LookId = 'plate';

export function isLookId(value: unknown): value is LookId {
  return typeof value === 'string' && value in LOOKS;
}

/** A part's wash under `look`: its palette key's colour, or the look's ink if unknown. */
export function washFor(look: Look, key: string): string {
  return key in look.palette ? look.palette[key as PaletteKey] : look.palette.ink;
}

/** Maps every colour to a tone between `dark` and `light` by its luminance. */
function monochrome(palette: Palette, dark: string, light: string): Palette {
  const from = new Color(dark);
  const to = new Color(light);
  const out = new Color();
  const entries = Object.entries(palette).map(([key, hex]) => {
    const c = new Color(hex);
    const luminance = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    return [key, `#${out.lerpColors(from, to, luminance).getHexString()}`];
  });
  return Object.fromEntries(entries) as Palette;
}
