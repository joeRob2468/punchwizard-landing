/**
 * Shown when WebGL 2 is unavailable or the plate fails to render: the border and
 * title on CSS paper, with a still image of the specimen in its resting cut
 * (public/fallback/, captured from the live plate) and a note on what's missing.
 */
import styles from './Fallback.module.css';
import { PaperBackdrop } from './PaperBackdrop.tsx';
import { PlateBorder } from './PlateBorder.tsx';
import { PlateHeader } from './PlateHeader.tsx';

const BASE = import.meta.env.BASE_URL;

export function Fallback() {
  return (
    <main className={styles.fallback}>
      <PaperBackdrop />
      <figure className={styles.figure}>
        <picture>
          <source srcSet={`${BASE}fallback/plate.webp`} type="image/webp" />
          <img
            className={styles.plate}
            src={`${BASE}fallback/plate.jpg`}
            width={858}
            height={1000}
            alt="The Common Punchwizard cut in half down the middle like an anatomy specimen: a wizard's head and shoulders in a blue hat and robe, with a long grey beard, showing glowing arcane organs inside, above a ring of runes."
          />
        </picture>
        <figcaption className={styles.caption}>
          The living plate needs WebGL 2 to turn and section the specimen.
        </figcaption>
      </figure>
      <PlateBorder />
      <PlateHeader />
    </main>
  );
}
