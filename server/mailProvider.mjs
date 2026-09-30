/**
 * Shared e-mail provider used by the serverless endpoints
 * (`netlify/functions/send-booking.mjs` and `api/send-booking.js`).
 *
 * Nothing here is required for the website to work: when no provider is
 * configured the endpoint answers `{ ok:false, configured:false }` and the
 * browser automatically falls back to the FormSubmit relay.
 *
 * Configure on Netlify (Site settings → Environment variables) or Vercel
 * (Project → Settings → Environment Variables):
 *
 *   MAIL_PROVIDER = resend | sendgrid | brevo | webhook
 *   MAIL_API_KEY  = <provider API key>          (not needed for "webhook")
 *   MAIL_WEBHOOK_URL = <https://…/exec>         (required for "webhook":
 *                       a Google Apps Script web app, Zapier/Make hook, etc.)
 *   MAIL_WEBHOOK_SECRET = <shared secret>       (optional, forwarded as `secret`)
 *   MAIL_FROM     = "Grid Master Bookings <bookings@yourdomain.com>"
 *   MAIL_TO       = contactgridmaster@gmail.com        (optional, this is the default)
 *   MAIL_CC       = extra@example.com,second@example.com  (optional)
 *
 * The sending address (MAIL_FROM) must be verified with the provider — that is
 * what makes these messages land in the inbox instead of the spam folder.
 */

export const DEFAULT_RECIPIENT = 'contactgridmaster@gmail.com';

/** Strip CR/LF so nothing can be injected into mail headers. */
export const sanitizeHeader = (value = '') => String(value).replace(/[\r\n]+/g, ' ').trim();

export const isValidEmail = (value) =>
  typeof value === 'string' &&
  /^[^\s@,;:<>()[\]\\]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(value.trim()) &&
  value.trim().length <= 254;

export function parseAddressList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(isValidEmail);
}

/** Split `Name <mail@host>` into the parts providers expect. */
export function parseFrom(value) {
  const raw = sanitizeHeader(value);
  const match = raw.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, '') || 'Grid Master Website', email: match[2].trim() };
  }
  return { name: 'Grid Master Website', email: raw };
}

export function readProviderConfig(env = {}) {
  const provider = String(env.MAIL_PROVIDER || '').trim().toLowerCase();
  const apiKey = String(env.MAIL_API_KEY || '').trim();
  const from = parseFrom(env.MAIL_FROM || '');
  const to = parseAddressList(env.MAIL_TO).length ? parseAddressList(env.MAIL_TO) : [DEFAULT_RECIPIENT];
  const cc = parseAddressList(env.MAIL_CC);

  const webhookUrl = sanitizeHeader(env.MAIL_WEBHOOK_URL || '');
  const webhookSecret = String(env.MAIL_WEBHOOK_SECRET || '').trim();
  const supported = ['resend', 'sendgrid', 'brevo', 'webhook'];
  const configured =
    provider === 'webhook'
      ? /^https:\/\//.test(webhookUrl)
      : supported.includes(provider) && Boolean(apiKey) && isValidEmail(from.email);

  return {
    provider,
    apiKey,
    from,
    to,
    cc,
    webhookUrl,
    webhookSecret,
    configured,
    reason: configured
      ? 'configured'
      : !supported.includes(provider)
        ? 'MAIL_PROVIDER must be one of resend, sendgrid, brevo, webhook'
        : provider === 'webhook'
          ? 'MAIL_WEBHOOK_URL must be an https:// address'
          : !apiKey
            ? 'MAIL_API_KEY is missing'
            : 'MAIL_FROM must be a valid address',
  };
}

/** Basic shape check so the endpoint can never be used to send arbitrary mail. */
export function validatePayload(payload = {}) {
  const subject = sanitizeHeader(payload.subject);
  const text = String(payload.text || '');
  const html = String(payload.html || '');
  if (!subject) return { ok: false, detail: 'A subject is required.' };
  if (!text && !html) return { ok: false, detail: 'A message body is required.' };
  if (text.length > 60000 || html.length > 120000) return { ok: false, detail: 'Message is too large.' };
  return {
    ok: true,
    value: {
      subject,
      text,
      html,
      replyTo: isValidEmail(payload.replyTo || '') ? String(payload.replyTo).trim() : undefined,
    },
  };
}

async function sendResend({ subject, text, html, replyTo }, cfg, fetchImpl) {
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${cfg.from.name} <${cfg.from.email}>`,
      to: cfg.to,
      cc: cfg.cc.length ? cfg.cc : undefined,
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });
  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    detail: response.ok ? `Resend accepted the message (id ${data.id || 'n/a'}).` : data.message || data.error || `Resend error ${response.status}`,
  };
}

async function sendSendgrid({ subject, text, html, replyTo }, cfg, fetchImpl) {
  const response = await fetchImpl('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [
        {
          to: cfg.to.map((email) => ({ email })),
          cc: cfg.cc.length ? cfg.cc.map((email) => ({ email })) : undefined,
          subject,
        },
      ],
      from: { email: cfg.from.email, name: cfg.from.name },
      reply_to: replyTo ? { email: replyTo } : undefined,
      content: [
        { type: 'text/plain', value: text || subject },
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
    }),
  });
  const data = response.status === 202 ? null : await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    detail: response.ok
      ? 'SendGrid accepted the message.'
      : data?.errors?.[0]?.message || `SendGrid error ${response.status}`,
  };
}

async function sendBrevo({ subject, text, html, replyTo }, cfg, fetchImpl) {
  const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': cfg.apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: cfg.from.email, name: cfg.from.name },
      to: cfg.to.map((email) => ({ email })),
      cc: cfg.cc.length ? cfg.cc.map((email) => ({ email })) : undefined,
      replyTo: replyTo ? { email: replyTo } : undefined,
      subject,
      htmlContent: html || `<pre>${text}</pre>`,
      textContent: text || undefined,
    }),
  });
  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    detail: response.ok
      ? `Brevo accepted the message (id ${data.messageId || 'n/a'}).`
      : data.message || `Brevo error ${response.status}`,
  };
}

/** Generic webhook: Google Apps Script, Zapier, Make, n8n, a Cloudflare Worker… */
async function sendWebhook({ subject, text, html, replyTo }, cfg, fetchImpl) {
  const response = await fetchImpl(cfg.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      secret: cfg.webhookSecret || undefined,
      to: cfg.to.join(','),
      cc: cfg.cc.join(','),
      subject,
      text,
      html,
      replyTo,
      source: 'grid-master-serverless',
    }),
  });
  const raw = await response.text().catch(() => '');
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  return {
    ok: response.ok && (!data || data.ok !== false),
    status: response.status,
    detail: (data && (data.detail || data.message)) || `Relay answered HTTP ${response.status}.`,
  };
}

const SENDERS = { resend: sendResend, sendgrid: sendSendgrid, brevo: sendBrevo, webhook: sendWebhook };

/**
 * Send one message through the configured provider.
 * @returns {Promise<{ok: boolean, status: number, detail: string, provider: string}>}
 */
export async function sendWithProvider(message, cfg, fetchImpl = fetch) {
  if (!cfg.configured) {
    return { ok: false, status: 501, provider: cfg.provider || 'none', detail: `Mail provider not configured: ${cfg.reason}` };
  }
  const sender = SENDERS[cfg.provider];
  try {
    const result = await sender(message, cfg, fetchImpl);
    return { ...result, provider: cfg.provider };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      provider: cfg.provider,
      detail: `Could not reach ${cfg.provider}: ${error?.message || 'unknown error'}`,
    };
  }
}
