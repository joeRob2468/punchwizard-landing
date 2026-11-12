/**
 * The default view's palette (Deyrolle washes on ink-black paper) for shaders and
 * materials. Mirrors the CSS custom properties in src/styles/tokens.css so DOM and
 * WebGL colours match. Other views (config/looks.ts) have their own palettes.
 */
export const PALETTE = {
  paper: '#17181c',
  paperShadow: '#09090b',
  foxing: '#2b2620',
  ink: '#0b0b0d',
  washFlesh: '#c48476',
  washMuscle: '#8d2b22',
  washBone: '#b5a98c',
  washBrain: '#a1696c',
  washOchre: '#a8751c',
  washVerdigris: '#44856a',
  washVein: '#35589b',
  washUmber: '#744d2e',
  washPlum: '#684374',
  washCartilage: '#819c9c',
  washCsf: '#98b3b9',
  arcaneMana: '#5fe0e6',
  arcaneGarnet: '#c0304a',
  // Glows of the magical organs, one hue each; shared by every view.
  arcaneViolet: '#b06cff',
  arcaneRose: '#ff3d7a',
  arcaneLime: '#a4ff4f',
  arcaneMagenta: '#ff4fd8',
  arcaneGold: '#ffc53d',
  arcaneSapphire: '#4a74ff',
  arcaneEmerald: '#2effa6',
  arcaneLumen: '#fff1c2',
  arcaneEmber: '#ff6a2a',
} as const;

export type PaletteKey = keyof typeof PALETTE;
