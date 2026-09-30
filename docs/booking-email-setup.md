# Booking e-mails — why they were not arriving, and how to finish the setup

## What was wrong

The booking form posted to `https://formsubmit.co/ajax/contactgridmaster@gmail.com`
as a cross-origin JSON request and then reported **"sent"** as soon as the
request finished — whatever the relay actually answered.

That created four ways for a booking to disappear:

| # | Cause | What the visitor saw |
| - | ----- | -------------------- |
| 1 | **FormSubmit needs a one-time activation.** The first submission mails an *Activate Form* link to the inbox and discards every submission until the link is clicked (`{"success":"false","message":"This form needs Activation…"}`). | "Submitted successfully" — nothing in the inbox |
| 2 | **Ad-blockers / privacy extensions / filtered networks** drop requests to `formsubmit.co`; the browser reports an opaque `Failed to fetch`. | "Booking Received — One Step Left" (the ⚠️ screen) |
| 3 | **A JSON body forces a CORS preflight** (`OPTIONS`) that the same setups refuse even when the POST would have worked. | Same ⚠️ screen |
| 4 | The UI printed success without reading the relay answer, so all of the above looked identical to a real delivery. | False confidence |

There was also a crash: the "Copy Reference & Receipt" and "Download Receipt"
buttons referenced a `targetEmail` variable that did not exist, so they threw a
`ReferenceError` and did nothing.

## What the site does now

The booking engine (`src/lib/bookingMail.js`) tries the relays in order and
reports **exactly** what happened — no guessing:

1. **The site's own relay** — `/api/booking` (Vercel) or
   `/.netlify/functions/booking` (Netlify). Same-origin, no activation, no CORS,
   no ad-blocker surface. Sends through *your* mail provider.
2. **FormSubmit** — first as `multipart/form-data` (no CORS preflight), then as
   JSON. The JSON answer is parsed: `success:true` is a real delivery,
   `"needs Activation"` is reported as such instead of being called a success.
3. **No relay reachable** — the booking is **saved on the device**
   (`localStorage`) and re-sent automatically on the next visit, when the
   connection returns, or with the **Retry automatic send** button on the
   confirmation screen. The screen also offers:
   * **Send this booking by e-mail** — opens the visitor's own mail app with the
     whole booking pre-filled and addressed to `contactgridmaster@gmail.com`;
   * **WhatsApp / Call** — pre-filled with the reference, date and slot.

Nothing is ever reported as "sent" unless a relay confirmed it.

---

## ✅ Finish the setup (choose one path)

### Path A — 30 seconds, free: activate FormSubmit (do this even if you also do B)

1. Open the live site and submit **one** test booking (any details will do).
2. Open `contactgridmaster@gmail.com` and search for the mail from **formsubmit.co** —
   subject **"Activate Form"**. Check **Spam / Promotions** as well.
3. Click the activation link in that mail once.
4. Submit another test booking. The confirmation screen now shows
   **"Solar Booking Submitted Successfully!"** and the mail arrives.

> The activation is tied to that exact address. If `COMPANY_INFO.email` is ever
> changed in `src/data/solarData.js`, the new address needs its own activation.
>
> If the *Activate Form* mail never arrives at all, FormSubmit is not usable for
> that inbox — use Path B.

### Path B — permanent: send from your own mail account (recommended)

Add the mail-provider variables on your host and every booking is sent from that
provider — there is no activation link at all, and no third party between the
visitor and your inbox.

**Resend (easiest free option)**

1. Create a free account at <https://resend.com> → **API Keys** → *Create API Key*.
2. Vercel → your project → **Settings → Environment Variables** → add:
   * `RESEND_API_KEY` = the key you just created
   * `MAIL_TO` = `contactgridmaster@gmail.com`
   * `MAIL_FROM` = `Grid Master Website <onboarding@resend.dev>`
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the function picks the variables up.
4. Submit a test booking — the confirmation screen says
   *"E-mailed to contactgridmaster@gmail.com"* and mentions the `resend` relay.

Netlify, Brevo, SendGrid, Web3Forms and generic webhook variants are documented
inline in [`.env.example`](../.env.example).

> Sanity check any time: open `/api/booking` on the deployed site. It answers
> `{"success":false,"configured":false,...}` (HTTP 501) when no provider is set,
> and `405` when the variables are live — that is the healthy answer for a GET.

### Path C — no third party at all

If you would rather not use a mail API, point `MAIL_WEBHOOK_URL` at a Google Apps
Script bound to your Gmail account: it can send the mail *and* append every
booking to a Google Sheet that you own.

---

## 📬 Recovering bookings that were lost before this fix

FormSubmit keeps every submission it received for **30 days**, even the ones it
did not deliver, and exposes them through a free archive API (5 calls/day):

1. Activate the form first (Path A).
2. Call (replace the address with yours):

   ```bash
   curl "https://formsubmit.co/api/get-submissions/YOUR_API_KEY/contactgridmaster@gmail.com"
   ```

   The API key is e-mailed to you when the form is activated. Each entry carries
   the full field list, so every missed booking can be recovered by hand.

Also worth checking while you are in Gmail: **Spam**, **Promotions**, and the
*All Mail* tab for anything from `formsubmit.co`, and consider adding a filter so
that sender always lands in the inbox.

---

## Verifying the fix locally

```bash
npm install
npm run dev          # http://localhost:3000  → Book Now → submit a test booking
npm test             # booking-mail engine unit tests
npm run build
```

The confirmation screen always states which relay answered, and the
**Show delivery details** link lists every attempt (`company relay`, `formsubmit
(multipart)`, `formsubmit (json)`) with its HTTP status and the relay's own
message — that is the fastest way to see what your network is doing.
