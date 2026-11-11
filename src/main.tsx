/**
 * Entry point: mounts the plate, or a static fallback when WebGL is unavailable.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Fallback } from './ui/Fallback.tsx';
import './styles/global.css';

function hasWebGL2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    // Some locked-down browsers throw instead of returning null.
    return false;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    {hasWebGL2() ? (
      <ErrorBoundary fallback={<Fallback />}>
        <App />
      </ErrorBoundary>
    ) : (
      <Fallback />
    )}
  </StrictMode>,
);
