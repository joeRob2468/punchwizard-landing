/**
 * The spotlight for the Tabula view (specimen/SpotRig, shaders/lib/spot.glsl):
 * where it sits (turning with the camera, at a fixed height), its cone and colour. How strongly a view uses it is
 * `Look.drama`.
 */
export const LIGHTING = {
  placement: {
    /** Radians round the vertical axis from the camera; positive is to the viewer's right (the cut side). */
    offset: 1.1,
    /** Radians above the horizontal, fixed in the world. */
    elevation: 0.85,
    distance: 5.2,
    /** What it's aimed at: the head. */
    target: [0, 0.55, 0],
  },
  /** Degrees: full light inside `inner`, none outside `outer`. */
  cone: { inner: 12, outer: 27 },
  colour: '#d6e4ff',
  /** The beam in the air (specimen/SpotBeam): brightness, and how far each ray is marched. */
  beam: { strength: 0.0035, length: 4.5 },
  /** Motes: brightness outside the beam, and how much they light up inside it. */
  motes: { outside: 0.45, inside: 3.5 },
  intensity: 4.5,
} as const;
