/**
 * The bake's output format: `manifest.json` plus one binary file per part.
 * Simpler than glTF and needs no exporter in Node.
 *
 * Part file layout (little-endian, sections 4-byte aligned):
 *   positions  Float32 × 3 × vertexCount
 *   normals    Int8 × 3 × vertexCount (normalised), padded to 4 bytes
 *   indices    Uint16 or Uint32 × indexCount
 */
import type { MeshData } from '../mesh/surface-nets.ts';
import type { Bounds, Vec3 } from '../sdf/types.ts';

export const FORMAT_VERSION = 1;

/** Anatomical layers, outside in. */
export const LAYERS = ['integument', 'musculature', 'skeleton', 'organs', 'arcane'] as const;
export type Layer = (typeof LAYERS)[number];

/** How a part is painted. `wash` is a key of PALETTE. */
export interface PartLook {
  readonly wash: string;
  readonly glow?: number;
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
}

export interface SpecimenManifest {
  readonly version: typeof FORMAT_VERSION;
  readonly parts: readonly PartEntry[];
  readonly landmarks: Readonly<Record<string, Vec3>>;
}

const align4 = (n: number) => (n + 3) & ~3;

export function encodePart(mesh: MeshData): {
  bytes: Uint8Array;
  indexType: PartEntry['indexType'];
} {
  const vertexCount = mesh.positions.length / 3;
  const indexType = vertexCount <= 0xffff ? 'uint16' : 'uint32';
  const positionBytes = mesh.positions.byteLength;
  const normalBytes = align4(vertexCount * 3);
  const indexBytes = mesh.indices.length * (indexType === 'uint16' ? 2 : 4);

  const buffer = new ArrayBuffer(positionBytes + normalBytes + indexBytes);
  new Float32Array(buffer, 0, mesh.positions.length).set(mesh.positions);
  const normals = new Int8Array(buffer, positionBytes, vertexCount * 3);
  for (let i = 0; i < normals.length; i++) {
    normals[i] = Math.round(Math.max(-1, Math.min(1, mesh.normals[i] ?? 0)) * 127);
  }
  const indexOffset = positionBytes + normalBytes;
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
  readonly indices: Uint16Array | Uint32Array;
}

export function decodePart(buffer: ArrayBuffer, entry: PartEntry): DecodedPart {
  const positions = new Float32Array(buffer, 0, entry.vertexCount * 3);
  const normals = new Int8Array(buffer, positions.byteLength, entry.vertexCount * 3);
  const indexOffset = positions.byteLength + align4(entry.vertexCount * 3);
  const indices =
    entry.indexType === 'uint16'
      ? new Uint16Array(buffer, indexOffset, entry.indexCount)
      : new Uint32Array(buffer, indexOffset, entry.indexCount);
  return { positions, normals, indices };
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
