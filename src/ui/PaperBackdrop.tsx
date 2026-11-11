/**
 * Stand-in paper background in plain CSS. Replaced by the procedural paper
 * effect in the render pipeline (M1), which also tints the model.
 */
import styles from './PaperBackdrop.module.css';

export function PaperBackdrop() {
  return <div className={styles.paper} aria-hidden="true" />;
}
