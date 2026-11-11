/**
 * Composition root: the WebGL plate (scene, camera, effects) and the DOM overlay.
 */
import { Canvas } from '@react-three/fiber';

import { CAMERA } from '../config/camera.ts';
import { PlateEffects } from '../rendering/effects/PlateEffects.tsx';
import { CameraRig } from '../scene/CameraRig.tsx';
import { TestBust } from '../scene/TestBust.tsx';
import { PlateBorder } from '../ui/PlateBorder.tsx';
import { PlateHeader } from '../ui/PlateHeader.tsx';
import styles from './App.module.css';

export function App() {
  return (
    <main className={styles.plate}>
      <Canvas
        className={styles.scene}
        flat
        dpr={[1, 2]}
        gl={{ antialias: false, stencil: true }}
        camera={{ fov: CAMERA.fov, position: [...CAMERA.position], near: 0.1, far: 50 }}
      >
        {/* White ground: the paper effect multiplies the scene onto paper. */}
        <color attach="background" args={['#ffffff']} />
        <CameraRig />
        <TestBust />
        <PlateEffects />
      </Canvas>
      <div className={styles.overlay}>
        <PlateBorder />
        <PlateHeader />
      </div>
    </main>
  );
}
