/**
 * The plate's title block: species name, vernacular name and a short
 * Hudspeth-style taxonomy.
 */
import styles from './PlateHeader.module.css';

const TAXONOMY: readonly (readonly [rank: string, name: string])[] = [
  ['Regnum', 'Animalia'],
  ['Ordo', 'Thaumaturgi'],
  ['Familia', 'Magidae'],
  ['Genus', 'Pugnomagus'],
  ['Species', 'P. pileatus'],
];

export function PlateHeader() {
  return (
    <header className={styles.header}>
      <h1 className={styles.species}>Pugnomagus pileatus</h1>
      <p className={styles.vernacular}>The Common Punchwizard</p>
      <p className={styles.subtitle}>Sectio capitis et humerorum</p>
      <dl className={styles.taxonomy}>
        {TAXONOMY.map(([rank, name]) => (
          <div key={rank} className={styles.rank}>
            <dt>{rank}</dt>
            <dd>{name}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
