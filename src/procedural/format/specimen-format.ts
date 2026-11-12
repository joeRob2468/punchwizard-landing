/**
 * The bake's output format: `manifest.json` plus one binary file per part.
 * Simpler than glTF and needs no exporter in Node.
 *
 * Each vertex is 12 bytes, interleaved: position Int16 × 3 (quantised within the
 * part's bounds), normal Int8 × 3 (normalised), occlusion Uint8 (normalised;
 * 1 = open), one byte of padding. A part file holds that vertex buffer and then
 * the index buffer (Uint16 or Uint32), each compressed with meshoptimizer's
 * codec (the bake encodes, `specimen/load-specimen` decodes); `vertexStreamBytes`
 * in the manifest says where the first ends. The codec plus gzip roughly halves
 * the download against the raw buffers.
 *
 * Positions are decoded to Float32 on load, so quantisation only affects download
 * size (precision is bounds / 65534, well under a micron at specimen scale).
 */
import type { MeshData } from '../mesh/surface-nets.ts';
import type { Bounds, Vec3 } from '../sdf/types.ts';

export const FORMAT_VERSION = 4;

/** Anatomical layers, outside in. */
export const LAYERS = ['integument', 'musculature', 'skeleton', 'organs', 'arcane'] as const;
export type Layer = (typeof LAYERS)[number];

/** Fill pattern for a part's cut face when the specimen is sectioned. */
export type SectionPattern = 'hatch' | 'stipple' | 'rings' | 'glow' | 'gyri' | 'strands';

/** How a part is painted. `wash` is a key of PALETTE. */
export interface PartLook {
  readonly wash: string;
  readonly glow?: number;
  /** Outline as this part (no inked edge where they meet), for one tissue split in two. */
  readonly inkAs?: string;
  readonly section?: {
    readonly pattern: SectionPattern;
    /** Centre for `rings` (rings are drawn around the vertical axis through it). */
    readonly centre?: Vec3;
  };
}

export interface PartEntry {
  readonly id: string;
  readonly layer: Layer;
  readonly look: PartLook;
  readonly file: string;
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly indexType: 'uint16' | 'uint32';
  /** Length of the compressed vertex buffer at the start of the part file. */
  readonly vertexStreamBytes: number;
  readonly bounds: Bounds;
  /** Present on parts that turn to follow the pointer: the point they turn about. */
  readonly gazePivot?: Vec3;
}

export interface SpecimenManifest {
  readonly version: typeof FORMAT_VERSION;
  readonly parts: readonly PartEntry[];
  readonly landmarks: Readonly<Record<string, Vec3>>;
}

/** Bytes per interleaved vertex (see the module comment). */
export const VERTEX_STRIDE = 12;

const QUANT = 32767;

/**
 * Quantises and interleaves a mesh's vertices into the format's vertex layout.
 * `order[i]` is where vertex i goes (or 0xffffffff to drop it), as a reordering
 * for compression gives it; `count` is how many vertices remain.
 */
export function interleaveVertices(
  mesh: MeshData,
  bounds: Bounds,
  occlusion: Float32Array | null,
  order: Uint32Array,
  count: number,
): Uint8Array {
  const bytes = new Uint8Array(count * VERTEX_STRIDE);
  const view = new DataView(bytes.buffer);
  const vertexCount = mesh.positions.length / 3;
  for (let i = 0; i < vertexCount; i++) {
    const target = order[i] ?? 0xffffffff;
    if (target === 0xffffffff) continue;
    const at = target * VERTEX_STRIDE;
    for (let axis = 0; axis < 3; axis++) {
      const lo = bounds.min[axis] ?? 0;
      const hi = bounds.max[axis] ?? 1;
      const t = ((mesh.positions[i * 3 + axis] ?? 0) - lo) / (hi - lo); // 0–1 inside the bounds
      view.setInt16(at + axis * 2, Math.round(Math.max(-1, Math.min(1, t * 2 - 1)) * QUANT), true);
      const n = Math.max(-1, Math.min(1, mesh.normals[i * 3 + axis] ?? 0));
      view.setInt8(at + 6 + axis, Math.round(n * 127));
    }
    bytes[at + 9] = Math.round(Math.max(0, Math.min(1, occlusion?.[i] ?? 1)) * 255);
  }
  return bytes;
}

export interface DecodedPart {
  readonly positions: Float32Array;
  readonly normals: Int8Array;
  readonly occlusion: Uint8Array;
}

/** Splits decoded interleaved vertices back into attributes (positions as Float32). */
export function deinterleaveVertices(bytes: Uint8Array, entry: PartEntry): DecodedPart {
  const count = entry.vertexCount;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const positions = new Float32Array(count * 3);
  const normals = new Int8Array(count * 3);
  const occlusion = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const at = i * VERTEX_STRIDE;
    for (let axis = 0; axis < 3; axis++) {
      const lo = entry.bounds.min[axis] ?? 0;
      const hi = entry.bounds.max[axis] ?? 1;
      const q = view.getInt16(at + axis * 2, true);
      positions[i * 3 + axis] = lo + ((q / QUANT + 1) / 2) * (hi - lo);
      normals[i * 3 + axis] = view.getInt8(at + 6 + axis);
    }
    occlusion[i] = bytes[at + 9] ?? 255;
  }
  return { positions, normals, occlusion };
}

/** Narrow check for a fetched manifest; the bake is the only writer. */
export function isSpecimenManifest(value: unknown): value is SpecimenManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === FORMAT_VERSION &&
    'parts' in value &&
    Array.isArray(value.parts)
  );
}
