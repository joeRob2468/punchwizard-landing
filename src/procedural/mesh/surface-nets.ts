/**
 * Turns an SDF into a closed triangle mesh with naive surface nets: one vertex per
 * grid cell the surface crosses (the average of its edge crossings), one quad per
 * grid edge the surface crosses. Vertices are then projected onto the surface and
 * normals taken from the field's gradient, which keeps shading smooth at coarse
 * resolutions. The output is watertight when the surface lies inside the bounds.
 */
import type { Bounds, Sdf } from '../sdf/types.ts';

export interface MeshData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint32Array;
}

export interface MeshOptions {
  /** Newton steps that pull each vertex onto the surface. */
  readonly projectionSteps?: number;
}

/** Grid points per side of a narrow-band sampling block. */
const BLOCK_SIZE = 4;

/**
 * Safety factor on the block test. Displaced and warped fields under-report
 * distance, so a block counts as far only well beyond its half-diagonal.
 */
const NARROW_BAND_MARGIN = 2;

/** Corner pairs (as 3-bit xyz offsets) for the 12 edges of a cell. */
const CELL_EDGES: readonly (readonly [number, number])[] = (() => {
  const edges: [number, number][] = [];
  for (let a = 0; a < 8; a++) {
    for (const bit of [1, 2, 4]) {
      if ((a & bit) === 0) edges.push([a, a | bit]);
    }
  }
  return edges;
})();

export function meshSdf(
  field: Sdf,
  bounds: Bounds,
  cellSize: number,
  { projectionSteps = 2 }: MeshOptions = {},
): MeshData {
  const h = cellSize;
  const pad = 2 * h;
  const ox = bounds.min[0] - pad;
  const oy = bounds.min[1] - pad;
  const oz = bounds.min[2] - pad;
  const nx = Math.ceil((bounds.max[0] - bounds.min[0] + 2 * pad) / h) + 1;
  const ny = Math.ceil((bounds.max[1] - bounds.min[1] + 2 * pad) / h) + 1;
  const nz = Math.ceil((bounds.max[2] - bounds.min[2] + 2 * pad) / h) + 1;

  // 1. Sample the field at every grid point, in blocks: a block whose centre is
  // clearly far from the surface takes the centre's value without sampling each
  // point (narrow-band sampling). Signs stay correct, which is all meshing needs
  // away from the surface.
  const values = new Float32Array(nx * ny * nz);
  const gridIndex = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  const block = BLOCK_SIZE;
  const farEnough = block * h * Math.sqrt(3) * NARROW_BAND_MARGIN;
  for (let bk = 0; bk < nz; bk += block) {
    for (let bj = 0; bj < ny; bj += block) {
      for (let bi = 0; bi < nx; bi += block) {
        const ei = Math.min(bi + block, nx);
        const ej = Math.min(bj + block, ny);
        const ek = Math.min(bk + block, nz);
        const centre = field(
          ox + ((bi + ei - 1) / 2) * h,
          oy + ((bj + ej - 1) / 2) * h,
          oz + ((bk + ek - 1) / 2) * h,
        );
        const far = Math.abs(centre) > farEnough;
        for (let k = bk; k < ek; k++) {
          for (let j = bj; j < ej; j++) {
            for (let i = bi; i < ei; i++) {
              values[gridIndex(i, j, k)] = far ? centre : field(ox + i * h, oy + j * h, oz + k * h);
            }
          }
        }
      }
    }
  }
  const valueAt = (index: number) => values[index] ?? 0;
  assertInsideGrid(values, nx, ny, nz);

  // 2. One vertex per cell that the surface crosses.
  const cx = nx - 1;
  const cy = ny - 1;
  const cellVertex = new Int32Array(cx * cy * (nz - 1)).fill(-1);
  const cellIndex = (i: number, j: number, k: number) => i + cx * (j + cy * k);
  const positions: number[] = [];
  const corner = new Float64Array(8);

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < cy; j++) {
      for (let i = 0; i < cx; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          const v = valueAt(gridIndex(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)));
          corner[c] = v;
          if (v < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;

        let sx = 0;
        let sy = 0;
        let sz = 0;
        let crossings = 0;
        for (const [a, b] of CELL_EDGES) {
          const va = corner[a] ?? 0;
          const vb = corner[b] ?? 0;
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          sx += (a & 1) + ((b & 1) - (a & 1)) * t;
          sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
          sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
          crossings++;
        }
        cellVertex[cellIndex(i, j, k)] = positions.length / 3;
        positions.push(
          ox + (i + sx / crossings) * h,
          oy + (j + sy / crossings) * h,
          oz + (k + sz / crossings) * h,
        );
      }
    }
  }

  // 3. One quad per grid edge with a sign change, joining the four cells around it.
  const indices: number[] = [];
  const quad = (
    q0: number,
    q1: number,
    q2: number,
    q3: number,
    ax: number,
    ay: number,
    az: number,
  ) => {
    // Orient so the face normal points the way the field increases (outward).
    const p = positions;
    const d1x = (p[q2 * 3] ?? 0) - (p[q0 * 3] ?? 0);
    const d1y = (p[q2 * 3 + 1] ?? 0) - (p[q0 * 3 + 1] ?? 0);
    const d1z = (p[q2 * 3 + 2] ?? 0) - (p[q0 * 3 + 2] ?? 0);
    const d2x = (p[q3 * 3] ?? 0) - (p[q1 * 3] ?? 0);
    const d2y = (p[q3 * 3 + 1] ?? 0) - (p[q1 * 3 + 1] ?? 0);
    const d2z = (p[q3 * 3 + 2] ?? 0) - (p[q1 * 3 + 2] ?? 0);
    const crossX = d1y * d2z - d1z * d2y;
    const crossY = d1z * d2x - d1x * d2z;
    const crossZ = d1x * d2y - d1y * d2x;
    const flip = crossX * ax + crossY * ay + crossZ * az < 0;
    const [a, b, c, d] = flip ? [q0, q3, q2, q1] : [q0, q1, q2, q3];
    indices.push(a, b, c, a, c, d);
  };

  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const v0 = valueAt(gridIndex(i, j, k));
        const in0 = v0 < 0;
        // Edge along +x: cells (i, j-1..j, k-1..k).
        if (in0 !== valueAt(gridIndex(i + 1, j, k)) < 0) {
          const s = in0 ? 1 : -1;
          quad(
            cellVertex[cellIndex(i, j - 1, k - 1)] ?? -1,
            cellVertex[cellIndex(i, j, k - 1)] ?? -1,
            cellVertex[cellIndex(i, j, k)] ?? -1,
            cellVertex[cellIndex(i, j - 1, k)] ?? -1,
            s,
            0,
            0,
          );
        }
        // Edge along +y: cells (i-1..i, j, k-1..k).
        if (in0 !== valueAt(gridIndex(i, j + 1, k)) < 0) {
          const s = in0 ? 1 : -1;
          quad(
            cellVertex[cellIndex(i - 1, j, k - 1)] ?? -1,
            cellVertex[cellIndex(i, j, k - 1)] ?? -1,
            cellVertex[cellIndex(i, j, k)] ?? -1,
            cellVertex[cellIndex(i - 1, j, k)] ?? -1,
            0,
            s,
            0,
          );
        }
        // Edge along +z: cells (i-1..i, j-1..j, k).
        if (in0 !== valueAt(gridIndex(i, j, k + 1)) < 0) {
          const s = in0 ? 1 : -1;
          quad(
            cellVertex[cellIndex(i - 1, j - 1, k)] ?? -1,
            cellVertex[cellIndex(i, j - 1, k)] ?? -1,
            cellVertex[cellIndex(i, j, k)] ?? -1,
            cellVertex[cellIndex(i - 1, j, k)] ?? -1,
            0,
            0,
            s,
          );
        }
      }
    }
  }

  // 4. Pull vertices onto the surface and take normals from the gradient.
  const vertexCount = positions.length / 3;
  const outPositions = new Float32Array(positions);
  const normals = new Float32Array(positions.length);
  const e = h * 0.25;
  for (let v = 0; v < vertexCount; v++) {
    let x = outPositions[v * 3] ?? 0;
    let y = outPositions[v * 3 + 1] ?? 0;
    let z = outPositions[v * 3 + 2] ?? 0;
    let gx = 0;
    let gy = 0;
    let gz = 0;
    for (let step = 0; step <= projectionSteps; step++) {
      gx = field(x + e, y, z) - field(x - e, y, z);
      gy = field(x, y + e, z) - field(x, y - e, z);
      gz = field(x, y, z + e) - field(x, y, z - e);
      const g2 = gx * gx + gy * gy + gz * gz;
      if (step === projectionSteps || g2 === 0) break;
      // Gradient is scaled by 2e; Newton step along it, capped at half a cell.
      const d = field(x, y, z);
      const len = Math.sqrt(g2) / (2 * e);
      const move = Math.max(-h * 0.5, Math.min(h * 0.5, d / len));
      const inv = 1 / Math.sqrt(g2);
      x -= gx * inv * move;
      y -= gy * inv * move;
      z -= gz * inv * move;
    }
    outPositions[v * 3] = x;
    outPositions[v * 3 + 1] = y;
    outPositions[v * 3 + 2] = z;
    const gl = Math.hypot(gx, gy, gz) || 1;
    normals[v * 3] = gx / gl;
    normals[v * 3 + 1] = gy / gl;
    normals[v * 3 + 2] = gz / gl;
  }

  return { positions: outPositions, normals, indices: Uint32Array.from(indices) };
}

export class SurfaceOutOfBoundsError extends Error {
  override name = 'SurfaceOutOfBoundsError';
}

/**
 * The outermost grid layer must be entirely outside the surface, or the mesh would
 * be cut open there. Throws so a too-small `bounds` fails the bake loudly.
 */
function assertInsideGrid(values: Float32Array, nx: number, ny: number, nz: number): void {
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const onBorder =
          i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1;
        if (!onBorder) continue;
        if ((values[i + nx * (j + ny * k)] ?? 1) <= 0) {
          throw new SurfaceOutOfBoundsError(
            `surface reaches the grid edge at cell (${i}, ${j}, ${k})`,
          );
        }
      }
    }
  }
}
