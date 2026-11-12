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
  /** Colour of hatching and section patterns. */
  readonly line: string;
  /** Colour of outlines; `line` if unset. */
  readonly outlineLine?: string;
  /** Tint of the haze effect (config/fx.ts): pigment on paper, light on a dark ground. */
  readonly haze: string;
  /** 0–1 multipliers on the base hatching, outline and section-pattern strength. */
  readonly hatch: number;
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
  palette: PALETTE,
  line: PALETTE.ink,
  haze: '#d6ecea',
  hatch: 1,
  outline: 1,
  section: 1,
};

/** The plate's colours on ink-black paper: pale chalk hatching, dark outlines. */
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
  outlineLine: '#050506',
  haze: '#1f5560',
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
  haze: '#2c3438',
  hatch: 0,
  outline: 0.8,
  section: 0.45,
  partWash: scanParts('#1a1c1e', '#8c9194', '#e8eef0'),
  layerGain: { integument: 0.25 },
};

/**
 * A false-colour MRI, as in the colourised scans: brain and cord steel blue with
 * bright fluid, soft tissue and muscle red-orange, bone orange, discs pale blue.
 */
const MRI_COLOUR: Look = {
  label: 'MRI colour',
  ground: 'dark',
  palette: {
    paper: '#050608',
    paperShadow: '#000000',
    foxing: '#0a0c10',
    ink: '#040506',
    washFlesh: '#b0603c',
    washMuscle: '#a8392a',
    washBone: '#c87436',
    washBrain: '#5b84ba',
    washOchre: '#d29a4c',
    washVerdigris: '#6aa8c0',
    washVein: '#3f6fb0',
    washUmber: '#5a3020',
    washPlum: '#3b3560',
    washCartilage: '#9cc4e6',
    washCsf: '#e6f6ff',
    arcaneMana: '#7fe8ff',
    arcaneGarnet: '#e05038',
  },
  line: '#0c1220',
  haze: '#1c3a66',
  hatch: 0,
  outline: 0.8,
  section: 0.45,
  partWash: scanParts('#121826', '#8fb4e0', '#d8f0ff'),
  layerGain: { integument: 0.3 },
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
  haze: '#efe0c2',
  hatch: 1,
  outline: 1,
  section: 1,
};

export const LOOKS = {
  plate: PLATE,
  nocturne: NOCTURNE,
  mri: MRI,
  'mri-colour': MRI_COLOUR,
  sepia: SEPIA,
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
