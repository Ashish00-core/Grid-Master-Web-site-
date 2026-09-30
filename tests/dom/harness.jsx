/**
 * Browser entry used by the DOM integration test.
 * It mounts the real application (the same App component the website ships)
 * inside a jsdom document so the booking flow can be exercised end to end.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';

export function mountApp(container, path = '/') {
  const root = createRoot(container);
  root.render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return root;
}

export { React };
