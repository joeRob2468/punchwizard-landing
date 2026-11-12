/**
 * Pure helpers for the ground glow: a signed distance field of the bust's
 * footprint on the ground, from the outline segments where its outer layer
 * crosses the ground (ground-slice.ts). Negative inside the footprint.
 */

/** A square grid over the ground: `size` × `size` cells from `min` to `max` in x and z. */
export interface GroundGrid {
  readonly size: number;
  readonly min: number;
  readonly max: number;
}

/**
 * Signed distance (ground units) from each cell's centre to the footprint's edge,
 * negative inside; row-major, rows along z, columns along x.
 */
export function footprintDistance(segments: readonly number[], grid: GroundGrid): Float32Array {
  const { size } = grid;
  const cell = (grid.max - grid.min) / size;
  const edge = rasterise(segments, grid);
  const outside = floodOutside(edge, size);

  const squared = new Float64Array(size * size);
  for (let i = 0; i < squared.length; i++) squared[i] = edge[i] ? 0 : Infinity;
  distanceTransform2d(squared, size);

  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) {
    const d = Math.sqrt(squared[i] ?? 0) * cell;
    out[i] = edge[i] || outside[i] ? d : -d;
  }
  return out;
}

/**
 * Signed distance to the *outer* edge of the outline (negative inside): gaps the
 * outline encloses count as inside, so only the silhouette has an edge. Within
 * `band` of it the distance is exact (to the segments themselves); further in it
 * comes from the grid.
 */
export function outlineDistance(
  segments: readonly number[],
  grid: GroundGrid,
  band: number,
): Float32Array {
  const { size, min, max } = grid;
  const cell = (max - min) / size;
  const edge = rasterise(segments, grid);
  const outside = floodOutside(edge, size);

  // Coarse: distance to the nearest outside cell.
  const squared = new Float64Array(size * size);
  for (let i = 0; i < squared.length; i++) squared[i] = outside[i] ? 0 : Infinity;
  distanceTransform2d(squared, size);

  // The segments on the silhouette: those with an outside cell next to them.
  const scale = size / (max - min);
  const touchesOutside = (x: number, y: number) => {
    const cx = Math.floor((x - min) * scale);
    const cy = Math.floor((y - min) * scale);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < size && ny < size && outside[ny * size + nx]) return true;
      }
    }
    return false;
  };
  const buckets = new Map<number, number[]>();
  const bucketSize = Math.max(band, cell * 4);
  const bucketCols = Math.ceil((max - min) / bucketSize) + 1;
  const bucketOf = (x: number, y: number) =>
    Math.floor((y - min) / bucketSize) * bucketCols + Math.floor((x - min) / bucketSize);
  for (let i = 0; i + 3 < segments.length; i += 4) {
    const x0 = segments[i] ?? 0;
    const y0 = segments[i + 1] ?? 0;
    const x1 = segments[i + 2] ?? 0;
    const y1 = segments[i + 3] ?? 0;
    if (!touchesOutside((x0 + x1) / 2, (y0 + y1) / 2)) continue;
    const key = bucketOf((x0 + x1) / 2, (y0 + y1) / 2);
    const list = buckets.get(key);
    if (list) list.push(i);
    else buckets.set(key, [i]);
  }

  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const coarse = Math.sqrt(squared[i] ?? 0) * cell;
      if (outside[i]) {
        out[i] = cell;
        continue;
      }
      if (coarse > band + cell * 2) {
        out[i] = -coarse;
        continue;
      }
      // Exact: the nearest silhouette segment in the surrounding buckets.
      const px = min + (x + 0.5) * cell;
      const py = min + (y + 0.5) * cell;
      const bx = Math.floor((px - min) / bucketSize);
      const by = Math.floor((py - min) / bucketSize);
      let best = coarse;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          for (const s of buckets.get((by + dy) * bucketCols + bx + dx) ?? []) {
            best = Math.min(
              best,
              segmentDistance(
                px,
                py,
                segments[s] ?? 0,
                segments[s + 1] ?? 0,
                segments[s + 2] ?? 0,
                segments[s + 3] ?? 0,
              ),
            );
          }
        }
      }
      out[i] = -best;
    }
  }
  return out;
}

function segmentDistance(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length2 = dx * dx + dy * dy || 1e-12;
  const t = Math.min(1, Math.max(0, ((px - x0) * dx + (py - y0) * dy) / length2));
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

/** Marks the cells the segments pass through, two cells thick so no diagonal gaps leak. */
function rasterise(segments: readonly number[], { size, min, max }: GroundGrid): Uint8Array {
  const edge = new Uint8Array(size * size);
  const scale = size / (max - min);
  const mark = (x: number, y: number) => {
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const cx = Math.floor(x) + dx;
      const cy = Math.floor(y) + dy;
      if (cx >= 0 && cy >= 0 && cx < size && cy < size) edge[cy * size + cx] = 1;
    }
  };
  for (let i = 0; i + 3 < segments.length; i += 4) {
    const x0 = ((segments[i] ?? 0) - min) * scale - 0.5;
    const y0 = ((segments[i + 1] ?? 0) - min) * scale - 0.5;
    const x1 = ((segments[i + 2] ?? 0) - min) * scale - 0.5;
    const y1 = ((segments[i + 3] ?? 0) - min) * scale - 0.5;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      mark(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  }
  return edge;
}

/** Cells reachable from the grid's border without crossing an edge (4-connected). */
function floodOutside(edge: Uint8Array, size: number): Uint8Array {
  const outside = new Uint8Array(size * size);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!edge[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let k = 0; k < size; k++) {
    push(k);
    push((size - 1) * size + k);
    push(k * size);
    push(k * size + size - 1);
  }
  for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
    const x = i % size;
    const y = (i - x) / size;
    if (x > 0) push(i - 1);
    if (x < size - 1) push(i + 1);
    if (y > 0) push(i - size);
    if (y < size - 1) push(i + size);
  }
  return outside;
}

/** Exact squared Euclidean distance transform in place (Felzenszwalb & Huttenlocher), in cells. */
function distanceTransform2d(grid: Float64Array, size: number): void {
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  const pass = (get: (k: number) => number, set: (k: number, value: number) => void) => {
    for (let k = 0; k < size; k++) f[k] = get(k);
    distanceTransform1d(f, d, v, z, size);
    for (let k = 0; k < size; k++) set(k, d[k] ?? 0);
  };
  for (let x = 0; x < size; x++) {
    pass(
      (k) => grid[k * size + x] ?? Infinity,
      (k, value) => (grid[k * size + x] = value),
    );
  }
  for (let y = 0; y < size; y++) {
    pass(
      (k) => grid[y * size + k] ?? Infinity,
      (k, value) => (grid[y * size + k] = value),
    );
  }
}

function distanceTransform1d(
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  n: number,
): void {
  const BIG = 1e20;
  const at = (q: number) => {
    const value = f[q] ?? Infinity;
    return Number.isFinite(value) ? value : BIG;
  };
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let vk = v[k] ?? 0;
    let s = (at(q) + q * q - (at(vk) + vk * vk)) / (2 * q - 2 * vk);
    while (s <= (z[k] ?? -Infinity)) {
      k--;
      vk = v[k] ?? 0;
      s = (at(q) + q * q - (at(vk) + vk * vk)) / (2 * q - 2 * vk);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while ((z[k + 1] ?? Infinity) < q) k++;
    const vk = v[k] ?? 0;
    d[q] = (q - vk) * (q - vk) + at(vk);
  }
}
