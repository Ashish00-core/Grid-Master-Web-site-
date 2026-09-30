/**
 * Unit tests for the booking e-mail engine.
 *
 *   node --test tests/
 *
 * No test framework or extra dependency is needed — the module is plain ESM and
 * every network call is injected through `fetchImpl`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBookingMessage,
  buildTestMessage,
  deliverMessage,
  flushOutbox,
  getOutbox,
  clearOutbox,
  queueMessage,
  isValidEmail,
  mailtoHref,
  whatsappHref,
  resolveRecipient,
  saveMailSettings,
  getMailSettings,
  resetMailSettings,
  sendViaFormSubmit,
  sendViaWebhook,
  buildFormSubmitPayload,
  isHttpUrl,
  CHANNEL_ORDER,
  DELIVERY_STATES,
  MAIL_CONFIG,
} from '../src/lib/mailDelivery.js';

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    _dump: () => Object.fromEntries(map),
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

/**
 * Records every call and answers with the supplied queue of responses.
 * Bodies are normalised so both JSON and multipart/form-data payloads can be
 * asserted with the same expectations.
 */
function mockFetch(queue) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const raw = init?.body;
    const isFormData = typeof FormData !== 'undefined' && raw instanceof FormData;
    let body = null;
    if (isFormData) {
      body = Object.fromEntries([...raw.entries()].map(([key, value]) => [key, String(value)]));
    } else if (typeof raw === 'string') {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
    calls.push({
      url: String(url),
      init,
      body,
      transport: isFormData
        ? 'formdata'
        : init?.mode === 'no-cors'
          ? 'nocors'
          : (init?.headers?.['Content-Type'] || '').startsWith('text/plain')
            ? 'text'
            : 'json',
    });
    const next = queue.shift();
    if (next === undefined) throw new TypeError('Failed to fetch');
    if (typeof next === 'function') return next(url, init);
    return next;
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

const settings = { recipient: 'owner@example.com', cc: [], disabledChannels: [] };

/** Keep retry pauses out of the test runtime. */
const fast = { retryDelayMs: 0 };

const sampleBooking = {
  reference: 'GM-SR-123456',
  createdAt: '2026-01-02T10:00:00.000Z',
  name: 'Meera Subramanian',
  phone: '+91 90000 00000',
  email: 'meera@example.com',
  location: '12 Lake Road, Hyderabad',
  purpose: 'Home (Residential)',
  service: 'Turnkey Solar Installation',
  engineer: 'GANDHAMANENI GOUTHAM (Head Engineer - Solar & Electrical)',
  date: '2026-01-10',
  timeSlot: '09:00 AM - 11:00 AM',
  notes: '5 kW roof',
};

/* ---------------------------------------------------------------- *
 * Message building
 * ---------------------------------------------------------------- */

test('buildBookingMessage produces the subject, fields and readable body', () => {
  const message = buildBookingMessage(sampleBooking);

  assert.match(message.subject, /GM-SR-123456/);
  assert.match(message.subject, /Meera Subramanian/);
  assert.equal(message.fields.reference_id, 'GM-SR-123456');
  assert.equal(message.fields.customer_name, 'Meera Subramanian');
  assert.equal(message.fields.email, 'meera@example.com');
  assert.match(message.text, /GRID MASTER SOLAR SYSTEMS/);
  assert.match(message.text, /Turnkey Solar Installation/);
  assert.ok(message.html.startsWith('<div style='));
  assert.ok(message.html.includes('meera@example.com'));
});

test('buildBookingMessage escapes HTML so a visitor cannot inject markup', () => {
  const message = buildBookingMessage({ ...sampleBooking, name: '<script>alert(1)</script>' });
  assert.ok(!message.html.includes('<script>alert(1)</script>'));
  assert.ok(message.html.includes('&lt;script&gt;'));
});

test('buildBookingMessage includes the equipment package when a quote is attached', () => {
  const message = buildBookingMessage({
    ...sampleBooking,
    quoteItems: [{ name: 'UltraPro 550W Panel', quantity: 12, lineTotalINR: '₹1,73,988' }],
    quoteTotalINR: '₹1,73,988',
    quoteTotalUSD: '$2,047',
  });

  assert.match(message.fields.selected_equipment, /UltraPro 550W Panel x12/);
  assert.equal(message.fields.equipment_package_total, '₹1,73,988 (approx $2,047)');
  assert.match(message.text, /SELECTED EQUIPMENT/);
});

test('the test message is clearly marked as a test', () => {
  const message = buildTestMessage('GM-TEST-1');
  assert.match(message.subject, /^\[TEST\]/);
  assert.match(message.text, /MAIL DELIVERY TEST/);
});

/* ---------------------------------------------------------------- *
 * Validation helpers
 * ---------------------------------------------------------------- */

test('isValidEmail accepts real addresses and rejects malformed ones', () => {
  ['a@b.co', 'first.last+tag@sub.domain.in'].forEach((value) => assert.ok(isValidEmail(value), value));
  ['', 'plain', 'a@b', 'a b@c.com', '<img@x.com>', `${'a'.repeat(300)}@b.co`].forEach((value) =>
    assert.ok(!isValidEmail(value), `should reject ${value}`),
  );
});

test('mailtoHref points at the configured inbox and carries the reference', () => {
  const message = buildBookingMessage(sampleBooking);
  const href = mailtoHref(message, { includeCustomer: true, customerEmail: 'meera@example.com' });
  assert.ok(href.startsWith(`mailto:${MAIL_CONFIG.recipient}?`));
  assert.ok(href.includes(encodeURIComponent(message.subject).replace(/%20/g, '%20')));
  assert.ok(href.includes('cc=meera%40example.com'));
});

test('whatsappHref targets the head engineer number with the text', () => {
  const href = whatsappHref('hello');
  assert.ok(href.startsWith('https://wa.me/917200745180?text='));
  assert.ok(href.endsWith('hello'));
});

/* ---------------------------------------------------------------- *
 * Recipient settings
 * ---------------------------------------------------------------- */

test('settings override and reset the delivery address per browser', () => {
  const storage = fakeStorage();
  assert.equal(resolveRecipient(getMailSettings(storage)), MAIL_CONFIG.recipient);

  saveMailSettings({ recipient: 'owner@example.com', cc: ['copy@example.com', 'nope'] }, storage);
  const saved = getMailSettings(storage);
  assert.equal(resolveRecipient(saved), 'owner@example.com');
  assert.deepEqual(saved.cc, ['copy@example.com']);

  resetMailSettings(storage);
  assert.equal(resolveRecipient(getMailSettings(storage)), MAIL_CONFIG.recipient);
});

/* ---------------------------------------------------------------- *
 * Channel: FormSubmit
 * ---------------------------------------------------------------- */

test('FormSubmit payload sends the field names the relay requires', async () => {
  const fetchImpl = mockFetch([jsonResponse({ success: 'true', message: 'Email sent' })]);
  const message = buildBookingMessage(sampleBooking);

  const result = await sendViaFormSubmit(message, {
    fetchImpl,
    settings,
    replyTo: 'meera@example.com',
    ...fast,
  });

  assert.equal(result.ok, true);
  const [call] = fetchImpl.calls;
  assert.equal(call.url, `${MAIL_CONFIG.formSubmitEndpoint}owner%40example.com`);
  assert.equal(call.body._subject, message.subject);
  assert.equal(call.body._template, 'table');
  // Required: fetch-based AJAX submissions are otherwise gated behind reCAPTCHA
  assert.equal(call.body._captcha, 'false');
  assert.equal(call.body.email, 'meera@example.com');
  assert.equal(call.body._replyto, 'meera@example.com');
  assert.equal(call.body.customer_name, 'Meera Subramanian');
  assert.equal(call.body.preferred_date, '2026-01-10');
});

test('FormSubmit flags the one-time activation answer instead of reporting success', async () => {
  const fetchImpl = mockFetch([
    jsonResponse({
      success: 'false',
      message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link.",
    }),
  ]);

  const result = await sendViaFormSubmit(buildBookingMessage(sampleBooking), { fetchImpl, settings, ...fast });
  assert.equal(result.ok, false);
  assert.equal(result.activationRequired, true);
});

test('an invalid customer address is never sent as _replyto', async () => {
  const fetchImpl = mockFetch([jsonResponse({ success: 'true' })]);
  await sendViaFormSubmit(buildBookingMessage({ ...sampleBooking, email: 'not-an-email' }), {
    fetchImpl,
    settings,
    replyTo: 'not-an-email',
    ...fast,
  });
  const [call] = fetchImpl.calls;
  assert.equal(call.body._replyto, undefined);
  assert.equal(call.body.email, undefined);
});

/* ---------------------------------------------------------------- *
 * Dispatcher
 * ---------------------------------------------------------------- */

test('a working company server is used first and short-circuits the rest', async () => {
  const fetchImpl = mockFetch([jsonResponse({ ok: true, configured: true, provider: 'resend' })]);
  const storage = fakeStorage();
  const report = await deliverMessage(buildBookingMessage(sampleBooking), {
    fetchImpl,
    storage,
    settings,
    ...fast,
  });

  assert.equal(report.state, DELIVERY_STATES.delivered);
  assert.equal(report.channel, 'backend');
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(getOutbox(storage).length, 0);
});

test('an unconfigured server falls through to FormSubmit without losing the booking', async () => {
  const fetchImpl = mockFetch([
    jsonResponse({ ok: false, configured: false, detail: 'not configured' }, 501),
    jsonResponse({ success: 'true', message: 'Email sent' }),
  ]);
  const storage = fakeStorage();

  const report = await deliverMessage(buildBookingMessage(sampleBooking), {
    fetchImpl,
    storage,
    settings,
    ...fast,
  });

  assert.equal(report.state, DELIVERY_STATES.delivered);
  assert.equal(report.channel, 'formsubmit');
  assert.deepEqual(
    report.attempts.map((attempt) => attempt.channel),
    ['webhook', 'backend', 'formsubmit'],
    'channels are tried in priority order',
  );
  assert.equal(report.attempts[0].skipped, true, 'no personal relay configured yet');
  assert.equal(report.attempts[1].skipped, true, 'server relay not configured');
  assert.equal(report.attempts[2].ok, true);
  assert.equal(getOutbox(storage).length, 0);

  // The transport that actually delivered must be preflight-free, otherwise
  // ad-blockers and strict privacy modes break the booking silently.
  const delivered = fetchImpl.calls.at(-1);
  assert.equal(delivered.transport, 'formdata');
  assert.equal(delivered.init.headers['Content-Type'], undefined, 'the browser sets the multipart boundary');
});

test('a second send skips the missing server relay (probe is cached)', async () => {
  const fetchImpl = mockFetch([
    jsonResponse({ ok: false, configured: false }, 501),
    jsonResponse({ success: 'true' }),
    jsonResponse({ success: 'true' }),
  ]);
  const storage = fakeStorage();

  await deliverMessage(buildBookingMessage(sampleBooking), { fetchImpl, storage, settings, ...fast });
  await deliverMessage(buildBookingMessage(sampleBooking), { fetchImpl, storage, settings, ...fast });

  // 1st delivery = probe + formsubmit, 2nd delivery = formsubmit only
  assert.equal(fetchImpl.calls.length, 3);
  assert.ok(fetchImpl.calls[0].url.endsWith('/api/send-booking'));
  assert.ok(fetchImpl.calls[1].url.includes('formsubmit.co'));
});

test('activation-required answers are queued and explained', async () => {
  const fetchImpl = mockFetch([
    jsonResponse({ ok: false, configured: false }, 501),
    jsonResponse({ success: 'false', message: 'This form needs Activation.' }),
  ]);
  const storage = fakeStorage();

  const report = await deliverMessage(buildBookingMessage(sampleBooking), {
    fetchImpl,
    storage,
    settings,
    reference: 'GM-SR-123456',
    ...fast,
  });

  assert.equal(report.state, DELIVERY_STATES.activation);
  assert.equal(report.queued, true);
  assert.match(report.detail, /Activate Form/);
  assert.equal(getOutbox(storage).length, 1);
  assert.equal(getOutbox(storage)[0].reference, 'GM-SR-123456');
});

test('a network failure still queues the booking so nothing is lost', async () => {
  const fetchImpl = mockFetch([
    () => {
      throw new TypeError('Failed to fetch');
    },
    () => {
      throw new TypeError('Failed to fetch');
    },
  ]);
  const storage = fakeStorage();

  const report = await deliverMessage(buildBookingMessage(sampleBooking), { fetchImpl, storage, settings, ...fast });

  assert.equal(report.state, DELIVERY_STATES.queued);
  assert.equal(report.queued, true);
  assert.equal(getOutbox(storage).length, 1);
  assert.equal(report.attempts[0].ok, false);
});

test('queued bookings are re-sent and removed once a relay accepts them', async () => {
  const storage = fakeStorage();
  queueMessage(
    {
      id: 'queued-1',
      kind: 'booking',
      reference: 'GM-SR-999999',
      message: buildBookingMessage(sampleBooking),
    },
    storage,
  );
  assert.equal(getOutbox(storage).length, 1);

  // First flush: everything fails again -> still queued.
  const failing = mockFetch([
    jsonResponse({ ok: false, configured: false }, 501),
    jsonResponse({ success: 'false', message: 'Service unavailable' }, 503),
  ]);
  const first = await flushOutbox({ fetchImpl: failing, storage, settings, ...fast });
  assert.equal(first.delivered, 0);
  assert.equal(getOutbox(storage).length, 1);
  assert.equal(getOutbox(storage)[0].id, 'queued-1');

  // Second flush: the relay accepts -> queue drains. (The missing server relay
  // is remembered from the first attempt, so only FormSubmit is contacted.)
  const succeeding = mockFetch([jsonResponse({ success: 'true' })]);
  const second = await flushOutbox({ fetchImpl: succeeding, storage, settings, ...fast });
  assert.equal(second.delivered, 1);
  assert.equal(getOutbox(storage).length, 0);
  assert.equal(succeeding.calls.length, 1);
  assert.ok(succeeding.calls[0].url.includes('formsubmit.co'));

  clearOutbox(storage);
  assert.equal(getOutbox(storage).length, 0);
});

test('the outbox never grows past the configured limit', () => {
  const storage = fakeStorage();
  for (let index = 0; index < MAIL_CONFIG.outboxLimit + 10; index += 1) {
    queueMessage({ kind: 'booking', reference: `GM-${index}`, message: buildBookingMessage(sampleBooking) }, storage);
  }
  assert.equal(getOutbox(storage).length, MAIL_CONFIG.outboxLimit);
});

/* ---------------------------------------------------------------- *
 * Resilience: preflight-free transport + automatic retries
 * ---------------------------------------------------------------- */

test('a transient network failure is retried and succeeds on the JSON fallback', async () => {
  const fetchImpl = mockFetch([
    () => {
      throw new TypeError('Failed to fetch');
    },
    jsonResponse({ success: 'true', message: 'Email sent' }),
  ]);

  const result = await sendViaFormSubmit(buildBookingMessage(sampleBooking), {
    fetchImpl,
    settings,
    replyTo: 'meera@example.com',
    retryDelayMs: 0,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    fetchImpl.calls.map((call) => call.transport),
    ['formdata', 'json'],
    'multipart is tried first, JSON is used as the fallback',
  );
  assert.equal(fetchImpl.calls[0].body.customer_name, 'Meera Subramanian');
  assert.equal(fetchImpl.calls[1].body.customer_name, 'Meera Subramanian');
});

test('a blocked relay is reported with an actionable message and queued', async () => {
  const blocked = () => {
    throw new TypeError('Failed to fetch');
  };
  const fetchImpl = mockFetch([blocked, blocked, blocked, blocked]);
  const storage = fakeStorage();

  const report = await deliverMessage(buildBookingMessage(sampleBooking), {
    fetchImpl,
    storage,
    settings,
    ...fast,
  });

  assert.equal(report.state, DELIVERY_STATES.queued);
  assert.match(report.detail, /ad-blocker|blocking/i);
  assert.equal(getOutbox(storage).length, 1, 'the booking is never lost');

  const relayAttempt = report.attempts.find((attempt) => attempt.channel === 'formsubmit');
  assert.ok(relayAttempt.raw.includes('Failed to fetch'), 'raw browser error is kept for diagnostics');
  assert.ok(
    fetchImpl.calls.filter((call) => call.url.includes('formsubmit')).length >= 2,
    'the blocked relay is retried before giving up',
  );
});

test('formsubmit payload keeps the relay-required fields for every transport', () => {
  const payload = buildFormSubmitPayload(buildBookingMessage(sampleBooking), {
    settings,
    replyTo: 'meera@example.com',
  });
  assert.equal(payload._template, 'table');
  assert.equal(payload._captcha, 'false');
  assert.equal(payload.email, 'meera@example.com');
  assert.equal(payload._replyto, 'meera@example.com');
  assert.equal(payload.customer_name, 'Meera Subramanian');
  assert.equal(payload.customer_phone, '+91 90000 00000');
});

/* ---------------------------------------------------------------- *
 * The owner's own relay (Google Apps Script / Zapier / Make)
 * ---------------------------------------------------------------- */

test('the personal relay is tried first and short-circuits everything else', async () => {
  const fetchImpl = mockFetch([jsonResponse({ ok: true, detail: 'Mail sent from your Gmail' })]);
  const storage = fakeStorage();
  const ownRelay = {
    recipient: 'owner@example.com',
    cc: [],
    disabledChannels: [],
    webhookUrl: 'https://script.google.com/macros/s/AKfycbxxxx/exec',
    webhookSecret: 'shared-secret',
  };

  const report = await deliverMessage(buildBookingMessage(sampleBooking), {
    fetchImpl,
    storage,
    settings: ownRelay,
    ...fast,
  });

  assert.equal(report.state, DELIVERY_STATES.delivered);
  assert.equal(report.channel, 'webhook');
  assert.equal(fetchImpl.calls.length, 1, 'nothing else is contacted once your own relay accepts');
  const [call] = fetchImpl.calls;
  assert.equal(call.transport, 'text', 'sent as a CORS-simple request: no preflight');
  assert.equal(call.body.secret, 'shared-secret');
  assert.equal(call.body.to, 'owner@example.com');
  assert.match(call.body.subject, /GM-SR-123456/);
  assert.equal(call.body.fields.customer_name, 'Meera Subramanian');
});

test('a relay that refuses CORS still receives the message (opaque retry)', async () => {
  const fetchImpl = mockFetch([
    () => {
      throw new TypeError('Failed to fetch');
    },
    jsonResponse({}),
  ]);
  const result = await sendViaWebhook(buildBookingMessage(sampleBooking), {
    fetchImpl,
    settings: { recipient: 'o@example.com', cc: [], disabledChannels: [], webhookUrl: 'https://example.com/hook' },
    retryDelayMs: 0,
  });
  assert.equal(result.ok, true);
  assert.equal(result.opaque, true);
  assert.deepEqual(fetchImpl.calls.map((call) => call.transport), ['text', 'nocors']);
});

test('an own relay that answers with an HTTP error is not treated as delivered', async () => {
  const fetchImpl = mockFetch([jsonResponse({ detail: 'Script error' }, 500)]);
  const result = await sendViaWebhook(buildBookingMessage(sampleBooking), {
    fetchImpl,
    settings: { recipient: 'o@example.com', cc: [], disabledChannels: [], webhookUrl: 'https://example.com/hook' },
    retryDelayMs: 0,
  });
  assert.equal(result.ok, false);
  assert.match(result.detail, /Script error|HTTP 500/);
});

test('a misconfigured personal relay URL is ignored instead of breaking the pipeline', async () => {
  const fetchImpl = mockFetch([
    jsonResponse({ ok: false, configured: false }, 501),
    jsonResponse({ success: 'true' }),
  ]);
  const report = await deliverMessage(buildBookingMessage(sampleBooking), {
    fetchImpl,
    storage: fakeStorage(),
    settings: { recipient: 'o@example.com', cc: [], disabledChannels: [], webhookUrl: 'not-a-url' },
    ...fast,
  });
  assert.equal(report.state, DELIVERY_STATES.delivered);
  assert.equal(report.channel, 'formsubmit');
  assert.equal(report.attempts[0].skipped, true);
});

test('isHttpUrl only accepts https (and local dev) endpoints', () => {
  ['https://script.google.com/macros/s/x/exec', 'https://hooks.zapier.com/hooks/catch/1/2', 'http://localhost:8787/hook'].forEach(
    (value) => assert.ok(isHttpUrl(value), `accepts ${value}`),
  );
  ['', 'not-a-url', 'ftp://example.com', 'javascript:alert(1)', 'http://example.com/hook'].forEach((value) =>
    assert.ok(!isHttpUrl(value), `rejects ${value}`),
  );
});

test('the personal relay is remembered per browser through settings', () => {
  const storage = fakeStorage();
  saveMailSettings({ webhookUrl: 'https://script.google.com/macros/s/abc/exec', webhookSecret: 's3cret', web3formsKey: 'key-1' }, storage);
  const saved = getMailSettings(storage);
  assert.equal(saved.webhookUrl, 'https://script.google.com/macros/s/abc/exec');
  assert.equal(saved.webhookSecret, 's3cret');
  assert.equal(saved.web3formsKey, 'key-1');

  saveMailSettings({ webhookUrl: 'http://evil.example.com/hook' }, storage);
  assert.equal(getMailSettings(storage).webhookUrl, '', 'plain http relays are refused');
});

test('channel priority is own relay, server relay, FormSubmit, Web3Forms', () => {
  assert.deepEqual(CHANNEL_ORDER, ['webhook', 'backend', 'formsubmit', 'web3forms']);
});
