/**
 * A short note written in Elder Futhark runes (a transliteration of Latin) that
 * reads as Latin when hovered or focused. Screen readers get the Latin.
 */
import { runePath, transliterate } from '../ornament/futhark.ts';
import styles from './CipherNote.module.css';

const HEIGHT = 10;
const PITCH = 7;
const SPACE = 6;

interface CipherNoteProps {
  readonly latin: string;
  readonly className?: string;
}

export function CipherNote({ latin, className }: CipherNoteProps) {
  const glyphs = transliterate(latin);
  let x = 1;
  const paths: string[] = [];
  for (const rune of glyphs) {
    if (rune) {
      paths.push(runePath(rune, x, HEIGHT + 1, HEIGHT));
      x += PITCH;
    } else x += SPACE;
  }
  const width = Math.ceil(x);

  return (
    <p className={[styles.note, className].filter(Boolean).join(' ')} tabIndex={0}>
      <svg
        className={styles.runes}
        width={width}
        height={HEIGHT + 2}
        viewBox={`0 0 ${width} ${HEIGHT + 2}`}
        aria-hidden="true"
      >
        <path d={paths.join('')} />
      </svg>
      <span className={styles.latin}>{latin}</span>
    </p>
  );
}
