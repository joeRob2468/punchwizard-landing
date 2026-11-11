/** What a procedural part generator returns: a field plus how to mesh and paint it. */
import type { Layer, PartLook } from '../format/specimen-format.ts';
import type { Bounds, Sdf, Vec3 } from '../sdf/types.ts';

export interface PartDefinition {
  readonly id: string;
  readonly layer: Layer;
  readonly look: PartLook;
  readonly field: Sdf;
  /** Box the surface must fit inside; the mesher pads it. */
  readonly bounds: Bounds;
  /** Grid spacing for meshing, in specimen units. Smaller is finer and slower. */
  readonly cellSize: number;
  /**
   * Through-holes the part is meant to have (the skull's openings into its cavity).
   * The bake warns when a part has more than this; stray holes show on screen.
   */
  readonly intendedHoles?: number;
  /** Turns about this point at runtime to follow the pointer (irises and pupils). */
  readonly gazePivot?: Vec3;
}
