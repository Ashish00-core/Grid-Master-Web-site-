/**
 * End-to-end booking form test against the real app in jsdom.
 *
 * It drives the same clicks a visitor makes: Book Now → fill the form → submit,
 * and asserts (a) what the mail relay receives, (b) what the confirmation screen
 * tells the customer, and (c) that no relay answer is ever misreported.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { mountApp, setField, findByText, findByLabel, fieldByPlaceholder } from './harness.mjs';

const FIELDS = [
  ['Full Name *', 'Bollapelly Meghana'],
  ['Phone Number *', '9391103814'],
  ['Email Address *', 'meghana@example.com'],
  ['Property Location Address / City *', 'Jayashankar Bhupalapally'],
];

async function openBookingForm(app) {
  const bookNow = findByText(app.document, 'button', 'Book Now');
  assert.ok(bookNow, 'the navbar exposes a "Book Now" button');
  bookNow.click();
  await app.flush(120);
}

async function fillAndSubmit(app) {
  FIELDS.forEach(([placeholder, value]) => {
    const input = fieldByPlaceholder(app.document, placeholder);
    assert.ok(input, `the form asks for "${placeholder}"`);
    setField(input, value);
  });
  await app.flush(30);

  const form = app.document.querySelector('form');
  assert.ok(form, 'the booking form is rendered');
  form.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
  await app.flush(400);
}

test('a visitor can open the booking form, submit it and see a real confirmation', async () => {
  const app = await mountApp();
  await openBookingForm(app);

  assert.match(app.document.body.textContent, /Book Solar Designing, Installation & Integration/);
  await fillAndSubmit(app);

  const body = app.document.body.textContent;
  assert.match(body, /Booking Reference: GM-SR-\d{6}/);
  assert.match(body, /Solar Booking Submitted Successfully!/);

  const relayCall = app.calls.find((call) => call.url.includes('formsubmit.co/ajax/'));
  assert.ok(relayCall, 'the booking was posted to the mail relay');
  assert.equal(relayCall.url, 'https://formsubmit.co/ajax/contactgridmaster@gmail.com');

  // Multipart body: relay directives plus the customer's answers.
  assert.ok(relayCall.init.body instanceof FormData);
  const sent = relayCall.init.body;
  assert.equal(sent.get('customer_name'), 'Bollapelly Meghana');
  assert.equal(sent.get('customer_phone'), '9391103814');
  assert.equal(sent.get('customer_email'), 'meghana@example.com');
  assert.equal(sent.get('property_location'), 'Jayashankar Bhupalapally');
  assert.equal(sent.get('email'), 'meghana@example.com');
  assert.equal(sent.get('_replyto'), 'meghana@example.com');
  assert.equal(sent.get('_captcha'), 'false');
  assert.equal(sent.get('purpose'), 'Home (Residential)');
  assert.match(sent.get('_subject'), /New Solar Integration Booking \[GM-SR-\d{6}\] - Bollapelly Meghana/);
  assert.match(sent.get('booking_reference'), /^GM-SR-\d{6}$/);

  // The customer's receipt never reports a delivery that did not happen.
  assert.doesNotMatch(body, /couldn&apos;t confirm|couldn't confirm/i);
});

test('a pending activation is reported honestly, with a way to deliver the booking', async () => {
  const app = await mountApp({
    fetchImpl: async (url) => {
      app.calls.push({ url: String(url), init: {} });
      return {
        status: 200,
        ok: true,
        text: async () =>
          JSON.stringify({
            success: 'false',
            message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link.",
          }),
      };
    },
  });

  await openBookingForm(app);
  await fillAndSubmit(app);

  const body = app.document.body.textContent;
  assert.match(body, /Booking Saved — Confirming Delivery/);
  assert.match(body, /one-time activation|Activate Form/i);
  assert.doesNotMatch(body, /Solar Booking Submitted Successfully!/);

  // Fallbacks that carry the booking even when no relay works.
  const mailto = app.document.querySelector('[data-testid="booking-mailto"]');
  assert.ok(mailto, 'the customer can send the booking from their own mail app');
  const href = decodeURIComponent(mailto.getAttribute('href'));
  assert.match(href, /^mailto:contactgridmaster@gmail\.com\?/);
  assert.match(href, /GM-SR-\d{6}/);
  assert.match(href, /Bollapelly Meghana/);
  assert.match(href, /Jayashankar Bhupalapally/);

  assert.ok(findByText(app.document, 'button', 'Retry automatic send'), 'a retry button is offered');
  assert.ok(app.document.querySelector('[data-testid="booking-whatsapp"]'), 'WhatsApp fallback is offered');
});

test('a blocked relay keeps the booking and never claims it was sent', async () => {
  const app = await mountApp({
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

  await openBookingForm(app);
  await fillAndSubmit(app);

  const body = app.document.body.textContent;
  assert.match(body, /Booking Saved — Confirming Delivery/);
  assert.match(body, /ad-blocker|blocked|refused/i);
  assert.doesNotMatch(body, /Solar Booking Submitted Successfully!/);

  // The booking is queued for an automatic retry on the next visit.
  const queue = JSON.parse(app.window.localStorage.getItem('grid-master-booking-queue') || '[]');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].payload.customer_name, 'Bollapelly Meghana');
});

test('a queued booking is re-sent automatically and the queue is cleared', async () => {
  const app = await mountApp({
    fetchImpl: async (url) => {
      app.calls.push({ url: String(url), init: {} });
      if (String(url).includes('formsubmit')) {
        return { status: 200, ok: true, text: async () => JSON.stringify({ success: 'true' }) };
      }
      return { status: 501, ok: false, text: async () => JSON.stringify({ configured: false }) };
    },
  });

  // Simulate a booking that was captured on an earlier visit, when the network failed.
  app.window.localStorage.setItem(
    'grid-master-booking-queue',
    JSON.stringify([
      {
        reference: 'GM-SR-111111',
        createdAt: new Date().toISOString(),
        payload: { customer_name: 'Queued Customer', booking_reference: 'GM-SR-111111' },
      },
    ])
  );

  const { drainQueue } = await import('../../src/lib/bookingMail.js');
  const result = await drainQueue({
    storage: app.window.localStorage,
    fetchImpl: globalThis.fetch,
  });

  assert.equal(result.delivered.length, 1);
  assert.equal(app.window.localStorage.getItem('grid-master-booking-queue'), '[]');
});

test('the receipts can always be copied and downloaded (no ReferenceError)', async () => {
  const app = await mountApp();
  await openBookingForm(app);
  await fillAndSubmit(app);

  const copyButton = findByText(app.document, 'button', 'Copy Reference & Receipt');
  const downloadButton = findByText(app.document, 'button', 'Download Official Receipt (.txt)');
  assert.ok(copyButton && downloadButton);

  // Both handlers used to throw on an out-of-scope variable.
  copyButton.click();
  downloadButton.click();
  await app.flush(80);

  assert.match(app.document.body.textContent, /Copy Reference & Receipt|Copied Receipt!/);
});

test('every route renders without crashing', async () => {
  for (const route of ['/', '/services', '/design-samples', '/equipment', '/calculator', '/team', '/contact']) {
    const app = await mountApp({ route });
    assert.ok(app.document.getElementById('root').children.length > 0, `${route} rendered`);
    assert.ok(app.document.body.textContent.length > 200, `${route} has content`);
  }
});

test('the booking modal closes without leaving the page locked', async () => {
  const app = await mountApp();
  await openBookingForm(app);

  const close = findByLabel(app.document, 'Close booking form');
  assert.ok(close);
  close.click();
  await app.flush(80);

  assert.equal(app.document.body.style.overflow, '', 'page scrolling is restored');
  assert.match(app.document.body.textContent, /Book Now/);
});
