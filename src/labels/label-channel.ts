/**
 * Hands per-frame label positions from the scene (inside the Canvas) to the DOM
 * overlay without going through React state. The tracker writes `samples` and
 * calls `publish`; the overlay subscribes and updates its elements directly.
 */
export interface LabelSample {
  visible: boolean;
  /** Anchor position in CSS pixels, relative to the canvas. */
  x: number;
  y: number;
}

export class LabelChannel {
  readonly samples: LabelSample[];
  width = 0;
  height = 0;
  /** Screen x of the specimen's centre; anchors left of it are labelled on the left. */
  centreX = 0;
  readonly #listeners = new Set<() => void>();

  constructor(count: number) {
    this.samples = Array.from({ length: count }, () => ({ visible: false, x: 0, y: 0 }));
  }

  setSample(index: number, visible: boolean, x = 0, y = 0): void {
    const sample = this.samples[index];
    if (!sample) return;
    sample.visible = visible;
    sample.x = x;
    sample.y = y;
  }

  setViewport(width: number, height: number, centreX: number): void {
    this.width = width;
    this.height = height;
    this.centreX = centreX;
  }

  publish(): void {
    for (const listener of this.#listeners) listener();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
}
