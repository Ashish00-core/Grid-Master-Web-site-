/**
 * Vercel Function — POST /api/send-booking
 *
 * Same behaviour as the Netlify copy: uses Resend / SendGrid / Brevo when the
 * MAIL_* environment variables are present, and answers 501 (`configured:false`)
 * so the website can fall back to the FormSubmit relay.
 */
import { readProviderConfig, sendWithProvider, validatePayload } from '../server/mailProvider.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, configured: true, detail: 'Use POST for this endpoint.' });
  }

  const cfg = readProviderConfig(process.env);
  if (!cfg.configured) {
    return res.status(501).json({
      ok: false,
      configured: false,
      detail: `The company mail server is not configured yet (${cfg.reason}).`,
    });
  }

  const payload = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const validated = validatePayload(payload);
  if (!validated.ok) {
    return res.status(422).json({ ok: false, configured: true, detail: validated.detail });
  }

  const result = await sendWithProvider(validated.value, cfg);
  if (result.ok) {
    return res.status(200).json({ ok: true, configured: true, provider: result.provider, detail: result.detail });
  }

  console.error('[send-booking] provider error:', result.provider, result.status, result.detail);
  return res.status(502).json({ ok: false, configured: true, provider: result.provider, detail: result.detail });
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
