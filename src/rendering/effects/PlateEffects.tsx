/**
 * The plate's post-processing stack as an R3F component.
 */
import { EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo } from 'react';

import { OutlineEffect, PaperEffect } from './plate-effects.ts';

export function PlateEffects() {
  const outline = useMemo(() => new OutlineEffect(), []);
  const paper = useMemo(() => new PaperEffect(), []);

  useEffect(
    () => () => {
      outline.dispose();
      paper.dispose();
    },
    [outline, paper],
  );

  return (
    <EffectComposer multisampling={4} stencilBuffer>
      <primitive object={outline} />
      <primitive object={paper} />
    </EffectComposer>
  );
}
