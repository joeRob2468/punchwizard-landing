/**
 * The full list of procedural parts that make up the specimen. The bake meshes
 * every entry in this order, and section caps are drawn in the same order with
 * later caps winning where parts overlap — so list parts from outermost to
 * innermost (an overlapping beard must not paint over the face it grows from).
 */
import { LANDMARKS } from './landmarks.ts';
import { latticePart, vesselsPart } from './parts/arcane.ts';
import { aethericCorePart, brainPart, etherealGlandPart, focusGemsPart } from './parts/brain.ts';
import { sinusPart, tonguePart } from './parts/face-organs.ts';
import { beardPart, eyebrowsPart, hairPart, moustachePart } from './parts/hair.ts';
import { eyesPart, headPart, irisPart, pupilPart } from './parts/head.ts';
import { hatBandPart, hatBucklePart, hatGemPart, hatPart } from './parts/hat.ts';
import type { PartDefinition } from './parts/part.ts';
import { robePart } from './parts/robe.ts';
import { girdlePart, mandiblePart, skullPart, spinePart } from './parts/skeleton.ts';

export function specimenParts(): PartDefinition[] {
  return [
    // Integument
    hatGemPart(),
    hatBucklePart(),
    hatBandPart(),
    hatPart(),
    eyebrowsPart(),
    moustachePart(),
    hairPart(),
    beardPart(),
    robePart(),
    headPart(),
    // Bone, then the soft organs it houses
    skullPart(),
    tonguePart(),
    sinusPart(),
    mandiblePart(),
    spinePart(),
    girdlePart(),
    // Brain and what is set in it
    brainPart(),
    focusGemsPart(),
    etherealGlandPart(),
    eyesPart(),
    irisPart('left'),
    irisPart('right'),
    pupilPart('left'),
    pupilPart('right'),
    // Arcane systems last so they read on top of everything they pass through
    vesselsPart(),
    latticePart(),
    aethericCorePart(),
  ];
}

export { LANDMARKS };
