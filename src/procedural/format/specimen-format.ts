/**
 * The bake's output format: `manifest.json` plus one binary file per part.
 * Simpler than glTF and needs no exporter in Node.
 *
 * Part file layout (little-endian, sections 4-byte aligned):
 *   positions  Int16 × 3 × vertexCount, quantised within the part's bounds, padded to 4 bytes
 *   normals    Int8 × 3 × vertexCount (normalised), padded to 4 bytes
 *   occlusion  Uint8 × vertexCount (normalised; 1 = open), padded to 4 bytes
 *   indices    Uint16 or Uint32 × indexCount
 *
 * Positions are decoded to Float32 on load, so quantisation only affects download
 * size (precision is bounds / 65534, well under a micron at specimen scale).
 */
import type { MeshData } from '../mesh/surface-nets.ts';
import type { Bounds, Vec3 } from '../sdf/types.ts';

export const FORMAT_VERSION = 3;

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
  readonly bounds: Bounds;
  /** Present on parts that turn to follow the pointer: the point they turn about. */
  readonly gazePivot?: Vec3;
}

export interface SpecimenManifest {
  readonly version: typeof FORMAT_VERSION;
  readonly parts: readonly PartEntry[];
  readonly landmarks: Readonly<Record<string, Vec3>>;
}

const align4 = (n: number) => (n + 3) & ~3;

const QUANT = 32767;

export function encodePart(
  mesh: MeshData,
  bounds: Bounds,
  occlusion: Float32Array | null,
): {
  bytes: Uint8Array<ArrayBuffer>;
  indexType: PartEntry['indexType'];
} {
  const vertexCount = mesh.positions.length / 3;
  const indexType = vertexCount <= 0xffff ? 'uint16' : 'uint32';
  const positionBytes = align4(vertexCount * 3 * 2);
  const normalBytes = align4(vertexCount * 3);
  const occlusionBytes = align4(vertexCount);
  const indexBytes = mesh.indices.length * (indexType === 'uint16' ? 2 : 4);

  const buffer = new ArrayBuffer(positionBytes + normalBytes + occlusionBytes + indexBytes);
  const positions = new Int16Array(buffer, 0, vertexCount * 3);
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    const lo = bounds.min[axis] ?? 0;
    const hi = bounds.max[axis] ?? 1;
    const t = ((mesh.positions[i] ?? 0) - lo) / (hi - lo); // 0–1 inside the bounds
    positions[i] = Math.round(Math.max(-1, Math.min(1, t * 2 - 1)) * QUANT);
  }
  const normals = new Int8Array(buffer, positionBytes, vertexCount * 3);
  for (let i = 0; i < normals.length; i++) {
    normals[i] = Math.round(Math.max(-1, Math.min(1, mesh.normals[i] ?? 0)) * 127);
  }
  const occlusionView = new Uint8Array(buffer, positionBytes + normalBytes, vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    occlusionView[i] = Math.round(Math.max(0, Math.min(1, occlusion?.[i] ?? 1)) * 255);
  }
  const indexOffset = positionBytes + normalBytes + occlusionBytes;
  if (indexType === 'uint16') {
    new Uint16Array(buffer, indexOffset, mesh.indices.length).set(mesh.indices);
  } else {
    new Uint32Array(buffer, indexOffset, mesh.indices.length).set(mesh.indices);
  }
  return { bytes: new Uint8Array(buffer), indexType };
}

export interface DecodedPart {
  readonly positions: Float32Array;
  readonly normals: Int8Array;
  readonly occlusion: Uint8Array;
  readonly indices: Uint16Array | Uint32Array;
}

export function decodePart(buffer: ArrayBuffer, entry: PartEntry): DecodedPart {
  const count = entry.vertexCount * 3;
  const quantised = new Int16Array(buffer, 0, count);
  const positions = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const axis = i % 3;
    const lo = entry.bounds.min[axis] ?? 0;
    const hi = entry.bounds.max[axis] ?? 1;
    positions[i] = lo + (((quantised[i] ?? 0) / QUANT + 1) / 2) * (hi - lo);
  }
  const positionBytes = align4(count * 2);
  const normals = new Int8Array(buffer, positionBytes, count);
  const occlusionOffset = positionBytes + align4(count);
  const occlusion = new Uint8Array(buffer, occlusionOffset, entry.vertexCount);
  const indexOffset = occlusionOffset + align4(entry.vertexCount);
  const indices =
    entry.indexType === 'uint16'
      ? new Uint16Array(buffer, indexOffset, entry.indexCount)
      : new Uint32Array(buffer, indexOffset, entry.indexCount);
  return { positions, normals, occlusion, indices };
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
