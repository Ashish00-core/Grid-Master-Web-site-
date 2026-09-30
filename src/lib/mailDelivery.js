/**
 * Grid Master — mail delivery engine
 * ==================================
 *
 * The website is a static single-page app, so every booking/contact message has
 * to leave the browser through an email relay. This module is the single place
 * that knows how to do that, and it is deliberately defensive:
 *
 *   Channel 1 — Company mail server   (optional serverless function + Resend /
 *                                      SendGrid / Brevo API key). Nothing to do
 *                                      when it is not configured: the endpoint
 *                                      answers "not configured" and we move on.
 *   Channel 2 — FormSubmit relay      (works out of the box, but the recipient
 *                                      address must be activated once — the
 *                                      first submission makes FormSubmit email
 *                                      an "Activate Form" link to that inbox).
 *   Channel 3 — Web3Forms relay       (optional; only used when a public access
 *                                      key is provided in the build env).
 *
 * Whatever the outcome, nothing is ever lost: every message is written to a
 * local outbox and re-sent automatically (on the next visit, when the browser
 * comes back online, and on demand from the Mail Delivery Center page).
 *
 * The module is framework free (no React, no DOM required) so it can be unit
 * tested in Node — see tests/mailDelivery.test.mjs.
 */

import { COMPANY_INFO } from '../data/solarData.js';

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

const buildEnv =
  (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

export const MAIL_CONFIG = {
  /** Inbox that receives every booking / contact message. */
  recipient: COMPANY_INFO.email,
  /** Extra copies (FormSubmit CC addresses do not need their own activation). */
  cc: [],
  /** Optional serverless endpoint of this repository (Netlify/Vercel). */
  backendEndpoint: buildEnv.VITE_MAIL_ENDPOINT || '/api/send-booking',
  /** Set VITE_MAIL_BACKEND=off to skip the serverless channel entirely. */
  backendEnabled: buildEnv.VITE_MAIL_BACKEND !== 'off',
  /** Optional Web3Forms public access key. */
  web3formsKey: buildEnv.VITE_WEB3FORMS_KEY || '',
  formSubmitEndpoint: 'https://formsubmit.co/ajax/',
  web3formsEndpoint: 'https://api.web3forms.com/submit',
  /** Abort a channel that hangs instead of freezing the booking form. */
  timeoutMs: 20000,
  /** Maximum queued messages kept on the device. */
  outboxLimit: 25,
};

export const CHANNELS = {
  backend: {
    id: 'backend',
    label: 'Company mail server',
    short: 'Server relay',
    hint: 'Serverless function of this website (Resend / SendGrid / Brevo).',
  },
  formsubmit: {
    id: 'formsubmit',
    label: 'FormSubmit relay',
    short: 'FormSubmit',
    hint: 'Free relay used by this website. Needs a one-time activation e-mail.',
  },
  web3forms: {
    id: 'web3forms',
    label: 'Web3Forms relay',
    short: 'Web3Forms',
    hint: 'Backup relay, active only when an access key is configured.',
  },
};

export const MAIL_SETTINGS_KEY = 'grid-master-mail-settings-v1';
export const OUTBOX_KEY = 'grid-master-mail-outbox-v1';
export const BACKEND_PROBE_KEY = 'grid-master-mail-backend-probe-v1';
export const DELIVERY_LOG_KEY = 'grid-master-mail-log-v1';

/* ------------------------------------------------------------------ *
 * Small helpers (safe in Node, browsers and private-mode storage)
 * ------------------------------------------------------------------ */

export function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    /* storage blocked (private mode / cookies disabled) */
  }
  return null;
}

export function readJSON(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const email = value.trim();
  // Pragmatic check: something@something.tld — enough to protect the relay.
  return /^[^\s@,;:<>()[\]\\]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(email) && email.length <= 254;
}

export const digitsOnly = (value = '') => String(value).replace(/[^\d]/g, '');

export const whatsappHref = (text, phone = COMPANY_INFO.directPhone) =>
  `https://wa.me/${digitsOnly(phone)}?text=${encodeURIComponent(text)}`;

export const callHref = (phone = COMPANY_INFO.directPhone) => `tel:${String(phone).replace(/\s/g, '')}`;

/* ------------------------------------------------------------------ *
 * Runtime settings (owner overrides, stored per browser)
 * ------------------------------------------------------------------ */

export function getMailSettings(storage = getStorage()) {
  const raw = readJSON(storage, MAIL_SETTINGS_KEY, {}) || {};
  const recipient = typeof raw.recipient === 'string' ? raw.recipient.trim() : '';
  const cc = Array.isArray(raw.cc) ? raw.cc : [];
  const disabledChannels = Array.isArray(raw.disabledChannels) ? raw.disabledChannels : [];
  return {
    recipient: isValidEmail(recipient) ? recipient : '',
    cc: cc.filter(isValidEmail).map((entry) => entry.trim()),
    disabledChannels,
  };
}

export function saveMailSettings(patch, storage = getStorage()) {
  const next = { ...getMailSettings(storage), ...patch };
  writeJSON(storage, MAIL_SETTINGS_KEY, next);
  return next;
}

export function resetMailSettings(storage = getStorage()) {
  try {
    storage?.removeItem(MAIL_SETTINGS_KEY);
  } catch {
    /* ignore */
  }
  return getMailSettings(storage);
}

export function resolveRecipient(settings = getMailSettings()) {
  return settings.recipient || MAIL_CONFIG.recipient;
}

export function resolveCc(settings = getMailSettings()) {
  return settings.cc.length ? settings.cc : MAIL_CONFIG.cc;
}

/* ------------------------------------------------------------------ *
 * Message building
 * ------------------------------------------------------------------ */

const prettyKey = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const pad = (label, width = 20) => `${label}:`.padEnd(width, ' ');

function quoteLines(booking) {
  const items = Array.isArray(booking.quoteItems) ? booking.quoteItems : [];
  if (!items.length) return [];
  return [
    ...items.map(
      (item) =>
        `  - ${item.name} x${item.quantity} = ${item.lineTotalINR || ''}`.trimEnd(),
    ),
    `  Package subtotal: ${booking.quoteTotalINR || '-'}${
      booking.quoteTotalUSD ? `  (approx ${booking.quoteTotalUSD})` : ''
    }`,
  ];
}

/**
 * Turn a booking object into every representation the relays need.
 *
 * @param {object} booking
 * @returns {{subject: string, fields: object, text: string, html: string, summary: string}}
 */
export function buildBookingMessage(booking = {}) {
  const isTest = Boolean(booking.isTest);
  const reference = booking.reference || 'GM-SR-000000';
  const created = booking.createdAt ? new Date(booking.createdAt) : new Date();
  const createdLabel = Number.isNaN(created.getTime())
    ? String(booking.createdAt || '')
    : created.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const quote = quoteLines(booking);

  const fields = {
    reference_id: reference,
    customer_name: booking.name || '-',
    customer_phone: booking.phone || '-',
    email: booking.email || '-',
    property_location: booking.location || '-',
    installation_purpose: booking.purpose || '-',
    service_required: booking.service || '-',
    lead_engineer: booking.engineer || '-',
    preferred_date: booking.date || '-',
    time_slot: booking.timeSlot || '-',
    special_notes: booking.notes || 'None provided',
  };

  const quoteItems = Array.isArray(booking.quoteItems) ? booking.quoteItems : [];
  if (quoteItems.length) {
    fields.selected_equipment = quoteItems
      .map((item) => `${item.name} x${item.quantity} (${item.lineTotalINR || ''})`)
      .join(' | ');
    fields.equipment_package_total = `${booking.quoteTotalINR || '-'}${
      booking.quoteTotalUSD ? ` (approx ${booking.quoteTotalUSD})` : ''
    }`;
  }

  const subject = isTest
    ? `[TEST] Grid Master mail delivery check — ${reference}`
    : `New Solar Booking [${reference}] — ${booking.name || 'Website visitor'}`;

  const textLines = [
    'GRID MASTER SOLAR SYSTEMS',
    isTest ? 'MAIL DELIVERY TEST (one-time check)' : 'NEW ONLINE BOOKING',
    '=====================================================',
    '',
    `${pad('Reference')}${reference}`,
    `${pad('Submitted')}${createdLabel}`,
    '',
    'CUSTOMER',
    '-----------------------------------------------------',
    `${pad('Name')}${booking.name || '-'}`,
    `${pad('Phone')}${booking.phone || '-'}`,
    `${pad('Email')}${booking.email || '-'}`,
    `${pad('Property')}${booking.location || '-'}`,
    '',
    'REQUIREMENT',
    '-----------------------------------------------------',
    `${pad('Purpose')}${booking.purpose || '-'}`,
    `${pad('Service')}${booking.service || '-'}`,
    `${pad('Engineer')}${booking.engineer || '-'}`,
    `${pad('Preferred date')}${booking.date || '-'}`,
    `${pad('Time slot')}${booking.timeSlot || '-'}`,
    `${pad('Notes')}${booking.notes || 'None provided'}`,
  ];

  if (quote.length) {
    textLines.push('', 'SELECTED EQUIPMENT', '-----------------------------------------------------', ...quote);
  }

  textLines.push(
    '',
    '-----------------------------------------------------',
    `Sent automatically from the Grid Master website to ${resolveRecipient()}.`,
    `Reply to this e-mail to answer ${booking.name || 'the customer'} directly.`,
  );

  const htmlRows = Object.entries(fields)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;white-space:nowrap;vertical-align:top">${prettyKey(
          key,
        )}</td><td style="padding:6px 12px;border:1px solid #e2e8f0">${String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br />')}</td></tr>`,
    )
    .join('');

  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
  <h2 style="margin:0 0 4px;color:#b45309">Grid Master Solar Systems</h2>
  <p style="margin:0 0 16px;font-weight:600">${isTest ? 'Mail delivery test' : 'New online booking'} — ${reference}</p>
  <table style="border-collapse:collapse;font-size:14px">${htmlRows}</table>
  <p style="margin:16px 0 0;font-size:12px;color:#64748b">
    Sent automatically from the Grid Master website. Reply to this e-mail to answer the customer directly.
  </p>
</div>`;

  const summary = `${booking.name || 'Booking'} — ${booking.service || '-'} — ${booking.date || ''} ${booking.timeSlot || ''}`.trim();

  return { subject, fields, text: textLines.join('\n'), html, summary };
}

/** Message used by the "run a live delivery test" button. */
export function buildTestMessage(reference = `GM-TEST-${Date.now().toString().slice(-6)}`) {
  return buildBookingMessage({
    isTest: true,
    reference,
    createdAt: new Date().toISOString(),
    name: 'Grid Master Website Mail Test',
    phone: COMPANY_INFO.phoneDisplay,
    email: resolveRecipient(),
    location: 'Automated delivery check — safe to ignore',
    purpose: 'System check',
    service: 'Mail delivery verification',
    engineer: 'Automated test',
    date: new Date().toISOString().slice(0, 10),
    timeSlot: 'Any time',
    notes:
      'If you can read this message, automatic booking e-mails are reaching this inbox. ' +
      'No action is required.',
  });
}

/* ------------------------------------------------------------------ *
 * Outbox (nothing is ever lost, even offline)
 * ------------------------------------------------------------------ */

export function getOutbox(storage = getStorage()) {
  const list = readJSON(storage, OUTBOX_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function queueMessage(entry, storage = getStorage()) {
  const list = getOutbox(storage);
  const id = entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next = [
    ...list.filter((item) => item.id !== id),
    { ...entry, id, queuedAt: new Date().toISOString() },
  ].slice(-MAIL_CONFIG.outboxLimit);
  writeJSON(storage, OUTBOX_KEY, next);
  return id;
}

export function removeQueuedMessage(id, storage = getStorage()) {
  const next = getOutbox(storage).filter((item) => item.id !== id);
  writeJSON(storage, OUTBOX_KEY, next);
  return next;
}

/**
 * Drop every queued copy of one booking reference. Used after a delivery is
 * confirmed (including a manual retry) so the same booking is never e-mailed
 * twice.
 */
export function removeQueuedByReference(reference, storage = getStorage()) {
  if (!reference) return getOutbox(storage);
  const next = getOutbox(storage).filter((item) => item.reference !== reference);
  writeJSON(storage, OUTBOX_KEY, next);
  return next;
}

export function clearOutbox(storage = getStorage()) {
  writeJSON(storage, OUTBOX_KEY, []);
}

/** Short history of the last delivery attempts, shown in the delivery centre. */
export function appendDeliveryLog(entry, storage = getStorage()) {
  const list = readJSON(storage, DELIVERY_LOG_KEY, []);
  const next = [...(Array.isArray(list) ? list : []), entry].slice(-12);
  writeJSON(storage, DELIVERY_LOG_KEY, next);
  return next;
}

export function getDeliveryLog(storage = getStorage()) {
  const list = readJSON(storage, DELIVERY_LOG_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function clearDeliveryLog(storage = getStorage()) {
  writeJSON(storage, DELIVERY_LOG_KEY, []);
}

/* ------------------------------------------------------------------ *
 * Transport primitives
 * ------------------------------------------------------------------ */

async function postJSON(url, payload, { fetchImpl, timeoutMs = MAIL_CONFIG.timeoutMs, headers = {} } = {}) {
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) return { ok: false, status: 0, detail: 'Network requests are unavailable in this browser.' };

  let timer;
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(payload),
  };

  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    init.signal = controller.signal;
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await doFetch(url, init);
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: true, status: response.status, data, httpOk: response.ok };
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: null,
      detail: aborted
        ? `No answer from the mail relay within ${Math.round(timeoutMs / 1000)}s.`
        : error?.message === 'Failed to fetch' || error?.name === 'TypeError'
          ? 'The browser could not reach the mail relay (offline, blocked by an ad-blocker, or cross-origin request refused).'
          : error?.message || 'Unknown network error.',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const isTruthy = (value) => value === true || value === 'true' || value === 1 || value === '1';

/* ------------------------------------------------------------------ *
 * Channels
 * ------------------------------------------------------------------ */

/**
 * The serverless endpoint of this website. It reports `configured:false`
 * (HTTP 501) when no provider API key is set, which simply means "skip me".
 */
export async function sendViaBackend(message, options = {}) {
  const { fetchImpl, storage = getStorage(), settings } = options;
  if (!MAIL_CONFIG.backendEnabled) {
    return { ok: false, skipped: true, detail: 'Server relay disabled in this build.' };
  }
  if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
    return { ok: false, skipped: true, detail: 'The website is open as a local file, so the server relay is unavailable.' };
  }

  const cached = readJSON(storage, BACKEND_PROBE_KEY, null);
  if (cached && cached.available === false && Date.now() - (cached.at || 0) < 6 * 60 * 60 * 1000) {
    return { ok: false, skipped: true, detail: 'Server relay not deployed — using the FormSubmit relay.' };
  }

  const result = await postJSON(
    MAIL_CONFIG.backendEndpoint,
    {
      to: resolveRecipient(settings),
      cc: resolveCc(settings),
      subject: message.subject,
      text: message.text,
      html: message.html,
      fields: message.fields,
      replyTo: isValidEmail(options.replyTo || '') ? options.replyTo : undefined,
    },
    { fetchImpl, timeoutMs: options.timeoutMs },
  );

  const data = result.data || {};
  const available = result.ok && ![404, 405, 501].includes(result.status);
  writeJSON(storage, BACKEND_PROBE_KEY, { available, at: Date.now() });

  if (!result.ok) return { ok: false, detail: result.detail, status: result.status };
  if ([404, 405, 501].includes(result.status) || data.configured === false) {
    return {
      ok: false,
      skipped: true,
      detail: data.detail || 'Server relay is not configured yet — using the FormSubmit relay.',
      status: result.status,
    };
  }
  if (data.ok) return { ok: true, detail: data.detail || `Delivered by the company mail server (${data.provider || 'API'}).` };

  return {
    ok: false,
    status: result.status,
    detail: data.detail || `Server relay rejected the message (HTTP ${result.status}).`,
  };
}

/** FormSubmit relay — free, but the recipient inbox must be activated once. */
export async function sendViaFormSubmit(message, options = {}) {
  const recipient = resolveRecipient(options.settings);
  const cc = resolveCc(options.settings);

  const payload = {
    _subject: message.subject,
    _template: 'table',
    _captcha: 'false',
    ...(isValidEmail(options.replyTo || '') ? { _replyto: options.replyTo } : {}),
    ...(cc.length ? { _cc: cc.join(',') } : {}),
    ...message.fields,
  };
  // FormSubmit only honours _replyto when the payload carries an `email` field,
  // and a malformed value there would make the relay reject the whole message.
  if (!isValidEmail(payload.email)) delete payload.email;

  const result = await postJSON(`${MAIL_CONFIG.formSubmitEndpoint}${encodeURIComponent(recipient)}`, payload, options);
  if (!result.ok) return { ok: false, status: result.status, raw: result.detail, detail: result.detail };

  const data = result.data || {};
  const detail = String(data.message || '').trim();

  if (isTruthy(data.success)) {
    return { ok: true, status: result.status, raw: detail || 'Relay accepted the message.', detail: detail || 'Relay accepted the message.' };
  }

  if (/activ/i.test(detail)) {
    return {
      ok: false,
      status: result.status,
      activationRequired: true,
      raw: detail,
      detail:
        detail ||
        'FormSubmit needs a one-time activation for this inbox before it forwards anything.',
    };
  }

  return {
    ok: false,
    status: result.status,
    raw: detail || `HTTP ${result.status}`,
    detail:
      detail ||
      `The relay answered HTTP ${result.status}. ${
        /web server|HTML files/i.test(detail) ? 'Open the website through its https:// address (not as a local file).' : ''
      }`.trim(),
  };
}

/** Web3Forms relay — used only when a public access key was configured. */
export async function sendViaWeb3Forms(message, options = {}) {
  // (relay always delivers to the key owner — settings only affect the reply-to)
  if (!MAIL_CONFIG.web3formsKey) {
    return { ok: false, skipped: true, detail: 'No Web3Forms access key configured.' };
  }
  const result = await postJSON(
    MAIL_CONFIG.web3formsEndpoint,
    {
      access_key: MAIL_CONFIG.web3formsKey,
      subject: message.subject,
      from_name: 'Grid Master Website',
      ...(isValidEmail(options.replyTo || '') ? { replyto: options.replyTo } : {}),
      ...message.fields,
      message: message.text,
    },
    options,
  );

  if (!result.ok) return { ok: false, status: result.status, detail: result.detail };
  const data = result.data || {};
  if (isTruthy(data.success)) {
    return { ok: true, status: result.status, raw: data.message || 'Relay accepted the message.', detail: data.message || 'Relay accepted the message.' };
  }
  return {
    ok: false,
    status: result.status,
    raw: data.message || `HTTP ${result.status}`,
    detail: data.message || `Web3Forms rejected the message (HTTP ${result.status}).`,
  };
}

const CHANNEL_SENDERS = {
  backend: sendViaBackend,
  formsubmit: sendViaFormSubmit,
  web3forms: sendViaWeb3Forms,
};

/* ------------------------------------------------------------------ *
 * Dispatcher
 * ------------------------------------------------------------------ */

export const DELIVERY_STATES = {
  delivered: 'delivered',
  queued: 'queued',
  activation: 'activation-required',
  failed: 'failed',
};

/**
 * Try every configured channel in order, then queue the message so it can be
 * retried later. Never throws.
 *
 * @returns {Promise<object>} delivery report
 */
export async function deliverMessage(message, options = {}) {
  const storage = options.storage === undefined ? getStorage() : options.storage;
  const settings = options.settings || getMailSettings(storage);
  const disabled = new Set(settings.disabledChannels || []);
  const attempts = [];

  const order = ['backend', 'formsubmit', 'web3forms'].filter(
    (id) => !disabled.has(id) && CHANNEL_SENDERS[id],
  );

  for (const id of order) {
    const outcome = await CHANNEL_SENDERS[id](message, { ...options, storage, settings });
    attempts.push({
      channel: id,
      label: CHANNELS[id].label,
      ok: Boolean(outcome.ok),
      skipped: Boolean(outcome.skipped),
      activationRequired: Boolean(outcome.activationRequired),
      detail: outcome.detail || (outcome.ok ? 'Sent.' : 'Failed.'),
      status: outcome.status ?? null,
      at: new Date().toISOString(),
    });
    if (outcome.ok) {
      // The booking is delivered: drop any queued copy of the same reference so
      // a retry can never send the identical booking twice.
      removeQueuedByReference(options.reference || message.fields?.reference_id, storage);
      return {
        ok: true,
        state: DELIVERY_STATES.delivered,
        channel: id,
        channelLabel: CHANNELS[id].label,
        recipient: resolveRecipient(settings),
        detail: `Booking e-mail delivered to ${resolveRecipient(settings)}.`,
        attempts,
        queued: false,
      };
    }
  }

  const activationAttempt = attempts.find((attempt) => attempt.activationRequired);
  const meaningful = attempts.filter((attempt) => !attempt.skipped);
  const lastDetail =
    activationAttempt?.detail ||
    meaningful[meaningful.length - 1]?.detail ||
    attempts[attempts.length - 1]?.detail ||
    'No mail relay was reachable.';

  const id = queueMessage(
    {
      id: options.queueId,
      kind: options.kind || 'booking',
      reference: options.reference || message.fields?.reference_id || '',
      message,
      recipient: resolveRecipient(settings),
      lastDetail,
    },
    storage,
  );

  return {
    ok: false,
    state: activationAttempt ? DELIVERY_STATES.activation : DELIVERY_STATES.queued,
    channel: null,
    channelLabel: null,
    recipient: resolveRecipient(settings),
    detail: activationAttempt
      ? `One-time activation needed: FormSubmit sent an "Activate Form" e-mail to ${resolveRecipient(
          settings,
        )} — clicking that link is what starts automatic delivery. Details are queued and will be re-sent automatically once activated.`
      : `${lastDetail}`,
    attempts,
    queued: true,
    outboxId: id,
  };
}

/** Re-attempt every queued message. Returns a small summary. */
export async function flushOutbox(options = {}) {
  const storage = options.storage === undefined ? getStorage() : options.storage;
  const list = getOutbox(storage);
  if (!list.length) return { attempted: 0, delivered: 0, pending: 0, results: [] };

  const results = [];
  let delivered = 0;

  for (const entry of list) {
    const report = await deliverMessage(entry.message || buildBookingMessage({}), {
      ...options,
      storage,
      queueId: entry.id,
      kind: entry.kind,
      reference: entry.reference,
    });
    if (report.ok) {
      delivered += 1;
      removeQueuedMessage(entry.id, storage);
    } else {
      // Keep the entry, but record that another attempt was made.
      queueMessage({ ...entry, attempts: (entry.attempts || 0) + 1, lastDetail: report.detail }, storage);
    }
    results.push({ id: entry.id, reference: entry.reference, ok: report.ok, state: report.state, detail: report.detail });
  }

  return { attempted: list.length, delivered, pending: getOutbox(storage).length, results };
}

/* ------------------------------------------------------------------ *
 * Guaranteed manual fallbacks (no third party involved)
 * ------------------------------------------------------------------ */

export function mailtoHref(message, { includeCustomer, customerEmail } = {}) {
  const recipient = resolveRecipient();
  const params = new URLSearchParams();
  params.set('subject', message.subject);
  // Some mail clients refuse very long bodies — keep it comfortably short.
  const body = message.text.length > 1700 ? `${message.text.slice(0, 1697)}...` : message.text;
  params.set('body', body);
  const cc = [];
  if (includeCustomer && isValidEmail(customerEmail)) cc.push(customerEmail.trim());
  resolveCc().forEach((address) => cc.push(address));
  const ccParam = cc.length ? `&cc=${encodeURIComponent(cc.join(','))}` : '';
  return `mailto:${recipient}?${params.toString()}${ccParam}`.replace(/\+/g, '%20');
}

/** Mirrors FormSubmit's field names for a copy-paste friendly summary. */
export function messageAsText(message) {
  return `${message.subject}\n\n${message.text}`;
}

export function channelLabel(id) {
  return CHANNELS[id]?.label || id;
}
