/**
 * The scene's empty ground: white under pigment (the paper effect multiplies the
 * scene onto paper) or black under light on a dark ground (screened onto it).
 */
import { LOOKS } from '../config/looks.ts';
import { usePlateStore } from '../state/plate-store.ts';

export function Ground() {
  const dark = LOOKS[usePlateStore((state) => state.look)].ground === 'dark';
  return <color attach="background" args={[dark ? '#000000' : '#ffffff']} />;
}
