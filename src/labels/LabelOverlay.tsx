/**
 * The anatomy labels: numbered names in the margins joined to the specimen by
 * ink leader lines, each with a tooltip (Latin name and lore) on hover, focus or
 * click. Positions arrive every frame through the LabelChannel and are written
 * straight to the DOM; React renders the elements once.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { ANATOMY } from '../anatomy/registry.ts';
import { usePlateStore } from '../state/plate-store.ts';
import type { LabelChannel } from './label-channel.ts';
import { layoutLabels, type LayoutInput } from './layout.ts';
import styles from './LabelOverlay.module.css';

/** Below this width labels show their number only. */
const COMPACT_WIDTH = 720;
const ROW_HEIGHT = 30;
const COMPACT_ROW_HEIGHT = 26;
/** Room kept clear (px) above the bottom controls: the cut control and views on the
 * right; on compact screens they stack a row higher, and the presets sit under the
 * left column. */
const CONTROLS_RIGHT = 60;
const COMPACT_CONTROLS_RIGHT = 130;
const COMPACT_CONTROLS_LEFT = 50;
/** Below this share of the height, a label's tooltip opens upward. */
const TOOLTIP_FLIP = 0.55;
/** Gap between a label and the start of its leader line. */
const LEADER_GAP = 8;

interface LabelOverlayProps {
  readonly channel: LabelChannel;
}

export function LabelOverlay({ channel }: LabelOverlayProps) {
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  const leaders = useRef<(SVGPathElement | null)[]>([]);
  const casings = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  useEffect(() => {
    let headerBottom = 0;
    let insetBottom = 0;
    const measure = () => {
      headerBottom =
        document.querySelector('[data-plate-header]')?.getBoundingClientRect().bottom ?? 0;
      // The inset study (top right) is hidden on small screens: then it has no box.
      insetBottom =
        document.querySelector('[data-plate-inset]')?.getBoundingClientRect().bottom ?? 0;
    };
    measure();
    window.addEventListener('resize', measure);
    // What was last written to each label's elements.
    const written: { side: string; tip: string; transform: string; path: string }[] = [];

    const unsubscribe = channel.subscribe(() => {
      const { width, height } = channel;
      const compact = width < COMPACT_WIDTH;
      root.current?.toggleAttribute('data-compact', compact);

      const items: LayoutInput[] = [];
      channel.samples.forEach((sample, index) => {
        if (sample.visible) items.push({ index, x: sample.x, y: sample.y });
      });
      const margin = Math.max(28, Math.min(width, height) * 0.06);
      const placed = layoutLabels(items, {
        splitX: channel.centreX,
        rowHeight: compact ? COMPACT_ROW_HEIGHT : ROW_HEIGHT,
        left: {
          edge: compact ? margin + 18 : Math.max(margin + 150, width * 0.24),
          top: Math.max(margin, headerBottom + 24),
          // Compact: the column shares its x with the layer presets below it.
          bottom: height - margin - (compact ? COMPACT_CONTROLS_LEFT : 0),
        },
        right: {
          edge: compact ? width - margin - 18 : Math.min(width - margin - 150, width * 0.76),
          top: Math.max(margin + 12, insetBottom + 20),
          bottom: height - margin - (compact ? COMPACT_CONTROLS_RIGHT : CONTROLS_RIGHT),
        },
      });
      const placedByIndex = new Map(placed.map((p) => [p.index, p]));

      ANATOMY.forEach((_, index) => {
        const label = labels.current[index];
        const leader = leaders.current[index];
        const casing = casings.current[index];
        const dot = dots.current[index];
        const sample = channel.samples[index];
        const place = placedByIndex.get(index);
        if (!label || !leader || !dot || !sample) return;

        const visible = place !== undefined;
        if (label.dataset.visible !== String(visible)) {
          label.dataset.visible = String(visible);
          label.tabIndex = visible ? 0 : -1;
          label.setAttribute('aria-hidden', String(!visible));
          leader.dataset.visible = String(visible);
          if (casing) casing.dataset.visible = String(visible);
          dot.dataset.visible = String(visible);
        }
        if (!place) return;

        // Only touch what changed: a still camera then costs no DOM work at all, and
        // labels move by transform, which skips layout.
        const last =
          written[index] ?? (written[index] = { side: '', tip: '', transform: '', path: '' });
        if (last.side !== place.side) {
          last.side = place.side;
          label.dataset.side = place.side;
        }
        // Labels low on the screen open their tooltip upward, so it stays on screen.
        const tip = place.y > height * TOOLTIP_FLIP ? 'above' : 'below';
        if (last.tip !== tip) {
          last.tip = tip;
          label.dataset.tip = tip;
        }
        const shiftX = place.side === 'left' ? '-100%' : '0';
        const transform = `translate(${place.x.toFixed(1)}px,${place.y.toFixed(1)}px) translate(${shiftX},-50%)`;
        if (last.transform !== transform) {
          last.transform = transform;
          label.style.transform = transform;
        }

        const sx = place.side === 'left' ? place.x + LEADER_GAP : place.x - LEADER_GAP;
        const dx = sample.x - sx;
        const wobble = ((index * 37) % 11) - 5;
        const path = `M${sx.toFixed(1)},${place.y.toFixed(1)} C${(sx + dx * 0.45).toFixed(1)},${(place.y + wobble).toFixed(1)} ${(sample.x - dx * 0.25).toFixed(1)},${sample.y.toFixed(1)} ${sample.x.toFixed(1)},${sample.y.toFixed(1)}`;
        if (last.path !== path) {
          last.path = path;
          leader.setAttribute('d', path);
          casing?.setAttribute('d', path);
          dot.setAttribute('cx', sample.x.toFixed(1));
          dot.setAttribute('cy', sample.y.toFixed(1));
        }
      });
    });
    return () => {
      unsubscribe();
      window.removeEventListener('resize', measure);
    };
  }, [channel]);

  // Escape or a press anywhere else un-pins.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(`.${styles.label}`)) {
        setPinned(null);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [pinned]);

  // The hovered (or focused) label, else the pinned one, makes its part flare and
  // its leader glow in the part's colour.
  const hovered = useRef<number | null>(null);
  const highlight = useCallback((pinnedId: string | null) => {
    const pinnedIndex = ANATOMY.findIndex((entry) => entry.id === pinnedId);
    const index = hovered.current ?? (pinnedIndex >= 0 ? pinnedIndex : null);
    const { setHighlight, partColours } = usePlateStore.getState();
    setHighlight(index === null ? null : (ANATOMY[index]?.part ?? null));
    ANATOMY.forEach((entry, i) => {
      const active = i === index;
      const colour = active ? partColours[entry.part] : undefined;
      for (const el of [leaders.current[i], dots.current[i], labels.current[i]]) {
        if (el !== labels.current[i]) el?.toggleAttribute('data-active', active);
        if (colour) el?.style.setProperty('--glow', colour);
        else el?.style.removeProperty('--glow');
      }
    });
  }, []);
  useEffect(() => {
    highlight(pinned);
  }, [highlight, pinned]);

  const setActive = (index: number, active: boolean) => {
    if (active) hovered.current = index;
    else if (hovered.current === index) hovered.current = null;
    highlight(pinned);
  };

  return (
    <div ref={root} className={styles.labels}>
      <svg className={styles.leaders} aria-hidden="true">
        {ANATOMY.map((entry, index) => (
          <g key={entry.id}>
            {/* A dark casing under each leader keeps it legible over the model. */}
            <path
              ref={(el) => {
                casings.current[index] = el;
              }}
              className={styles.casing}
              data-visible="false"
            />
            <path
              ref={(el) => {
                leaders.current[index] = el;
              }}
              className={styles.leader}
              data-visible="false"
            />
            <circle
              ref={(el) => {
                dots.current[index] = el;
              }}
              className={styles.dot}
              r={2.2}
              data-visible="false"
            />
          </g>
        ))}
      </svg>
      {ANATOMY.map((entry, index) => {
        const tooltipId = `anatomy-${entry.id}`;
        return (
          <button
            key={entry.id}
            ref={(el) => {
              labels.current[index] = el;
            }}
            type="button"
            className={styles.label}
            data-visible="false"
            data-pinned={pinned === entry.id ? '' : undefined}
            tabIndex={-1}
            aria-hidden="true"
            aria-describedby={tooltipId}
            aria-pressed={pinned === entry.id}
            onClick={() => {
              setPinned((current) => (current === entry.id ? null : entry.id));
            }}
            onPointerEnter={() => {
              setActive(index, true);
            }}
            onPointerLeave={() => {
              setActive(index, false);
            }}
            onFocus={() => {
              setActive(index, true);
            }}
            onBlur={() => {
              setActive(index, false);
            }}
          >
            <span className={styles.number}>{entry.number}</span>
            <span className={styles.name}>{entry.name}</span>
            <span id={tooltipId} role="tooltip" className={styles.tooltip}>
              <span className={styles.tooltipName}>{entry.name}</span>
              <span className={styles.latin}>{entry.latin}</span>
              <span className={styles.description}>{entry.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
