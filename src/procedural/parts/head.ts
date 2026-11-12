/**
 * The skin of the head and neck, modelled as an old man's face: a long aquiline
 * nose, deep-set hooded eyes with bags beneath, a heavy brow, high cheekbones over
 * hollow cheeks, nasolabial folds, thin lips, large ears, forehead furrows and
 * crow's feet. Much of the lower face is later covered by the beard.
 *
 * Also the eyeballs and their crystalline irises.
 */
import { EYE_RADIUS, LANDMARKS as L } from '../landmarks.ts';
import {
  capsule,
  displace,
  ellipsoid,
  fbm,
  halfSpace,
  intersect,
  mirrorX,
  roundCone,
  shell,
  smoothSubtract,
  smoothUnion,
  sphere,
  subtract,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { mirrorPoint } from './mirror.ts';
import { mucosaAirway } from './airways.ts';
import { cranialCavity } from './skull.ts';
import { canalField } from './spine-path.ts';
import type { PartDefinition } from './part.ts';

const SEED = 11;
const [EX, EY, EZ] = L.eyeLeft;
/**
 * Eye opening, after real proportions: about a fifth of the face's width (the gap
 * between the eyes is about one eye-width), and hooded to roughly a third as tall.
 */
const EYE_OPENING_HALF_WIDTH = 0.076;
const EYE_OPENING_HALF_HEIGHT = 0.029;

/** How far each eye turns away from the nose (radians), so the outer corner sits further back. */
const EYE_YAW = 0.17;

/**
 * Evaluates a field built for the left eye in its own frame (looking along +z, before
 * the yaw) for both eyes: mirrors x, then turns the point into the eye's frame.
 */
function eyeFrame(local: Sdf): Sdf {
  const c = Math.cos(EYE_YAW);
  const s = Math.sin(EYE_YAW);
  return mirrorX((x, y, z) => {
    const dx = x - EX;
    const dz = z - EZ;
    return local(EX + dx * c - dz * s, y, EZ + dx * s + dz * c);
  });
}

/**
 * The almond opening between the lids, in the eye's frame: a prism along z, the
 * inner corner (toward the nose) at -x, the outer corner a touch lower.
 */
const eyeOpening: Sdf = (x, y) => {
  const u = (x - EX) / EYE_OPENING_HALF_WIDTH;
  const centreY = EY - 0.005 - 0.01 * u;
  const halfHeight = EYE_OPENING_HALF_HEIGHT * Math.max(0, 1 - u * u);
  return Math.max(Math.abs(y - centreY) - halfHeight, (Math.abs(u) - 1) * EYE_OPENING_HALF_WIDTH);
};

/** Points in front of the eyeball's surface, in the eye's frame. */
const frontOfBall: Sdf = (x, y, z) => {
  const dx = x - EX;
  const dy = y - EY;
  const ballFront = EZ + Math.sqrt(Math.max(0, EYE_RADIUS * EYE_RADIUS - dx * dx - dy * dy));
  return ballFront - 0.003 - z;
};

/**
 * Eyelids: one sheet of skin wrapping the front of each eyeball with a softened
 * almond opening, the fold of the upper lid above it, a fleshy pad filling the
 * inner corner (so it can't read as a crevice), and a puffy bag below.
 */
function eyelids(): Sdf {
  const lid = shell(sphere(L.eyeLeft, EYE_RADIUS + 0.008), 0.014);
  const front = halfSpace([0, 0, EZ - 0.02], [0, 0, -1]);
  const sheet = smoothSubtract(0.005, intersect(lid, front), eyeOpening);
  const fold = smoothUnion(
    0.02,
    roundCone(
      [EX - 0.06, EY + 0.042, EZ + 0.056],
      [EX + 0.02, EY + 0.038, EZ + 0.06],
      0.013,
      0.015,
    ),
    roundCone(
      [EX + 0.02, EY + 0.038, EZ + 0.06],
      [EX + 0.085, EY + 0.018, EZ + 0.038],
      0.015,
      0.012,
    ),
  );
  const innerCorner = ellipsoid(
    [EX - EYE_OPENING_HALF_WIDTH * 0.92, EY - 0.006, EZ + EYE_RADIUS * 0.62],
    [0.02, 0.014, 0.022],
  );
  const bag = ellipsoid([EX + 0.01, EY - 0.066, EZ + 0.045], [0.07, 0.025, 0.03]);
  return eyeFrame(smoothUnion(0.02, smoothUnion(0.01, sheet, fold, innerCorner), bag));
}

/** The tear-trough crease under each bag. */
const tearTroughs = (): Sdf =>
  eyeFrame(
    roundCone(
      [EX - 0.06, EY - 0.098, EZ + 0.055],
      [EX + 0.075, EY - 0.104, EZ + 0.034],
      0.004,
      0.003,
    ),
  );

function nose(): Sdf {
  return smoothUnion(
    0.035,
    roundCone([0, 0.16, 0.455], [0, -0.03, 0.59], 0.038, 0.05), // bridge, seated on the face
    sphere([0, 0.06, 0.545], 0.034), // the hump
    sphere([0, -0.055, 0.615], 0.052), // bulbous tip
    // Nostril wings, each one lobe running back into the cheek: a wing that met the
    // face in two places left a tunnel behind it.
    mirrorX(ellipsoid([0.052, -0.085, 0.525], [0.04, 0.033, 0.065])),
  );
}

function ears(): Sdf {
  const [ax, ay, az] = L.earLeft;
  const plate = ellipsoid([ax, ay, az], [0.032, 0.15, 0.09]);
  const lobe = sphere([ax + 0.005, ay - 0.12, az + 0.01], 0.035);
  const concha = sphere([ax + 0.04, ay - 0.01, az + 0.005], 0.045);
  return mirrorX(smoothSubtract(0.02, smoothUnion(0.04, plate, lobe), concha));
}

function lips(): Sdf {
  const upper = ellipsoid([0, -0.205, 0.5], [0.08, 0.022, 0.035]);
  const lower = ellipsoid([0, -0.252, 0.488], [0.068, 0.026, 0.035]);
  const slit = capsule([-0.075, -0.229, 0.53], [0.075, -0.229, 0.53], 0.006);
  return smoothSubtract(0.006, smoothUnion(0.015, upper, lower), slit);
}

/** Surface grooves: forehead furrows, crow's feet, a frown line, and fine skin noise. */
function wrinkles(x: number, y: number, z: number): number {
  let groove = 0;
  const ax = Math.abs(x);

  // Forehead furrows: horizontal, gently arched, front of the head only.
  const front = smoothstep(0.25, 0.42, z);
  const band = smoothstep(0.24, 0.3, y) * (1 - smoothstep(0.48, 0.56, y));
  const arch = y + 0.15 * ax * ax;
  const furrow = Math.max(0, Math.sin(arch * 62 + fbm(SEED + 3, x * 4, y * 4, z * 4) * 3) - 0.6);
  groove += furrow * 0.012 * front * band;

  // Crow's feet: lines fanning out from the outer corner of each eye.
  const cx = ax - (EX + EYE_OPENING_HALF_WIDTH + 0.02);
  const cy = y - EY;
  const r = Math.hypot(cx, cy);
  const fan = Math.max(0, Math.sin(Math.atan2(cy, cx) * 11) - 0.5) * 0.012;
  groove += fan * Math.exp(-((r / 0.06) ** 2)) * smoothstep(0.2, 0.32, z) * smoothstep(0, 0.02, cx);

  // A vertical frown line between the brows.
  groove += 0.006 * Math.exp(-((ax / 0.012) ** 2)) * Math.exp(-(((y - 0.21) / 0.05) ** 2)) * front;

  // Fine skin texture, faded out around the eyes: the lids are thin enough that it
  // would punch holes through them.
  const nearEye = Math.hypot(ax - EX, y - EY, z - EZ);
  const texture = fbm(SEED, x * 14, y * 14, z * 14) * 0.006 * smoothstep(0.09, 0.13, nearEye);
  return groove + texture;
}

/** The skin of head and neck as a field (also used to keep internals inside it). */
export function headSkinField(): Sdf {
  const cranium = ellipsoid([0, 0.17, -0.06], [0.43, 0.5, 0.52]);
  const face = ellipsoid([0, -0.13, 0.15], [0.33, 0.42, 0.36]);
  const jaw = ellipsoid([0, -0.33, 0.17], [0.27, 0.15, 0.25]);
  const brow = smoothUnion(
    0.04,
    mirrorX(roundCone([0.04, 0.215, 0.47], [0.28, 0.205, 0.37], 0.045, 0.03)),
    sphere([0, 0.2, 0.465], 0.04),
  );
  const cheekbones = mirrorX(ellipsoid([0.24, 0.0, 0.31], [0.11, 0.055, 0.09]));
  // Deep enough front to back for the spine behind and the airway in front.
  const neck = roundCone([0, L.neckTop[1], -0.06], [0, L.neckBase[1], -0.06], 0.22, 0.24);

  let solid = smoothUnion(0.18, cranium, face, jaw, neck);
  // Sunken temples and hollow cheeks under the cheekbones.
  solid = smoothSubtract(0.08, solid, mirrorX(sphere([0.47, 0.2, 0.17], 0.09)));
  solid = smoothSubtract(0.06, solid, mirrorX(sphere([0.3, -0.13, 0.36], 0.065)));
  solid = smoothUnion(0.04, solid, brow, cheekbones, ears());
  // The nose blends in generously: the face curves away beneath the bridge, and a
  // tight blend left a tunnel under it.
  solid = smoothUnion(0.06, solid, nose());
  solid = smoothUnion(0.03, solid, lips());

  // Nasolabial folds, from the nostril wings toward the corners of the mouth.
  const folds = mirrorX(capsule([0.105, -0.085, 0.5], [0.14, -0.27, 0.43], 0.009));
  solid = smoothSubtract(0.015, solid, folds);
  // Nostrils: shallow openings on the underside of the tip, well inside the
  // wings so they can't break through them.
  solid = smoothSubtract(
    0.006,
    solid,
    mirrorX(ellipsoid([0.024, -0.114, 0.578], [0.011, 0.006, 0.016])),
  );

  // The orbit: open the face in front of each eye so the eyeball (a separate part)
  // shows. There is deliberately no socket hollowed behind the eye: a socket wider
  // than the ball broke out beside the nose bridge.
  // Only inside the visible opening and only down to the eyeball's own front surface,
  // so there is always eyeball behind it: a wider carve left a gap behind the lid
  // (a hole) and, at the corners beyond the ball, deep pits.
  solid = subtract(solid, eyeFrame(intersect(eyeOpening, frontOfBall)));
  const skin = smoothSubtract(0.014, smoothUnion(0.012, solid, eyelids()), tearTroughs());

  return displace(skin, wrinkles);
}

export function headPart(): PartDefinition {
  return {
    id: 'head',
    layer: 'integument',
    look: { wash: 'washFlesh', section: { pattern: 'hatch' } },
    // The air spaces are open in the flesh too, so a section shows them.
    field: subtract(headSkinField(), union(mucosaAirway(), cranialCavity, canalField())),
    bounds: { min: [-0.62, -1.15, -0.7], max: [0.62, 0.78, 0.76] },
    cellSize: 0.009,
  };
}

const eyeBounds = (r: number) => ({
  min: [-EX - r, EY - r, EZ - r] as Vec3,
  max: [EX + r, EY + r, EZ + r] as Vec3,
});

export function eyesPart(): PartDefinition {
  return {
    id: 'eyes',
    layer: 'organs',
    look: { wash: 'washBone', section: { pattern: 'stipple' } },
    field: mirrorX(sphere(L.eyeLeft, EYE_RADIUS)),
    bounds: eyeBounds(0.1),
    cellSize: 0.007,
  };
}

type Side = 'left' | 'right';

/** A cap on the front of one eyeball, looking straight ahead (+z). */
function eyeCap(side: Side, lift: number, radius: number): Sdf {
  const centre: Vec3 = side === 'left' ? L.eyeLeft : mirrorPoint(L.eyeLeft);
  const [cx, cy, cz] = centre;
  return intersect(
    sphere(centre, EYE_RADIUS + lift),
    sphere([cx, cy - 0.004, cz + EYE_RADIUS], radius),
  );
}

const sideBounds = (side: Side) => {
  const [cx, cy, cz] = side === 'left' ? L.eyeLeft : mirrorPoint(L.eyeLeft);
  const r = 0.1;
  return { min: [cx - r, cy - r, cz - r] as Vec3, max: [cx + r, cy + r, cz + r] as Vec3 };
};

/**
 * The crystalline iris of one eye: a glowing cap on the front of the eyeball. Each
 * iris is its own part, turning about its eyeball's centre to follow the pointer.
 */
export function irisPart(side: Side): PartDefinition {
  return {
    id: `iris-${side}`,
    layer: 'organs',
    look: { wash: 'arcaneMana', glow: 0.7, section: { pattern: 'glow' } },
    field: eyeCap(side, 0.003, 0.038),
    bounds: sideBounds(side),
    cellSize: 0.004,
    gazePivot: side === 'left' ? L.eyeLeft : mirrorPoint(L.eyeLeft),
  };
}

/** The pupil of one eye: a small dark cap at the centre of the iris; turns with it. */
export function pupilPart(side: Side): PartDefinition {
  return {
    id: `pupil-${side}`,
    layer: 'organs',
    look: { wash: 'ink', section: { pattern: 'stipple' } },
    field: eyeCap(side, 0.005, 0.013),
    bounds: sideBounds(side),
    cellSize: 0.003,
    gazePivot: side === 'left' ? L.eyeLeft : mirrorPoint(L.eyeLeft),
  };
}

/** Right-hand eye position, for consumers that need both. */
export const EYE_RIGHT = mirrorPoint(L.eyeLeft);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
