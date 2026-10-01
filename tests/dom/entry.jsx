/**
 * Browser-side entry for the DOM integration test.
 *
 * esbuild bundles this file (JSX + ESM + node_modules) into a single module the
 * test can import after a jsdom environment is in place.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';

export function renderApp(container, { route = '/' } = {}) {
  const root = createRoot(container);
  root.render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
  return root;
}

export { React };
