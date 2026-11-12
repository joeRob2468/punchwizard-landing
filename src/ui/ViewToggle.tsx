/**
 * Switches between the plate's views (config/looks.ts): the illustration and the
 * MRI scan. Bottom right, above the section controls; the V key steps through
 * them. Sets `data-look` on the root element so the DOM chrome follows
 * (styles/tokens.css).
 */
import { useEffect } from 'react';

import { LOOK_IDS, LOOKS } from '../config/looks.ts';
import { usePlateStore } from '../state/plate-store.ts';
import styles from './ViewToggle.module.css';

export function ViewToggle() {
  const look = usePlateStore((state) => state.look);
  const { setLook } = usePlateStore.getState();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey) return;
      if (event.key !== 'v' && event.key !== 'V') return;
      const { look: current, setLook: next } = usePlateStore.getState();
      const id = LOOK_IDS[(LOOK_IDS.indexOf(current) + 1) % LOOK_IDS.length];
      if (id) next(id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.look = look;
  }, [look]);

  return (
    <nav className={styles.views} aria-label="Views">
      {LOOK_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={styles.view}
          aria-pressed={id === look}
          onClick={() => {
            setLook(id);
          }}
          title="Change the view (V)"
        >
          {LOOKS[id].label}
        </button>
      ))}
    </nav>
  );
}
