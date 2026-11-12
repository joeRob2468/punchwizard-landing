/**
 * The plate's printed border, drawn over the scene: a double rule whose band
 * carries a line of Elder Futhark runes (Latin about the specimen, in runes), with
 * a medallion at each corner. Now and then a rune catches the light. On small
 * screens it's a plain double rule.
 */
import { useEffect, useRef, useState } from 'react';

import { type Rune, RUNES, runePath, transliterate } from '../ornament/futhark.ts';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion.ts';
import styles from './PlateBorder.module.css';

/** Repeated around the band. */
const INSCRIPTION =
  'PUGNOMAGUS PILEATUS · MAGUS VULGARIS · CAPUT ET HUMERI · SECTIO ARCANA · ' +
  'MANA FLUIT PER VASA · ';
/** Rune height and spacing along the band, in pixels. */
const RUNE_HEIGHT = 8;
const PITCH = 7.2;
/** Down the sides runes stand upright, one above the next. */
const SIDE_PITCH = 11;
/** Space kept clear of runes around each corner medallion. */
const CORNER_CLEAR = 26;
const MEDALLION = 13;
/** The corner medallions' runes, clockwise from the top left. */
const CORNER_RUNES = ['fehu', 'tiwaz', 'othala', 'algiz'];
/** How often a rune lights up, and for how long (ms). */
const GLINT_EVERY = 900;
const GLINT_FOR = 2200;

interface Placed {
  readonly d: string;
}

/** Runes along the four edges of a `w` × `h` band, `band` pixels deep. */
function placeRunes(w: number, h: number, band: number): Placed[] {
  const glyphs = transliterate(INSCRIPTION);
  const placed: Placed[] = [];
  let next = 0;
  const take = (): Rune | null => glyphs[next++ % glyphs.length] ?? null;
  const half = band / 2;
  // Top and bottom run left to right; the sides run top to bottom, upright.
  const edge = (length: number, pitch: number, at: (s: number) => [number, number]) => {
    for (let s = CORNER_CLEAR; s < length - CORNER_CLEAR; s += pitch) {
      const rune = take();
      if (!rune) continue;
      const [x, y] = at(s);
      placed.push({ d: runePath(rune, x - RUNE_HEIGHT / 4, y + RUNE_HEIGHT / 2, RUNE_HEIGHT) });
    }
  };
  edge(w, PITCH, (s) => [s, half]);
  edge(h, SIDE_PITCH, (s) => [w - half, s]);
  edge(w, PITCH, (s) => [w - s, h - half]);
  edge(h, SIDE_PITCH, (s) => [half, h - s]);
  return placed;
}

export function PlateBorder() {
  const frame = useRef<HTMLDivElement>(null);
  const runes = useRef<SVGGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number; band: number } | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const band = parseFloat(getComputedStyle(el).getPropertyValue('--band')) || 0;
      setSize({ w: el.clientWidth, h: el.clientHeight, band });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Glints: now and then a rune lights up and fades.
  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      const paths = runes.current?.children;
      if (!paths?.length) return;
      const path = paths[Math.floor(Math.random() * paths.length)];
      path?.setAttribute('data-lit', '');
      window.setTimeout(() => path?.removeAttribute('data-lit'), GLINT_FOR);
    }, GLINT_EVERY);
    return () => {
      window.clearInterval(timer);
    };
  }, [reducedMotion, size]);

  const showRunes = size !== null && size.band > 8;
  const placed = showRunes ? placeRunes(size.w, size.h, size.band) : [];
  const corners: [number, number][] = size
    ? [
        [size.band / 2, size.band / 2],
        [size.w - size.band / 2, size.band / 2],
        [size.w - size.band / 2, size.h - size.band / 2],
        [size.band / 2, size.h - size.band / 2],
      ]
    : [];

  return (
    <div ref={frame} className={styles.frame} aria-hidden="true">
      <div className={styles.inner} />
      {showRunes && (
        <svg className={styles.ornament} width={size.w} height={size.h}>
          <g ref={runes} className={styles.runes}>
            {placed.map((p, i) => (
              <path key={i} d={p.d} />
            ))}
          </g>
          {corners.map(([x, y], i) => {
            const rune = RUNES.find((r) => r.name === CORNER_RUNES[i]);
            const r = MEDALLION;
            return (
              <g key={i} className={styles.medallion}>
                <circle cx={x} cy={y} r={r} />
                <circle cx={x} cy={y} r={r - 3} />
                <path
                  d={`M${x},${y - r + 5}L${x + r - 5},${y}L${x},${y + r - 5}L${x - r + 5},${y}Z`}
                />
                {rune && (
                  <path d={runePath(rune, x - 3, y + 6, 12)} className={styles.medallionRune} />
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
