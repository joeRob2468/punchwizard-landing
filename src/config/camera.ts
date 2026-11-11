/**
 * Camera framing, limits and input bindings. Mouse and touch bindings follow
 * common web 3D viewers: left-drag orbits, right-drag pans, wheel and pinch zoom.
 */
export const CAMERA = {
  fov: 30,
  /** Initial three-quarter view. */
  position: [6.6, 1.5, 5.6] as const,
  target: [0, 0.2, 0] as const,
  minDistance: 2.2,
  maxDistance: 11,
  /** Radians from straight up: can look down on the hat, not up from under the shoulders. */
  minPolarAngle: Math.PI * 0.18,
  maxPolarAngle: Math.PI * 0.62,
  /** Seconds to settle after input (damping). */
  smoothTime: 0.18,
  /** Pan is kept within this box around the target (world units, half-extents). */
  panBounds: [1.5, 1.5, 1.5] as const,
  /** Seconds without input before the idle turn starts. */
  idleDelay: 8,
  /** Radians per second for the idle turn. */
  idleSpeed: 0.08,
  /** World units of zoom per pixel of Ctrl/⌘ + wheel. */
  wheelZoom: 0.01,
  keyboard: {
    /** Radians per arrow-key press. */
    orbitStep: Math.PI / 16,
    /** World units per `+` / `-` press. */
    zoomStep: 0.6,
  },
} as const;
