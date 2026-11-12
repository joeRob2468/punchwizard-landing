/**
 * Camera framing, limits and input bindings. Mouse and touch bindings follow
 * common web 3D viewers: left-drag orbits, right-drag pans, wheel and pinch zoom.
 */
export const CAMERA = {
  /** Vertical field of view: the bust fills the same share of any screen's height. */
  fov: 30,
  /** Initial three-quarter view: angles about the target and distance from it. */
  view: { azimuth: 0.56, polar: 1.535, distance: 7.45 },
  /**
   * Below this aspect ratio (narrow or portrait windows) the camera starts further
   * back, so the bust still fits across with room for the margin labels.
   */
  narrowAspect: 1.5,
  target: [0, 0, 0] as const,
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

/** Where the camera starts (and resets to) for a viewport of this aspect ratio. */
export function framingPosition(aspect: number): [number, number, number] {
  const { azimuth, polar, distance } = CAMERA.view;
  const pullBack = Math.max(1, CAMERA.narrowAspect / Math.max(aspect, 0.3)) ** 0.45;
  const d = distance * pullBack;
  const [tx, ty, tz] = CAMERA.target;
  return [
    tx + d * Math.sin(polar) * Math.sin(azimuth),
    ty + d * Math.cos(polar),
    tz + d * Math.sin(polar) * Math.cos(azimuth),
  ];
}
