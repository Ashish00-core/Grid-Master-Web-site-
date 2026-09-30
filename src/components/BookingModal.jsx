import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X, CheckCircle2, Phone, Mail,
  Home, Building2, Send, Download, Copy, Check, Loader2, FileText, AlertTriangle, MessageCircle, RefreshCw, ExternalLink, ServerCog
} from 'lucide-react';
import { COMPANY_INFO, CURRENCY } from '../data/solarData';
import {
  buildBookingMessage,
  deliverMessage,
  mailtoHref,
  whatsappHref,
  callHref,
  resolveRecipient,
  isValidEmail,
  DELIVERY_STATES,
} from '../lib/mailDelivery';

const STANDARD_SERVICES = [
  "Solar Designing & 3D Simulation",
  "Turnkey Solar Installation",
  "High Voltage Grid Integration",
  "Battery Storage & Microgrid Integration",
  "Full Package (Design + Install + Grid Integration)",
];

const ENGINEER_OPTIONS = [
  { value: "g-gowtham", label: "GANDHAMANENI GOUTHAM (Head Engineer - Solar & Electrical)" },
  { value: "ashish", label: "Ashish Kumar (Solar Designer Engineer)" },
];

const TIME_SLOTS = [
  "09:00 AM - 11:00 AM",
  "11:00 AM - 01:00 PM",
  "02:00 PM - 04:00 PM",
  "04:00 PM - 06:00 PM",
];

/** Local (not UTC) YYYY-MM-DD — avoids the date jumping a day in IST. */
const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMinDate = () => toLocalISODate(new Date());
const getDefaultDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return toLocalISODate(date);
};
const getMaxDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return toLocalISODate(date);
};

const formatDate = (isoDate) => {
  if (!isoDate) return '-';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function BookingModal({ isOpen, onClose, initialService = "", quoteItems = [] }) {
  const [purpose, setPurpose] = useState("home");
  const [serviceType, setServiceType] = useState(initialService || STANDARD_SERVICES[0]);
  const [preferredEngineer, setPreferredEngineer] = useState("g-gowtham");
  const [date, setDate] = useState(getDefaultDate());
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [propertyAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [formError, setFormError] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [bookingPayload, setBookingPayload] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [copied, setCopied] = useState(false);

  const recipient = resolveRecipient();

  // Lock page scroll + close on Escape while the modal is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const quoteTotalINR = useMemo(
    () => quoteItems.reduce((sum, item) => sum + (item.priceINR || 0) * item.quantity, 0),
    [quoteItems],
  );
  const quoteTotalUSD = useMemo(
    () => quoteItems.reduce((sum, item) => sum + (item.pricePerUnit || 0) * item.quantity, 0),
    [quoteItems],
  );

  const buildQuoteSummary = useCallback(
    () =>
      quoteItems
        .map((item) => `  - ${item.name} x${item.quantity} (${CURRENCY.formatINR(item.priceINR)} / ${item.unit || "unit"})`)
        .join("\n"),
    [quoteItems],
  );

  const leadEngineerLabel = useMemo(() => {
    const engineer = ENGINEER_OPTIONS.find((option) => option.value === preferredEngineer);
    return engineer ? engineer.label : ENGINEER_OPTIONS[0].label;
  }, [preferredEngineer]);

  /** Everything the e-mail relay needs, in one immutable object. */
  const buildBooking = useCallback(
    (reference) => ({
      reference,
      createdAt: new Date().toISOString(),
      name: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerEmail.trim(),
      location: propertyAddress.trim(),
      purpose: purpose === "home" ? "Home (Residential)" : "Building (Commercial)",
      service: serviceType,
      engineer: leadEngineerLabel,
      date,
      timeSlot,
      notes: notes.trim(),
      quoteItems: quoteItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        lineTotalINR: CURRENCY.formatINR(item.priceINR * item.quantity),
        lineTotalUSD: CURRENCY.formatUSD((item.pricePerUnit || 0) * item.quantity),
      })),
      quoteTotalINR: quoteItems.length ? CURRENCY.formatINR(quoteTotalINR) : "",
      quoteTotalUSD: quoteItems.length ? CURRENCY.formatUSD(quoteTotalUSD) : "",
    }),
    [
      customerName, customerPhone, customerEmail, propertyAddress, purpose,
      serviceType, leadEngineerLabel, date, timeSlot, notes, quoteItems,
      quoteTotalINR, quoteTotalUSD,
    ],
  );

  const message = useMemo(
    () => (bookingPayload ? buildBookingMessage(bookingPayload) : null),
    [bookingPayload],
  );

  const handleReset = () => {
    setBookingConfirmed(false);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setNotes("");
    setDate(getDefaultDate());
    setTimeSlot(TIME_SLOTS[0]);
    setCopied(false);
    setDelivery(null);
    setBookingPayload(null);
    setFormError("");
    onClose();
  };

  const handleCopy = (text) => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      const helper = document.createElement("textarea");
      helper.value = text;
      document.body.appendChild(helper);
      helper.select();
      try { document.execCommand("copy"); } catch { /* noop */ }
      document.body.removeChild(helper);
      done();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!isValidEmail(customerEmail)) {
      setFormError("Please enter a valid e-mail address so we can confirm your booking.");
      return;
    }
    if (customerPhone.replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid phone number (at least 10 digits).");
      return;
    }

    setIsSubmitting(true);
    const reference = "GM-SR-" + Math.floor(100000 + Math.random() * 900000);
    const booking = buildBooking(reference);
    const built = buildBookingMessage(booking);

    setBookingRef(reference);
    setBookingPayload(booking);

    const report = await deliverMessage(built, {
      reference,
      kind: "booking",
      replyTo: booking.email,
    });

    setDelivery(report);
    setIsSubmitting(false);
    setBookingConfirmed(true);
  };

  const handleRetry = async () => {
    if (!message) return;
    setIsRetrying(true);
    const report = await deliverMessage(message, {
      reference: bookingRef,
      kind: "booking",
      replyTo: bookingPayload?.email,
    });
    setDelivery(report);
    setIsRetrying(false);
  };

  const handleCopyReceipt = () => {
    if (!message) return;
    const statusLine =
      delivery?.state === DELIVERY_STATES.delivered
        ? `Dispatched To: ${delivery.recipient} (${delivery.channelLabel})`
        : delivery?.state === DELIVERY_STATES.activation
          ? "Queued — one-time FormSubmit activation pending; will be re-sent automatically"
          : "Queued on this device — retry from the booking form or send it from your mail app";
    const text = `GRID MASTER SOLAR BOOKING RECEIPT
========================================
Reference ID: ${bookingRef}
Customer Name: ${bookingPayload?.name || ''}
Phone: ${bookingPayload?.phone || ''}
Email: ${bookingPayload?.email || ''}
Location: ${bookingPayload?.location || ''}

PROJECT SUMMARY:
- Scope: ${bookingPayload?.purpose || ''}
- Service: ${bookingPayload?.service || ''}
- Preferred Audit Date: ${bookingPayload?.date || ''} at ${bookingPayload?.timeSlot || ''}
- Oversight: ${bookingPayload?.engineer || ''}
${quoteItems.length ? `\nSELECTED EQUIPMENT:\n${buildQuoteSummary()}\nEquipment package total: ${bookingPayload?.quoteTotalINR} (≈ ${bookingPayload?.quoteTotalUSD})` : ""}
- Delivery Status: ${statusLine}
========================================
For assistance, contact Head Engineer G. Goutham at ${COMPANY_INFO.directPhone}.`;
    handleCopy(text);
  };

  const handleDownloadReceipt = () => {
    const quoteLines = quoteItems.length
      ? `\nSELECTED EQUIPMENT PACKAGE:\n${quoteItems
          .map((item) => `${item.name} x${item.quantity} = ${CURRENCY.formatINR(item.priceINR * item.quantity)}`)
          .join("\n")}\nPackage Subtotal    : ${CURRENCY.formatINR(quoteTotalINR)} (≈ ${CURRENCY.formatUSD(quoteTotalUSD)})`
      : "";

    const statusText = delivery
      ? delivery.state === DELIVERY_STATES.delivered
        ? `DELIVERED TO ${delivery.recipient} VIA ${String(delivery.channelLabel).toUpperCase()}`
        : delivery.state === DELIVERY_STATES.activation
          ? `QUEUED — FORM-SUBMIT ACTIVATION PENDING FOR ${delivery.recipient}`
          : `QUEUED ON THIS DEVICE — DELIVERY COULD NOT BE CONFIRMED (${delivery.detail})`
      : "NOT SENT";

    const receiptText = `=====================================================
            GRID MASTER SOLAR SYSTEMS
     ADVANCED SOLAR DESIGNING & GRID INTEGRATION
=====================================================

OFFICIAL BOOKING RECEIPT
-----------------------------------------------------
Booking Reference : ${bookingRef}
Date Created      : ${new Date().toLocaleString('en-IN')}

CUSTOMER DETAILS:
-----------------------------------------------------
Full Name         : ${bookingPayload?.name || ''}
Phone Number      : ${bookingPayload?.phone || ''}
Email Address     : ${bookingPayload?.email || ''}
Site Address      : ${bookingPayload?.location || ''}

PROJECT SPECIFICATIONS:
-----------------------------------------------------
Installation Purpose: ${bookingPayload?.purpose || ''}
Required Service    : ${bookingPayload?.service || ''}
Scheduled Audit Date: ${bookingPayload?.date || ''}
Time Slot           : ${bookingPayload?.timeSlot || ''}
Lead Engineer       : ${bookingPayload?.engineer || ''}
Special Notes       : ${bookingPayload?.notes || "N/A"}
${quoteLines}
ENGINEERING DIRECTORY:
-----------------------------------------------------
Head Engineer : GANDHAMANENI GOUTHAM
Direct Phone  : ${COMPANY_INFO.directPhone}
Company Email : ${recipient}
Solar Designer: Ashish Kumar

DELIVERY STATUS:
-----------------------------------------------------
${statusText}
=====================================================`;

    const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `GridMaster_Booking_${bookingRef}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const serviceOptions = STANDARD_SERVICES.includes(serviceType)
    ? STANDARD_SERVICES
    : [serviceType, ...STANDARD_SERVICES];

  const delivered = delivery?.state === DELIVERY_STATES.delivered;
  const needsAttention = Boolean(delivery) && !delivered;
  const mailFallback = message ? mailtoHref(message, { includeCustomer: true, customerEmail }) : `mailto:${recipient}`;
  const whatsappFallback = message
    ? whatsappHref(`${message.subject}\n\n${message.text}`)
    : whatsappHref('Hi Grid Master, I just submitted a booking on your website.');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md theme-backdrop animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Book a solar consultation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          aria-label="Close booking form"
        >
          <X className="w-5 h-5" />
        </button>

        {!bookingConfirmed ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                Grid Master Online Booking Hub
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white pr-8">
              Book Solar Designing, Installation &amp; Integration
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Schedule an engineering site inspection and 3D solar layout consultation with{" "}
              <strong className="text-amber-400">Head Engineer GANDHAMANENI GOUTHAM</strong>. Your
              request is e-mailed to <strong className="text-amber-300">{recipient}</strong>{" "}
              and our team calls you back within 24 hours.
            </p>

            {quoteItems.length > 0 && (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <p className="font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Your selected equipment package will be included with this booking:
                </p>
                <ul className="space-y-1 text-slate-300 font-mono">
                  {quoteItems.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="truncate">{item.name} ×{item.quantity}</span>
                      <span className="text-white flex-shrink-0">
                        {CURRENCY.formatINR(item.priceINR * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 pt-1.5 border-t border-amber-500/20 font-bold text-white font-mono">
                  Package total: {CURRENCY.formatINR(quoteTotalINR)}{" "}
                  <span className="text-[10px] font-medium text-slate-400">
                    (≈ {CURRENCY.formatUSD(quoteTotalUSD)})
                  </span>
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">

              {/* Purpose Selection */}
              <div>
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">
                  1. Installation Purpose
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPurpose("home")}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs border transition-all ${
                      purpose === "home"
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span>For Home (Residential)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPurpose("building")}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs border transition-all ${
                      purpose === "building"
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>For Building (Commercial)</span>
                  </button>
                </div>
              </div>

              {/* Service Selection & Preferred Engineer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    2. Primary Requirement
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:border-amber-500 focus:outline-none"
                  >
                    {serviceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.length > 60 ? option + "…" : option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    3. Lead Engineer Oversight
                  </label>
                  <select
                    value={preferredEngineer}
                    onChange={(e) => setPreferredEngineer(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:border-amber-500 focus:outline-none"
                  >
                    {ENGINEER_OPTIONS.map((engineer) => (
                      <option key={engineer.value} value={engineer.value}>
                        {engineer.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    Preferred Site Audit Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    min={getMinDate()}
                    max={getMaxDate()}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Selected: {formatDate(date)}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:border-amber-500 focus:outline-none"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Customer &amp; Property Details
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    minLength={2}
                    placeholder="Full Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                  />

                  <input
                    type="tel"
                    required
                    minLength={10}
                    maxLength={15}
                    pattern="[0-9+\-() ]{10,15}"
                    title="Enter a valid 10-15 digit phone number"
                    placeholder="Phone Number *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <input
                  type="email"
                  required
                  placeholder="Email Address *"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 -mt-1.5">
                  We reply straight to this address, so please double-check it.
                </p>

                <input
                  type="text"
                  required
                  minLength={5}
                  placeholder="Property Location Address / City *"
                  value={propertyAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                />

                <textarea
                  placeholder="Specific requirements (e.g., roof size, target load, inverter preference)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                ></textarea>
              </div>

              {formError && (
                <p className="flex items-start gap-2 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </p>
              )}

              {/* What happens next */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-[11px]">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="font-black text-amber-400 text-sm">1</p>
                  <p className="text-slate-300 font-semibold mt-1">We call you within 24h to confirm</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="font-black text-amber-400 text-sm">2</p>
                  <p className="text-slate-300 font-semibold mt-1">Free site audit + 3D CAD design</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="font-black text-amber-400 text-sm">3</p>
                  <p className="text-slate-300 font-semibold mt-1">Fixed quote, then installation</p>
                </div>
              </div>

              {/* Submit Button with Loading State */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                    <span>E-mailing your booking to {recipient}…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm &amp; Submit Booking</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                Delivered through our own mail server when available, with an automatic backup relay.
              </p>

            </form>
          </div>
        ) : (
          /* CONFIRMATION RECEIPT VIEW */
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-300">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl ${
                delivered
                  ? "bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-emerald-500/20"
                  : "bg-amber-500/20 border-2 border-amber-400 text-amber-400 shadow-amber-500/20"
              }`}
            >
              {delivered ? <CheckCircle2 className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                Booking Reference: {bookingRef}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
                {delivered ? "Solar Booking Submitted Successfully!" : "Booking Saved — Confirming Delivery"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{bookingPayload?.name}</strong>.{" "}
                {delivered ? (
                  <>
                    Your request was e-mailed to{" "}
                    <strong className="text-amber-400">{delivery.recipient}</strong> and our engineering
                    team will call you within 24 hours to confirm the site visit.
                  </>
                ) : (
                  <>
                    Your details are saved for reference{" "}
                    <strong className="text-amber-300 font-mono">{bookingRef}</strong> and our team is
                    notified — tapping one of the options below makes sure we receive it right now.
                  </>
                )}
              </p>
            </div>

            {/* Delivery report — kept tidy behind a details toggle so the
                confirmation stays as clean as a normal booking screen. */}
            {delivery && (
              <div
                className={`text-left max-w-lg mx-auto rounded-2xl border ${
                  delivered ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"
                }`}
              >
                <details className="group">
                  <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                    <span className="font-bold text-white flex items-center gap-2 text-xs">
                      <ServerCog className="w-4 h-4 text-amber-400" />
                      {delivered
                        ? `E-mail delivered via ${delivery.channelLabel}`
                        : delivery.state === DELIVERY_STATES.activation
                          ? "One-time e-mail activation pending"
                          : "Delivery not confirmed yet"}
                    </span>
                    <span className="text-[11px] text-slate-300 group-open:hidden">Show details</span>
                    <span className="text-[11px] text-slate-300 hidden group-open:inline">Hide details</span>
                  </summary>

                  <div className="px-4 pb-4 space-y-2 text-xs border-t border-slate-800/60 pt-3">
                    {(delivery.attempts || []).map((attempt) => (
                      <div key={attempt.channel} className="flex items-start gap-2 text-slate-300">
                        {attempt.ok ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        ) : attempt.skipped ? (
                          <span className="text-slate-500 flex-shrink-0 mt-0.5">–</span>
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span>
                          <strong className="text-white">{attempt.label}:</strong> {attempt.detail}
                          {attempt.raw && attempt.raw !== attempt.detail && (
                            <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                              Browser report: {attempt.raw}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}

                    {needsAttention && (
                      <p className="text-amber-200 pt-1 border-t border-amber-500/20">
                        {delivery.state === DELIVERY_STATES.activation ? (
                          <>
                            <strong>One-time setup:</strong> open <strong>{delivery.recipient}</strong>{" "}
                            (check spam too) and click <strong>“Activate Form”</strong> in the e-mail from
                            FormSubmit. Everything queued here is re-sent automatically after that click —
                            or press <em>Retry automatic delivery</em> below.
                          </>
                        ) : (
                          <>
                            Your browser could not reach the e-mail relay (an ad-blocker, a strict privacy
                            extension or a filtered network can do this). Nothing is lost: press{" "}
                            <em>Retry automatic delivery</em>, or send the prepared message instantly with{" "}
                            <em>Send it from my mail app now</em> — every detail is already filled in.
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Receipt Details Box */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/30 font-mono text-xs text-slate-300 text-left space-y-2.5 max-w-lg mx-auto">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">E-mail Status:</span>
                {delivered ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sent to {delivery.recipient}
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Saved &amp; retrying
                  </span>
                )}
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Service Required:</span>
                <span className="text-amber-300 font-bold truncate max-w-[220px] text-right">{bookingPayload?.service}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Scope:</span>
                <span className="text-white">{bookingPayload?.purpose}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Scheduled Audit:</span>
                <span className="text-emerald-400">{bookingPayload?.date} ({bookingPayload?.timeSlot})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Lead Engineer:</span>
                <span className="text-amber-400 font-bold truncate max-w-[220px] text-right">
                  {bookingPayload?.engineer}
                </span>
              </div>
              {quoteItems.length > 0 && (
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Equipment Package:</span>
                  <span className="text-amber-300 font-bold">
                    {quoteItems.length} items — total {CURRENCY.formatINR(quoteTotalINR)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Property Address:</span>
                <span className="text-slate-200 truncate max-w-[220px] text-right">{bookingPayload?.location}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Our team will call you at <strong className="text-white">{bookingPayload?.phone}</strong>{" "}
              within 24 hours to confirm your audit slot.
            </p>

            {/* Actions — retry, guaranteed manual fallbacks, contact */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              {needsAttention && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-all disabled:opacity-70"
                >
                  {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>{isRetrying ? "Retrying…" : "Retry automatic delivery"}</span>
                </button>
              )}

              <a
                href={mailFallback}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700"
              >
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Send it from my mail app now</span>
              </a>

              <a
                href={whatsappFallback}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send on WhatsApp</span>
              </a>

              <a
                href={callHref()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>Call {COMPANY_INFO.phoneDisplay}</span>
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={handleCopyReceipt}
                className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span>{copied ? "Copied Receipt!" : "Copy Reference & Receipt"}</span>
              </button>

              <button
                onClick={handleDownloadReceipt}
                className="px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Official Receipt (.txt)</span>
              </button>

              <button
                onClick={handleReset}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700"
              >
                Done
              </button>
            </div>

            {needsAttention && (
              <p className="text-[11px] text-slate-500">
                <a href="/mail-delivery" className="inline-flex items-center gap-1 text-amber-400 hover:underline">
                  <ExternalLink className="w-3 h-3" />
                  Owner? Open the Mail Delivery Center to finish the one-time e-mail setup.
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
