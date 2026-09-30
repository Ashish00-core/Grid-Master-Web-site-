/**
 * Booking mail delivery.
 *
 * Why this module exists
 * ----------------------
 * The booking form used to fire a single cross-origin `fetch` at
 * `https://formsubmit.co/ajax/<inbox>` with a JSON body and then treat any
 * completed request as "sent". That fails silently in several common cases:
 *
 *  1. FormSubmit discards every submission until the recipient inbox confirms
 *     the one-time "Activate Form" mail. It answers `{"success":"false",
 *     "message":"This form needs Activation..."}` and nothing is delivered.
 *  2. Ad-blockers / privacy extensions / filtered networks drop requests to
 *     formsubmit.co, and the browser reports it as an opaque "Failed to fetch".
 *  3. A JSON body forces a CORS preflight (OPTIONS) that those same setups
 *     refuse even when the POST itself would have worked.
 *  4. The UI printed "Sent" regardless of the relay's real answer.
 *
 * This module talks to up to three relays, in order, and reports honestly what
 * happened. A booking that could not be delivered is queued in localStorage and
 * retried later, so a customer's details are never silently lost.
 *
 *   1. own relay  -> /api/booking (Vercel) or /.netlify/functions/booking.
 *                    Same-origin, no activation, no CORS. Sends from the
 *                    company's own mail provider (Resend / Brevo / SendGrid /
 *                    Web3Forms / any webhook). Returns 501 when the host has no
 *                    MAIL_* variables configured, in which case we fall through.
 *   2. FormSubmit -> preflight-free multipart POST, JSON as a second attempt.
 *   3. nothing left to try -> the caller offers mail-app / WhatsApp / phone
 *                    fallbacks that carry the whole booking.
 */

export const RELAY_ENDPOINTS = ['/api/booking', '/.netlify/functions/booking'];

/**
 * Fallback FormSubmit endpoint. The app always passes `COMPANY_INFO.email`, but
 * bookings queued by an older build carry no inbox — they must still be
 * deliverable from here.
 */
export const FALLBACK_INBOX = 'contactgridmaster@gmail.com';

export const QUEUE_KEY = 'grid-master-booking-queue';
export const RELAY_PROBE_KEY = 'grid-master-relay-probe';

const REQUEST_TIMEOUT_MS = 15000;

/** Delivery outcomes surfaced to the visitor. */
export const DELIVERY = {
  DELIVERED: 'delivered', // a relay confirmed the hand-off
  ACTIVATION: 'activation-pending', // FormSubmit wants its one-time activation click
  BLOCKED: 'blocked', // browser/extension/network stopped the request
  FAILED: 'failed', // relay answered but refused the submission
  OFFLINE: 'offline', // device is not online
};

/**
 * @typedef {Object} BookingFields
 * @property {string} customerName
 * @property {string} customerPhone
 * @property {string} customerEmail
 * @property {string} propertyAddress
 * @property {string} purpose           "home" | "building"
 * @property {string} serviceType
 * @property {string} leadEngineer
 * @property {string} date              ISO yyyy-mm-dd
 * @property {string} timeSlot
 * @property {string} notes
 * @property {string} [quoteSummary]
 * @property {string} [quoteTotal]
 */

const prettyPurpose = (purpose) =>
  purpose === 'home' ? 'Home (Residential)' : 'Building (Commercial)';

/** Assemble the human-readable payload both relays and the receipt share. */
export function buildBookingPayload(fields, { reference, inbox }) {
  const name = (fields.customerName || '').trim();
  const payload = {
    _subject: `New Solar Integration Booking [${reference}] - ${name || 'Website visitor'}`,
    _template: 'table',
    _captcha: 'false',
    _replyto: (fields.customerEmail || '').trim(),
    // FormSubmit only honours `_replyto` when the form carries an `email` field.
    email: (fields.customerEmail || '').trim(),
    form_name: 'Grid Master Solar Booking',
    booking_reference: reference,
    customer_name: name,
    customer_phone: (fields.customerPhone || '').trim(),
    customer_email: (fields.customerEmail || '').trim(),
    property_location: fields.propertyAddress || '',
    purpose: prettyPurpose(fields.purpose),
    service_required: fields.serviceType || '',
    lead_engineer: fields.leadEngineer || '',
    scheduled_date: fields.date || '',
    time_slot: fields.timeSlot || '',
    notes: fields.notes || 'None provided',
  };

  if (fields.quoteSummary) {
    payload.selected_equipment = fields.quoteSummary;
    payload.equipment_package_total = fields.quoteTotal || '';
  }
  // NOTE: no `_cc` by default — the relay already delivers to `inbox`, and a CC
  // to the same address would simply duplicate every booking mail. Add a second
  // address here (and only a different one) if a colleague must be copied.
  return payload;
}

/** Drop relay directives that must not show up in the customer's receipt. */
export function payloadToReadableFields(payload) {
  const out = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (key.startsWith('_')) return;
    out[key] = value;
  });
  return out;
}

/**
 * Multipart form body — `Content-Type` stays unset so the browser adds the
 * boundary itself, which means no CORS preflight is triggered.
 */
export function payloadToFormData(payload, { FormDataImpl } = {}) {
  const FD = FormDataImpl || (typeof FormData !== 'undefined' ? FormData : null);
  if (!FD) throw new Error('FormData is not available in this environment');
  const form = new FD();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    form.append(key, String(value));
  });
  // Honeypot: scrapers fill it, humans never see it. Empty value = not spam.
  form.append('_honey', '');
  return form;
}

const text = (value) => (typeof value === 'string' ? value : '');

/** FormSubmit answers `{"success":true}` / `{"success":"false","message":"..."}`. */
export function interpretFormSubmit(status, body) {
  const data = typeof body === 'string' ? safeJson(body) : body || {};
  const success = data.success === true || data.success === 'true';
  const message = text(data.message);

  if (success) {
    return { ok: true, state: DELIVERY.DELIVERED, message: message || 'Accepted by the mail relay.' };
  }
  if (/needs? activation|activate form|not activated|activation/i.test(message)) {
    return { ok: false, state: DELIVERY.ACTIVATION, message };
  }
  if (/too many|rate ?limit|try again later/i.test(message)) {
    return { ok: false, state: DELIVERY.FAILED, message };
  }
  if (!status || status >= 500) {
    return {
      ok: false,
      state: DELIVERY.FAILED,
      message: message || `The mail relay answered with HTTP ${status || 'error'}.`,
    };
  }
  return {
    ok: false,
    state: DELIVERY.FAILED,
    message: message || `The mail relay refused the booking (HTTP ${status}).`,
  };
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function isJson(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object';
  } catch {
    return false;
  }
}

async function postWithTimeout(fetchImpl, url, options = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;
  try {
    const res = await fetchImpl(url, { ...options, signal: controller ? controller.signal : undefined });
    const raw = await res.text().catch(() => '');
    const json = safeJson(raw);
    return { status: res.status, ok: res.ok, raw, json, validJson: isJson(raw) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * Relay 1 — the site's own serverless function (same origin, no CORS)
 * ------------------------------------------------------------------ */

/** `true` once we know this host has no mail provider configured. */
function relayDisabledForSession(storage) {
  try {
    return storage?.getItem(RELAY_PROBE_KEY) === 'disabled';
  } catch {
    return false;
  }
}

function rememberRelayDisabled(storage) {
  try {
    storage?.setItem(RELAY_PROBE_KEY, 'disabled');
  } catch {
    /* storage is optional */
  }
}

export async function deliverViaServerRelay(payload, options = {}) {
  const {
    fetchImpl = typeof fetch !== 'undefined' ? fetch : null,
    endpoints = RELAY_ENDPOINTS,
    storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null,
  } = options;

  if (!fetchImpl) return { ok: false, state: DELIVERY.FAILED, skipped: true, message: 'No fetch available.' };
  if (relayDisabledForSession(storage)) {
    return { ok: false, state: DELIVERY.FAILED, skipped: true, message: 'No mail provider configured on this host.' };
  }

  let lastMessage = '';
  for (const endpoint of endpoints) {
    let res;
    try {
      res = await postWithTimeout(fetchImpl, endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      lastMessage = describeError(error);
      continue;
    }

    // Not deployed on this host — try the other convention, then give up quietly.
    // A static host answers the SPA fallback (HTTP 200 + index.html) for
    // unknown paths, so a 200 that is not our JSON counts as "no relay here".
    if (res.status === 404 || res.status === 405 || res.status === 501 || (res.status === 200 && !res.validJson)) {
      lastMessage = text(res.json?.error) || `HTTP ${res.status}`;
      continue;
    }

    if (res.ok && (res.json?.success === true || res.json?.success === 'true')) {
      return {
        ok: true,
        state: DELIVERY.DELIVERED,
        channel: 'server',
        provider: res.json?.provider,
        status: res.status,
        message: text(res.json?.message) || 'Sent from the company mail relay.',
      };
    }
    if (res.status === 501) {
      lastMessage = text(res.json?.error) || 'No mail provider configured on this host.';
      continue;
    }
    lastMessage = text(res.json?.error) || text(res.json?.message) || `HTTP ${res.status}`;
  }

  rememberRelayDisabled(storage);
  return { ok: false, state: DELIVERY.FAILED, channel: 'server', skipped: true, message: lastMessage };
}

/* ------------------------------------------------------------------ *
 * Relay 2 — FormSubmit (works with zero configuration, needs activation)
 * ------------------------------------------------------------------ */

export async function deliverViaFormSubmit(payload, options = {}) {
  const {
    fetchImpl = typeof fetch !== 'undefined' ? fetch : null,
    inbox = FALLBACK_INBOX,
    ajaxBase = 'https://formsubmit.co/ajax/',
  } = options;

  if (!fetchImpl || !inbox) {
    return { ok: false, state: DELIVERY.FAILED, channel: 'formsubmit', message: 'Mail relay unavailable.' };
  }

  const url = ajaxBase + inbox;
  const attempts = [];

  // Attempt 1: multipart (no preflight). Attempt 2: JSON (some proxies prefer it).
  const transports = [];
  try {
    transports.push({ kind: 'multipart', init: { method: 'POST', headers: { Accept: 'application/json' }, body: payloadToFormData(payload, options) } });
  } catch {
    /* FormData unsupported — JSON only */
  }
  transports.push({
    kind: 'json',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    },
  });

  let last = null;
  for (const transport of transports) {
    let res;
    try {
      res = await postWithTimeout(fetchImpl, url, transport.init);
    } catch (error) {
      last = { ok: false, state: DELIVERY.BLOCKED, channel: 'formsubmit', transport: transport.kind, message: describeError(error) };
      attempts.push(last);
      continue;
    }

    const verdict = interpretFormSubmit(res.status, res.raw || res.json);
    last = { ...verdict, channel: 'formsubmit', transport: transport.kind, status: res.status };
    attempts.push(last);

    if (verdict.ok) return { ...last, attempts };
    // An activation or rate-limit answer will not change on a retry with
    // another transport — report it right away instead of double-posting.
    if (verdict.state === DELIVERY.ACTIVATION || res.status === 429 || res.status < 500) {
      return { ...last, attempts };
    }
  }

  return { ...(last || { ok: false, state: DELIVERY.FAILED, message: 'No transport available.' }), attempts };
}

/* ------------------------------------------------------------------ *
 * Orchestration
 * ------------------------------------------------------------------ */

/**
 * Try every automatic relay, best first. Never throws.
 * @returns {Promise<{ok: boolean, state: string, channel?: string, message: string, attempts: Array}>}
 */
export async function deliverBooking(payload, options = {}) {
  const { online = typeof navigator === 'undefined' ? true : navigator.onLine !== false } = options;

  if (!online) {
    return {
      ok: false,
      state: DELIVERY.OFFLINE,
      attempts: [],
      message: 'This device is offline — the booking is saved and will be sent automatically when you reconnect.',
    };
  }

  const attempts = [];

  const server = await deliverViaServerRelay(payload, options);
  attempts.push(server);
  if (server.ok) return { ...server, attempts };

  const fs = await deliverViaFormSubmit(payload, options);
  attempts.push(...(fs.attempts || [fs]));
  if (fs.ok) return { ...fs, attempts };

  // Prefer the most actionable diagnosis for the visitor.
  const state =
    fs.state === DELIVERY.ACTIVATION
      ? DELIVERY.ACTIVATION
      : fs.state === DELIVERY.BLOCKED
        ? DELIVERY.BLOCKED
        : DELIVERY.FAILED;

  return { ok: false, state, channel: fs.channel, message: fs.message, attempts };
}

export function describeError(error) {
  if (!error) return 'Unknown network error.';
  if (error.name === 'AbortError') return 'The mail relay did not answer in time.';
  const message = error.message || String(error);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'The browser could not reach the mail relay (offline, blocked by an ad-blocker, or the request was refused).';
  }
  return message;
}

/* ------------------------------------------------------------------ *
 * Retry queue — a booking that could not be delivered is never lost
 * ------------------------------------------------------------------ */

export function makeReference() {
  return 'GM-SR-' + Math.floor(100000 + Math.random() * 900000);
}

function storageFor(options) {
  if (options.storage !== undefined) return options.storage;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadQueue(options = {}) {
  const storage = storageFor(options);
  try {
    const parsed = JSON.parse(storage?.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(entries, options = {}) {
  const storage = storageFor(options);
  try {
    storage?.setItem(QUEUE_KEY, JSON.stringify(entries.slice(-25)));
  } catch {
    /* storage full or unavailable — the receipt download is still the backup */
  }
  return entries;
}

export function enqueueBooking(entry, options = {}) {
  const queue = loadQueue(options).filter((item) => item.reference !== entry.reference);
  queue.push(entry);
  return saveQueue(queue, options);
}

export function dequeueBooking(reference, options = {}) {
  return saveQueue(loadQueue(options).filter((item) => item.reference !== reference), options);
}

/**
 * Re-send anything the visitor queued earlier (on page load, on `online`, or
 * from the "Retry" button). Delivered entries are removed from the queue.
 */
export async function drainQueue(options = {}) {
  const { onDelivered } = options;
  const queue = loadQueue(options);
  const delivered = [];
  const pending = [];

  for (const entry of queue) {
    // The entry remembers the inbox it was written for — without it the retry
    // would have no FormSubmit endpoint to post to.
    const result = await deliverBooking(entry.payload, { ...options, inbox: entry.inbox || options.inbox });
    if (result.ok) {
      delivered.push({ ...entry, result });
      if (onDelivered) onDelivered(entry, result);
    } else {
      pending.push(entry);
    }
  }

  saveQueue(pending, options);
  return { delivered, pending };
}
