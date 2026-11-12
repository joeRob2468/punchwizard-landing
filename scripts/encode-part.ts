/**
 * Bake-time part encoding: reorders the mesh for the GPU's vertex cache and for
 * compression, interleaves its vertices (format/specimen-format.ts) and compresses
 * vertices and indices with meshoptimizer's codec. Kept out of src/ so the encoder
 * never reaches the browser bundle.
 */
import { MeshoptEncoder } from 'meshoptimizer';

import {
  interleaveVertices,
  type PartEntry,
  VERTEX_STRIDE,
} from '../src/procedural/format/specimen-format.ts';
import type { MeshData } from '../src/procedural/mesh/surface-nets.ts';
import type { Bounds } from '../src/procedural/sdf/types.ts';

export interface EncodedPart {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly indexType: PartEntry['indexType'];
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly vertexStreamBytes: number;
}

export async function encodePart(
  mesh: MeshData,
  bounds: Bounds,
  occlusion: Float32Array | null,
): Promise<EncodedPart> {
  await MeshoptEncoder.ready;
  const indices = Uint32Array.from(mesh.indices);
  // Reorders triangles in place and returns where each vertex goes.
  const [order, vertexCount] = MeshoptEncoder.reorderMesh(indices, true, false);
  const vertices = interleaveVertices(mesh, bounds, occlusion, order, vertexCount);
  const vertexStream = MeshoptEncoder.encodeVertexBuffer(vertices, vertexCount, VERTEX_STRIDE);

  const indexType = vertexCount <= 0xffff ? 'uint16' : 'uint32';
  const indexBytes =
    indexType === 'uint16'
      ? new Uint8Array(Uint16Array.from(indices).buffer)
      : new Uint8Array(indices.buffer);
  const indexStream = MeshoptEncoder.encodeIndexBuffer(
    indexBytes,
    indices.length,
    indexType === 'uint16' ? 2 : 4,
  );

  const bytes = new Uint8Array(vertexStream.length + indexStream.length);
  bytes.set(vertexStream, 0);
  bytes.set(indexStream, vertexStream.length);
  return {
    bytes,
    indexType,
    vertexCount,
    indexCount: indices.length,
    vertexStreamBytes: vertexStream.length,
  };
}
