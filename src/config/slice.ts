/**
 * Sectioning plane settings. Each axis removes the half of the specimen nearest
 * the default camera, so the cut face looks toward the viewer.
 */
import type { Vec3 } from '../procedural/sdf/types.ts';

export const SLICE_AXES = ['sagittal', 'coronal', 'transverse'] as const;
export type SliceAxis = (typeof SLICE_AXES)[number];

interface AxisSettings {
  /** Latin label shown in the UI. */
  readonly label: string;
  /** Kept side is where dot(normal, p) + offset > 0. */
  readonly normal: Vec3;
  /** Offset the plane eases to when this axis is chosen. */
  readonly restingOffset: number;
}

export const SLICE: {
  readonly axes: Readonly<Record<SliceAxis, AxisSettings>>;
  readonly initialAxis: SliceAxis;
  readonly keyboardStep: number;
  readonly introDelay: number;
  /** Seconds for the plane to ease most of the way to its target. */
  readonly easeTime: number;
  /** Extra margin past the specimen's bounds when the plane is parked outside it. */
  readonly parkMargin: number;
} = {
  axes: {
    sagittal: { label: 'Sectio sagittalis', normal: [-1, 0, 0], restingOffset: 0.08 },
    coronal: { label: 'Sectio coronalis', normal: [0, 0, -1], restingOffset: 0.18 },
    transverse: { label: 'Sectio transversalis', normal: [0, -1, 0], restingOffset: 0.1 },
  },
  initialAxis: 'sagittal',
  keyboardStep: 0.05,
  introDelay: 1.4,
  easeTime: 0.45,
  parkMargin: 0.05,
};
