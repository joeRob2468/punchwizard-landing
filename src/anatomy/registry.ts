/**
 * The labelled anatomy of Pugnomagus pileatus. Text mirrors docs/anatomy.md;
 * anchors are in specimen space (see src/procedural/landmarks.ts).
 */
import { LANDMARKS as L } from '../procedural/landmarks.ts';
import { LATTICE_BEND } from '../procedural/parts/arcane.ts';
import { focusGemCentres } from '../procedural/parts/brain.ts';
import {
  COCHLEA_CENTRE,
  GANGLIA_CENTRES,
  HEART_TOP,
  LEXICON_BINDING,
  LEXICON_CENTRE,
} from '../procedural/parts/fantasy.ts';
import { SINUS_PIPES } from '../procedural/parts/face-organs.ts';
import { hornTip } from '../procedural/parts/cranium.ts';
import { canalAt } from '../procedural/parts/spine-path.ts';
import { bezier, lerp, mirrorX } from '../procedural/sdf/math.ts';
import type { AnatomyEntry } from './types.ts';

export const ANATOMY: readonly AnatomyEntry[] = [
  {
    id: 'hat',
    number: 1,
    name: 'The Hat',
    latin: 'Pileus arcanus',
    description:
      'Not clothing but a sheath of laminated keratin over a horn core of bone, into which the brain itself has grown. One growth ring is laid down for each year of study.',
    part: 'hat',
    section: [
      [0.1, 1.45, -0.18],
      [0.12, 1.6, -0.2],
      [0, 0.75, 0.3],
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
    // Along the trunk, up through the brain to the fontanelle.
    section: [0.35, 0.55, 0.75, 0.2].map((t) => bezier(L.aethericCore, LATTICE_BEND, hornTip(), t)),
    surface: [],
  },
  {
    id: 'fontanelle',
    number: 3,
    name: 'Third Fontanelle',
    latin: 'Fonticulus tertius',
    description:
      "An opening at the tip of the skull's horn core that never closes. The Conduit Lattice passes through it into the hat.",
    part: 'lattice',
    section: [hornTip()],
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
    section: [...SINUS_PIPES],
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
      'Carry mana from the core down the spinal canal, out to the arms for gesturing and forward to the eyes. The Cor Aethericum drives them.',
    part: 'vessels',
    section: [
      [0, -0.45, canalAt(-0.45)[2] - 0.026],
      [0, -0.3, canalAt(-0.3)[2] - 0.026],
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
  {
    id: 'pileal-lobe',
    number: 13,
    name: 'Pileal Lobe',
    latin: 'Lobus pileatus',
    description:
      'The brain does not stop at the brim. It grows up the horn core into the hat for as long as the wizard keeps learning; the tallest hats hold the most.',
    part: 'brain',
    section: [
      [0, 0.9, -0.02],
      [0, 0.75, 0.02],
      [0, 1.0, -0.06],
    ],
    surface: [],
  },
  {
    id: 'lexicon',
    number: 14,
    name: 'Lexicon Lamellae',
    latin: 'Lamellae lexicales',
    description:
      'Leaves of tissue stacked like the pages of a book behind the brow, one leaf to a spell. A wizard who forgets a spell has torn out a page.',
    part: 'lexicon',
    // On the binding along the leaves' inner edge.
    section: [0, 0.02, -0.02].map((dy): [number, number, number] => [
      0,
      LEXICON_CENTRE[1] + dy,
      LEXICON_CENTRE[2] - 0.12 + LEXICON_BINDING,
    ]),
    surface: [],
  },
  {
    id: 'heart',
    number: 15,
    name: 'Cor Aethericum',
    latin: 'Cor aethericum',
    description:
      'A second heart behind the breastbone, of four faceted chambers, that beats mana rather than blood. It quickens before a spell.',
    part: 'heart',
    section: [
      [HEART_TOP[0] - 0.02, HEART_TOP[1] - 0.08, HEART_TOP[2]],
      [HEART_TOP[0], HEART_TOP[1] - 0.12, HEART_TOP[2] + 0.01],
    ],
    surface: [],
  },
  {
    id: 'cochlea',
    number: 16,
    name: 'Cochlea Arcana',
    latin: 'Cochlea arcana',
    description:
      'A second inner ear by each of the first, coiled tighter, that hears the hum of enchanted things and the lies in a spoken charm.',
    part: 'cochlea',
    section: [
      [COCHLEA_CENTRE[0], COCHLEA_CENTRE[1], COCHLEA_CENTRE[2] + 0.038],
      [-COCHLEA_CENTRE[0], COCHLEA_CENTRE[1], COCHLEA_CENTRE[2] + 0.038],
    ],
    surface: [],
  },
  {
    id: 'ganglia',
    number: 17,
    name: 'Ganglia Arcana',
    latin: 'Ganglia arcana',
    description:
      'Beads of light strung down the front of the spinal cord, one to a vertebra. Each holds a reflex spell, cast faster than thought.',
    part: 'ganglia',
    section: GANGLIA_CENTRES.slice(2, 7),
    surface: [],
  },
  {
    id: 'beard-roots',
    number: 18,
    name: 'Radix Barbae',
    latin: 'Radix barbae',
    description:
      'The root plexus along the jaw from which the Mnemonic Beard grows. Memories pass down it to be filed in the hairs.',
    part: 'beard-roots',
    section: [
      [0, -0.43, 0.433],
      [-0.06, -0.433, 0.425],
    ],
    surface: [],
  },
  {
    id: 'superiority',
    name: 'Signature look of superiority',
    latin: 'Vultus superioritatis',
    description:
      'Perfected over centuries of looking down the nose at apprentices. Best delivered over the beard, in silence.',
    part: 'head',
    section: [
      [0, 0.0, 0.6],
      [0, 0.1, 0.5],
    ],
    surface: [
      [0.1, 0.13, 0.49],
      [-0.1, 0.13, 0.49],
      [0, 0.05, 0.62],
    ],
  },
];
