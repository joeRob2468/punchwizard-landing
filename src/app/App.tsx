/**
 * Composition root: the WebGL plate (scene, camera, effects) and the DOM overlay.
 */
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

import { CAMERA } from '../config/camera.ts';
import { PlateEffects } from '../rendering/effects/PlateEffects.tsx';
import { CameraRig } from '../scene/CameraRig.tsx';
import { DevHandle } from '../scene/DevHandle.tsx';
import { loadSpecimen } from '../specimen/load-specimen.ts';
import { Specimen } from '../specimen/Specimen.tsx';
import { PlateBorder } from '../ui/PlateBorder.tsx';
import { PlateHeader } from '../ui/PlateHeader.tsx';
import styles from './App.module.css';

// Started at module load so the fetch overlaps React and WebGL start-up.
const specimen = loadSpecimen(`${import.meta.env.BASE_URL}specimen/`);

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
        <Suspense fallback={null}>
          <Specimen specimen={specimen} />
        </Suspense>
        <PlateEffects />
        {import.meta.env.DEV && <DevHandle />}
      </Canvas>
      <div className={styles.overlay}>
        <PlateBorder />
        <PlateHeader />
      </div>
    </main>
  );
}
