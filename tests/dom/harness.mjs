/**
 * jsdom + esbuild harness for the booking form integration test.
 *
 * esbuild (a dependency of Vite) transpiles the real `src/App.jsx` tree, jsdom
 * provides the browser globals, and every network call is intercepted so the
 * test can assert exactly what the booking form puts on the wire.
 */

import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const APP_URL = 'https://grid-master-web-site.vercel.app/';

let bundlePromise = null;

/** Bundle the real React app once per test run. */
export function buildBundle() {
  if (!bundlePromise) {
    const dir = mkdtempSync(join(tmpdir(), 'gm-dom-'));
    const outfile = join(dir, 'app.mjs');
    bundlePromise = build({
      entryPoints: ['tests/dom/entry.jsx'],
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      jsx: 'automatic',
      loader: { '.css': 'empty' },
      define: { 'process.env.NODE_ENV': '"test"' },
      logLevel: 'silent',
    }).then(() => import(pathToFileURL(outfile).href));
  }
  return bundlePromise;
}

const flush = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Boot a fresh jsdom window with the real app rendered inside it.
 * @returns {Promise<{dom: JSDOM, document: Document, mount: Function, calls: Array, setFetch: Function, flush: Function}>}
 */
export async function mountApp({ fetchImpl, route = '/' } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: APP_URL,
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // Browser globals the app touches.
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLInputElement = window.HTMLInputElement;
  globalThis.HTMLTextAreaElement = window.HTMLTextAreaElement;
  globalThis.Element = window.Element;
  globalThis.Node = window.Node;
  globalThis.Event = window.Event;
  globalThis.MouseEvent = window.MouseEvent;
  globalThis.localStorage = window.localStorage;
  globalThis.sessionStorage = window.sessionStorage;
  globalThis.Blob = window.Blob;
  globalThis.URL = window.URL;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  Object.defineProperty(globalThis, 'navigator', {
    value: window.navigator,
    configurable: true,
    writable: true,
  });

  const calls = [];
  // Default host: no MAIL_* provider configured (like the current deployment),
  // so the server relay answers 501 and the FormSubmit path is exercised.
  const defaultFetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('/')) {
      return { status: 501, ok: false, text: async () => JSON.stringify({ success: false, configured: false }) };
    }
    return {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ success: 'true', message: 'Email sent' }),
    };
  };
  globalThis.fetch = fetchImpl || defaultFetch;

  const { renderApp } = await buildBundle();
  const container = window.document.getElementById('root');
  const root = renderApp(container, { route });
  await flush(120);

  return {
    dom,
    window,
    document: window.document,
    root,
    calls,
    setFetch: (fn) => {
      globalThis.fetch = fn;
    },
    flush,
  };
}

/** React only reacts to the native value setter + an input event. */
export function setField(element, value) {
  const proto =
    element.tagName === 'TEXTAREA' ? globalThis.HTMLTextAreaElement.prototype : globalThis.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(element, value);
  element.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
}

export function findByText(document, selector, text) {
  return [...document.querySelectorAll(selector)].find((node) => node.textContent.trim() === text);
}

export function findByLabel(document, label) {
  return document.querySelector(`[aria-label="${label}"]`);
}

export function fieldByPlaceholder(document, placeholder) {
  return document.querySelector(`[placeholder="${placeholder}"]`);
}
