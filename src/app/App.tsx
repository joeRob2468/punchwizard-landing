/**
 * Composition root: the paper backdrop, the WebGL scene and the DOM overlay.
 */
import { Canvas } from '@react-three/fiber';

import { PaperBackdrop } from '../ui/PaperBackdrop.tsx';
import { PlateHeader } from '../ui/PlateHeader.tsx';
import styles from './App.module.css';

export function App() {
  return (
    <main className={styles.plate}>
      <PaperBackdrop />
      <Canvas
        className={styles.scene}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 5], fov: 30 }}
      />
      <div className={styles.overlay}>
        <PlateHeader />
      </div>
    </main>
  );
}
