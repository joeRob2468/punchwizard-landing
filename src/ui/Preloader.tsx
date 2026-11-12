/**
 * Shown while the specimen loads: a ring of the 24 Futhark runes that ink in one
 * by one as the parts arrive, turning slowly, with a caption in Latin. It fades
 * out once the specimen has drawn its first frame.
 */
import { useEffect, useState } from 'react';

import { RUNES, runePath } from '../ornament/futhark.ts';
import { usePlateStore } from '../state/plate-store.ts';
import styles from './Preloader.module.css';

const RING_RADIUS = 70;
const RUNE_HEIGHT = 11;
/** How long the fade-out lasts (ms); matches the CSS transition. */
const FADE_MS = 900;

/** Each rune upright on the ring, pointing outward, clockwise from the top. */
const RING = RUNES.map((rune, i) => ({
  d: runePath(rune, -RUNE_HEIGHT / 4, RUNE_HEIGHT / 2, RUNE_HEIGHT),
  angle: (i / RUNES.length) * 360,
}));

export function Preloader() {
  const progress = usePlateStore((state) => state.loadProgress);
  const ready = usePlateStore((state) => state.specimenReady);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setGone(true);
    }, FADE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [ready]);

  if (gone) return null;
  // Fetching is most of the wait; the last rune lights when the specimen appears.
  const lit = ready ? RING.length : Math.floor(progress * (RING.length - 1));

  return (
    <div
      className={styles.preloader}
      data-leaving={ready ? '' : undefined}
      role="progressbar"
      aria-label="Preparing the specimen"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <svg className={styles.ring} viewBox="-86 -86 172 172" aria-hidden="true">
        <circle r={RING_RADIUS + 11} className={styles.rule} />
        <circle r={RING_RADIUS - 10} className={styles.rule} />
        <circle r={RING_RADIUS - 14} className={styles.fineRule} />
        <g className={styles.turning}>
          {RING.map(({ d, angle }, i) => (
            <path
              key={angle}
              d={d}
              transform={`rotate(${angle}) translate(0 ${-RING_RADIUS})`}
              className={styles.rune}
              data-lit={i < lit ? '' : undefined}
            />
          ))}
        </g>
        <path d="M0 -6 L5 0 L0 6 L-5 0 Z" className={styles.centre} />
      </svg>
      <p className={styles.caption}>Praeparatur specimen</p>
    </div>
  );
}
