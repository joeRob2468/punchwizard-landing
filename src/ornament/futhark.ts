/**
 * The Elder Futhark: the 24 runes as straight strokes (they were carved), on a
 * grid 4 wide and 8 tall with y up, plus a Latin transliteration and helpers that
 * draw a rune as an SVG path or onto a canvas. Every rune on the plate (the rune
 * circles, the scrying cut, the border, the cipher notes) comes from here.
 */

type Point = readonly [number, number];
type Stroke = readonly Point[];

export interface Rune {
  readonly name: string;
  /** Polylines on a 4 × 8 grid, y up. */
  readonly strokes: readonly Stroke[];
}

const STAVE: Stroke = [
  [1, 0],
  [1, 8],
];
const MID: Stroke = [
  [2, 0],
  [2, 8],
];
const LEFT: Stroke = [
  [0.5, 0],
  [0.5, 8],
];
const RIGHT: Stroke = [
  [3.5, 0],
  [3.5, 8],
];

export const RUNES: readonly Rune[] = [
  {
    name: 'fehu',
    strokes: [
      STAVE,
      [
        [1, 6],
        [3.5, 8],
      ],
      [
        [1, 3.5],
        [3.5, 6],
      ],
    ],
  },
  {
    name: 'uruz',
    strokes: [
      STAVE,
      [
        [1, 8],
        [3.5, 6],
        [3.5, 0],
      ],
    ],
  },
  {
    name: 'thurisaz',
    strokes: [
      STAVE,
      [
        [1, 6],
        [3, 4],
        [1, 2],
      ],
    ],
  },
  {
    name: 'ansuz',
    strokes: [
      STAVE,
      [
        [1, 8],
        [3.5, 6],
      ],
      [
        [1, 5.5],
        [3.5, 3.5],
      ],
    ],
  },
  {
    name: 'raidho',
    strokes: [
      STAVE,
      [
        [1, 8],
        [3.5, 6.3],
        [1, 4.5],
        [3.5, 0],
      ],
    ],
  },
  {
    name: 'kaunan',
    strokes: [
      [
        [3.5, 7],
        [1, 4],
        [3.5, 1],
      ],
    ],
  },
  {
    name: 'gebo',
    strokes: [
      [
        [0.5, 8],
        [3.5, 0],
      ],
      [
        [3.5, 8],
        [0.5, 0],
      ],
    ],
  },
  {
    name: 'wunjo',
    strokes: [
      STAVE,
      [
        [1, 8],
        [3.5, 6.5],
        [1, 5],
      ],
    ],
  },
  {
    name: 'hagalaz',
    strokes: [
      LEFT,
      RIGHT,
      [
        [0.5, 5],
        [3.5, 3],
      ],
    ],
  },
  {
    name: 'naudiz',
    strokes: [
      MID,
      [
        [0.5, 5],
        [3.5, 3],
      ],
    ],
  },
  { name: 'isaz', strokes: [MID] },
  {
    name: 'jera',
    strokes: [
      [
        [1.8, 7],
        [0.3, 5],
        [1.8, 3],
      ],
      [
        [2.2, 5],
        [3.7, 3],
        [2.2, 1],
      ],
    ],
  },
  {
    name: 'eihwaz',
    strokes: [
      MID,
      [
        [2, 8],
        [3.5, 6.5],
      ],
      [
        [2, 0],
        [0.5, 1.5],
      ],
    ],
  },
  {
    name: 'perthro',
    strokes: [
      STAVE,
      [
        [1, 8],
        [3.5, 6.5],
        [3.5, 5.5],
      ],
      [
        [1, 0],
        [3.5, 1.5],
        [3.5, 2.5],
      ],
    ],
  },
  {
    name: 'algiz',
    strokes: [
      MID,
      [
        [2, 4.5],
        [0.5, 7.5],
      ],
      [
        [2, 4.5],
        [3.5, 7.5],
      ],
    ],
  },
  {
    name: 'sowilo',
    strokes: [
      [
        [3, 8],
        [1, 5.5],
        [3, 2.5],
        [1, 0],
      ],
    ],
  },
  {
    name: 'tiwaz',
    strokes: [
      MID,
      [
        [0.5, 6],
        [2, 8],
        [3.5, 6],
      ],
    ],
  },
  {
    name: 'berkanan',
    strokes: [
      STAVE,
      [
        [1, 8],
        [3.5, 6],
        [1, 4],
        [3.5, 2],
        [1, 0],
      ],
    ],
  },
  {
    name: 'ehwaz',
    strokes: [
      LEFT,
      RIGHT,
      [
        [0.5, 8],
        [2, 6],
        [3.5, 8],
      ],
    ],
  },
  {
    name: 'mannaz',
    strokes: [
      LEFT,
      RIGHT,
      [
        [0.5, 8],
        [3.5, 4.5],
      ],
      [
        [3.5, 8],
        [0.5, 4.5],
      ],
    ],
  },
  {
    name: 'laguz',
    strokes: [
      STAVE,
      [
        [1, 8],
        [3.5, 6],
      ],
    ],
  },
  {
    name: 'ingwaz',
    strokes: [
      [
        [2, 6.5],
        [3.5, 4],
        [2, 1.5],
        [0.5, 4],
        [2, 6.5],
      ],
    ],
  },
  {
    name: 'dagaz',
    strokes: [
      LEFT,
      RIGHT,
      [
        [0.5, 8],
        [3.5, 0],
      ],
      [
        [0.5, 0],
        [3.5, 8],
      ],
    ],
  },
  {
    name: 'othala',
    strokes: [
      [
        [2, 8],
        [3.5, 6.3],
        [0.5, 1],
      ],
      [
        [2, 8],
        [0.5, 6.3],
        [3.5, 1],
      ],
    ],
  },
];

const BY_NAME = new Map(RUNES.map((rune) => [rune.name, rune]));

/** The rune each Latin letter is written with (letters with no rune borrow a near one). */
const LETTERS: Readonly<Record<string, string>> = {
  a: 'ansuz',
  b: 'berkanan',
  c: 'kaunan',
  d: 'dagaz',
  e: 'ehwaz',
  f: 'fehu',
  g: 'gebo',
  h: 'hagalaz',
  i: 'isaz',
  j: 'jera',
  k: 'kaunan',
  l: 'laguz',
  m: 'mannaz',
  n: 'naudiz',
  o: 'othala',
  p: 'perthro',
  q: 'kaunan',
  r: 'raidho',
  s: 'sowilo',
  t: 'tiwaz',
  u: 'uruz',
  v: 'wunjo',
  w: 'wunjo',
  x: 'kaunan',
  y: 'jera',
  z: 'algiz',
};

/** Latin text as runes; anything without a rune (spaces, punctuation) is null. */
export function transliterate(text: string): (Rune | null)[] {
  // Plain Latin letters only, so code units are fine.
  return Array.from({ length: text.length }, (_, i) => text.charAt(i).toLowerCase()).map((ch) => {
    const name = LETTERS[ch];
    return name ? (BY_NAME.get(name) ?? null) : null;
  });
}

/**
 * A rune as SVG path data, `height` tall with its baseline at `y` and its left
 * edge at `x` (SVG's y points down). Width is half the height.
 */
export function runePath(rune: Rune, x: number, y: number, height: number): string {
  const s = height / 8;
  return rune.strokes
    .map((stroke) =>
      stroke
        .map(
          ([px, py], i) =>
            `${i === 0 ? 'M' : 'L'}${(x + px * s).toFixed(2)},${(y - py * s).toFixed(2)}`,
        )
        .join(''),
    )
    .join('');
}

/** Strokes a rune onto a canvas, centred on the origin, `height` tall, y down. */
export function strokeRune(ctx: CanvasRenderingContext2D, rune: Rune, height: number): void {
  const s = height / 8;
  ctx.beginPath();
  for (const stroke of rune.strokes) {
    stroke.forEach(([px, py], i) => {
      const x = (px - 2) * s;
      const y = (4 - py) * s;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
  }
  ctx.stroke();
}
