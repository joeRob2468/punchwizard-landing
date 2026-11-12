/**
 * Pure helper for the ground glow: where a mesh crosses a horizontal plane, as
 * line segments in the plane (x, z pairs).
 */

/**
 * Segments where the triangles of an indexed mesh cross the plane y = `height`:
 * a flat array of x0, z0, x1, z1 for each segment.
 */
export function sliceAtHeight(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  height: number,
): number[] {
  const segments: number[] = [];
  const corner = (i: number): [number, number, number] => {
    const at = (indices[i] ?? 0) * 3;
    return [positions[at] ?? 0, (positions[at + 1] ?? 0) - height, positions[at + 2] ?? 0];
  };
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const tri = [corner(t), corner(t + 1), corner(t + 2)];
    const crossings: number[] = [];
    for (let e = 0; e < 3; e++) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      if (!a || !b || a[1] > 0 === b[1] > 0) continue;
      const s = a[1] / (a[1] - b[1]);
      crossings.push(a[0] + (b[0] - a[0]) * s, a[2] + (b[2] - a[2]) * s);
    }
    if (crossings.length === 4) segments.push(...crossings);
  }
  return segments;
}
