/**
 * The spotlight's shadows: each frame, the specimen's depth is drawn from the spot
 * into a small depth map, which surfaces and cut faces look up (pwSpotShadow in
 * shaders/lib/spot.glsl). Drawn with the sectioning plane (the cut-away half
 * casts nothing) and the idle sway (the hat's shadow follows it); layers that are
 * see-through or hidden cast nothing. Skipped while the view doesn't use the spot.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  type Camera,
  DepthTexture,
  type Material,
  MeshDepthMaterial,
  type Object3D,
  PerspectiveCamera,
  type Scene,
  UnsignedIntType,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

import { LIGHTING } from '../config/lighting.ts';
import { LOOKS } from '../config/looks.ts';
import type { Layer } from '../procedural/format/specimen-format.ts';
import { setShadow, type SpotUniforms } from '../rendering/materials/spot.ts';
import { addSway, type SwayUniforms } from '../rendering/materials/sway.ts';
import { useClipPlane } from '../slicing/clip-plane.tsx';
import { usePlateStore } from '../state/plate-store.ts';

/** Depth map size (pixels, square). */
const SIZE = 1024;
/** A render layer only the specimen's surfaces are on, for the shadow camera. */
const SHADOW_LAYER = 5;

interface SpotShadowProps {
  readonly spot: SpotUniforms;
  readonly sway: SwayUniforms;
}

export function SpotShadow({ spot, sway }: SpotShadowProps) {
  const { plane } = useClipPlane();
  const scene = useThree((state) => state.scene);

  const { target, camera, depth } = useMemo(() => {
    const map = new DepthTexture(SIZE, SIZE, UnsignedIntType);
    const renderTarget = new WebGLRenderTarget(SIZE, SIZE, { depthTexture: map });
    const lightCamera = new PerspectiveCamera(2 * LIGHTING.cone.outer + 6, 1, 1.5, 12);
    lightCamera.layers.set(SHADOW_LAYER);
    return {
      target: renderTarget,
      camera: lightCamera,
      depth: addSway(new MeshDepthMaterial({ clippingPlanes: [plane] }), sway),
    };
  }, [plane, sway]);

  useEffect(
    () => () => {
      target.depthTexture?.dispose();
      target.dispose();
      depth.dispose();
    },
    [target, depth],
  );

  useFrame(({ gl }) => {
    const { look, layers } = usePlateStore.getState();
    if (LOOKS[look].drama <= 0) return;
    const specimen = scene.getObjectByName('specimen');
    if (!specimen) return;

    // Only solid layers cast; remember what to restore.
    const hidden: Object3D[] = [];
    specimen.traverse((object) => {
      object.layers.enable(SHADOW_LAYER);
      const layer = object.userData.layer as Layer | undefined;
      if (layer && layers[layer] !== 'shown' && object.visible) {
        object.visible = false;
        hidden.push(object);
      }
    });

    const p = spot.uSpotPosition.value;
    const [tx, ty, tz] = LIGHTING.path.target;
    camera.position.copy(p);
    camera.lookAt(tx, ty, tz);
    camera.updateMatrixWorld();

    renderDepth(gl, scene, camera, target, depth);
    for (const object of hidden) object.visible = true;

    if (target.depthTexture) {
      setShadow(
        spot,
        target.depthTexture,
        camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse),
        SIZE,
      );
    }
  });

  return null;
}

/** Draws `scene` from `camera` into `target` with every surface as `material`. */
function renderDepth(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  target: WebGLRenderTarget,
  material: Material,
): void {
  const previousTarget = gl.getRenderTarget();
  const previousOverride = scene.overrideMaterial;
  scene.overrideMaterial = material;
  gl.setRenderTarget(target);
  gl.clear();
  gl.render(scene, camera);
  gl.setRenderTarget(previousTarget);
  scene.overrideMaterial = previousOverride;
}
