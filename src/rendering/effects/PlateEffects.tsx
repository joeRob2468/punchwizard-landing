/**
 * The plate's post-processing stack as an R3F component.
 */
import { EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo } from 'react';

import { LOOKS } from '../../config/looks.ts';
import { usePlateStore } from '../../state/plate-store.ts';

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

  const look = LOOKS[usePlateStore((state) => state.look)];
  useEffect(() => {
    const { palette } = look;
    outline.paint(look.line, look.outline);
    paper.paint(palette.paper, palette.paperShadow, palette.foxing, look.ground === 'dark');
  }, [look, outline, paper]);

  return (
    <EffectComposer multisampling={4} stencilBuffer>
      <primitive object={outline} />
      <primitive object={paper} />
    </EffectComposer>
  );
}
