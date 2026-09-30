/**
 * Booking mail delivery tests.
 *
 * These pin down the behaviour that the live site got wrong: every relay is
 * tried in a known order, FormSubmit's own answer is interpreted (including the
 * "needs Activation" reply) and a booking that could not be delivered is queued
 * instead of being reported as sent.
 *
 *   node --test tests/
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DELIVERY,
  buildBookingPayload,
  payloadToFormData,
  interpretFormSubmit,
  deliverBooking,
  deliverViaFormSubmit,
  deliverViaServerRelay,
  describeError,
  enqueueBooking,
  dequeueBooking,
  loadQueue,
  drainQueue,
  makeReference,
  QUEUE_KEY,
  RELAY_PROBE_KEY,
} from '../src/lib/bookingMail.js';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const INBOX = 'contactgridmaster@gmail.com';

const FIELDS = {
  customerName: 'Bollapelly Meghana',
  customerPhone: '9391103814',
  customerEmail: 'meghana@example.com',
  propertyAddress: 'Jayashankar Bhupalapally',
  purpose: 'home',
  serviceType: 'Full Package (Design + Install + Grid Integration)',
  leadEngineer: 'Ashish Kumar (Solar Designer Engineer)',
  date: '2026-10-03',
  timeSlot: '09:00 AM - 11:00 AM',
  notes: 'Roof size 900 sq ft',
};

const makeStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    _dump: () => Object.fromEntries(map),
  };
};

/** Response stub with the parts of the Fetch Response contract we use. */
const response = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? {})),
});

const formsubmitSuccess = () => response(200, { success: 'true', message: 'Email sent' });
const formsubmitNeedsActivation = () =>
  response(200, {
    success: 'false',
    message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link.",
  });
const notConfigured = () => response(501, { success: false, configured: false, error: 'No mail provider configured.' });

/* ------------------------------------------------------------------ */
/* payload                                                             */
/* ------------------------------------------------------------------ */

test('buildBookingPayload carries every field the relays and the receipt need', () => {
  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-123456', inbox: INBOX });

  assert.equal(payload.booking_reference, 'GM-SR-123456');
  assert.equal(payload.customer_name, 'Bollapelly Meghana');
  assert.equal(payload.customer_phone, '9391103814');
  assert.equal(payload.property_location, 'Jayashankar Bhupalapally');
  assert.equal(payload.purpose, 'Home (Residential)');
  assert.equal(payload.service_required, 'Full Package (Design + Install + Grid Integration)');
  assert.equal(payload.scheduled_date, '2026-10-03');
  assert.equal(payload.time_slot, '09:00 AM - 11:00 AM');
  assert.equal(payload.notes, 'Roof size 900 sq ft');

  // FormSubmit directives
  assert.equal(payload._captcha, 'false');
  assert.equal(payload._template, 'table');
  assert.equal(payload._replyto, 'meghana@example.com');
  assert.equal(payload.email, 'meghana@example.com', 'FormSubmit needs an `email` field for _replyto');
  assert.equal('_cc' in payload, false, 'the relay already delivers to the inbox — a CC would duplicate every mail');
  assert.match(payload._subject, /^New Solar Integration Booking \[GM-SR-123456\] - Bollapelly Meghana$/);
});

test('buildBookingPayload adds the equipment package only when one was selected', () => {
  const bare = buildBookingPayload(FIELDS, { reference: 'GM-SR-1', inbox: INBOX });
  assert.equal(bare.selected_equipment, undefined);

  const withQuote = buildBookingPayload(
    { ...FIELDS, quoteSummary: '  - Panel x4', quoteTotal: '₹57,996' },
    { reference: 'GM-SR-1', inbox: INBOX }
  );
  assert.equal(withQuote.selected_equipment, '  - Panel x4');
  assert.equal(withQuote.equipment_package_total, '₹57,996');
});

test('buildBookingPayload never emits undefined in the subject', () => {
  const payload = buildBookingPayload({ ...FIELDS, customerName: '' }, { reference: 'GM-SR-9', inbox: INBOX });
  assert.match(payload._subject, /Website visitor$/);
});

test('payloadToFormData skips blanks and adds the honeypot', () => {
  const payload = buildBookingPayload({ ...FIELDS, notes: '' }, { reference: 'GM-SR-2', inbox: INBOX });
  const form = payloadToFormData(payload);

  assert.equal(form.get('booking_reference'), 'GM-SR-2');
  assert.equal(form.get('notes'), 'None provided', 'an empty note still tells the inbox it was empty');
  assert.equal(form.get('selected_equipment'), null, 'absent fields are dropped, not sent as "undefined"');
  assert.equal(form.get('_captcha'), 'false');
  assert.equal(form.get('_honey'), '', 'honeypot present but empty');
  assert.equal(form.get('customer_email'), 'meghana@example.com');
});

/* ------------------------------------------------------------------ */
/* relay answers                                                       */
/* ------------------------------------------------------------------ */

test('interpretFormSubmit understands success:true and success:"true"', () => {
  assert.equal(interpretFormSubmit(200, { success: true }).ok, true);
  assert.equal(interpretFormSubmit(200, { success: 'true' }).ok, true);
  assert.equal(interpretFormSubmit(200, { success: true }).state, DELIVERY.DELIVERED);
});

test('interpretFormSubmit flags the activation reply instead of calling it a success', () => {
  const verdict = interpretFormSubmit(200, {
    success: 'false',
    message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link.",
  });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.state, DELIVERY.ACTIVATION);
});

test('interpretFormSubmit reports relay errors honestly', () => {
  assert.equal(interpretFormSubmit(429, { message: 'Too many requests' }).state, DELIVERY.FAILED);
  assert.equal(interpretFormSubmit(500, { message: 'Server error' }).state, DELIVERY.FAILED);
  assert.equal(interpretFormSubmit(403, { message: 'Forbidden' }).ok, false);
  assert.equal(interpretFormSubmit(200, 'not json').ok, false, 'HTML/error pages are not success');
});

test('describeError turns an opaque "Failed to fetch" into advice', () => {
  assert.match(describeError(new TypeError('Failed to fetch')), /ad-blocker|blocked/i);
  assert.match(describeError({ name: 'AbortError' }), /did not answer in time/);
});

/* ------------------------------------------------------------------ */
/* FormSubmit transport ladder                                         */
/* ------------------------------------------------------------------ */

test('FormSubmit is tried as multipart first (no CORS preflight)', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: init.headers || {}, body: init.body });
    return formsubmitSuccess();
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-3', inbox: INBOX });
  const result = await deliverViaFormSubmit(payload, { fetchImpl, inbox: INBOX });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://formsubmit.co/ajax/${INBOX}`);
  assert.equal(calls[0].headers['Content-Type'], undefined, 'multipart must not set Content-Type');
  assert.equal(calls[0].headers.Accept, 'application/json');
  assert.ok(calls[0].body instanceof FormData);
});

test('FormSubmit falls back to JSON when the multipart attempt is blocked', async () => {
  const kinds = [];
  const fetchImpl = async (url, init) => {
    if (init.body instanceof FormData) {
      kinds.push('multipart');
      throw new TypeError('Failed to fetch');
    }
    kinds.push('json');
    return formsubmitSuccess();
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-4', inbox: INBOX });
  const result = await deliverViaFormSubmit(payload, { fetchImpl, inbox: INBOX });

  assert.deepEqual(kinds, ['multipart', 'json']);
  assert.equal(result.ok, true);
  assert.equal(result.transport, 'json');
});

test('FormSubmit stops after the first attempt when activation is required', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return formsubmitNeedsActivation();
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-5', inbox: INBOX });
  const result = await deliverViaFormSubmit(payload, { fetchImpl, inbox: INBOX });

  assert.equal(result.state, DELIVERY.ACTIVATION);
  assert.equal(calls, 1, 'an activation answer will not change with a second transport');
});

/* ------------------------------------------------------------------ */
/* relay ladder                                                        */
/* ------------------------------------------------------------------ */

test('the company relay wins when it is configured', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return response(200, { success: true, provider: 'resend' });
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-6', inbox: INBOX });
  const result = await deliverBooking(payload, { fetchImpl, inbox: INBOX, storage: makeStorage(), online: true });

  assert.equal(result.ok, true);
  assert.equal(result.channel, 'server');
  assert.deepEqual(urls, ['/api/booking'], 'FormSubmit is not called once the relay delivers');
});

test('an unconfigured relay silently hands over to FormSubmit', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url === '/api/booking' || url.includes('netlify')) return notConfigured();
    return formsubmitSuccess();
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-7', inbox: INBOX });
  const result = await deliverBooking(payload, { fetchImpl, inbox: INBOX, storage: makeStorage(), online: true });

  assert.equal(result.ok, true);
  assert.equal(result.channel, 'formsubmit');
  assert.ok(urls.includes('/api/booking'));
  assert.ok(urls.some((u) => u.includes('formsubmit.co')));
});

test('a host where the relay never existed is not probed again in the same session', async () => {
  const storage = makeStorage();
  storage.setItem(RELAY_PROBE_KEY, 'disabled');

  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return formsubmitSuccess();
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-8', inbox: INBOX });
  await deliverBooking(payload, { fetchImpl, inbox: INBOX, storage, online: true });

  assert.deepEqual(urls, [`https://formsubmit.co/ajax/${INBOX}`]);
});

test('blocked network is reported as blocked, never as delivered', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('formsubmit')) throw new TypeError('Failed to fetch');
    return notConfigured();
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-10', inbox: INBOX });
  const result = await deliverBooking(payload, { fetchImpl, inbox: INBOX, storage: makeStorage(), online: true });

  assert.equal(result.ok, false);
  assert.equal(result.state, DELIVERY.BLOCKED);
  assert.match(result.message, /ad-blocker|blocked|refused/i);
  assert.ok(result.attempts.length >= 2);
});

test('an offline device is reported as offline without a request', async () => {
  let called = 0;
  const fetchImpl = async () => {
    called += 1;
    return formsubmitSuccess();
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-11', inbox: INBOX });
  const result = await deliverBooking(payload, { fetchImpl, inbox: INBOX, storage: makeStorage(), online: false });

  assert.equal(result.state, DELIVERY.OFFLINE);
  assert.equal(called, 0);
});

test('deliverViaServerRelay gives up quietly when nothing is deployed', async () => {
  const fetchImpl = async () => response(404, 'not found');
  const result = await deliverViaServerRelay({}, { fetchImpl, storage: makeStorage() });

  assert.equal(result.ok, false);
  assert.equal(result.skipped, true);
});

/* ------------------------------------------------------------------ */
/* retry queue                                                         */
/* ------------------------------------------------------------------ */

test('references look like GM-SR-######', () => {
  assert.match(makeReference(), /^GM-SR-\d{6}$/);
});

test('a failed booking is queued, de-duplicated and removed once delivered', async () => {
  const storage = makeStorage();
  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-12', inbox: INBOX });

  const failing = async () => {
    throw new TypeError('Failed to fetch');
  };
  const failed = await deliverBooking(payload, { fetchImpl: failing, inbox: INBOX, storage, online: true });
  assert.equal(failed.ok, false);

  enqueueBooking({ reference: 'GM-SR-12', payload, inbox: INBOX }, { storage });
  enqueueBooking({ reference: 'GM-SR-12', payload, inbox: INBOX }, { storage });
  assert.equal(loadQueue({ storage }).length, 1, 'same reference is stored once');
  assert.ok(storage.getItem(QUEUE_KEY).includes('GM-SR-12'));

  dequeueBooking('GM-SR-12', { storage });
  assert.equal(loadQueue({ storage }).length, 0);
});

test('drainQueue re-sends queued bookings and clears the delivered ones', async () => {
  const storage = makeStorage();
  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-13', inbox: INBOX });
  enqueueBooking({ reference: 'GM-SR-13', payload, inbox: INBOX }, { storage });

  const fetchImpl = async (url) => {
    if (url === '/api/booking') return response(200, { success: true, provider: 'brevo' });
    return formsubmitSuccess();
  };

  const seen = [];
  const { delivered, pending } = await drainQueue({
    storage,
    fetchImpl,
    inbox: INBOX,
    online: true,
    onDelivered: (entry) => seen.push(entry.reference),
  });

  assert.deepEqual(delivered.map((d) => d.reference), ['GM-SR-13']);
  assert.deepEqual(seen, ['GM-SR-13']);
  assert.equal(pending.length, 0);
  assert.equal(loadQueue({ storage }).length, 0, 'queue is empty after a successful retry');
});

test('drainQueue keeps bookings that still cannot be delivered', async () => {
  const storage = makeStorage();
  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-14', inbox: INBOX });
  enqueueBooking({ reference: 'GM-SR-14', payload, inbox: INBOX }, { storage });

  const fetchImpl = async () => {
    throw new TypeError('Failed to fetch');
  };

  const { delivered, pending } = await drainQueue({ storage, fetchImpl, inbox: INBOX, online: true });

  assert.equal(delivered.length, 0);
  assert.equal(pending.length, 1);
  assert.equal(loadQueue({ storage }).length, 1);
});

test('a static host answering HTML (SPA fallback) is treated as "no relay here"', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (String(url).startsWith('/api') || String(url).includes('netlify')) {
      return { status: 200, ok: true, text: async () => '<!doctype html><html><body>app</body></html>' };
    }
    return formsubmitSuccess();
  };

  const payload = buildBookingPayload(FIELDS, { reference: 'GM-SR-20', inbox: INBOX });
  const result = await deliverBooking(payload, { fetchImpl, inbox: INBOX, storage: makeStorage(), online: true });

  assert.equal(result.ok, true);
  assert.equal(result.channel, 'formsubmit');
  assert.ok(urls.some((u) => u.includes('formsubmit.co')));
});
