/**
 * The robed bust, in layers: an inner robe over the shoulders and chest, a heavier
 * mantle over it that stops at a wavy hem, opens in a V at the front and rises
 * into a stand collar; gold trim along the mantle's edges; and two brooches joined
 * by a chain. Cut flat at the base like a bust. Folds hang vertically and deepen
 * toward the hem.
 */
import { LANDMARKS as L } from '../landmarks.ts';
import {
  capsule,
  displace,
  ellipsoid,
  fbm,
  halfSpace,
  intersect,
  mirrorX,
  offset,
  roundCone,
  roundedCylinder,
  smoothUnion,
  sphere,
  subtract,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { framesBounds, inFrame, surfaceFrame, type SurfaceFrame } from './frame.ts';
import type { PartDefinition } from './part.ts';

const SEED = 53;
const BASE_Y = L.bustBase[1];

/** The mantle's collar: from its base up to its top edge, which rises toward the back. */
const COLLAR_LOW = L.neckBase[1] - 0.06;
const collarTop = (z: number) => L.neckBase[1] + 0.16 + 0.24 * smoothstep(0.15, -0.35, z);
/** Where the V opening starts at the throat. */
const V_TOP = L.neckBase[1] - 0.02;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Shoulders, arms and chest as one smooth mass, before folds and the base cut. */
function bodyMass(): Sdf {
  const [sx, sy, sz] = L.shoulderLeft;
  const slope = mirrorX(roundCone([0.1, L.neckBase[1] + 0.04, sz], [sx, sy, sz], 0.2, 0.26));
  const arm = mirrorX(roundCone([sx, sy, sz], [sx + 0.12, BASE_Y - 0.1, sz + 0.02], 0.27, 0.25));
  const chest = ellipsoid([0, -1.5, 0.0], [0.7, 0.6, 0.4]);
  return smoothUnion(0.22, slope, arm, chest);
}

/**
 * Cloth folds hanging from the shoulders: grooves around the body's vertical axis
 * that wander with noise and deepen toward the bottom.
 */
function folds(seed: number, count: number, depth: number): Sdf {
  return (x, y, z) => {
    const angle = Math.atan2(x, z);
    const wander = fbm(seed, x * 2, y * 1.2, z * 2) * 2.5;
    const groove = Math.abs(Math.sin(angle * count * 0.5 + wander)) ** 3;
    const deepen = 0.35 + 0.65 * smoothstep(-0.85, BASE_Y, y);
    return groove * depth * deepen + fbm(seed + 1, x * 6, y * 1.2, z * 6) * 0.012;
  };
}

const aboveBase = halfSpace([0, BASE_Y, 0], [0, -1, 0]);

/** The inner robe as a field (also keeps internals inside it and hair outside it). */
export function robeField(): Sdf {
  return intersect(displace(bodyMass(), folds(SEED, 22, 0.022)), aboveBase);
}

export function robePart(): PartDefinition {
  return {
    id: 'robe',
    layer: 'integument',
    look: { wash: 'washPlum', section: { pattern: 'hatch' } },
    field: robeField(),
    bounds: { min: [-1.3, BASE_Y - 0.02, -0.55], max: [1.3, -0.6, 0.5] },
    cellSize: 0.022,
  };
}

/** Height of the mantle's hem at a point: lower at the back, in shallow scallops. */
function hemHeight(x: number, z: number): number {
  const angle = Math.atan2(x, z);
  return -1.3 - 0.12 * smoothstep(0.3, -0.3, z) + 0.05 * Math.sin(angle * 5 + 0.4);
}

/** Half-width of the V opening at height y (zero above the throat). */
const vHalfWidth = (y: number) => 0.07 + Math.max(0, V_TOP - y) * 0.32;

/** The stand collar: a flaring wall around the neck, open at the front. */
function collarWall(thickness: number): Sdf {
  const [, , nz] = L.neckBase;
  return (x, y, z) => {
    const top = collarTop(z);
    const t = Math.min(1, Math.max(0, (y - COLLAR_LOW) / (top - COLLAR_LOW)));
    const radius = 0.26 + 0.16 * t * t;
    const radial = Math.hypot(x, z - nz) - radius;
    const wall = Math.abs(radial) - thickness;
    const span = Math.max(COLLAR_LOW - y, y - top);
    const opening = -Math.max(Math.abs(x) - 0.17, 0.05 - z);
    return Math.max(wall, span, opening);
  };
}

/** The mantle before the V is cut: the robe's mass thickened, with deeper folds. */
const capeField = (): Sdf => displace(offset(bodyMass(), 0.055), folds(SEED + 7, 16, 0.035));
const COLLAR_THICKNESS = 0.026;

function mantleShell(): Sdf {
  const hem: Sdf = (x, y, z) => hemHeight(x, z) - y;
  return smoothUnion(0.04, intersect(capeField(), hem), collarWall(COLLAR_THICKNESS));
}

/** Points in the V opening at the front of the chest (negative inside it). */
const vOpening: Sdf = (x, y, z) => Math.max(Math.abs(x) - vHalfWidth(y), y - V_TOP, 0.05 - z);

export function mantleField(): Sdf {
  return intersect(subtract(mantleShell(), vOpening), aboveBase);
}

export function mantlePart(): PartDefinition {
  return {
    id: 'mantle',
    layer: 'integument',
    look: { wash: 'washVein', section: { pattern: 'hatch' } },
    field: mantleField(),
    bounds: { min: [-1.4, BASE_Y - 0.02, -0.65], max: [1.4, -0.35, 0.6] },
    cellSize: 0.02,
  };
}

/**
 * Gold trim: a band lying just over the mantle along the V's edges, the hem and
 * the collar's top edge.
 */
export function mantleTrimPart(): PartDefinition {
  // Bands are cut from a thin skin over the cape's outer surface (before the hem
  // and V are cut, so they wrap the edges rather than filling the cut faces).
  const skinOf =
    (field: Sdf): Sdf =>
    (x, y, z) => {
      const m = field(x, y, z);
      return Math.max(m - 0.016, -m - 0.022);
    };
  const vEdge: Sdf = (x, y, z) =>
    Math.max(
      Math.abs(Math.abs(x) - vHalfWidth(y)) - 0.04,
      y - V_TOP - 0.02,
      0.02 - z,
      hemHeight(x, z) - y,
    );
  const hemEdge: Sdf = (x, y, z) => Math.abs(y - hemHeight(x, z) - 0.035) - 0.035;
  const collarEdge: Sdf = (_x, y, z) => Math.abs(y - collarTop(z) + 0.03) - 0.03;
  const hemOutsideV = intersect(hemEdge, (x, y, z) => -vOpening(x, y, z));
  const trim = intersect(
    union(
      intersect(skinOf(capeField()), union(vEdge, hemOutsideV)),
      intersect(collarWall(COLLAR_THICKNESS + 0.014), collarEdge),
    ),
    aboveBase,
  );
  return {
    id: 'mantle-trim',
    layer: 'integument',
    look: { wash: 'washOchre', section: { pattern: 'stipple' } },
    field: trim,
    bounds: { min: [-1.4, BASE_Y - 0.02, -0.7], max: [1.4, -0.35, 0.65] },
    cellSize: 0.007,
    intendedHoles: 1, // the collar's top band
  };
}

/** Where the two brooches sit: either side of the beard, on the mantle. */
const claspFrames = (): SurfaceFrame[] => {
  const left = surfaceFrame(mantleField(), [0.4, -1.08, 0.7], 0.01);
  const right = surfaceFrame(mantleField(), [-0.4, -1.08, 0.7], 0.01);
  return [left, right];
};

/** Two round brooches with a raised rim, joined by a hanging chain. */
export function claspsPart(): PartDefinition {
  const brooch = smoothUnion(
    0.006,
    roundedCylinderZ(0.07, 0.012),
    torusZ(0.07, 0.014),
    sphere([0, 0, 0.006], 0.04),
  );
  const frames = claspFrames();
  const [left, right] = frames;
  if (!left || !right) throw new Error('clasp frames missing');
  // The chain sags between the brooches in a few links (capsules), behind the beard.
  const links: Sdf[] = [];
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const at = (t: number): Vec3 => {
      const sag = Math.sin(t * Math.PI) * 0.09;
      return [
        left.origin[0] + (right.origin[0] - left.origin[0]) * t,
        left.origin[1] + (right.origin[1] - left.origin[1]) * t - sag,
        left.origin[2] + (right.origin[2] - left.origin[2]) * t + 0.03,
      ];
    };
    links.push(capsule(at(i / steps), at((i + 1) / steps), 0.012));
  }
  const field = union(inFrame(brooch, left), inFrame(brooch, right), ...links);
  return {
    id: 'clasps',
    layer: 'integument',
    look: { wash: 'washOchre', section: { pattern: 'stipple' } },
    field,
    bounds: framesBounds(frames, 0.16),
    cellSize: 0.005,
  };
}

/** A garnet set in the centre of each brooch. */
export function claspGemsPart(): PartDefinition {
  const frames = claspFrames();
  const gem = ellipsoid([0, 0, 0.03], [0.032, 0.032, 0.022]);
  return {
    id: 'clasp-gems',
    layer: 'integument',
    look: { wash: 'arcaneGarnet', glow: 0.45, section: { pattern: 'glow' } },
    field: union(...frames.map((f) => inFrame(gem, f))),
    bounds: framesBounds(frames, 0.08),
    cellSize: 0.004,
  };
}

/** A disc facing +z (the frame's out direction). */
function roundedCylinderZ(radius: number, halfHeight: number): Sdf {
  const disc = roundedCylinder([0, 0, 0], radius, halfHeight, 0.006);
  return (x, y, z) => disc(x, z, y);
}

/** A ring facing +z. */
function torusZ(major: number, minor: number): Sdf {
  return (x, y, z) => Math.hypot(Math.hypot(x, y) - major, z - 0.012) - minor;
}
