/**
 * Server-side booking mail sender.
 *
 * The browser's own relays (FormSubmit) need a one-time activation click and
 * can be blocked by extensions. This module powers the site's own endpoint
 * (`/api/booking` on Vercel, `/.netlify/functions/booking` on Netlify), which
 * sends the booking from the company's own mail provider — no activation step,
 * nothing for an ad-blocker to block.
 *
 * Configure ONE of these environment variables on the host (see .env.example):
 *
 *   RESEND_API_KEY      + MAIL_FROM          https://resend.com
 *   BREVO_API_KEY       + MAIL_FROM          https://brevo.com
 *   SENDGRID_API_KEY    + MAIL_FROM          https://sendgrid.com
 *   WEB3FORMS_KEY                            https://web3forms.com
 *   MAIL_WEBHOOK_URL                         any URL that accepts JSON
 *
 * With none configured the endpoint answers `501 {configured:false}` and the
 * browser automatically falls back to FormSubmit.
 */

export const DEFAULT_INBOX = 'contactgridmaster@gmail.com';
export const DEFAULT_FROM = 'Grid Master Website <onboarding@resend.dev>';

const asText = (value) => (value === undefined || value === null ? '' : String(value));

/** Turn the browser payload into a readable, escaped mail. */
export function renderBookingMail(booking = {}, { inbox = DEFAULT_INBOX } = {}) {
  const rows = [
    ['Booking Reference', booking.booking_reference],
    ['Customer Name', booking.customer_name],
    ['Phone Number', booking.customer_phone],
    ['Email Address', booking.customer_email || booking.email],
    ['Property Location', booking.property_location],
    ['Purpose', booking.purpose],
    ['Service Required', booking.service_required],
    ['Lead Engineer', booking.lead_engineer],
    ['Scheduled Audit Date', booking.scheduled_date],
    ['Time Slot', booking.time_slot],
    ['Special Notes', booking.notes],
    ['Selected Equipment', booking.selected_equipment],
    ['Equipment Package Total', booking.equipment_package_total],
  ].filter(([, value]) => asText(value).trim() !== '');

  const escape = (value) =>
    asText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const subject =
    asText(booking._subject).trim() ||
    `New Solar Integration Booking${booking.booking_reference ? ` [${booking.booking_reference}]` : ''} - ${asText(booking.customer_name)}`;

  const textBody = [
    'GRID MASTER SOLAR SYSTEMS — NEW BOOKING',
    '========================================',
    ...rows.map(([label, value]) => `${label.padEnd(22)}: ${asText(value)}`),
    '',
    `Reply directly to ${asText(booking.customer_email || booking.email) || 'the customer'} to answer this enquiry.`,
    `Booking mail delivered to ${inbox}.`,
  ].join('\n');

  const htmlBody = `<!doctype html><html><body style="margin:0;background:#f8fafc;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
    <tr><td style="background:#0f172a;padding:20px 24px">
      <p style="margin:0;color:#fbbf24;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Grid Master Solar Systems</p>
      <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px">New Solar Integration Booking</h1>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:12px">Reference ${escape(booking.booking_reference)} &middot; submitted from the website</p>
    </td></tr>
    <tr><td style="padding:8px 24px 24px">
      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([label, value], index) => `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;background:${index % 2 ? '#f8fafc' : '#ffffff'};color:#475569;font-weight:600;width:42%">${escape(label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;background:${index % 2 ? '#f8fafc' : '#ffffff'};color:#0f172a;white-space:pre-wrap">${escape(value)}</td>
        </tr>`
          )
          .join('')}
      </table>
      <p style="margin:20px 0 0;font-size:13px;color:#475569">Reply to this mail to answer <strong>${escape(booking.customer_name)}</strong> directly${
        booking.customer_email || booking.email ? ` (${escape(booking.customer_email || booking.email)})` : ''
      }.</p>
    </td></tr>
  </table>
</body></html>`;

  return { subject, textBody, htmlBody, to: inbox };
}

/**
 * Pick the first configured provider.
 * @returns {{name: string, configured: boolean, send?: Function, reason?: string}}
 */
export function resolveProvider(env = {}) {
  const from = asText(env.MAIL_FROM).trim() || DEFAULT_FROM;
  const to = asText(env.MAIL_TO).trim() || DEFAULT_INBOX;

  if (asText(env.RESEND_API_KEY).trim()) {
    const key = env.RESEND_API_KEY.trim();
    return {
      name: 'resend',
      configured: true,
      to,
      send: (fetchImpl, mail) =>
        fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: [to],
            subject: mail.subject,
            text: mail.textBody,
            html: mail.htmlBody,
            reply_to: mail.replyTo || undefined,
          }),
        }),
    };
  }

  if (asText(env.BREVO_API_KEY).trim()) {
    const key = env.BREVO_API_KEY.trim();
    const senderEmail = (from.match(/<([^>]+)>/)?.[1] || from).trim();
    return {
      name: 'brevo',
      configured: true,
      to,
      send: (fetchImpl, mail) =>
        fetchImpl('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            sender: { email: senderEmail, name: 'Grid Master Website' },
            to: [{ email: to }],
            replyTo: mail.replyTo ? { email: mail.replyTo } : undefined,
            subject: mail.subject,
            textContent: mail.textBody,
            htmlContent: mail.htmlBody,
          }),
        }),
    };
  }

  if (asText(env.SENDGRID_API_KEY).trim()) {
    const key = env.SENDGRID_API_KEY.trim();
    const senderEmail = (from.match(/<([^>]+)>/)?.[1] || from).trim();
    return {
      name: 'sendgrid',
      configured: true,
      to,
      send: (fetchImpl, mail) =>
        fetchImpl('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: senderEmail, name: 'Grid Master Website' },
            reply_to: mail.replyTo ? { email: mail.replyTo } : undefined,
            subject: mail.subject,
            content: [
              { type: 'text/plain', value: mail.textBody },
              { type: 'text/html', value: mail.htmlBody },
            ],
          }),
        }),
    };
  }

  if (asText(env.WEB3FORMS_KEY).trim()) {
    const key = env.WEB3FORMS_KEY.trim();
    return {
      name: 'web3forms',
      configured: true,
      to,
      send: (fetchImpl, mail, booking) =>
        fetchImpl('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: key,
            subject: mail.subject,
            from_name: 'Grid Master Website',
            replyto: mail.replyTo,
            ...booking,
          }),
        }),
    };
  }

  if (asText(env.MAIL_WEBHOOK_URL).trim()) {
    const url = env.MAIL_WEBHOOK_URL.trim();
    return {
      name: 'webhook',
      configured: true,
      to,
      send: (fetchImpl, mail, booking) =>
        fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...booking, subject: mail.subject, text: mail.textBody, html: mail.htmlBody }),
        }),
    };
  }

  return { name: 'none', configured: false, to, reason: 'No mail provider configured on this host.' };
}

/** Fetch with a hard timeout so a hanging provider never hangs the form. */
async function withTimeout(fetchImpl, url, init, ms = 12000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetchImpl(url, { ...init, signal: controller ? controller.signal : undefined });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Send one booking. Never throws — the caller gets a structured verdict.
 * @returns {Promise<{configured: boolean, ok: boolean, provider: string, status?: number, error?: string, skipped?: boolean}>}
 */
export async function sendBookingMail({ booking = {}, env = {}, fetchImpl } = {}) {
  const provider = resolveProvider(env);
  if (!provider.configured) {
    return { configured: false, ok: false, provider: provider.name, error: provider.reason };
  }

  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) {
    return { configured: true, ok: false, provider: provider.name, error: 'No fetch implementation available.' };
  }

  const mail = renderBookingMail(booking, { inbox: provider.to });
  mail.replyTo = asText(booking.customer_email || booking.email || booking._replyto).trim() || undefined;

  try {
    const res = await provider.send(
      (url, init) => withTimeout(doFetch, url, init),
      mail,
      booking
    );
    const raw = await res.text().catch(() => '');
    if (res.ok) {
      return { configured: true, ok: true, provider: provider.name, status: res.status, message: raw.slice(0, 300) };
    }
    return {
      configured: true,
      ok: false,
      provider: provider.name,
      status: res.status,
      error: extractError(raw) || `Mail provider answered HTTP ${res.status}.`,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      provider: provider.name,
      error: error?.name === 'AbortError' ? 'The mail provider did not answer in time.' : error?.message || String(error),
    };
  }
}

export function extractError(raw) {
  if (!raw) return '';
  try {
    const data = JSON.parse(raw);
    return (
      data?.error?.message ||
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.map((e) => e.message || e).join(', ') : '') ||
      data?.error ||
      ''
    );
  } catch {
    return String(raw).slice(0, 200);
  }
}
