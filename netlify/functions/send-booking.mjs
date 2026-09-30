/**
 * Netlify Function — POST /api/send-booking
 *
 * Delivers a booking e-mail through Resend / SendGrid / Brevo when the matching
 * environment variables are set (see server/mailProvider.mjs). Answers HTTP 501
 * with `configured:false` when nothing is configured, which tells the browser to
 * fall back to the FormSubmit relay automatically.
 */
import { readProviderConfig, sendWithProvider, validatePayload } from '../../server/mailProvider.mjs';

export const config = { path: '/api/send-booking' };

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const respond = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

export default async (request) => {
  if (request.method !== 'POST') {
    return respond(405, { ok: false, configured: true, detail: 'Use POST for this endpoint.' });
  }

  const cfg = readProviderConfig(process.env);
  if (!cfg.configured) {
    return respond(501, {
      ok: false,
      configured: false,
      detail: `The company mail server is not configured yet (${cfg.reason}).`,
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return respond(400, { ok: false, configured: true, detail: 'Invalid JSON body.' });
  }

  const validated = validatePayload(payload);
  if (!validated.ok) {
    return respond(422, { ok: false, configured: true, detail: validated.detail });
  }

  const result = await sendWithProvider(validated.value, cfg);
  if (result.ok) {
    return respond(200, { ok: true, configured: true, provider: result.provider, detail: result.detail });
  }

  console.error('[send-booking] provider error:', result.provider, result.status, result.detail);
  return respond(502, { ok: false, configured: true, provider: result.provider, detail: result.detail });
};
