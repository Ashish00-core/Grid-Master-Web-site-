# ☀️ Grid Master — Advanced Solar Designing, Installation & Integration System

**Grid Master** is a modern, high-performance web platform for solar systems engineering, rooftop 3D designing, equipment price cataloging, and turnkey installation & grid integration. Designed for both **Home (Residential)** and **Building (Commercial)** solar purpose requirements.

This repository is the full web application (a React + Vite + Tailwind + React Router multi-page app — every menu item opens its own page) — deployable directly from the repo root to Netlify, Vercel or Cloudflare Pages.

---

## 🧭 Site Pages

| URL | Page |
| --- | --- |
| `/` | Home — hero, stats, service highlights, process, reviews, call-to-action |
| `/services` | Services (Home / Building) |
| `/design-samples` | Design Samples & CAD blueprints |
| `/equipment` | Equipment & Prices with quote builder |
| `/calculator` | Solar system calculator |
| `/team` | Engineering team + Head Engineer visiting card |
| `/contact` | Contact details, booking and FAQ |
| `/mail-delivery` | Mail Delivery Center — verify automatic e-mails, set your own Gmail relay, re-send the queue |

Menu links open real pages (no fast in-page scrolling); each page opens at the top with a soft fade-in.
Because these are real URLs the host must serve `index.html` for unknown paths — already configured for
Netlify (`netlify.toml`, `public/_redirects`) and Vercel (`vercel.json`). For a local static server use `npx serve -s dist`.

---

## 🚀 Key Features

### 1. 🏠 Dual Scope: Home vs Building
- **Home / Residential Solar**: 5 kW to 20 kW hybrid setups, 100% electricity bill offsets, silent lithium battery backup banks.
- **Building / Commercial**: 50 kW to 2+ MW commercial rooftop BIPV, high-voltage transformer hooks, ballasted racking, peak demand shaving.

### 2. 🧮 Interactive System Sizing Calculator
- Select purpose (**Home** or **Building**), slide to your rooftop area (sq ft) and monthly electricity bill.
- Capacity is sized from the bill **and capped by usable roof area** (with a clear note when the roof is the limiting factor).
- Instant results: monthly generation, monthly savings, payback period, 25-year net savings, and an itemized cost breakdown.
- One-click booking that carries the calculated design into the booking form.

### 3. 🛒 Hardware Catalog with Transparent Pricing + Quote Builder
- Component store with prices for panels, hybrid inverters, LiFePO4 batteries, and racking.
- Category filtering + live search.
- **Quote builder**: add equipment, adjust quantities with +/− steppers, see the live package total, then book installation with the exact package attached to the booking email and receipt.

### 4. 📅 Online Booking Engine
- Purpose (Home/Building), service type, preferred lead engineer, date (no past dates), time slot, contact & property details.
- Delivered to `contactgridmaster@gmail.com` by a four-channel engine (own Gmail webhook → server relay →
  FormSubmit → Web3Forms), sent as a CORS-preflight-free request so ad-blockers cannot break it, with
  automatic retries and a local retry queue.
- Honest but friendly status handling: a clean confirmation screen, with the per-relay report behind a
  “Show details” toggle, plus retry / mail-app / WhatsApp / direct-call fallbacks carrying the full booking.
- Owner dashboard at `/mail-delivery`: live delivery test, one-time relay activation guidance, queued-message
  management and delivery history.
- Copy or download an official booking receipt (.txt) with the reference ID and equipment package.

### 5. 📐 Designing Samples & CAD Blueprint Viewer
- Residential and commercial case-study portfolio with filters.
- **Inspect CAD Blueprint modal**: technical spec tables, generation & CO₂ metrics, and engineering sign-off by **GANDHAMANENI GOUTHAM** and **Ashish Kumar**.

### 6. 💳 Interactive 3D Digital Visiting Card
- Flippable 3D card for Head Engineer **GANDHAMANENI GOUTHAM**.
- **Real scannable QR code** (opens a direct call to the Head Engineer).
- **Save vCard (.vcf)** button, copy contact details, credential badges.

### 7. 👨‍🔬 Engineering Roster, Testimonials & FAQ
- Team roster featuring **GANDHAMANENI GOUTHAM** (Head Engineer) and **Ashish Kumar** (Solar Designer Engineer), plus a "Grid Master Standard" guarantees card, client reviews and an FAQ accordion.

### 8. 💬 Floating WhatsApp Button
- Always-visible WhatsApp contact button (bottom-right) that opens a chat with the Head Engineer's number (+91 7200745180) with a pre-filled message. Also used as a fallback when email delivery can't be confirmed.

---

## 💻 Tech Stack

- **Frontend**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 (+ `tailwindcss-animate` for modal transitions)
- **Icons**: Lucide React
- **QR**: qrcode.react
- **Typography**: Inter & Fira Code (Google Fonts)
- **E-mail delivery**: 4-channel engine (`src/lib/mailDelivery.js`) — own Gmail/webhook relay → serverless relay → FormSubmit → Web3Forms, preflight-free transports, automatic retries and a local retry queue
- **Optional backend**: serverless function (`netlify/functions/send-booking.mjs` + `api/send-booking.js`) for Resend / SendGrid / Brevo
- **Tests**: Node's built-in test runner (39 tests: engine unit tests, jsdom UI integration, serverless relay) + ESLint 9
- **Deployment**: Vercel / Netlify / Cloudflare Pages ready (`netlify.toml`, `vercel.json` included)

---

## 🛠️ Getting Started

### Prerequisites
[Node.js](https://nodejs.org/) v18 or higher.

```bash
npm install
npm run dev        # → http://localhost:3000
npm run build      # production build in dist/
```

### ✅ Verify the booking e-mail in one click
Open **`/mail-delivery`** (also linked in the footer as *Mail Delivery Center*) on the deployed site and press
**“Run live delivery test”**. The page sends a real test message through every relay and prints the exact
answer of each one, so you can see immediately whether `contactgridmaster@gmail.com` is receiving bookings.

Nothing is ever lost: every booking is stored in a local retry queue until a relay confirms delivery and is
re-sent automatically on the next visit, when the connection returns, and from the delivery centre itself.

### 🔒 The permanent fix: your own Gmail relay (no third party, no activation)
This is the recommended setup. Bookings are e-mailed **from your own Gmail account** — nothing can be blocked
by an ad-blocker, and there is no activation link to click.

1. Open <https://script.google.com> → **New project**.
2. Paste the ready-made script from **`docs/google-apps-script-mail-relay.gs`** (it also writes an optional
   Google‑Sheet log and can auto-reply to the customer).
3. **Deploy → New deployment → Web app**, *Execute as* **Me**, *Who has access* **Anyone**, then copy the
   **Web app URL** (it ends with `/exec`).
4. Website → footer → **Mail Delivery Center** → paste it into **"Personal relay URL"** → **Save** →
   **Run live delivery test**. A test e-mail must arrive in your inbox — that is your proof.

Once that URL is set, it becomes the **first** channel for every booking; FormSubmit stays as an automatic
backup. The same URL can also be set at build time with `VITE_MAIL_WEBHOOK_URL`, or server-side with
`MAIL_PROVIDER=webhook` + `MAIL_WEBHOOK_URL`.

### ⚠️ Why a booking can say "Delivery not confirmed" (and what to do)
The website now reports the truth instead of pretending to succeed. The common causes:

| What the report says | Cause | Fix |
| --- | --- | --- |
| *“The browser could not reach the relay … ad-blocker”* | An ad-blocker / strict privacy extension, a filtered network, or a blocked CORS preflight | The site already retries with a preflight-free multipart POST. Then either allow `formsubmit.co`, or use your own Gmail relay above (never blocked) |
| *“Activation pending”* | FormSubmit has not been activated for the inbox yet | Click **Activate Form** in the e-mail FormSubmit sent to `contactgridmaster@gmail.com` (check Spam/Promotions) |
| *“Server relay is not available”* | The optional serverless function is not deployed / has no provider key | Harmless — the relays below it are used instead. Deploy it only for domain-based sending |

Filtered networks and strict privacy browsers are exactly why the multipart (preflight-free) transport and
your own Gmail relay exist: they keep the customer flow smooth with no scary errors.

### ⚠️ Optional: activate the FormSubmit relay too (30 seconds, one time)
FormSubmit **silently discards every submission until the recipient inbox is activated** — the classic reason
“automatic mails never arrive”:

1. Open `/mail-delivery` on the live site and press **“Run live delivery test”** (or submit any booking).
2. Open `contactgridmaster@gmail.com` — FormSubmit has just sent an e-mail with an **Activate Form** link
   (check **Spam** and **Promotions**).
3. Click that link, then press **“Run live delivery test”** again — every relay turns green and anything
   queued is re-sent.

### 🚀 Optional: send from your own domain (Resend / SendGrid / Brevo)
Set these in Netlify (Site settings → Environment variables) or Vercel (Project → Environment variables):
`MAIL_PROVIDER`, `MAIL_API_KEY`, `MAIL_FROM` (optional `MAIL_TO`, `MAIL_CC`). When unconfigured the endpoint
answers `501 { configured: false }` and the browser falls back automatically. See `.env.example`.

### 🧪 Verify everything locally
```bash
npm run lint      # ESLint 9 (0 errors)
npm test          # 51 tests: engine unit + jsdom UI integration + serverless relay
npm run verify    # lint + tests + production build
```

---

## 💰 Pricing / Currency (Dual: ₹ primary, $ secondary)

Prices show **₹ (primary) with an ≈ $ equivalent** across the catalog, quote builder,
calculator and booking receipts — all driven by one config in
[`src/data/solarData.js`](./src/data/solarData.js):

```js
export const CURRENCY = {
  rate: 85, // ₹ per 1 USD (reference conversion)
  formatINR / formatUSD / inrFromUSD / usdFromINR
};
export const SOLAR_ASSUMPTIONS = { tariffPerKwhInr: 8, ... }; // calculator (INR-based)
```

- **Change the reference rate**: edit `CURRENCY.rate`.
- **Change an equipment price**: edit `priceINR` on the item in `EQUIPMENT_CATALOG` (`pricePerUnit` is the USD reference used for the ≈ $ display).
- **Change calculator assumptions** (tariff, cost per kW, battery cost): edit `SOLAR_ASSUMPTIONS`.

> The ≈ $ values are conversions at the reference rate — if you want exact fixed USD prices
> next to the ₹ prices, set them manually per item.

---

## 📁 Project Structure

```
Grid-Master-Web-site-/
├── README.md
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml                    # Netlify build, functions & redirects
├── vercel.json                     # Vercel build, functions & SPA rewrite
├── eslint.config.js                # ESLint 9 flat config
├── .env.example                    # Optional mail-provider / build variables
├── run.bat                         # Windows one-click launcher
├── docs/
│   └── google-apps-script-mail-relay.gs   # ready-to-paste own-Gmail relay
├── netlify/functions/              # Serverless mail endpoint (Netlify)
├── api/                            # Serverless mail endpoint (Vercel)
├── server/
│   └── mailProvider.mjs            # Resend / SendGrid / Brevo sender
├── tests/                          # 51 automated tests (engine, UI, relay)
├── public/
└── src/
    ├── main.jsx
    ├── App.jsx                     # Section composition + shared booking/quote state
    ├── index.css                   # Tailwind + flip-card 3D + utilities
    ├── lib/
    │   └── mailDelivery.js         # Booking e-mail engine + retry queue
    ├── data/
    │   └── solarData.js            # Currency, assumptions, team, catalog, samples, FAQs
    └── components/
        ├── Navbar.jsx              # Sticky header nav + quick actions
        ├── Hero.jsx                # Hero banner with primary CTAs
        ├── VisitingCard.jsx        # 3D flippable card, real QR, vCard download
        ├── Services.jsx            # Home & Building service capabilities
        ├── DesignSamples.jsx       # Blueprint portfolio & CAD inspection modal
        ├── EquipmentCatalog.jsx    # Store, search/filter, quote builder w/ quantities
        ├── SolarCalculator.jsx     # Sizing & ROI engine (roof-aware)
        ├── Team.jsx                # Engineering roster
        ├── BookingModal.jsx        # Booking form + mail engine dispatch + receipt
        ├── Testimonials.jsx        # Reviews & FAQ accordion
        ├── Footer.jsx              # Footer links & contact
        └── WhatsAppButton.jsx      # Floating WhatsApp contact button
    └── pages/
        ├── HomePage.jsx … NotFoundPage.jsx   # One page per menu entry
        └── MailDeliveryPage.jsx    # Owner mail-delivery centre (/mail-delivery)
```

---

## 👤 Contacts & Leadership

- **Company**: Grid Master Solar Systems
- **Head Engineer**: GANDHAMANENI GOUTHAM (Solar Designing Engineer & Electrical Engineer)
  - 📞 `+91 72007 45180`
  - ✉️ `goutham4518@gmail.com`
- **Solar Designer Engineer**: Ashish Kumar — `snazzy5566@gmail.com`
- **Headquarters**: Solar Tech Park, Suite 402, Clean Energy Corridor, Hyderabad

> Note: `contactgridmaster@gmail.com` is the booking receipt inbox configured in `COMPANY_INFO` — update it in `src/data/solarData.js` if you move to a company domain.

---

© 2026 Grid Master Solar Systems. All rights reserved.
