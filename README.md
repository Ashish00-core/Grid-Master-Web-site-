# ☀️ Grid Master — Advanced Solar Designing, Installation & Integration System

**Grid Master** is a modern, high-performance web platform for solar systems engineering, rooftop 3D designing, equipment price cataloging, and turnkey installation & grid integration. Designed for both **Home (Residential)** and **Building (Commercial)** solar purpose requirements.

This repository is the full web application (a React + Vite + Tailwind single-page app) — deployable directly from the repo root to Netlify, Vercel or Cloudflare Pages.

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
- Submits to `contactgridmaster@gmail.com` via FormSubmit (no page redirect, no mail-app popup).
- Honest status handling: the confirmation receipt shows whether delivery was confirmed, and if not, it offers direct call / WhatsApp fallbacks.
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
- **Deployment**: Vercel / Netlify / Cloudflare Pages ready (`netlify.toml` included)

---

## 🛠️ Getting Started

### Prerequisites
[Node.js](https://nodejs.org/) v18 or higher.

```bash
npm install
npm run dev        # → http://localhost:3000
npm run build      # production build in dist/
```

### ⚠️ Important: Activate the booking email (one-time)
Bookings are delivered through [FormSubmit](https://formsubmit.co). **Before the first real booking can arrive**, the owner of `contactgridmaster@gmail.com` must:

1. Submit any booking from the live site (or trigger one from the local dev server).
2. Open the inbox of `contactgridmaster@gmail.com` — FormSubmit will send an **activation email**.
3. Click the **Activate** link in that email.

After activation, every booking submission is emailed as a clean table. Until activation happens, the site still shows the customer a reference ID and offers call/WhatsApp fallbacks, but the email itself will not be delivered.

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
├── netlify.toml                    # Netlify build & deploy config
├── run.bat                         # Windows one-click launcher
├── public/
└── src/
    ├── main.jsx
    ├── App.jsx                     # Section composition + shared booking/quote state
    ├── index.css                   # Tailwind + flip-card 3D + utilities
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
        ├── BookingModal.jsx        # Booking form + FormSubmit dispatch + receipt
        ├── Testimonials.jsx        # Reviews & FAQ accordion
        ├── Footer.jsx              # Footer links & contact
        └── WhatsAppButton.jsx      # Floating WhatsApp contact button
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
