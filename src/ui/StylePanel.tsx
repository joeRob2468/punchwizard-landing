/**
 * Development only: switches the post effects (config/fx.ts) off and on to
 * compare. Top centre. `?look=<id>&fx=<id>,<id>` opens a view and set of effects
 * directly and is kept in the URL, so tabs can hold different ones side by side.
 */
import { useEffect } from 'react';

import { FX, FX_IDS, type FxModes, isFxId } from '../config/fx.ts';
import { isLookId } from '../config/looks.ts';
import { usePlateStore } from '../state/plate-store.ts';
import styles from './StylePanel.module.css';

// Read once at load: the effect below rewrites the URL as the choice changes.
const PARAMS = new URLSearchParams(window.location.search);
const REQUESTED_LOOK = PARAMS.get('look');
const REQUESTED_FX = PARAMS.get('fx');

export function StylePanel() {
  const look = usePlateStore((state) => state.look);
  const fx = usePlateStore((state) => state.fx);
  const { toggleFx } = usePlateStore.getState();

  useEffect(() => {
    const { setLook, setFx } = usePlateStore.getState();
    if (isLookId(REQUESTED_LOOK)) setLook(REQUESTED_LOOK);
    if (REQUESTED_FX !== null) {
      const on = REQUESTED_FX.split(',').filter(isFxId);
      setFx(Object.fromEntries(FX_IDS.map((id) => [id, on.includes(id)])) as FxModes);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('look', look);
    url.searchParams.set('fx', FX_IDS.filter((id) => fx[id]).join(','));
    window.history.replaceState(null, '', url);
  }, [look, fx]);

  return (
    <nav className={styles.panel} aria-label="Effects (development)">
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
