/**
 * Shown when WebGL 2 is unavailable. A static plate image replaces the text in M6.
 */
import { PaperBackdrop } from './PaperBackdrop.tsx';
import { PlateBorder } from './PlateBorder.tsx';
import { PlateHeader } from './PlateHeader.tsx';

export function Fallback() {
  return (
    <main style={{ position: 'relative', height: '100%' }}>
      <PaperBackdrop />
      <PlateBorder />
      <PlateHeader />
    </main>
  );
}
