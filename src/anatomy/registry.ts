/**
 * The labelled anatomy of Pugnomagus pileatus. Text mirrors docs/anatomy.md;
 * anchors are in specimen space (see src/procedural/landmarks.ts).
 */
import { LANDMARKS as L } from '../procedural/landmarks.ts';
import { focusGemCentres } from '../procedural/parts/brain.ts';
import { lerp, mirrorX } from '../procedural/sdf/math.ts';
import type { AnatomyEntry } from './types.ts';

export const ANATOMY: readonly AnatomyEntry[] = [
  {
    id: 'hat',
    number: 1,
    name: 'The Hat',
    latin: 'Pileus arcanus',
    description:
      'Not clothing but a horn of laminated keratin grown from the crown. One growth ring is laid down for each year of study.',
    part: 'hat',
    section: [
      [0, 1.1, -0.12],
      [0, 0.75, -0.1],
      [0.1, 1.4, -0.18],
    ],
    surface: [
      [-0.3, 1.1, 0.1],
      [0.3, 1.1, 0.1],
      [0, 1.3, -0.45],
    ],
  },
  {
    id: 'lattice',
    number: 2,
    name: 'Conduit Lattice',
    latin: 'Rete pilei',
    description:
      'Mana vessels that rise through the crown and branch up the hat to its tip, where surplus mana is discharged.',
    part: 'lattice',
    section: [
      [0.0, 0.82, -0.08],
      [0.0, 0.72, -0.07],
      [0.05, 1.15, -0.14],
    ],
    surface: [],
  },
  {
    id: 'fontanelle',
    number: 3,
    name: 'Third Fontanelle',
    latin: 'Fonticulus tertius',
    description:
      'An opening in the crown of the skull that never closes. The Conduit Lattice passes through it into the hat.',
    part: 'lattice',
    section: [L.fontanelle],
    surface: [],
  },
  {
    id: 'core',
    number: 4,
    name: 'Aetheric Core',
    latin: 'Nucleus aethericus',
    description:
      'A glowing nodule at the centre of the brain where mana is stored. Every vessel leads to it.',
    part: 'aetheric-core',
    section: [L.aethericCore],
    surface: [],
  },
  {
    id: 'gland',
    number: 5,
    name: 'Ethereal Gland',
    latin: 'Glandula aetheris',
    description:
      'Meters out spell potency. When overworked, the wizard suffers burnout: dim eyes and a limp hat.',
    part: 'ethereal-gland',
    section: [L.etherealGland],
    surface: [],
  },
  {
    id: 'gems',
    number: 6,
    name: 'Focus Gems',
    latin: 'Gemmae cogitationis',
    description:
      'Crystals under the cortex, one for each discipline mastered. Old wizards carry many.',
    part: 'focus-gems',
    section: focusGemCentres(),
    surface: [],
  },
  {
    id: 'eye',
    number: 7,
    name: 'Crystalline Eye',
    latin: 'Oculus crystallinus',
    description: 'Fed directly by the vessels; sees ley lines and the glow of enchanted things.',
    part: 'eyes',
    section: [
      [L.eyeLeft[0], L.eyeLeft[1], L.eyeLeft[2] + 0.05],
      [-L.eyeLeft[0], L.eyeLeft[1], L.eyeLeft[2] + 0.05],
    ],
    surface: [
      [L.eyeLeft[0], L.eyeLeft[1], L.eyeLeft[2] + 0.07],
      [-L.eyeLeft[0], L.eyeLeft[1], L.eyeLeft[2] + 0.07],
    ],
  },
  {
    id: 'sinus',
    number: 8,
    name: 'Incantatory Sinus',
    latin: 'Sinus incantatorius',
    description: 'A resonance chamber behind the nose that tunes the voice for incantation.',
    part: 'sinus',
    section: [L.sinus, [0.06, 0.07, 0.28], [-0.06, 0.07, 0.28]],
    surface: [],
  },
  {
    id: 'tongue',
    number: 9,
    name: 'Glossal Arcanum',
    latin: 'Lingua sigillata',
    description:
      'Ridged like engraved sigils, for the precise consonants of the old spell-tongues.',
    part: 'tongue',
    section: [L.tongue, [0, L.tongue[1], L.tongue[2] + 0.08]],
    surface: [],
  },
  {
    id: 'beard',
    number: 10,
    name: 'Mnemonic Beard',
    latin: 'Barba mnemonica',
    description: 'Each hair holds one memory. Trimming the beard is forgetting.',
    part: 'beard',
    section: [
      [0, -0.85, 0.42],
      [0, -0.55, 0.4],
    ],
    surface: [
      [0, -0.85, 0.8],
      [0.25, -0.6, 0.7],
      [-0.25, -0.6, 0.7],
    ],
  },
  {
    id: 'vessels',
    number: 11,
    name: 'Aetherial Vessels',
    latin: 'Vasa aetheria',
    description:
      'Carry mana from the core down the neck to the arms, for gesturing, and forward to the eyes.',
    part: 'vessels',
    section: [
      [0, -0.45, -0.04],
      [0, -0.2, -0.12],
      lerp(L.shoulderLeft, [0, -0.6, 0], 0.4),
      lerp(mirrorX(L.shoulderLeft), [0, -0.6, 0], 0.4),
    ],
    surface: [],
  },
  {
    id: 'perch',
    number: 12,
    name: "Familiar's Perch",
    latin: 'Processus familiaris',
    description:
      'A shelf of bone grown from the left collarbone, through the robe, for an owl or toad to ride on.',
    part: 'girdle',
    section: [L.familiarsPerch],
    surface: [[L.familiarsPerch[0], L.familiarsPerch[1] + 0.1, L.familiarsPerch[2]]],
  },
];
