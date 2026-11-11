/** A point or direction as a plain tuple; the SDF core avoids allocating objects per sample. */
export type Vec3 = readonly [x: number, y: number, z: number];

/**
 * A signed distance field: negative inside, positive outside, roughly the distance
 * to the surface. Called millions of times per part, so it takes scalars.
 */
export type Sdf = (x: number, y: number, z: number) => number;

/** Axis-aligned box as min and max corners. */
export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}
