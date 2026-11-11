/**
 * The plate's printed double rule, drawn over the scene.
 */
import styles from './PlateBorder.module.css';

export function PlateBorder() {
  return <div className={styles.border} aria-hidden="true" />;
}
