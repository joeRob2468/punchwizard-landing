/**
 * Inset study, top right: the key of lights (each magical organ's glow, with its
 * plate number and Latin name, in the colour it glows in the current view) and a
 * small ruled scale, and a note in runes. Hovering a row makes that organ flare, as its label does.
 * The label overlay keeps its right-hand column below this inset.
 */
import { usePlateStore } from '../state/plate-store.ts';
import { CipherNote } from './CipherNote.tsx';
import styles from './GlowKey.module.css';

/** Glowing organs, by plate number: the part each glows from, and its Latin name. */
const ROWS: readonly { readonly number: string; readonly part: string; readonly latin: string }[] =
  [
    { number: '2·11', part: 'lattice', latin: 'Rete et vasa aetheria' },
    { number: '4', part: 'aetheric-core', latin: 'Nucleus aethericus' },
    { number: '5', part: 'ethereal-gland', latin: 'Glandula aetheris' },
    { number: '6', part: 'focus-gems', latin: 'Gemmae cogitationis' },
    { number: '8', part: 'sinus', latin: 'Sinus incantatorius' },
    { number: '14', part: 'lexicon', latin: 'Lamellae lexicales' },
    { number: '15', part: 'heart', latin: 'Cor aethericum' },
    { number: '16', part: 'cochlea', latin: 'Cochlea arcana' },
    { number: '17', part: 'ganglia', latin: 'Ganglia arcana' },
    { number: '18', part: 'beard-roots', latin: 'Radix barbae' },
  ];

export function GlowKey() {
  const colours = usePlateStore((state) => state.partColours);
  const { setHighlight } = usePlateStore.getState();

  return (
    <aside className={styles.inset} data-plate-inset aria-label="Key of lights">
      <h2 className={styles.title}>Clavis luminum</h2>
      <ul className={styles.rows}>
        {ROWS.map((row) => (
          <li
            key={row.part}
            className={styles.row}
            style={{ '--glow': colours[row.part] ?? 'transparent' } as React.CSSProperties}
            onPointerEnter={() => {
              setHighlight(row.part);
            }}
            onPointerLeave={() => {
              setHighlight(null);
            }}
          >
            <span className={styles.swatch} aria-hidden="true" />
            <span className={styles.number}>{row.number}</span>
            <span className={styles.latin}>{row.latin}</span>
          </li>
        ))}
      </ul>
      <div className={styles.scale} aria-hidden="true">
        <svg viewBox="0 0 120 14" className={styles.ruler}>
          <path d="M0.5,2V12M30,7V12M60,2V12M90,7V12M119.5,2V12M0.5,12H119.5" />
          <path d="M0.5,12H60" className={styles.filled} />
        </svg>
        <span>Scala · II palmi</span>
      </div>
      <CipherNote latin="Mana per vasa fluit, cor aethericum pulsat." className={styles.note} />
    </aside>
  );
}
