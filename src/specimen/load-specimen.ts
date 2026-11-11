/**
 * Fetches the baked specimen (manifest + part buffers) and builds geometries.
 * The rest of the app depends on `LoadedSpecimen`, not on how parts were made.
 */
import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from 'three';

import {
  decodePart,
  isSpecimenManifest,
  type PartEntry,
  type SpecimenManifest,
} from '../procedural/format/specimen-format.ts';
import type { Bounds } from '../procedural/sdf/types.ts';

export interface LoadedPart {
  readonly entry: PartEntry;
  readonly geometry: BufferGeometry;
}

export interface LoadedSpecimen {
  readonly manifest: SpecimenManifest;
  readonly parts: readonly LoadedPart[];
  /** Union of all parts' bounds. */
  readonly bounds: Bounds;
}

export class SpecimenLoadError extends Error {
  override name = 'SpecimenLoadError';
}

export async function loadSpecimen(baseUrl: string): Promise<LoadedSpecimen> {
  const manifest = await fetchJson(`${baseUrl}manifest.json`);
  if (!isSpecimenManifest(manifest)) {
    throw new SpecimenLoadError('specimen manifest has an unexpected format');
  }
  const parts = await Promise.all(
    manifest.parts.map(async (entry) => {
      const buffer = await fetchBuffer(`${baseUrl}${entry.file}`);
      return { entry, geometry: buildGeometry(buffer, entry) };
    }),
  );
  return { manifest, parts, bounds: unionBounds(manifest.parts.map((p) => p.bounds)) };
}

function unionBounds(all: readonly Bounds[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of all) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i] ?? Infinity, b.min[i] ?? Infinity);
      max[i] = Math.max(max[i] ?? -Infinity, b.max[i] ?? -Infinity);
    }
  }
  return { min, max };
}

function buildGeometry(buffer: ArrayBuffer, entry: PartEntry): BufferGeometry {
  const { positions, normals, indices } = decodePart(buffer, entry);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3, true));
  geometry.setIndex(new BufferAttribute(indices, 1));
  const [minX, minY, minZ] = entry.bounds.min;
  const [maxX, maxY, maxZ] = entry.bounds.max;
  const centre = new Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  geometry.boundingSphere = new Sphere(centre, centre.distanceTo(new Vector3(maxX, maxY, maxZ)));
  geometry.name = entry.id;
  return geometry;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new SpecimenLoadError(`${url}: HTTP ${response.status}`);
  return response.json();
}

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new SpecimenLoadError(`${url}: HTTP ${response.status}`);
  return response.arrayBuffer();
}
