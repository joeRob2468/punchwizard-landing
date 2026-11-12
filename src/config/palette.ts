/**
 * Plate palette for shaders and materials. Mirrors the CSS custom properties in
 * src/styles/tokens.css so DOM and WebGL colours match.
 */
export const PALETTE = {
  paper: '#efe4cc',
  paperShadow: '#d9c7a3',
  foxing: '#b3854f',
  ink: '#3b2a1a',
  washFlesh: '#eda98a',
  washMuscle: '#b8423a',
  washBone: '#f0e2c0',
  washBrain: '#d39a9c',
  washOchre: '#d39a3c',
  washVerdigris: '#5f9e84',
  washVein: '#3f66a8',
  washUmber: '#7a5233',
  washPlum: '#6e4a78',
  washCartilage: '#a9c4c4',
  washCsf: '#cfe2e6',
  arcaneMana: '#4fc3c9',
  arcaneGarnet: '#9b2335',
} as const;

export type PaletteKey = keyof typeof PALETTE;
