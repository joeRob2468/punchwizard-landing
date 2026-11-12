/**
 * Composition root: the WebGL plate (scene, camera, effects) and the DOM overlay.
 */
import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';

import { ANATOMY } from '../anatomy/registry.ts';
import { CAMERA, framingPosition } from '../config/camera.ts';
import { LabelChannel } from '../labels/label-channel.ts';
import { LabelOverlay } from '../labels/LabelOverlay.tsx';
import { PlateEffects } from '../rendering/effects/PlateEffects.tsx';
import { CameraRig } from '../scene/CameraRig.tsx';
import { ClipPlaneProvider } from '../slicing/clip-plane.tsx';
import { DevHandle } from '../scene/DevHandle.tsx';
import { RuneCircles } from '../scene/RuneCircles.tsx';
import { loadSpecimen } from '../specimen/load-specimen.ts';
import { Specimen } from '../specimen/Specimen.tsx';
import { PlateBorder } from '../ui/PlateBorder.tsx';
import { PlateHeader } from '../ui/PlateHeader.tsx';
import { LayerControls } from '../ui/LayerControls.tsx';
import { ViewToggle } from '../ui/ViewToggle.tsx';
import { SliceControls } from '../ui/SliceControls.tsx';
import styles from './App.module.css';

// Started at module load so the fetch overlaps React and WebGL start-up.
const specimen = loadSpecimen(`${import.meta.env.BASE_URL}specimen/`);

export function App() {
  const labels = useMemo(() => new LabelChannel(ANATOMY.length), []);
  return (
    <main className={styles.plate}>
      <Canvas
        className={styles.scene}
        flat
        dpr={[1, 2]}
        gl={{ antialias: false, stencil: true }}
        camera={{
          fov: CAMERA.fov,
          position: framingPosition(window.innerWidth / window.innerHeight),
          near: 0.1,
          far: 50,
        }}
        onCreated={({ gl }) => {
          // Materials clip against the sectioning plane individually.
          gl.localClippingEnabled = true;
        }}
      >
        {/* Black ground: the paper effect screens the scene onto dark paper. */}
        <color attach="background" args={['#000000']} />
        <CameraRig />
        <RuneCircles />
        <ClipPlaneProvider>
          <Suspense fallback={null}>
            <Specimen specimen={specimen} labels={labels} />
          </Suspense>
        </ClipPlaneProvider>
        <PlateEffects />
        {import.meta.env.DEV && <DevHandle />}
      </Canvas>
      <div className={styles.overlay}>
        <PlateBorder />
        <PlateHeader />
        <LabelOverlay channel={labels} />
        <SliceControls />
        <LayerControls />
        <ViewToggle />
      </div>
    </main>
  );
}
