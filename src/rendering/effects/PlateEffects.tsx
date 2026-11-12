/**
 * The plate's post-processing stack as an R3F component: ink outlines, optional
 * haze and depth of field on the scene, the paper composite, then optional bloom
 * and lens effects on the finished image (see config/fx.ts).
 */
import { useFrame } from '@react-three/fiber';
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useEffect, useMemo } from 'react';
import { Vector2 } from 'three';

import { FX } from '../../config/fx.ts';
import { LOOKS } from '../../config/looks.ts';
import { usePlateStore } from '../../state/plate-store.ts';
import { HazeEffect, OutlineEffect, PaperEffect } from './plate-effects.ts';

export function PlateEffects() {
  const outline = useMemo(() => new OutlineEffect(), []);
  const haze = useMemo(() => new HazeEffect(), []);
  const paper = useMemo(() => new PaperEffect(), []);
  const aberration = useMemo(() => new Vector2(FX.lens.aberration, FX.lens.aberration * 0.6), []);

  useEffect(
    () => () => {
      outline.dispose();
      haze.dispose();
      paper.dispose();
    },
    [outline, haze, paper],
  );

  const look = LOOKS[usePlateStore((state) => state.look)];
  const fx = usePlateStore((state) => state.fx);
  useEffect(() => {
    const { palette } = look;
    outline.paint(look.outlineLine ?? look.line, look.outline);
    haze.paint(look.haze);
    paper.paint(palette.paper, palette.paperShadow, palette.foxing, look.ground === 'dark');
  }, [look, outline, haze, paper]);

  useFrame(({ camera }) => {
    haze.focusAt(camera.position.length());
  });

  return (
    <EffectComposer multisampling={4} stencilBuffer>
      <primitive object={outline} />
      {fx.haze && <primitive object={haze} />}
      {fx.focus && (
        <DepthOfField
          target={FX.focus.target}
          worldFocusRange={FX.focus.worldFocusRange}
          bokehScale={FX.focus.bokehScale}
        />
      )}
      <primitive object={paper} />
      {fx.bloom && (
        <Bloom
          mipmapBlur
          intensity={FX.bloom.intensity}
          luminanceThreshold={FX.bloom.threshold}
          luminanceSmoothing={FX.bloom.smoothing}
        />
      )}
      {fx.lens && (
        <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.3} />
      )}
      {fx.lens && <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={FX.lens.grain} />}
      {fx.lens && <Vignette offset={0.3} darkness={FX.lens.vignette} />}
    </EffectComposer>
  );
}
