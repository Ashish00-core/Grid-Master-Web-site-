/**
 * Vercel serverless function: POST /api/booking
 *
 * Sends booking e-mails from the company's own mail provider so they do not
 * depend on FormSubmit's activation link. Configure MAIL_* variables in the
 * Vercel project (see .env.example). Without them the endpoint answers
 * `501 {configured:false}` and the site falls back to FormSubmit on its own.
 */

import { handleBookingRequest } from '../server/handleBooking.mjs';

export default async function handler(req, res) {
  const body =
    typeof req.body === 'string'
      ? req.body
      : req.body && typeof req.body === 'object'
        ? JSON.stringify(req.body)
        : '';

  const result = await handleBookingRequest(
    { httpMethod: req.method, headers: req.headers || {}, body },
    { env: process.env }
  );

  res.status(result.statusCode);
  Object.entries(result.headers).forEach(([key, value]) => res.setHeader(key, value));
  res.send(result.body);
}
