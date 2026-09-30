/**
 * Netlify function: POST /.netlify/functions/booking
 *
 * Same job as `api/booking.js` on Vercel — configure MAIL_* variables in
 * Netlify (Site settings → Environment variables) to send bookings from the
 * company's own mail provider.
 */

import { handleBookingRequest } from '../../server/handleBooking.mjs';

export async function handler(event) {
  const result = await handleBookingRequest(event, { env: process.env });
  return {
    statusCode: result.statusCode,
    headers: result.headers,
    body: result.body,
  };
}

export default handler;
