/**
 * Part ids for the outline effect's part edges: 1-based manifest index, kept
 * within 1–254 (255 marks the background and helpers such as the slice knob).
 */
export function partIdFor(index: number): number {
  return Math.min(index + 1, 254);
}
