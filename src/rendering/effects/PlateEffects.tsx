/**
 * The plate's post-processing stack as an R3F component: ink outlines, SMAA, the
 * paper composite, then bloom and lens effects on the finished image (see
 * config/fx.ts).
 */
import {
  ChromaticAberration,
  EffectComposer,
  Noise,
  SMAA,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, BloomEffect } from 'postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import { Vector2, Vector3 } from 'three';

import { useFrame } from '@react-three/fiber';

import { FX } from '../../config/fx.ts';
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion.ts';
import { LOOKS } from '../../config/looks.ts';
import { usePlateStore } from '../../state/plate-store.ts';
import { GradeEffect, OutlineEffect, PaperEffect } from './plate-effects.ts';

/** The point (specimen space) the marginalia are centred on. */
const MARGINALIA_CENTRE = [0, 0.15, 0] as const;

export function PlateEffects() {
  const outline = useMemo(() => new OutlineEffect(), []);
  const paper = useMemo(() => new PaperEffect(), []);
  // Made here rather than with <Bloom> so the grade can read its blurred texture.
  const bloom = useMemo(
    () =>
      new BloomEffect({
        mipmapBlur: true,
        intensity: FX.bloom.intensity,
        luminanceThreshold: FX.bloom.threshold,
        luminanceSmoothing: FX.bloom.smoothing,
      }),
    [],
  );
  const grade = useMemo(() => new GradeEffect(), []);
  useEffect(() => {
    grade.setBloom(bloom.texture);
  }, [bloom, grade]);
  const aberration = useMemo(() => new Vector2(FX.lens.aberration, FX.lens.aberration * 0.6), []);

  useEffect(
    () => () => {
      outline.dispose();
      paper.dispose();
      bloom.dispose();
      grade.dispose();
    },
    [outline, paper, bloom, grade],
  );

  const look = LOOKS[usePlateStore((state) => state.look)];
  useEffect(() => {
    const { palette } = look;
    outline.paint(look.outlineLine, look.outline);
    paper.paint(palette.paper, palette.paperShadow, palette.foxing, look.paperTexture);
    paper.paintMarginalia(look.chalk, look.marginalia);
    grade.paint(look.grade.split, look.grade.halation);
  }, [look, outline, paper, grade]);

  // Dev builds: G turns the grade off and on, to compare.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let on = true;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'g' && event.key !== 'G') return;
      on = !on;
      grade.setAmount(on ? 1 : 0);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [grade]);

  // The marginalia centre on the specimen and turn slowly (still with reduced motion).
  const reducedMotion = usePrefersReducedMotion();
  const centre = useMemo(() => new Vector3(), []);
  // When the specimen became ready (clock seconds), for the ink-in.
  const readyAt = useRef<number | null>(null);
  useFrame(({ camera, clock }) => {
    const now = clock.getElapsedTime();
    if (readyAt.current === null && usePlateStore.getState().specimenReady) readyAt.current = now;
    const seconds = reducedMotion ? FX.reveal.reducedMotionSeconds : FX.reveal.seconds;
    const reveal = readyAt.current === null ? 0 : Math.min(1, (now - readyAt.current) / seconds);
    paper.setReveal(reveal);

    // The camera controls leave its matrices stale until render; refresh them, or
    // the marginalia trail the specimen by a frame as it turns.
    camera.updateMatrixWorld();
    centre.set(...MARGINALIA_CENTRE).project(camera);
    const [u, v] = [(centre.x + 1) / 2, (centre.y + 1) / 2];
    paper.frame(u, v, reducedMotion ? 0 : now);
    outline.setReveal(reveal, u, v);
  });

  return (
    // No MSAA: SMAA looks the same, and ANGLE's multisampled depth-stencil resolve
    // cost ~30 ms a frame (design.md § Post effects).
    <EffectComposer multisampling={0} stencilBuffer>
      <primitive object={outline} />
      {/* Smooths jaggies on silhouettes and ink lines before the paper and bloom. */}
      <SMAA />
      <primitive object={paper} />
      <primitive object={bloom} />
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.3} />
      <primitive object={grade} />
      <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={FX.lens.grain} />
      <Vignette offset={0.3} darkness={FX.lens.vignette} />
    </EffectComposer>
  );
}
