/**
 * Paper in plain CSS, for the no-WebGL fallback. With WebGL the paper effect draws
 * the paper instead.
 */
import styles from './PaperBackdrop.module.css';

export function PaperBackdrop() {
  return <div className={styles.paper} aria-hidden="true" />;
}
