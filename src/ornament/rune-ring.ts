/**
 * Draws rune rings onto canvases (white on transparent), for the rune circles in
 * the scene: concentric circles, bands of runes spelling a Latin phrase in the
 * Elder Futhark, tick marks like a dial, and optionally a valknut at the centre.
 */
import { type Rune, RUNES, strokeRune, transliterate } from './futhark.ts';

export interface RuneBand {
  /** Inner and outer radius as fractions of the canvas's half-width. */
  readonly inner: number;
  readonly outer: number;
  /** Repeated around the band; words are separated by a small cross. */
  readonly text: string;
}

export interface RingDesign {
  /** Radii (fractions of the half-width) of plain circles. */
  readonly circles: readonly number[];
  readonly bands: readonly RuneBand[];
  /** Tick marks between two radii: a short tick every 5°, a long one every 30°. */
  readonly ticks?: { readonly inner: number; readonly outer: number };
  /** Radius of a valknut (three interlocked triangles) at the centre, if any. */
  readonly valknut?: number;
}

/** A canvas `size` pixels square with the ring drawn on it. */
export function drawRuneRing(size: number, design: RingDesign): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2D canvas');
  const half = size / 2;
  ctx.translate(half, half);
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.lineWidth = size / 900;
  for (const r of design.circles) {
    ctx.beginPath();
    ctx.arc(0, 0, r * half, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (design.ticks) {
    const { inner, outer } = design.ticks;
    for (let deg = 0; deg < 360; deg += 5) {
      const long = deg % 30 === 0;
      const a = (deg * Math.PI) / 180;
      const r0 = (long ? inner : outer - (outer - inner) * 0.45) * half;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * outer * half, Math.sin(a) * outer * half);
      ctx.stroke();
    }
  }

  for (const band of design.bands) drawBand(ctx, band, half, size);

  if (design.valknut) drawValknut(ctx, design.valknut * half, size);
  return canvas;
}

function drawBand(ctx: CanvasRenderingContext2D, band: RuneBand, half: number, size: number) {
  const height = (band.outer - band.inner) * half * 0.72;
  const radius = ((band.inner + band.outer) / 2) * half;
  // Each rune and separator takes the same arc; fill the circle with whole repeats.
  const glyphs: (Rune | null)[] = transliterate(band.text);
  glyphs.push(null);
  const pitch = height * 0.85;
  const perCircle = Math.max(glyphs.length, Math.floor((Math.PI * 2 * radius) / pitch));
  const repeats = Math.max(1, Math.round(perCircle / glyphs.length));
  const total = glyphs.length * repeats;
  ctx.lineWidth = size / 700;
  for (let i = 0; i < total; i++) {
    const glyph = glyphs[i % glyphs.length] ?? null;
    const angle = (i / total) * Math.PI * 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0, -radius);
    if (glyph) strokeRune(ctx, glyph, height);
    else {
      // A small cross between words.
      const c = height * 0.12;
      ctx.beginPath();
      ctx.moveTo(-c, 0);
      ctx.lineTo(c, 0);
      ctx.moveTo(0, -c);
      ctx.lineTo(0, c);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Three interlocked triangles, the valknut. */
function drawValknut(ctx: CanvasRenderingContext2D, radius: number, size: number) {
  ctx.lineWidth = size / 500;
  for (let k = 0; k < 3; k++) {
    const offset = (k / 3) * Math.PI * 2;
    const cx = Math.cos(offset - Math.PI / 2) * radius * 0.28;
    const cy = Math.sin(offset - Math.PI / 2) * radius * 0.28;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * radius * 0.62;
      const y = cy + Math.sin(a) * radius * 0.62;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/**
 * A tileable canvas of runes in rows (white on transparent), each a random rune,
 * for faint writing that drifts across the cut faces.
 */
export function drawRuneTile(size: number, rows: number, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2D canvas');
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size / 400;
  const pitch = size / rows;
  const height = pitch * 0.55;
  const perRow = Math.floor(size / (height * 0.9));
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < perRow; i++) {
      if (random() < 0.18) continue; // gaps between words
      const rune = RUNES[Math.floor(random() * RUNES.length)];
      if (!rune) continue;
      ctx.save();
      ctx.translate((i + 0.5) * (size / perRow), (row + 0.5) * pitch);
      strokeRune(ctx, rune, height);
      ctx.restore();
    }
  }
  return canvas;
}
