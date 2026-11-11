/**
 * Places visible labels in two margin columns, Hudspeth-style: each label goes to
 * the side its anchor is on, columns are sorted by anchor height, and overlaps
 * are pushed apart, then pulled back inside the column's vertical limits.
 */
export interface LayoutInput {
  readonly index: number;
  readonly x: number;
  readonly y: number;
}

export interface LayoutColumn {
  /** Edge of the column nearest the specimen (labels align to it), in px. */
  readonly edge: number;
  readonly top: number;
  readonly bottom: number;
}

export interface LayoutOptions {
  /** Anchors left of this x go to the left column. */
  readonly splitX: number;
  readonly left: LayoutColumn;
  readonly right: LayoutColumn;
  /** Minimum distance between label centres. */
  readonly rowHeight: number;
}

export interface PlacedLabel {
  readonly index: number;
  readonly side: 'left' | 'right';
  /** Column edge x and label centre y, in px. */
  readonly x: number;
  readonly y: number;
}

export function layoutLabels(items: readonly LayoutInput[], options: LayoutOptions): PlacedLabel[] {
  const left = items.filter((item) => item.x < options.splitX);
  const right = items.filter((item) => item.x >= options.splitX);
  return [
    ...placeColumn(left, options.left, options.rowHeight).map((p) => ({
      ...p,
      side: 'left' as const,
      x: options.left.edge,
    })),
    ...placeColumn(right, options.right, options.rowHeight).map((p) => ({
      ...p,
      side: 'right' as const,
      x: options.right.edge,
    })),
  ];
}

function placeColumn(
  items: readonly LayoutInput[],
  column: LayoutColumn,
  gap: number,
): { index: number; y: number }[] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const ys = sorted.map((item) => Math.min(column.bottom, Math.max(column.top, item.y)));
  // Push down to remove overlaps…
  for (let i = 1; i < ys.length; i++) {
    const prev = ys[i - 1] ?? column.top;
    if ((ys[i] ?? 0) < prev + gap) ys[i] = prev + gap;
  }
  // …then back up from the bottom if the column overflowed.
  for (let i = ys.length - 1; i >= 0; i--) {
    const limit = i === ys.length - 1 ? column.bottom : (ys[i + 1] ?? column.bottom) - gap;
    if ((ys[i] ?? 0) > limit) ys[i] = limit;
  }
  return sorted.map((item, i) => ({ index: item.index, y: ys[i] ?? item.y }));
}
