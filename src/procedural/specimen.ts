/**
 * The full list of procedural parts that make up the specimen. The bake meshes
 * every entry in this order, and section caps are drawn in the same order with
 * later caps winning where parts overlap — so list parts from outermost to
 * innermost (an overlapping beard must not paint over the face it grows from).
 */
import { LANDMARKS } from './landmarks.ts';
import { beardPart, hairPart } from './parts/hair.ts';
import { eyesPart, headPart } from './parts/head.ts';
import { hatPart } from './parts/hat.ts';
import type { PartDefinition } from './parts/part.ts';
import { robePart } from './parts/robe.ts';

export function specimenParts(): PartDefinition[] {
  return [hatPart(), hairPart(), beardPart(), robePart(), headPart(), eyesPart()];
}

export { LANDMARKS };
