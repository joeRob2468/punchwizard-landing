/**
 * Part ids for the outline effect's part edges: 1-based manifest index, kept
 * within 1–254 (255 marks the background and helpers such as the slice knob).
 * A part whose look names `inkAs` takes that part's id instead, so no edge is
 * inked where the two meet (the torso's flesh continuing the neck's).
 */
import type { PartEntry } from '../procedural/format/specimen-format.ts';

export function partIdFor(index: number): number {
  return Math.min(index + 1, 254);
}

/** The outline id of each part in manifest order, with `inkAs` resolved. */
export function partIds(entries: readonly PartEntry[]): number[] {
  return entries.map((entry, index) => {
    const target = entry.look.inkAs;
    const shared = target === undefined ? -1 : entries.findIndex((e) => e.id === target);
    return partIdFor(shared >= 0 ? shared : index);
  });
}
