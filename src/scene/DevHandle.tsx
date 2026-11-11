/**
 * Development only: exposes the R3F state as `window.__plate` so the scene can be
 * inspected from the browser console or DevTools scripts. Renders nothing and is
 * not mounted in production builds.
 */
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

declare global {
  interface Window {
    __plate?: unknown;
  }
}

export function DevHandle() {
  const get = useThree((state) => state.get);
  useEffect(() => {
    window.__plate = get;
    return () => {
      delete window.__plate;
    };
  }, [get]);
  return null;
}
