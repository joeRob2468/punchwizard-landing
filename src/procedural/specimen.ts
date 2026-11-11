/**
 * The full list of procedural parts that make up the specimen. The bake meshes
 * every entry; order is draw order within a layer.
 */
import { LANDMARKS } from './landmarks.ts';
import { beardPart, hairPart } from './parts/hair.ts';
import { eyesPart, headPart } from './parts/head.ts';
import { hatPart } from './parts/hat.ts';
import type { PartDefinition } from './parts/part.ts';
import { robePart } from './parts/robe.ts';

export function specimenParts(): PartDefinition[] {
  return [robePart(), headPart(), eyesPart(), hairPart(), beardPart(), hatPart()];
}

export { LANDMARKS };
