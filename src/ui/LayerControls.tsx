/**
 * Layer controls, bottom left: a preset row (everything, the bones, the viscera,
 * the arcana) and each layer's on/off switch, then one see-through switch: layers
 * that are off show see-through when it's on, and not at all when it's off.
 * L steps through the presets; T toggles see-through.
 */
import { useEffect } from 'react';

import { isPresetActive, LAYER_PRESETS, VIEWABLE_LAYERS } from '../config/layers.ts';
import { usePlateStore } from '../state/plate-store.ts';
import styles from './LayerControls.module.css';

export function LayerControls() {
  const layersOn = usePlateStore((state) => state.layersOn);
  const seeThrough = usePlateStore((state) => state.seeThrough);
  const { toggleLayer, toggleSeeThrough, applyPreset } = usePlateStore.getState();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === 'l') usePlateStore.getState().cycleLayerPreset();
      else if (key === 't') usePlateStore.getState().toggleSeeThrough();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <nav className={styles.controls} aria-label="Layers">
      <div className={styles.row}>
        {LAYER_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={styles.preset}
            aria-pressed={isPresetActive(preset, layersOn)}
            onClick={() => {
              applyPreset(preset);
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
            aria-pressed={layersOn[id]}
            onClick={() => {
              toggleLayer(id);
            }}
            title={`${label}: ${layersOn[id] ? 'shown' : 'hidden'} (click to change)`}
          >
            <span aria-hidden="true" className={styles.mark}>
              {layersOn[id] ? '●' : '○'}
            </span>
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className={styles.seeThrough}
          aria-pressed={seeThrough}
          onClick={toggleSeeThrough}
          title="Show the layers that are off as see-through (T)"
        >
          <span aria-hidden="true" className={styles.mark}>
            {seeThrough ? '●' : '○'}
          </span>
          <span>Perspicua</span>
        </button>
      </div>
    </nav>
  );
}
