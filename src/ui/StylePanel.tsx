/**
 * Development only: compares the candidate looks (config/looks.ts) and toggles
 * the optional effects (config/fx.ts) before one combination is chosen to ship.
 * Top centre. V steps through the looks; `?look=<id>&fx=<id>,<id>` opens a
 * combination directly and is kept in the URL, so tabs can hold different ones
 * side by side. Also sets `data-look` on the root element so the DOM chrome
 * follows (styles/tokens.css).
 */
import { useEffect } from 'react';

import { FX, FX_IDS, type FxModes, isFxId } from '../config/fx.ts';
import { LOOK_IDS, LOOKS, isLookId } from '../config/looks.ts';
import { usePlateStore } from '../state/plate-store.ts';
import styles from './StylePanel.module.css';

// Read once at load: the effect below rewrites the URL as the choice changes.
const PARAMS = new URLSearchParams(window.location.search);
const REQUESTED_LOOK = PARAMS.get('look');
const REQUESTED_FX = (PARAMS.get('fx') ?? '').split(',').filter(isFxId);

export function StylePanel() {
  const look = usePlateStore((state) => state.look);
  const fx = usePlateStore((state) => state.fx);
  const { setLook, toggleFx } = usePlateStore.getState();

  useEffect(() => {
    const { setLook: set, setFx } = usePlateStore.getState();
    if (isLookId(REQUESTED_LOOK)) set(REQUESTED_LOOK);
    setFx(Object.fromEntries(FX_IDS.map((id) => [id, REQUESTED_FX.includes(id)])) as FxModes);

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
    const url = new URL(window.location.href);
    url.searchParams.set('look', look);
    const on = FX_IDS.filter((id) => fx[id]);
    if (on.length > 0) url.searchParams.set('fx', on.join(','));
    else url.searchParams.delete('fx');
    window.history.replaceState(null, '', url);
  }, [look, fx]);

  return (
    <nav className={styles.panel} aria-label="Looks and effects (development)">
      <div className={styles.row}>
        {LOOK_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.option}
            aria-pressed={id === look}
            onClick={() => {
              setLook(id);
            }}
            title="Compare looks (V)"
          >
            {LOOKS[id].label}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        {FX_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.option}
            aria-pressed={fx[id]}
            onClick={() => {
              toggleFx(id);
            }}
            title="Toggle this effect"
          >
            {fx[id] ? '● ' : '○ '}
            {FX[id].label}
          </button>
        ))}
      </div>
    </nav>
  );
}
