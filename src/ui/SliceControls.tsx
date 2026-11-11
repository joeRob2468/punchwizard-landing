/**
 * The plate's only controls: the current section (click to change the plane)
 * and a reset mark. Small, ink-coloured and tucked into the bottom-right corner.
 */
import { SLICE } from '../config/slice.ts';
import { usePlateStore } from '../state/plate-store.ts';
import styles from './SliceControls.module.css';

export function SliceControls() {
  const axis = usePlateStore((state) => state.slice.axis);
  const { cycleSliceAxis, resetView } = usePlateStore.getState();

  return (
    <nav className={styles.controls} aria-label="Plate controls">
      <button
        type="button"
        className={styles.control}
        onClick={cycleSliceAxis}
        title="Change the section plane (S)"
      >
        <span aria-hidden="true" className={styles.glyph}>
          ⊘
        </span>
        <span>{SLICE.axes[axis].label}</span>
      </button>
      <button
        type="button"
        className={styles.control}
        onClick={resetView}
        title="Reset the view (R)"
        aria-label="Reset the view"
      >
        <span aria-hidden="true" className={styles.glyph}>
          ↺
        </span>
      </button>
    </nav>
  );
}
