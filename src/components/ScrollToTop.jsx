import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Every time the user opens a different page, start at the very top of it
// (instantly — no fast scrolling animation). Back/forward keeps the browser's
// own behaviour for a natural feel.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
