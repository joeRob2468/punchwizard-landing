/**
 * Development only: switches between the candidate looks (config/looks.ts) so
 * they can be compared before one is chosen to ship. Top centre; the V key steps
 * through them, and `?look=<id>` opens a look directly (kept in the URL, so tabs
 * can hold different looks side by side). Also sets `data-look` on the root
 * element so the DOM chrome follows (styles/tokens.css).
 */
import { useEffect } from 'react';

import { LOOK_IDS, LOOKS, isLookId } from '../config/looks.ts';
import { usePlateStore } from '../state/plate-store.ts';
import styles from './LookSwitcher.module.css';

// Read once at load: the effect below rewrites the URL as the look changes.
const REQUESTED = new URLSearchParams(window.location.search).get('look');

export function LookSwitcher() {
  const look = usePlateStore((state) => state.look);
  const { setLook } = usePlateStore.getState();

  useEffect(() => {
    if (isLookId(REQUESTED)) usePlateStore.getState().setLook(REQUESTED);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey) return;
      if (event.key !== 'v' && event.key !== 'V') return;
      const { look: current, setLook: set } = usePlateStore.getState();
      const next = LOOK_IDS[(LOOK_IDS.indexOf(current) + 1) % LOOK_IDS.length];
      if (next) set(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.look = look;
    const url = new URL(window.location.href);
    url.searchParams.set('look', look);
    window.history.replaceState(null, '', url);
  }, [look]);

  return (
    <nav className={styles.switcher} aria-label="Looks (development)">
      {LOOK_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={styles.look}
          aria-pressed={id === look}
          onClick={() => {
            setLook(id);
          }}
          title="Compare looks (V)"
        >
          {LOOKS[id].label}
        </button>
      ))}
    </nav>
  );
}
