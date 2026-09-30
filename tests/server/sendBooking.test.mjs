/**
 * Tests for the optional serverless mail relay:
 *   - server/mailProvider.mjs      (Resend / SendGrid / Brevo mapping)
 *   - netlify/functions/send-booking.mjs
 *   - api/send-booking.js          (Vercel handler)
 *
 *   node --test tests/server/sendBooking.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readProviderConfig,
  parseFrom,
  parseAddressList,
  validatePayload,
  sendWithProvider,
  DEFAULT_RECIPIENT,
} from '../../server/mailProvider.mjs';
import netlifyHandler from '../../netlify/functions/send-booking.mjs';
import vercelHandler from '../../api/send-booking.js';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const providerEnv = {
  MAIL_PROVIDER: 'resend',
  MAIL_API_KEY: 'test-key',
  MAIL_FROM: 'Grid Master Bookings <bookings@gridmaster.test>',
};

function setEnv(env) {
  ['MAIL_PROVIDER', 'MAIL_API_KEY', 'MAIL_FROM', 'MAIL_TO', 'MAIL_CC', 'MAIL_WEBHOOK_URL', 'MAIL_WEBHOOK_SECRET'].forEach(
    (key) => delete process.env[key],
  );
  Object.assign(process.env, env);
}

/** Captures the outgoing provider request and returns a canned answer. */
function stubFetch(answer = { status: 200, body: { id: 'msg_1' } }) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: init?.body ? JSON.parse(init.body) : null });
    return {
      ok: answer.status >= 200 && answer.status < 300,
      status: answer.status,
      json: async () => answer.body,
    };
  };
  return calls;
}

const validPayload = {
  subject: 'New Solar Booking [GM-SR-123456] — Meera Subramanian',
  text: 'Booking details…',
  html: '<div>Booking details…</div>',
  replyTo: 'meera@example.com',
};

function fakeVercelRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    ended: false,
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test.afterEach(() => {
  setEnv({});
});

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

test('the relay reports itself as unconfigured when no provider is set', () => {
  setEnv({});
  const cfg = readProviderConfig(process.env);
  assert.equal(cfg.configured, false);
  assert.match(cfg.reason, /MAIL_PROVIDER/);
});

test('a complete provider configuration is accepted and defaults the recipient', () => {
  setEnv(providerEnv);
  const cfg = readProviderConfig(process.env);
  assert.equal(cfg.configured, true);
  assert.equal(cfg.provider, 'resend');
  assert.equal(cfg.from.email, 'bookings@gridmaster.test');
  assert.equal(cfg.from.name, 'Grid Master Bookings');
  assert.deepEqual(cfg.to, [DEFAULT_RECIPIENT]);
  assert.deepEqual(cfg.cc, []);
});

test('extra copies are parsed and invalid ones ignored', () => {
  setEnv({ ...providerEnv, MAIL_TO: 'sales@gridmaster.test', MAIL_CC: 'engineer@gridmaster.test, not-an-email' });
  const cfg = readProviderConfig(process.env);
  assert.deepEqual(cfg.to, ['sales@gridmaster.test']);
  assert.deepEqual(cfg.cc, ['engineer@gridmaster.test']);
  assert.deepEqual(parseAddressList('a@b.co, ,c@d.co'), ['a@b.co', 'c@d.co']);
  assert.deepEqual(parseFrom('bookings@gridmaster.test'), { name: 'Grid Master Website', email: 'bookings@gridmaster.test' });
});

test('validatePayload strips header injections and refuses empty messages', () => {
  assert.equal(validatePayload({ subject: '', text: 'x' }).ok, false);
  assert.equal(validatePayload({ subject: 'x', text: '', html: '' }).ok, false);
  const ok = validatePayload({ subject: 'Hello\r\nBcc: evil@example.com', text: 'body', replyTo: 'nope' });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.subject, 'Hello Bcc: evil@example.com');
  assert.equal(ok.value.replyTo, undefined);
});

/* ------------------------------------------------------------------ *
 * Provider mapping
 * ------------------------------------------------------------------ */

test('Resend receives the mapped message', async () => {
  setEnv(providerEnv);
  const calls = stubFetch();
  const cfg = readProviderConfig(process.env);
  const result = await sendWithProvider(validatePayload(validPayload).value, cfg);

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'resend');
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key');
  assert.equal(calls[0].body.from, 'Grid Master Bookings <bookings@gridmaster.test>');
  assert.deepEqual(calls[0].body.to, [DEFAULT_RECIPIENT]);
  assert.equal(calls[0].body.reply_to, 'meera@example.com');
  assert.match(calls[0].body.subject, /GM-SR-123456/);
});

test('SendGrid receives personalizations with both text and html parts', async () => {
  setEnv({ ...providerEnv, MAIL_PROVIDER: 'sendgrid' });
  const calls = stubFetch({ status: 202, body: {} });
  const cfg = readProviderConfig(process.env);
  const result = await sendWithProvider(validatePayload(validPayload).value, cfg);

  assert.equal(result.ok, true);
  assert.equal(calls[0].url, 'https://api.sendgrid.com/v3/mail/send');
  assert.equal(calls[0].body.personalizations[0].to[0].email, DEFAULT_RECIPIENT);
  assert.equal(calls[0].body.personalizations[0].subject.includes('GM-SR-123456'), true);
  assert.deepEqual(calls[0].body.content.map((part) => part.type), ['text/plain', 'text/html']);
});

test('Brevo receives sender, recipients and reply-to', async () => {
  setEnv({ ...providerEnv, MAIL_PROVIDER: 'brevo' });
  const calls = stubFetch({ status: 201, body: { messageId: 'abc' } });
  const cfg = readProviderConfig(process.env);
  const result = await sendWithProvider(validatePayload(validPayload).value, cfg);

  assert.equal(result.ok, true);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].init.headers['api-key'], 'test-key');
  assert.equal(calls[0].body.sender.email, 'bookings@gridmaster.test');
  assert.equal(calls[0].body.to[0].email, DEFAULT_RECIPIENT);
});

test('the webhook provider posts to the owner relay (Apps Script / Zapier)', async () => {
  setEnv({
    MAIL_PROVIDER: 'webhook',
    MAIL_WEBHOOK_URL: 'https://script.google.com/macros/s/AKfycb/exec',
    MAIL_WEBHOOK_SECRET: 'shared-secret',
  });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, detail: 'Delivered from Gmail' }) };
  };

  const cfg = readProviderConfig(process.env);
  assert.equal(cfg.configured, true);
  const result = await sendWithProvider(validatePayload(validPayload).value, cfg);

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'webhook');
  assert.equal(calls[0].url, 'https://script.google.com/macros/s/AKfycb/exec');
  assert.equal(calls[0].init.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.equal(calls[0].body.secret, 'shared-secret');
  assert.equal(calls[0].body.to, DEFAULT_RECIPIENT);
  assert.equal(calls[0].body.replyTo, 'meera@example.com');
});

test('a webhook relay that reports an error is not counted as delivered', async () => {
  setEnv({ MAIL_PROVIDER: 'webhook', MAIL_WEBHOOK_URL: 'https://example.com/hook' });
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => JSON.stringify({ ok: false, detail: 'Script error' }),
  });

  const cfg = readProviderConfig(process.env);
  const result = await sendWithProvider(validatePayload(validPayload).value, cfg);
  assert.equal(result.ok, false);
  assert.match(result.detail, /Script error/);
});

test('the webhook provider needs a valid https URL', () => {
  setEnv({ MAIL_PROVIDER: 'webhook' });
  assert.match(readProviderConfig(process.env).reason, /MAIL_WEBHOOK_URL/);
  setEnv({ MAIL_PROVIDER: 'webhook', MAIL_WEBHOOK_URL: 'http://insecure.example.com/hook' });
  assert.equal(readProviderConfig(process.env).configured, false);
});

test('provider errors are reported instead of swallowed', async () => {
  setEnv(providerEnv);
  stubFetch({ status: 401, body: { message: 'Invalid API key' } });
  const cfg = readProviderConfig(process.env);
  const result = await sendWithProvider(validatePayload(validPayload).value, cfg);
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.match(result.detail, /Invalid API key/);
});

/* ------------------------------------------------------------------ *
 * Endpoints
 * ------------------------------------------------------------------ */

test('the Netlify endpoint answers 501 when unconfigured so the site can fall back', async () => {
  setEnv({});
  const response = await netlifyHandler(new Request('https://gridmaster.test/api/send-booking', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 501);
  const body = await response.json();
  assert.equal(body.configured, false);
});

test('the Netlify endpoint sends a real booking through the provider', async () => {
  setEnv(providerEnv);
  const calls = stubFetch();
  const response = await netlifyHandler(
    new Request('https://gridmaster.test/api/send-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    }),
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.provider, 'resend');
  assert.equal(calls.length, 1);
});

test('the Netlify endpoint rejects malformed and empty payloads', async () => {
  setEnv(providerEnv);
  stubFetch();

  const bad = await netlifyHandler(
    new Request('https://gridmaster.test/api/send-booking', { method: 'POST', body: 'not json' }),
  );
  assert.equal(bad.status, 400);

  const empty = await netlifyHandler(
    new Request('https://gridmaster.test/api/send-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: '', text: '' }),
    }),
  );
  assert.equal(empty.status, 422);

  const wrongMethod = await netlifyHandler(new Request('https://gridmaster.test/api/send-booking', { method: 'GET' }));
  assert.equal(wrongMethod.status, 405);
});

test('the Vercel endpoint mirrors the Netlify behaviour', async () => {
  setEnv({});
  const unconfigured = fakeVercelRes();
  await vercelHandler({ method: 'POST', body: {} }, unconfigured);
  assert.equal(unconfigured.statusCode, 501);
  assert.equal(unconfigured.body.configured, false);

  setEnv(providerEnv);
  const calls = stubFetch();
  const ok = fakeVercelRes();
  await vercelHandler({ method: 'POST', body: validPayload, headers: {} }, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.ok, true);
  assert.equal(calls.length, 1);

  const wrongMethod = fakeVercelRes();
  await vercelHandler({ method: 'GET', headers: {} }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
});
