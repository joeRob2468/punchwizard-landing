/**
 * The skull, jaw and teeth, after a lateral radiograph and a midline MRI: a vault
 * of even thickness over a stepped cranial floor (anterior fossa over the orbits,
 * sella and middle fossae, a deep posterior fossa around the foramen magnum), a
 * face of frontal, nasal, zygomatic and maxillary bone with conical orbits and the
 * nasal cavity, a hard palate, mastoids, the mandible and both dental arches.
 * The fantasy features stay: the Third Fontanelle opens the crown into the hat,
 * and the Incantatory Sinus sits where the sphenoid sinus would.
 */
import { EYE_RADIUS, LANDMARKS as L } from '../landmarks.ts';
import {
  capsule,
  ellipsoid,
  intersect,
  mirrorX,
  roundCone,
  smoothSubtract,
  smoothUnion,
  subtract,
  union,
} from '../sdf/index.ts';
import type { Sdf, Vec3 } from '../sdf/types.ts';
import { boneAirway, CHOANAE_Z, conchae, PALATE_TOP, septum } from './airways.ts';
import type { PartDefinition } from './part.ts';
import {
  cranialCavity,
  cranialFloor,
  HORN,
  hornCore,
  hornTip,
  smoothstep,
  vaultOuter,
} from './cranium.ts';
import { headSkinField } from './head.ts';
import { FORAMEN_MAGNUM } from './spine-path.ts';

const BONE = { wash: 'washBone', section: { pattern: 'stipple' } } as const;

/**
 * Underside of the skull base: bone below the floor is thin except the sphenoid
 * body in the middle (which houses the sinus) and the petrous ridges and mastoids
 * at the sides.
 */
function baseUnderside(x: number, z: number): number {
  const ax = Math.abs(x);
  const sphenoid =
    (1 - smoothstep(0.08, 0.14, ax)) * smoothstep(-0.06, 0.0, z) * (1 - smoothstep(0.2, 0.26, z));
  const petrous =
    smoothstep(0.12, 0.2, ax) * (1 - smoothstep(-0.02, 0.06, z)) * smoothstep(-0.25, -0.15, z);
  return cranialFloor(x, z) - 0.04 - 0.11 * sphenoid - 0.08 * petrous;
}

/** Conical orbits: wide at the rim, narrowing back to the optic canal. */
const orbits: Sdf = mirrorX(
  roundCone(
    [0.055, 0.085, 0.13],
    [L.eyeLeft[0], L.eyeLeft[1], L.eyeLeft[2] + 0.12],
    0.012,
    EYE_RADIUS + 0.04,
  ),
);

/** The facial skeleton: frontal brow, nasal bones, maxilla with the palate, zygomas. */
function faceBones(): Sdf {
  const maxilla = intersect(
    ellipsoid([0, -0.06, 0.25], [0.24, 0.17, 0.21]),
    (_x, y) => -0.215 - y, // alveolar margin; teeth hang below it
  );
  const palate: Sdf = (x, y, z) =>
    Math.max(
      Math.abs(y - (PALATE_TOP - 0.018)) - 0.018,
      CHOANAE_Z - z,
      z - 0.43,
      Math.abs(x) - 0.17,
    );
  const brow = mirrorX(roundCone([0.03, 0.2, 0.43], [0.27, 0.19, 0.33], 0.035, 0.025));
  const nasalBones = roundCone([0, 0.16, 0.425], [0, 0.04, 0.47], 0.03, 0.022);
  const zygoma = mirrorX(
    smoothUnion(
      0.03,
      ellipsoid([0.23, 0.0, 0.29], [0.07, 0.05, 0.07]),
      roundCone([0.26, 0.0, 0.26], [0.37, 0.02, -0.0], 0.022, 0.018), // arch to the temple
    ),
  );
  const mastoid = mirrorX(ellipsoid([0.35, -0.1, -0.09], [0.045, 0.075, 0.05]));
  // Walls of each orbit (carved hollow afterwards) and the ethmoid between them.
  const orbitWalls = intersect(
    (x, y, z) => orbits(x, y, z) - 0.018,
    (_x, _y, z) => z - 0.47,
  );
  const ethmoid = ellipsoid([0, 0.085, 0.3], [0.075, 0.1, 0.15]);
  return smoothUnion(0.04, maxilla, palate, brow, nasalBones, zygoma, mastoid, orbitWalls, ethmoid);
}

/** The nasal aperture (piriform opening) at the front of the face. */
const nasalAperture = ellipsoid([0, -0.06, 0.45], [0.05, 0.075, 0.06]);

export function skullPart(): PartDefinition {
  const base: Sdf = (x, y, z) => baseUnderside(x, z) - y;
  // The vault, cut away below the skull base (the face keeps its own bone).
  const cranium = smoothUnion(
    0.06,
    intersect(vaultOuter, (x, y, z) => base(x, y, z) * 0.7),
    hornCore(HORN.bone),
  );
  let skull = smoothUnion(0.05, cranium, faceBones());

  // The Third Fontanelle: open at the tip of the horn core, into the hat.
  const [tx, ty, tz] = hornTip();
  const fontanelle = capsule([tx, ty, tz], [tx, ty + 0.25, tz], 0.04);
  const [, fy, fz] = FORAMEN_MAGNUM;
  const foramenMagnum = capsule([0, fy + 0.1, fz], [0, fy - 0.25, fz - 0.01], 0.06);
  const sinusChamber = ellipsoid(L.sinus, [0.07, 0.05, 0.075]);

  skull = smoothSubtract(0.02, skull, orbits);
  skull = smoothSubtract(0.015, skull, nasalAperture);
  skull = subtract(
    skull,
    union(cranialCavity, fontanelle, foramenMagnum, sinusChamber, boneAirway()),
  );
  // The septum and conchae are bone inside the nasal cavity.
  skull = union(skull, intersect(union(septum, conchae), ellipsoid([0, 0, 0.3], [0.1, 0.2, 0.2])));
  // Never through the skin: the orbit walls and zygomas reached past the face.
  const skin = headSkinField();
  const bone = skull;
  const insideSkin: Sdf = (x, y, z) => {
    const d = bone(x, y, z);
    return d > 0.03 ? d : Math.max(d, skin(x, y, z) + 0.012);
  };
  return {
    id: 'skull',
    layer: 'skeleton',
    look: BONE,
    field: insideSkin,
    bounds: { min: [-0.46, -0.32, -0.6], max: [0.46, 1.36, 0.54] },
    // Fontanelle, foramen magnum, orbits and nasal aperture open into the cavities.
    intendedHoles: 6,
    cellSize: 0.009,
  };
}

/**
 * The lower dental arch line at height y: a parabola from the incisors (x = 0) back
 * to the last molars. Upper sits a little in front of lower (overbite).
 */
const archZ = (x: number, front: number) => front - 2.8 * x * x;
const UPPER_FRONT = 0.43;
const LOWER_FRONT = 0.415;
const OCCLUSAL_Y = -0.236;

/** Half-widths of each tooth from the midline back: incisors, canine, premolars, molars. */
const TEETH = [
  { x: 0.018, crown: 0.013, root: 0.075, kind: 'incisor' },
  { x: 0.05, crown: 0.012, root: 0.07, kind: 'incisor' },
  { x: 0.08, crown: 0.014, root: 0.09, kind: 'canine' },
  { x: 0.11, crown: 0.016, root: 0.07, kind: 'premolar' },
  { x: 0.135, crown: 0.017, root: 0.07, kind: 'premolar' },
  { x: 0.163, crown: 0.022, root: 0.065, kind: 'molar' },
  { x: 0.19, crown: 0.022, root: 0.06, kind: 'molar' },
  { x: 0.212, crown: 0.02, root: 0.055, kind: 'molar' },
] as const;

/** One tooth: a crown at the occlusal plane and a tapering root into the jaw. */
function tooth(x: number, front: number, upper: boolean, t: (typeof TEETH)[number]): Sdf {
  const z = archZ(x, front);
  const dir = upper ? 1 : -1;
  const tip: Vec3 = [x, OCCLUSAL_Y + dir * 0.003, z];
  const neck: Vec3 = [x, OCCLUSAL_Y + dir * 0.04, z];
  const apex: Vec3 = [x, OCCLUSAL_Y + dir * (0.04 + t.root), z - 0.01 * dir];
  // Incisors are flat chisels across the arch; back teeth are round.
  const flat = t.kind === 'incisor' ? 0.55 : 1;
  const crown = roundCone(tip, neck, t.crown * 0.85, t.crown);
  const root = roundCone(neck, apex, t.crown * 0.8, 0.005);
  const shape = smoothUnion(0.01, crown, root);
  // Flatten front to back along the arch for incisors (scale z about the tooth).
  return flat === 1 ? shape : (px, py, pz) => shape(px, py, z + (pz - z) / flat) * flat;
}

export function teethPart(): PartDefinition {
  const teeth: Sdf[] = [];
  for (const t of TEETH) {
    for (const side of [1, -1]) {
      teeth.push(tooth(t.x * side, UPPER_FRONT, true, t));
      teeth.push(tooth(t.x * side, LOWER_FRONT, false, t));
    }
  }
  return {
    id: 'teeth',
    layer: 'skeleton',
    look: { wash: 'washBone', section: { pattern: 'rings', centre: [0, OCCLUSAL_Y, 0.3] } },
    field: union(...teeth),
    bounds: { min: [-0.26, -0.38, 0.22], max: [0.26, -0.1, 0.47] },
    cellSize: 0.005,
  };
}

/**
 * The mandible: a curved body following the lower arch (tall at the chin, holding
 * the roots), the angle, and the ramus rising to the condyle in front of the ear
 * and the coronoid process under the zygomatic arch.
 */
export function mandiblePart(): PartDefinition {
  const plates: Sdf[] = [];
  const steps = 9;
  let previous: { top: Vec3; bottom: Vec3 } | undefined;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = 0.24 * t;
    const z = archZ(x, LOWER_FRONT) - 0.012 - 0.06 * t * t;
    const top: Vec3 = [x, -0.265 - 0.005 * t, z];
    const bottom: Vec3 = [x, -0.445 + 0.07 * t, z - 0.01];
    const thick = 0.026 - 0.006 * t;
    plates.push(capsule(top, bottom, thick));
    if (previous) {
      plates.push(capsule(previous.top, top, thick), capsule(previous.bottom, bottom, thick));
    }
    previous = { top, bottom };
  }
  const angle: Vec3 = [0.265, -0.37, 0.02];
  const condyle: Vec3 = [0.285, -0.05, 0.02];
  const coronoid: Vec3 = [0.25, -0.1, 0.12];
  const ramus = smoothUnion(
    0.03,
    roundCone([0.24, -0.33, 0.13], angle, 0.026, 0.024),
    roundCone(angle, condyle, 0.026, 0.02),
    roundCone([0.255, -0.24, 0.1], coronoid, 0.024, 0.012),
    capsule([0.255, -0.27, 0.1], [0.265, -0.2, 0.03], 0.026), // fills the ramus plate
    ellipsoid(condyle, [0.03, 0.018, 0.02]),
  );
  const half = smoothUnion(0.02, ...plates);
  const mandible = mirrorX(smoothUnion(0.04, half, ramus));
  return {
    id: 'mandible',
    layer: 'skeleton',
    look: BONE,
    field: mandible,
    bounds: { min: [-0.36, -0.5, -0.06], max: [0.36, -0.01, 0.46] },
    cellSize: 0.008,
  };
}
