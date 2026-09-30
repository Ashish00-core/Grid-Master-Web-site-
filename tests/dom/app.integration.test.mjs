/**
 * End-to-end DOM integration test for the booking / mail delivery flow.
 *
 *   node --test tests/dom/app.integration.test.mjs
 *
 * The real `App` component is bundled with esbuild and mounted inside jsdom.
 * Every network call is intercepted, so the test proves what the browser would
 * really put on the wire — that is what was broken before (FormSubmit answered
 * "success:false" / needed activation and the page still claimed success).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX_KEY = 'grid-master-mail-outbox-v1';

/* ------------------------------------------------------------------ *
 * Bundle the app once
 * ------------------------------------------------------------------ */

const bundleFile = path.join(os.tmpdir(), 'grid-master-dom-harness.mjs');
await esbuild.build({
  entryPoints: [path.join(here, 'harness.jsx')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  outfile: bundleFile,
  logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"development"' },
});

/* ------------------------------------------------------------------ *
 * jsdom plumbing
 * ------------------------------------------------------------------ */

const dom = new JSDOM(
  '<!doctype html><html data-theme="dark"><head></head><body><div id="root"></div></body></html>',
  { url: 'http://localhost:3000/', pretendToBeVisual: true },
);

const { window } = dom;
window.scrollTo = () => {};
window.matchMedia =
  window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));

function expose(key, value) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

expose('window', window);
expose('document', window.document);
expose('navigator', window.navigator);
expose('localStorage', window.localStorage);
expose('sessionStorage', window.sessionStorage);
expose('location', window.location);
expose('getComputedStyle', window.getComputedStyle.bind(window));
expose('IS_REACT_ACT_ENVIRONMENT', false);
[
  'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement',
  'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent',
  'DocumentFragment', 'requestAnimationFrame', 'cancelAnimationFrame', 'Blob',
  // The bundle must build the very same FormData class the DOM offers,
  // otherwise multipart bodies cannot be asserted.
  'FormData', 'Headers',
].forEach((key) => {
  if (window[key] !== undefined) expose(key, window[key]);
});
globalThis.URL.createObjectURL = () => 'blob:mock';
globalThis.URL.revokeObjectURL = () => {};

const consoleErrors = [];
const originalError = console.error;
console.error = (...args) => {
  consoleErrors.push(args.map(String).join(' '));
  originalError(...args);
};

/* ------------------------------------------------------------------ *
 * Network mock
 * ------------------------------------------------------------------ */

let routes = [];

function mockFetch(url, init) {
  const absolute = String(url);
  const rawBody = init?.body;
  const isFormData =
    Boolean(rawBody) &&
    typeof rawBody.entries === 'function' &&
    typeof rawBody.append === 'function' &&
    !(rawBody instanceof window.ArrayBuffer);
  let body = null;
  if (isFormData) {
    body = Object.fromEntries([...rawBody.entries()].map(([key, value]) => [key, String(value)]));
  } else if (typeof rawBody === 'string') {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }
  }
  const call = {
    url: absolute,
    method: init?.method || 'GET',
    init,
    body,
    transport: isFormData
      ? 'formdata'
      : init?.mode === 'no-cors'
        ? 'nocors'
        : (init?.headers?.['Content-Type'] || '').startsWith('text/plain')
          ? 'text'
          : 'json',
    at: Date.now(),
  };
  mockFetch.calls.push(call);

  for (const [matcher, responder] of routes) {
    if (absolute.includes(matcher)) {
      const answer = typeof responder === 'function' ? responder(call) : responder;
      if (answer instanceof Error) return Promise.reject(answer);
      return Promise.resolve({
        ok: answer.status >= 200 && answer.status < 300,
        status: answer.status ?? 200,
        json: async () => answer.body ?? {},
      });
    }
  }
  return Promise.reject(new TypeError('Failed to fetch'));
}
mockFetch.calls = [];
mockFetch.reset = () => {
  mockFetch.calls = [];
};
expose('fetch', mockFetch);

const formSubmitCalls = () => mockFetch.calls.filter((call) => call.url.includes('formsubmit.co'));
const backendCalls = () => mockFetch.calls.filter((call) => call.url.includes('/api/send-booking'));

const okRelays = () => {
  routes = [
    ['/api/send-booking', { status: 501, body: { ok: false, configured: false } }],
    ['formsubmit.co', { status: 200, body: { success: 'true', message: 'Email sent' } }],
  ];
};

const activationRelays = () => {
  routes = [
    ['/api/send-booking', { status: 501, body: { ok: false, configured: false } }],
    [
      'formsubmit.co',
      {
        status: 200,
        body: {
          success: 'false',
          message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link.",
        },
      },
    ],
  ];
};

const offlineRelays = () => {
  routes = [
    ['/api/send-booking', new TypeError('Failed to fetch')],
    ['formsubmit.co', new TypeError('Failed to fetch')],
  ];
};

/* ------------------------------------------------------------------ *
 * Render helpers
 * ------------------------------------------------------------------ */

const { mountApp } = await import(`file://${bundleFile}`);
const mounted = [];

function mount(pagePath = '/') {
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);
  const root = mountApp(container, pagePath);
  mounted.push({ root, container });
  return container;
}

function unmountAll() {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    try {
      root.unmount();
    } catch {
      /* ignore */
    }
    container.remove();
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, { timeout = 4000, label = 'condition' } = {}) {
  const started = Date.now();
  for (;;) {
    const value = check();
    if (value) return value;
    if (Date.now() - started > timeout) throw new Error(`Timed out waiting for ${label}`);
    await sleep(15);
  }
}

const text = (node = window.document.body) => node.textContent || '';

function findButton(label, scope = window.document.body) {
  return [...scope.querySelectorAll('button, a')].find((node) =>
    (node.textContent || '').toLowerCase().includes(label.toLowerCase()),
  );
}

function click(node) {
  if (!node) throw new Error('click() received no element');
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
}

function setNativeValue(element, value) {
  const prototypes = {
    INPUT: window.HTMLInputElement.prototype,
    TEXTAREA: window.HTMLTextAreaElement.prototype,
    SELECT: window.HTMLSelectElement.prototype,
  };
  const descriptor = Object.getOwnPropertyDescriptor(prototypes[element.tagName], 'value');
  descriptor.set.call(element, value);
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
  element.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function fillBookingForm(container, overrides = {}) {
  const values = {
    'Full Name *': 'Meera Subramanian',
    'Phone Number *': '9000000000',
    'Email Address *': 'meera@example.com',
    'Property Location Address / City *': '12 Lake Road, Hyderabad',
    ...overrides,
  };
  Object.entries(values).forEach(([placeholder, value]) => {
    const field = container.querySelector(`[placeholder="${placeholder}"]`);
    assert.ok(field, `field ${placeholder} should exist`);
    setNativeValue(field, value);
  });
}

async function openBookingModal(pagePath = '/') {
  const container = mount(pagePath);
  await waitFor(() => findButton('Book Now', container), { label: 'Book Now button' });
  click(findButton('Book Now', container));
  await waitFor(
    () => container.querySelector('[placeholder="Full Name *"]'),
    { label: 'booking modal' },
  );
  return container;
}

const outbox = () => JSON.parse(window.localStorage.getItem(OUTBOX_KEY) || '[]');

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

test.beforeEach(() => {
  mockFetch.reset();
  consoleErrors.length = 0;
  window.localStorage.clear();
  window.localStorage.setItem('grid-master-mail-backend-probe-v1', JSON.stringify({ available: false, at: Date.now() }));
});

test.after(() => {
  unmountAll();
  console.error = originalError;
});

test('booking form sends the exact payload FormSubmit needs and reports real delivery', async () => {
  okRelays();
  const container = await openBookingModal();
  fillBookingForm(container);

  click(findButton('Confirm & Submit Booking', container));

  await waitFor(() => text(container).includes('Solar Booking Submitted Successfully!'), { label: 'delivered state' });

  const posts = formSubmitCalls();
  assert.equal(posts.length, 1, 'exactly one FormSubmit submission');
  const payload = posts[0].body;

  assert.equal(posts[0].url, 'https://formsubmit.co/ajax/contactgridmaster%40gmail.com');
  assert.equal(posts[0].transport, 'formdata', 'no CORS preflight: ad-blockers cannot break the booking');
  assert.equal(posts[0].init.headers['Content-Type'], undefined, 'the browser adds the multipart boundary');
  assert.match(payload._subject, /^New Solar Booking \[GM-SR-\d{6}\] — Meera Subramanian$/);
  assert.equal(payload._template, 'table');
  assert.equal(payload._captcha, 'false', 'AJAX submissions must disable reCAPTCHA');
  assert.equal(payload.email, 'meera@example.com');
  assert.equal(payload._replyto, 'meera@example.com');
  assert.equal(payload.customer_name, 'Meera Subramanian');
  assert.equal(payload.customer_phone, '9000000000');
  assert.equal(payload.property_location, '12 Lake Road, Hyderabad');
  assert.equal(payload.installation_purpose, 'Home (Residential)');
  assert.equal(payload.service_required, 'Solar Designing & 3D Simulation');
  assert.ok(payload.preferred_date, 'audit date present');
  assert.ok(payload.time_slot, 'time slot present');
  assert.ok(payload.reference_id?.startsWith('GM-SR-'));

  assert.match(text(container), /Solar Booking Submitted Successfully!/);
  assert.match(text(container), /contactgridmaster@gmail\.com/);
  assert.equal(outbox().length, 0, 'nothing left queued after a confirmed delivery');
  assert.equal(consoleErrors.length, 0, `no console errors: ${consoleErrors.join(' | ')}`);

  unmountAll();
});

test('a pending FormSubmit activation is shown honestly, queued, and retryable', async () => {
  activationRelays();
  const container = await openBookingModal();
  fillBookingForm(container);
  click(findButton('Confirm & Submit Booking', container));

  await waitFor(() => text(container).includes('One-time e-mail activation pending'), {
    label: 'activation state',
  });

  const body = text(container);
  assert.match(body, /Activate Form/, 'explains the one-time activation');
  assert.match(body, /contactgridmaster@gmail\.com/);
  assert.match(body, /Retry automatic delivery/);
  const dialog = container.querySelector('[role="dialog"]');
  assert.ok(dialog, 'booking dialog is open');
  const mailFallback = [...dialog.querySelectorAll('a')].find((node) =>
    (node.getAttribute('href') || '').startsWith('mailto:contactgridmaster@gmail.com'),
  );
  assert.ok(mailFallback, 'mail-app fallback offered');
  assert.match(decodeURIComponent(mailFallback.getAttribute('href')), /GM-SR-\d{6}/);
  assert.equal(outbox().length, 1, 'booking is queued so it cannot be lost');
  assert.equal(outbox()[0].reference.startsWith('GM-SR-'), true);

  // Fix the relay (activation completed) and press retry.
  okRelays();
  click(findButton('Retry automatic delivery', container));
  await waitFor(() => text(container).includes('Solar Booking Submitted Successfully!'), { label: 'retry success' });
  assert.equal(outbox().length, 0, 'queue drained after the successful retry');

  unmountAll();
});

test('an offline visitor keeps a queued booking instead of a fake success', async () => {
  offlineRelays();
  const container = await openBookingModal();
  fillBookingForm(container);
  click(findButton('Confirm & Submit Booking', container));

  await waitFor(() => text(container).includes('Booking Saved — Confirming Delivery'), {
    label: 'queued state',
  });

  const body = text(container);
  assert.ok(!body.includes('Solar Booking Submitted Successfully!'), 'must not claim success');
  assert.match(body, /Send it from my mail app now/);
  assert.match(body, /Send on WhatsApp/);
  assert.equal(outbox().length, 1, 'booking survives offline');

  unmountAll();
});

test('receipt copy and download work in every delivery state (regression: targetEmail crash)', async () => {
  const clipboard = { value: '' };
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: async (value) => { clipboard.value = value; } },
    configurable: true,
  });

  activationRelays();
  const container = await openBookingModal();
  fillBookingForm(container);
  click(findButton('Confirm & Submit Booking', container));
  await waitFor(() => text(container).includes('One-time e-mail activation pending'), { label: 'activation state' });

  click(findButton('Copy Reference & Receipt', container));
  await waitFor(() => clipboard.value.length > 0, { label: 'clipboard write' });
  assert.match(clipboard.value, /GRID MASTER SOLAR BOOKING RECEIPT/);
  assert.match(clipboard.value, /GM-SR-\d{6}/);
  assert.match(clipboard.value, /Queued/);
  assert.ok(!clipboard.value.includes('undefined'), 'receipt must never contain undefined values');

  // Downloading builds a Blob + object URL — make sure nothing throws.
  click(findButton('Download Official Receipt', container));
  await waitFor(() => text(container).includes('Booking Reference'), { label: 'still on receipt' });

  unmountAll();
});

test('queued bookings from an earlier visit are re-sent automatically on load', async () => {
  const { buildBookingMessage } = await import('../../src/lib/mailDelivery.js');
  const message = buildBookingMessage({
    reference: 'GM-SR-111111',
    name: 'Queued Customer',
    email: 'queued@example.com',
    phone: '9000000000',
    service: 'Turnkey Solar Installation',
    date: '2026-02-02',
    timeSlot: '11:00 AM - 01:00 PM',
  });

  window.localStorage.setItem(
    OUTBOX_KEY,
    JSON.stringify([
      { id: 'queued-1', kind: 'booking', reference: 'GM-SR-111111', message, queuedAt: new Date().toISOString() },
    ]),
  );
  okRelays();

  mount('/');
  await waitFor(() => outbox().length === 0, { label: 'automatic outbox flush' });
  const posts = formSubmitCalls();
  assert.ok(posts.length >= 1, 'the queued message was pushed to the relay');
  assert.equal(posts.at(-1).body.reference_id, 'GM-SR-111111');

  unmountAll();
});

test('every page renders without errors, including the Mail Delivery Center', async () => {
  okRelays();
  const pages = ['/', '/services', '/design-samples', '/equipment', '/calculator', '/team', '/contact', '/mail-delivery', '/does-not-exist'];

  for (const page of pages) {
    unmountAll();
    const container = mount(page);
    await waitFor(() => text(container).trim().length > 40, { label: `content for ${page}` });
    assert.ok(text(container).length > 200, `${page} should render real content`);
  }

  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join(' | ')}`);
  unmountAll();
});

test('the Mail Delivery Center runs a live test and reports each relay', async () => {
  routes = [
    ['/api/send-booking', { status: 501, body: { ok: false, configured: false, detail: 'not configured' } }],
    ['formsubmit.co', { status: 200, body: { success: 'true', message: 'Email sent' } }],
  ];
  window.localStorage.removeItem('grid-master-mail-backend-probe-v1');
  const container = mount('/mail-delivery');
  await waitFor(() => findButton('Run live delivery test', container), { label: 'test button' });

  click(findButton('Run live delivery test', container));
  await waitFor(() => text(container).includes('Automatic e-mail delivery confirmed'), { label: 'test result' });

  const body = text(container);
  assert.match(body, /FormSubmit relay/);
  assert.match(body, /Company mail server/);
  assert.equal(formSubmitCalls().length, 1);
  assert.equal(backendCalls().length, 1);

  unmountAll();
});

test('quote builder can add and clear equipment (regression: missing onClearQuote)', async () => {
  okRelays();
  const container = mount('/equipment');
  await waitFor(() => findButton('Add Equipment to Quote', container), { label: 'catalog' });

  click(findButton('Add Equipment to Quote', container));
  await waitFor(() => findButton('Clear all', container), { label: 'quote panel appears' });
  assert.match(text(container), /Your Custom Equipment Package/);

  click(findButton('Clear all', container));
  await waitFor(() => !findButton('Clear all', container), { label: 'quote panel disappears' });
  assert.ok(!text(container).includes('Your Custom Equipment Package'));
  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join(' | ')}`);

  unmountAll();
});

test('an owner-configured personal relay delivers without any third party', async () => {
  routes = [
    ['script.google.com', { status: 200, body: { ok: true, detail: 'Delivered from your Gmail' } }],
    ['formsubmit.co', { status: 200, body: { success: 'true' } }],
    ['/api/send-booking', { status: 501, body: { ok: false, configured: false } }],
  ];
  window.localStorage.setItem(
    'grid-master-mail-settings-v1',
    JSON.stringify({
      recipient: 'contactgridmaster@gmail.com',
      cc: [],
      webhookUrl: 'https://script.google.com/macros/s/AKfycbTEST/exec',
      webhookSecret: '',
      web3formsKey: '',
      disabledChannels: [],
    }),
  );

  const container = await openBookingModal();
  fillBookingForm(container);
  click(findButton('Confirm & Submit Booking', container));

  await waitFor(() => text(container).includes('Solar Booking Submitted Successfully!'), {
    label: 'personal relay delivery',
  });

  const ownRelayCalls = mockFetch.calls.filter((call) => call.url.includes('script.google.com'));
  assert.equal(ownRelayCalls.length, 1, 'the personal relay is contacted exactly once');
  assert.equal(ownRelayCalls[0].transport, 'text', 'no preflight for the Apps Script relay');
  assert.equal(ownRelayCalls[0].body.fields.customer_name, 'Meera Subramanian');
  assert.equal(ownRelayCalls[0].body.to, 'contactgridmaster@gmail.com');
  assert.equal(formSubmitCalls().length, 0, 'the built-in relay is not used when the owner relay works');
  assert.match(text(container), /Own mail relay/);
  assert.equal(outbox().length, 0);

  window.localStorage.removeItem('grid-master-mail-settings-v1');
  unmountAll();
});

test('a blocked FormSubmit relay is retried before the booking is queued', async () => {
  routes = [
    ['/api/send-booking', { status: 501, body: { ok: false, configured: false } }],
    ['formsubmit.co', new TypeError('Failed to fetch')],
  ];
  const container = await openBookingModal();
  fillBookingForm(container);
  click(findButton('Confirm & Submit Booking', container));

  await waitFor(() => text(container).includes('Booking Saved — Confirming Delivery'), { label: 'queued state' });

  const posts = formSubmitCalls();
  assert.ok(posts.length >= 2, `the relay is retried (got ${posts.length} attempts)`);
  assert.deepEqual(posts.map((call) => call.transport).slice(0, 2), ['formdata', 'json']);
  assert.equal(outbox().length, 1, 'the booking is queued, never lost');

  unmountAll();
});

test('the light/dark theme toggle and footer delivery link work', async () => {
  okRelays();
  const container = mount('/');
  const themeToggle = () =>
    [...container.querySelectorAll('button')].find(
      (node) => node.getAttribute('aria-label') === 'Switch to light theme',
    );
  await waitFor(themeToggle, { label: 'theme toggle' });

  click(themeToggle());
  await waitFor(() => window.document.documentElement.dataset.theme === 'light', { label: 'light theme' });
  assert.equal(window.localStorage.getItem('grid-master-theme'), 'light');

  const link = [...container.querySelectorAll('a')].find((node) => (node.textContent || '').includes('Mail Delivery Center'));
  assert.ok(link, 'footer links to the delivery center');
  assert.equal(link.getAttribute('href'), '/mail-delivery');

  unmountAll();
});
