/**
 * Thin-adapter tests: the Vercel function entry and the Netlify function entry
 * must both hand the request to the shared handler and return its JSON answer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import vercelHandler from '../api/booking.js';
import { handler as netlifyHandler } from '../netlify/functions/booking.mjs';

const BOOKING = {
  booking_reference: 'GM-SR-777777',
  customer_name: 'Bollapelly Meghana',
  customer_phone: '9391103814',
  customer_email: 'meghana@example.com',
  property_location: 'Jayashankar Bhupalapally',
  purpose: 'Home (Residential)',
  service_required: 'Full Package (Design + Install + Grid Integration)',
  scheduled_date: '2026-10-03',
  time_slot: '09:00 AM - 11:00 AM',
};

function fakeVercelRes() {
  return {
    statusCode: 0,
    headers: {},
    payload: '',
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    send(body) {
      this.payload = body;
      return this;
    },
  };
}

test('Vercel adapter answers 501 (configured:false) with no MAIL_* variables', async () => {
  const res = fakeVercelRes();
  await vercelHandler({ method: 'POST', headers: {}, body: JSON.stringify(BOOKING) }, res);

  assert.equal(res.statusCode, 501);
  assert.equal(JSON.parse(res.payload).configured, false);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
});

test('Vercel adapter accepts a parsed object body and reports success', async () => {
  const previous = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 200, ok: true, text: async () => '{"id":"ok"}' });

  try {
    const res = fakeVercelRes();
    await vercelHandler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.9' }, body: BOOKING }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.payload).success, true);
  } finally {
    if (previous === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous;
    globalThis.fetch = originalFetch;
  }
});

test('Netlify adapter returns the same shape', async () => {
  const result = await netlifyHandler({
    httpMethod: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.11' },
    body: JSON.stringify(BOOKING),
  });

  assert.equal(typeof result.statusCode, 'number');
  assert.equal(result.statusCode, 501);
  assert.equal(JSON.parse(result.body).configured, false);
});
