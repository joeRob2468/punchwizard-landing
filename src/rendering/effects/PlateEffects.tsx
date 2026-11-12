/**
 * The plate's post-processing stack as an R3F component: ink outlines, the paper
 * composite, then bloom and lens effects on the finished image (see config/fx.ts).
 */
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useEffect, useMemo } from 'react';
import { Vector2, Vector3 } from 'three';

import { useFrame } from '@react-three/fiber';

import { FX } from '../../config/fx.ts';
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion.ts';
import { LOOKS } from '../../config/looks.ts';
import { usePlateStore } from '../../state/plate-store.ts';
import { OutlineEffect, PaperEffect } from './plate-effects.ts';

/** The point (specimen space) the marginalia are centred on. */
const MARGINALIA_CENTRE = [0, 0.15, 0] as const;

export function PlateEffects() {
  const outline = useMemo(() => new OutlineEffect(), []);
  const paper = useMemo(() => new PaperEffect(), []);
  const aberration = useMemo(() => new Vector2(FX.lens.aberration, FX.lens.aberration * 0.6), []);

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
    outline.paint(look.outlineLine, look.outline);
    paper.paint(palette.paper, palette.paperShadow, palette.foxing, look.paperTexture);
    paper.paintMarginalia(look.chalk, look.marginalia);
  }, [look, outline, paper]);

  // The marginalia centre on the specimen and turn slowly (still with reduced motion).
  const reducedMotion = usePrefersReducedMotion();
  const centre = useMemo(() => new Vector3(), []);
  useFrame(({ camera, clock }) => {
    centre.set(...MARGINALIA_CENTRE).project(camera);
    paper.frame((centre.x + 1) / 2, (centre.y + 1) / 2, reducedMotion ? 0 : clock.getElapsedTime());
  });

  return (
    <EffectComposer multisampling={4} stencilBuffer>
      <primitive object={outline} />
      <primitive object={paper} />
      <Bloom
        mipmapBlur
        intensity={FX.bloom.intensity}
        luminanceThreshold={FX.bloom.threshold}
        luminanceSmoothing={FX.bloom.smoothing}
      />
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.3} />
      <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={FX.lens.grain} />
      <Vignette offset={0.3} darkness={FX.lens.vignette} />
    </EffectComposer>
  );
}
