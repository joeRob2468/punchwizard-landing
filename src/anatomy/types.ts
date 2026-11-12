import type { Vec3 } from '../procedural/sdf/types.ts';

/** One labelled feature of the specimen. */
export interface AnatomyEntry {
  readonly id: string;
  /**
   * Plate number, as printed next to the label. Omitted for an aside: a remark
   * rather than an anatomical feature, printed without a number.
   */
  readonly number?: number;
  readonly name: string;
  readonly latin: string;
  readonly description: string;
  /** Manifest part the feature belongs to. */
  readonly part: string;
  /**
   * Candidate points (specimen space), in order of preference, for labelling the
   * feature where the cut passes through it. Each is projected onto the cut plane
   * and used if the part is there.
   */
  readonly section: readonly Vec3[];
  /**
   * Candidate points near the part's outer surface for labelling it uncut. They are
   * snapped onto the surface at start-up and used if unobstructed from the camera.
   */
  readonly surface: readonly Vec3[];
}
