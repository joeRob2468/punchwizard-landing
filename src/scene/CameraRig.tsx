/**
 * Camera controls for the specimen: orbit, pan and zoom with damping and limits,
 * keyboard equivalents, double-click to reset, and a slow turn when idle.
 */
import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import { useEffect, useRef } from 'react';
import { Box3, Vector3 } from 'three';

import { CAMERA } from '../config/camera.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import { usePlateStore } from '../state/plate-store.ts';

const { ACTION } = CameraControlsImpl;

export function CameraRig() {
  const controls = useRef<CameraControlsImpl>(null);
  const lastInput = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const domElement = useThree((state) => state.gl.domElement);

  // Initial framing, limits, and the reset point.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const [tx, ty, tz] = CAMERA.target;
    const [bx, by, bz] = CAMERA.panBounds;
    c.setBoundary(
      new Box3(new Vector3(tx - bx, ty - by, tz - bz), new Vector3(tx + bx, ty + by, tz + bz)),
    );
    // The wheel is ours: it moves the cut, or zooms with Ctrl/⌘ (see below). Two
    // fingers only pinch-zoom here; dragging them moves the cut (SliceController).
    c.mouseButtons.wheel = ACTION.NONE;
    c.touches.two = ACTION.TOUCH_DOLLY;
    void c.setLookAt(...CAMERA.position, ...CAMERA.target, false);
    c.saveState();
    lastInput.current = performance.now();
  }, []);

  // Keyboard, Shift-to-pan, double-click reset.
  useEffect(() => {
    const markInput = () => {
      lastInput.current = performance.now();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const c = controls.current;
      if (!c || isTyping(event.target)) return;
      markInput();
      if (event.key === 'Shift') c.mouseButtons.left = ACTION.TRUCK;
      const { orbitStep, zoomStep } = CAMERA.keyboard;
      const handled = runKey(c, event.key, orbitStep, zoomStep);
      if (handled) event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift' && controls.current) {
        controls.current.mouseButtons.left = ACTION.ROTATE;
      }
    };
    const onDoubleClick = () => {
      markInput();
      usePlateStore.getState().resetView();
    };

    // The plain wheel moves the cut (SliceController); Ctrl/⌘ + wheel, which is also
    // how trackpad pinches arrive, zooms.
    const onWheel = (event: WheelEvent) => {
      markInput();
      if (!(event.ctrlKey || event.metaKey) || !controls.current) return;
      event.preventDefault();
      void controls.current.dolly(-event.deltaY * CAMERA.wheelZoom, true);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    domElement.addEventListener('dblclick', onDoubleClick);
    domElement.addEventListener('pointerdown', markInput);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domElement.removeEventListener('dblclick', onDoubleClick);
      domElement.removeEventListener('pointerdown', markInput);
      domElement.removeEventListener('wheel', onWheel);
    };
  }, [domElement]);

  // Reset requests (keyboard, double-click, the reset glyph).
  const viewResets = usePlateStore((state) => state.viewResets);
  useEffect(() => {
    if (viewResets === 0) return;
    lastInput.current = performance.now();
    void controls.current?.reset(true);
  }, [viewResets]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c || reducedMotion) return;
    const idleFor = (performance.now() - lastInput.current) / 1000;
    if (idleFor > CAMERA.idleDelay) void c.rotate(CAMERA.idleSpeed * delta, 0, false);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={CAMERA.minDistance}
      maxDistance={CAMERA.maxDistance}
      minPolarAngle={CAMERA.minPolarAngle}
      maxPolarAngle={CAMERA.maxPolarAngle}
      smoothTime={CAMERA.smoothTime}
    />
  );
}

/** Applies a keyboard shortcut; returns whether the key was one of ours. */
function runKey(c: CameraControlsImpl, key: string, orbit: number, zoom: number): boolean {
  switch (key) {
    case 'ArrowLeft':
      void c.rotate(-orbit, 0, true);
      return true;
    case 'ArrowRight':
      void c.rotate(orbit, 0, true);
      return true;
    case 'ArrowUp':
      void c.rotate(0, -orbit, true);
      return true;
    case 'ArrowDown':
      void c.rotate(0, orbit, true);
      return true;
    case '+':
    case '=':
      void c.dolly(zoom, true);
      return true;
    case '-':
    case '_':
      void c.dolly(-zoom, true);
      return true;
    case 'r':
    case 'R':
      usePlateStore.getState().resetView();
      return true;
    default:
      return false;
  }
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}
