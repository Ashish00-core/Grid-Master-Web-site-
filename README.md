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
| `/mail-delivery` | Mail Delivery Center — verify automatic e-mails, activate the relay, re-send the queue |

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
- Delivered to `contactgridmaster@gmail.com` by a three-channel engine (own server relay → FormSubmit → Web3Forms) with a local retry queue.
- Honest status handling: the receipt shows the answer of every relay, retries on demand, and offers
  mail-app / WhatsApp / direct-call fallbacks carrying the full booking details.
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
- **E-mail delivery**: 3-channel engine (`src/lib/mailDelivery.js`) — own serverless relay → FormSubmit → Web3Forms, with a local retry queue
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

Every booking is also stored in a local retry queue until a relay confirms delivery, so a message can never
be lost — it is re-sent automatically on the visitor's next visit, when the connection returns, and from the
delivery centre itself.

### ⚠️ Important: Activate the booking e-mail (one-time, FormSubmit relay)
FormSubmit — the free relay used out of the box — **silently discards every submission until the recipient
inbox is activated**. This is the classic reason “automatic mails never arrive”. To activate:

1. Open `/mail-delivery` on the live site and press **“Run live delivery test”** (or submit any booking).
2. Open `contactgridmaster@gmail.com` — FormSubmit has just sent an e-mail with an **Activate Form** link
   (check the **Spam** and **Promotions** folders and mark it “not spam”).
3. Click that **Activate Form** link.
4. Press **“Run live delivery test”** again — every relay turns green and anything queued is re-sent.

The website now shows the customer an honest state instead of a fake success: *“Booking E-mail Delivered!”*,
*“Booking Saved — Activation Pending”* or *“Booking Saved — Delivery Unconfirmed”*, and it always offers a
one-click mail-app / WhatsApp / phone fallback that carries the full booking details.

### 🚀 Optional: send from your own domain (no third-party activation needed)
Deploy the included serverless endpoint with a provider API key and messages are sent from your own domain
instead — this is the most reliable option and needs no activation click:

| Netlify (Site settings → Environment variables) / Vercel (Project → Environment variables) | Example |
| --- | --- |
| `MAIL_PROVIDER` | `resend` \| `sendgrid` \| `brevo` |
| `MAIL_API_KEY` | `re_xxxxxxxx` (provider API key) |
| `MAIL_FROM` | `Grid Master Bookings <bookings@yourdomain.com>` *(verify the domain with the provider)* |
| `MAIL_TO` | `contactgridmaster@gmail.com` *(default — no need to set)* |
| `MAIL_CC` | `engineer@yourdomain.com,office@yourdomain.com` *(optional)* |

When the endpoint is not configured it answers `501 { configured: false }` and the browser transparently falls
back to FormSubmit, so nothing breaks either way. See `.env.example` for the build-time (`VITE_*`) options.

### 🧪 Verify everything locally
```bash
npm run lint      # ESLint 9 (0 errors)
npm test          # 39 tests: engine unit + jsdom UI integration + serverless relay
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
├── netlify/functions/              # Serverless mail endpoint (Netlify)
├── api/                            # Serverless mail endpoint (Vercel)
├── server/
│   └── mailProvider.mjs            # Resend / SendGrid / Brevo sender
├── tests/                          # 39 automated tests (engine, UI, relay)
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
