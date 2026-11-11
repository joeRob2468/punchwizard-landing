/**
 * Provides the one sectioning plane that every specimen material clips against.
 * The underlying three.js Plane is shared and updated in place each frame.
 */
import { createContext, use, type ReactNode, useMemo } from 'react';
import { Plane, Vector3 } from 'three';

import type { Vec3 } from '../procedural/sdf/types.ts';

/** The shared plane plus the only ways to change it. */
export class ClipPlane {
  /** Pass to materials' `clippingPlanes`; don't mutate directly. */
  readonly plane = new Plane(new Vector3(-1, 0, 0), 1e3);

  setNormal([x, y, z]: Vec3): void {
    this.plane.normal.set(x, y, z);
  }

  setOffset(offset: number): void {
    this.plane.constant = offset;
  }
}

const ClipPlaneContext = createContext<ClipPlane | null>(null);

export function ClipPlaneProvider({ children }: { readonly children: ReactNode }) {
  const clip = useMemo(() => new ClipPlane(), []);
  return <ClipPlaneContext value={clip}>{children}</ClipPlaneContext>;
}

export function useClipPlane(): ClipPlane {
  const clip = use(ClipPlaneContext);
  if (!clip) throw new Error('useClipPlane needs a <ClipPlaneProvider> above it');
  return clip;
}
