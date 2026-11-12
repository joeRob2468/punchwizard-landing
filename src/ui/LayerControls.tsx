/**
 * Layer controls, bottom left: a preset row (everything, the bones, the viscera)
 * and each layer on its own, which cycles shown → ghost (see-through) → hidden.
 * The L key steps through the presets.
 */
import { useEffect } from 'react';

import { LAYER_PRESETS, VIEWABLE_LAYERS, type LayerMode } from '../config/layers.ts';
import { usePlateStore } from '../state/plate-store.ts';
import styles from './LayerControls.module.css';

/** Ink marks for each mode: a full, half and empty circle. */
const MARK: Readonly<Record<LayerMode, string>> = { shown: '●', ghost: '◐', hidden: '○' };
const SAID: Readonly<Record<LayerMode, string>> = {
  shown: 'shown',
  ghost: 'see-through',
  hidden: 'hidden',
};

export function LayerControls() {
  const layers = usePlateStore((state) => state.layers);
  const { cycleLayer, setLayers } = usePlateStore.getState();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey) return;
      if (event.key === 'l' || event.key === 'L') usePlateStore.getState().cycleLayerPreset();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const activePreset = LAYER_PRESETS.find((preset) =>
    VIEWABLE_LAYERS.every(({ id }) => preset.modes[id] === layers[id]),
  );

  return (
    <nav className={styles.controls} aria-label="Layers">
      <div className={styles.row}>
        {LAYER_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={styles.preset}
            aria-pressed={activePreset === preset}
            onClick={() => {
              setLayers(preset.modes);
            }}
            title="Show a set of layers (L)"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        {VIEWABLE_LAYERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={styles.layer}
            data-mode={layers[id]}
            onClick={() => {
              cycleLayer(id);
            }}
            title={`${label}: ${SAID[layers[id]]} (click to change)`}
            aria-label={`${label}, ${SAID[layers[id]]}`}
          >
            <span aria-hidden="true" className={styles.mark}>
              {MARK[layers[id]]}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
