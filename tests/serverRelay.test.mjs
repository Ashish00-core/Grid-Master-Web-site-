/**
 * Tests for the site's own mail relay: provider selection, mail rendering and
 * the request handler used by both `api/booking.js` and the Netlify function.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_INBOX,
  renderBookingMail,
  resolveProvider,
  sendBookingMail,
  extractError,
} from '../server/mailProvider.mjs';
import { handleBookingRequest, validateBooking } from '../server/handleBooking.mjs';

const BOOKING = {
  booking_reference: 'GM-SR-424242',
  customer_name: 'Bollapelly Meghana',
  customer_phone: '9391103814',
  customer_email: 'meghana@example.com',
  property_location: 'Jayashankar Bhupalapally',
  purpose: 'Home (Residential)',
  service_required: 'Full Package (Design + Install + Grid Integration)',
  lead_engineer: 'Ashish Kumar (Solar Designer Engineer)',
  scheduled_date: '2026-10-03',
  time_slot: '09:00 AM - 11:00 AM',
  notes: 'Roof size 900 sq ft',
  _subject: 'New Solar Integration Booking [GM-SR-424242] - Bollapelly Meghana',
};

const postEvent = (booking, overrides = {}) => ({
  httpMethod: 'POST',
  headers: { 'x-forwarded-for': '203.0.113.7' },
  body: JSON.stringify(booking),
  ...overrides,
});

const okFetch = (captured = []) => async (url, init) => {
  captured.push({ url, init });
  return { status: 200, ok: true, text: async () => '{"id":"abc"}' };
};

/* ------------------------------------------------------------------ */
/* mail rendering                                                      */
/* ------------------------------------------------------------------ */

test('the rendered booking mail contains every customer detail', () => {
  const mail = renderBookingMail(BOOKING);

  assert.match(mail.subject, /GM-SR-424242/);
  assert.match(mail.textBody, /Bollapelly Meghana/);
  assert.match(mail.textBody, /9391103814/);
  assert.match(mail.textBody, /Jayashankar Bhupalapally/);
  assert.match(mail.textBody, /09:00 AM - 11:00 AM/);
  assert.match(mail.htmlBody, /Grid Master Solar Systems/);
  assert.equal(mail.to, DEFAULT_INBOX);
});

test('HTML in a submission is escaped before it reaches the inbox', () => {
  const mail = renderBookingMail({ ...BOOKING, notes: '<script>alert(1)</script>' });
  assert.ok(!mail.htmlBody.includes('<script>'));
  assert.match(mail.htmlBody, /&lt;script&gt;/);
});

/* ------------------------------------------------------------------ */
/* provider selection                                                  */
/* ------------------------------------------------------------------ */

test('no configuration means "not configured" (the browser then falls back)', () => {
  const provider = resolveProvider({});
  assert.equal(provider.configured, false);
  assert.equal(provider.name, 'none');
});

test('each supported provider is detected from its variable', () => {
  assert.equal(resolveProvider({ RESEND_API_KEY: 're_x' }).name, 'resend');
  assert.equal(resolveProvider({ BREVO_API_KEY: 'xkeysib' }).name, 'brevo');
  assert.equal(resolveProvider({ SENDGRID_API_KEY: 'SG.x' }).name, 'sendgrid');
  assert.equal(resolveProvider({ WEB3FORMS_KEY: 'uuid' }).name, 'web3forms');
  assert.equal(resolveProvider({ MAIL_WEBHOOK_URL: 'https://example.com/hook' }).name, 'webhook');
  assert.equal(resolveProvider({ RESEND_API_KEY: 're_x', BREVO_API_KEY: 'b' }).name, 'resend', 'first match wins');
});

test('MAIL_TO decides the destination inbox', () => {
  assert.equal(resolveProvider({ RESEND_API_KEY: 're_x', MAIL_TO: 'hello@grid.example' }).to, 'hello@grid.example');
  assert.equal(resolveProvider({ RESEND_API_KEY: 're_x' }).to, DEFAULT_INBOX);
});

test('sendBookingMail reports "not configured" without calling anything', async () => {
  let called = 0;
  const result = await sendBookingMail({
    booking: BOOKING,
    env: {},
    fetchImpl: async () => {
      called += 1;
      return { ok: true, status: 200, text: async () => '' };
    },
  });

  assert.equal(result.configured, false);
  assert.equal(result.ok, false);
  assert.equal(called, 0);
});

test('sendBookingMail posts the mail to Resend with reply-to set to the customer', async () => {
  const captured = [];
  const result = await sendBookingMail({
    booking: BOOKING,
    env: { RESEND_API_KEY: 're_test', MAIL_TO: 'bookings@grid.example' },
    fetchImpl: okFetch(captured),
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'resend');
  assert.equal(captured.length, 1);
  assert.equal(captured[0].url, 'https://api.resend.com/emails');

  const body = JSON.parse(captured[0].init.body);
  assert.deepEqual(body.to, ['bookings@grid.example']);
  assert.equal(body.reply_to, 'meghana@example.com');
  assert.match(body.subject, /GM-SR-424242/);
});

test('sendBookingMail surfaces the provider error instead of pretending to send', async () => {
  const result = await sendBookingMail({
    booking: BOOKING,
    env: { BREVO_API_KEY: 'key' },
    fetchImpl: async () => ({
      status: 401,
      ok: false,
      text: async () => '{"message":"Key not found"}',
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.match(result.error, /Key not found/);
});

test('extractError understands the provider error shapes', () => {
  assert.equal(extractError('{"error":{"message":"bad key"}}'), 'bad key');
  assert.equal(extractError('{"message":"nope"}'), 'nope');
  assert.equal(extractError('plain text'), 'plain text');
  assert.equal(extractError(''), '');
});

/* ------------------------------------------------------------------ */
/* request handler                                                     */
/* ------------------------------------------------------------------ */

test('validation rejects incomplete bookings', () => {
  assert.equal(validateBooking(BOOKING), null);
  assert.match(validateBooking({ ...BOOKING, customer_name: '' }), /name/i);
  assert.match(validateBooking({ ...BOOKING, customer_phone: '12' }), /phone/i);
  assert.match(validateBooking({ ...BOOKING, customer_email: 'nope' }), /email/i);
  assert.match(validateBooking({ ...BOOKING, property_location: '' }), /location/i);
  assert.match(validateBooking({ ...BOOKING, _honey: 'bot' }), /spam/i);
});

test('POST /api/booking answers 501 when the host has no mail provider', async () => {
  const res = await handleBookingRequest(postEvent(BOOKING), { env: {} });
  assert.equal(res.statusCode, 501);
  assert.equal(JSON.parse(res.body).configured, false);
});

test('POST /api/booking sends the mail when a provider is configured', async () => {
  const captured = [];
  const res = await handleBookingRequest(postEvent(BOOKING), {
    env: { RESEND_API_KEY: 're_test' },
    fetchImpl: okFetch(captured),
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.provider, 'resend');
  assert.equal(captured.length, 1);
});

test('POST /api/booking accepts the { booking } envelope too', async () => {
  const res = await handleBookingRequest(postEvent({ booking: BOOKING }), {
    env: { RESEND_API_KEY: 're_test' },
    fetchImpl: okFetch(),
  });
  assert.equal(res.statusCode, 200);
});

test('POST /api/booking rejects invalid input and non-POST methods', async () => {
  const invalid = await handleBookingRequest(postEvent({ ...BOOKING, customer_email: 'x' }), {
    env: { RESEND_API_KEY: 're_test' },
    fetchImpl: okFetch(),
  });
  assert.equal(invalid.statusCode, 400);

  const wrongMethod = await handleBookingRequest(postEvent(BOOKING, { httpMethod: 'GET' }), {
    env: { RESEND_API_KEY: 're_test' },
  });
  assert.equal(wrongMethod.statusCode, 405);

  const badJson = await handleBookingRequest(postEvent(undefined, { body: '{oops' }), {
    env: { RESEND_API_KEY: 're_test' },
  });
  assert.equal(badJson.statusCode, 400);
});

test('POST /api/booking reports a provider failure as 502', async () => {
  const res = await handleBookingRequest(postEvent(BOOKING), {
    env: { RESEND_API_KEY: 're_test' },
    fetchImpl: async () => ({ status: 422, ok: false, text: async () => '{"message":"Invalid from"}' }),
  });

  assert.equal(res.statusCode, 502);
  assert.match(JSON.parse(res.body).error, /Invalid from/);
});

test('the endpoint throttles repeated submissions from one address', async () => {
  const env = { WEB3FORMS_KEY: 'uuid' };
  const fetchImpl = okFetch();
  let last;

  for (let i = 0; i < 14; i += 1) {
    last = await handleBookingRequest(postEvent(BOOKING, { headers: { 'x-forwarded-for': '198.51.100.42' } }), {
      env,
      fetchImpl,
    });
  }

  assert.equal(last.statusCode, 429);
});
