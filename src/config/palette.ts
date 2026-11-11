/**
 * Plate palette for shaders and materials. Mirrors the CSS custom properties in
 * src/styles/tokens.css so DOM and WebGL colours match.
 */
export const PALETTE = {
  paper: '#efe4cc',
  paperShadow: '#d9c7a3',
  ink: '#3b2a1a',
  washFlesh: '#e8b9a0',
  washMuscle: '#b9504a',
  washBone: '#efe6cf',
  washBrain: '#c9a3a0',
  washOchre: '#c99a4a',
  washVerdigris: '#6f9a86',
  washVein: '#4f6f9a',
  arcaneMana: '#4fc3c9',
  arcaneGarnet: '#9b2335',
} as const;

export type PaletteKey = keyof typeof PALETTE;
