import React, { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, Clock, CheckCircle2, User, Phone, Mail,
  MapPin, Home, Building2, Sun, ShieldCheck, Send, Download, Copy, Check, Loader2, FileText, AlertTriangle, MessageCircle, RefreshCw, ChevronDown, ExternalLink
} from 'lucide-react';
import { COMPANY_INFO, CURRENCY } from '../data/solarData';
import {
  DELIVERY,
  buildBookingPayload,
  deliverBooking,
  enqueueBooking,
  dequeueBooking,
  makeReference,
} from '../lib/bookingMail';

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

const toISODate = (d) => {
  // Local calendar date — toISOString() would shift the day for IST users.
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getMinDate = () => toISODate(new Date());
const getDefaultDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return toISODate(d);
};
const getMaxDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return toISODate(d);
};

export default function BookingModal({ isOpen, onClose, initialService = "", quoteItems = [] }) {
  const [purpose, setPurpose] = useState("home"); // 'home' or 'building'
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
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [delivery, setDelivery] = useState(null); // { ok, state, channel, message, attempts }
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const submittedPayload = useRef(null);

  // Keep the pre-filled service in sync every time the modal (re)opens
  useEffect(() => {
    if (isOpen) {
      setServiceType(initialService || STANDARD_SERVICES[0]);
    }
  }, [isOpen, initialService]);

  // Lock page scroll + close on Escape while the modal is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

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
    setShowDetails(false);
    setDelivery(null);
    submittedPayload.current = null;
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
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* noop */ }
      document.body.removeChild(ta);
      done();
    }
  };

  const buildQuoteSummary = () =>
    quoteItems
      .map(
        (item) =>
          `  - ${item.name} x${item.quantity} (${CURRENCY.formatINR(item.priceINR)} / ${item.unit || "unit"})`
      )
      .join("\n");

  const quoteTotalINR = quoteItems.reduce(
    (sum, item) => sum + (item.priceINR || 0) * item.quantity,
    0
  );
  const quoteTotalUSD = quoteItems.reduce(
    (sum, item) => sum + (item.pricePerUnit || 0) * item.quantity,
    0
  );

  const leadEngineerLabel = () =>
    ENGINEER_OPTIONS.find((eng) => eng.value === preferredEngineer)?.label ||
    ENGINEER_OPTIONS[0].label;

  const delivered = delivery?.ok === true;
  const inbox = COMPANY_INFO.email;

  /** Send (or re-send) whatever is currently in the form / last submitted. */
  const dispatchBooking = async (payload, reference, { retry = false } = {}) => {
    const result = await deliverBooking(payload, { inbox });
    setDelivery(result);
    if (result.ok) {
      dequeueBooking(reference);
    } else {
      // Never lose a booking: keep it locally and re-send it automatically later.
      enqueueBooking({
        reference,
        createdAt: new Date().toISOString(),
        inbox,
        payload,
      });
    }
    if (retry) setIsRetrying(false);
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const randomRef = makeReference();
    setBookingRef(randomRef);

    const payload = buildBookingPayload(
      {
        customerName,
        customerPhone,
        customerEmail,
        propertyAddress,
        purpose,
        serviceType,
        leadEngineer: leadEngineerLabel(),
        date,
        timeSlot,
        notes,
        quoteSummary: quoteItems.length > 0 ? buildQuoteSummary() : "",
        quoteTotal:
          quoteItems.length > 0
            ? `${CURRENCY.formatINR(quoteTotalINR)} (≈ ${CURRENCY.formatUSD(quoteTotalUSD)})`
            : "",
      },
      { reference: randomRef, inbox }
    );

    submittedPayload.current = payload;
    await dispatchBooking(payload, randomRef);

    setIsSubmitting(false);
    setBookingConfirmed(true);
  };

  const handleRetryDelivery = async () => {
    if (!submittedPayload.current) return;
    setIsRetrying(true);
    await dispatchBooking(submittedPayload.current, bookingRef, { retry: true });
  };

  /** Everything the visitor can paste into their own mail app. */
  const buildReceiptText = () => {
    const statusLine = delivered
      ? `Sent to ${inbox} via the ${delivery?.channel === "server" ? "company mail relay" : "website mail relay"}`
      : "Pending — please use the call / WhatsApp / e-mail buttons to confirm this booking";
    const quoteLines =
      quoteItems.length > 0
        ? `\nSELECTED EQUIPMENT:\n${buildQuoteSummary()}\nEquipment package total: ${CURRENCY.formatINR(quoteTotalINR)} (≈ ${CURRENCY.formatUSD(quoteTotalUSD)})`
        : "";
    return `GRID MASTER SOLAR BOOKING RECEIPT
========================================
Reference ID: ${bookingRef}
Customer Name: ${customerName}
Phone: ${customerPhone}
Email: ${customerEmail}
Location: ${propertyAddress}

PROJECT SUMMARY:
- Scope: ${purpose === "home" ? "Home (Residential)" : "Building (Commercial)"}
- Service: ${serviceType}
- Preferred Audit Date: ${date} at ${timeSlot}
- Oversight: ${leadEngineerLabel()}
${quoteLines}
- Status: ${statusLine}
========================================
For assistance, contact Head Engineer G. Goutham at ${COMPANY_INFO.directPhone}.`;
  };

  const handleCopyReceipt = () => handleCopy(buildReceiptText());

  const handleDownloadReceipt = () => {
    const quoteLines =
      quoteItems.length > 0
        ? `\nSELECTED EQUIPMENT PACKAGE:\n${quoteItems
            .map((item) => `${item.name} x${item.quantity} = ${CURRENCY.formatINR(item.priceINR * item.quantity)}`)
            .join("\n")}\nPackage Subtotal    : ${CURRENCY.formatINR(quoteTotalINR)} (≈ ${CURRENCY.formatUSD(quoteTotalUSD)})`
        : "";
    const receiptText = `=====================================================
            GRID MASTER SOLAR SYSTEMS
     ADVANCED SOLAR DESIGNING & GRID INTEGRATION
=====================================================

OFFICIAL BOOKING RECEIPT
-----------------------------------------------------
Booking Reference : ${bookingRef}
Date Created      : ${new Date().toLocaleDateString()}

CUSTOMER DETAILS:
-----------------------------------------------------
Full Name         : ${customerName}
Phone Number      : ${customerPhone}
Email Address     : ${customerEmail}
Site Address      : ${propertyAddress}

PROJECT SPECIFICATIONS:
-----------------------------------------------------
Installation Purpose: ${purpose === "home" ? "Home (Residential)" : "Building (Commercial)"}
Required Service    : ${serviceType}
Scheduled Audit Date: ${date}
Time Slot           : ${timeSlot}
Lead Engineer       : ${leadEngineerLabel()}
Special Notes       : ${notes || "N/A"}
${quoteLines}
ENGINEERING DIRECTORY:
-----------------------------------------------------
Head Engineer : GANDHAMANENI GOUTHAM
Direct Phone  : ${COMPANY_INFO.directPhone}
Company Email : ${COMPANY_INFO.email}
Solar Designer: Ashish Kumar

Mail status: ${
      delivered
        ? `DELIVERED TO ${inbox}`
        : `NOT CONFIRMED - ${delivery?.message || "please reach us directly to confirm your slot"}`
    }
=====================================================`;

    // Some in-app browsers (Instagram / WhatsApp webviews) block Blob
    // downloads — fall back to copying the receipt rather than doing nothing.
    try {
      const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `GridMaster_Booking_${bookingRef}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      handleCopy(receiptText);
    }
  };

  /** A mail the customer can send from their own inbox — works with zero relays. */
  const buildMailtoHref = () => {
    const subject = `Solar Booking ${bookingRef} — ${customerName}`;
    const body = buildReceiptText();
    return `mailto:${inbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const whatsappHref = `https://wa.me/917200745180?text=${encodeURIComponent(
    `Hi Grid Master, I submitted a solar booking (Ref ${bookingRef}) for ${customerName}. Please confirm my slot: ${date} at ${timeSlot}.`
  )}`;

  const diagnosis = () => {
    if (!delivery) return "";
    switch (delivery.state) {
      case DELIVERY.ACTIVATION:
        return `The mail relay is waiting for a one-time activation of ${inbox} (an "Activate Form" e-mail from formsubmit.co). Your booking is saved here and will be re-sent automatically once that is done.`;
      case DELIVERY.BLOCKED:
        return "Your browser could not reach the mail relay — usually an ad-blocker, a privacy extension or a filtered network. Using desktop data / another browser, or the e-mail button below, delivers the same booking.";
      case DELIVERY.OFFLINE:
        return "You appear to be offline. The booking is stored on this device and is sent automatically the moment you are back online.";
      default:
        return delivery.message || "The mail relay did not accept the booking.";
    }
  };

  if (!isOpen) return null;

  const serviceOptions = STANDARD_SERVICES.includes(serviceType)
    ? STANDARD_SERVICES
    : [serviceType, ...STANDARD_SERVICES];

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

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          aria-label="Close booking form"
        >
          <X className="w-5 h-5" />
        </button>

        {!bookingConfirmed ? (
          <div>
            {/* Modal Header */}
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
              request is sent to <strong className="text-amber-300">{inbox}</strong>{" "}
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
                    {serviceOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.length > 60 ? opt + "…" : opt}
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
                    {ENGINEER_OPTIONS.map((eng) => (
                      <option key={eng.value} value={eng.value}>
                        {eng.label}
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
                    <span>Sending your booking securely...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm &amp; Submit Booking</span>
                  </>
                )}
              </button>

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
              {delivered ? (
                <CheckCircle2 className="w-12 h-12" />
              ) : (
                <AlertTriangle className="w-12 h-12" />
              )}
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                Booking Reference: {bookingRef}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
                {delivered
                  ? "Solar Booking Submitted Successfully!"
                  : "Booking Saved — Confirming Delivery"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{customerName}</strong>.{" "}
                {delivered ? (
                  <>
                    Your booking e-mail has been delivered to{" "}
                    <strong className="text-amber-400">{inbox}</strong>. Our team will call you
                    within 24 hours.
                  </>
                ) : (
                  <>
                    Your booking is saved on this device and we are still trying to deliver it to{" "}
                    <strong className="text-amber-400">{inbox}</strong>. You can also send it
                    yourself in one click below — it takes 5 seconds.
                  </>
                )}
              </p>
            </div>

            {/* Receipt Details Box */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/30 font-mono text-xs text-slate-300 text-left space-y-2.5 max-w-lg mx-auto">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Booking Status:</span>
                {delivered ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> E-mailed to {inbox}
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Saved — send below
                  </span>
                )}
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Service Required:</span>
                <span className="text-amber-300 font-bold truncate max-w-[220px] text-right">{serviceType}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Scope:</span>
                <span className="text-white">{purpose === "home" ? "Home (Residential)" : "Building (Commercial)"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Scheduled Audit:</span>
                <span className="text-emerald-400">{date} ({timeSlot})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Lead Engineer:</span>
                <span className="text-amber-400 font-bold truncate max-w-[220px] text-right">
                  {leadEngineerLabel()}
                </span>
              </div>
              {quoteItems.length > 0 && (
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Equipment Package:</span>
                  <span className="text-amber-300 font-bold">{quoteItems.length} items — total {CURRENCY.formatINR(quoteTotalINR)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Property Address:</span>
                <span className="text-slate-200 truncate max-w-[220px] text-right">{propertyAddress}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Our team will call you at <strong className="text-white">{customerPhone}</strong>{" "}
              within 24 hours to confirm your audit slot.
            </p>

            {!delivered && (
              <div className="max-w-lg mx-auto rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left space-y-3">
                <p className="text-xs text-amber-200 leading-relaxed">{diagnosis()}</p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={buildMailtoHref()}
                    data-testid="booking-mailto"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send this booking by e-mail</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleRetryDelivery}
                    disabled={isRetrying}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700 disabled:opacity-60"
                  >
                    {isRetrying ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{isRetrying ? "Re-sending…" : "Retry automatic send"}</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`tel:${COMPANY_INFO.directPhone.replace(/\s/g, "")}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700"
                  >
                    <Phone className="w-4 h-4 text-amber-400" />
                    <span>Call {COMPANY_INFO.phoneDisplay}</span>
                  </a>
                  <a
                    href={whatsappHref}
                    data-testid="booking-whatsapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Us</span>
                  </a>
                </div>

                {delivery?.state === DELIVERY.ACTIVATION && (
                  <a
                    href="https://mail.google.com/mail/u/0/#search/formsubmit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-amber-300 hover:text-amber-200 underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open the inbox to approve the mail relay (one-time, 30 seconds)</span>
                  </a>
                )}
              </div>
            )}

            {/* Honest per-relay diagnostics, folded away by default */}
            {delivery?.attempts?.length > 0 && (
              <div className="max-w-lg mx-auto text-left">
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-amber-300 transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                  <span>{showDetails ? "Hide delivery details" : "Show delivery details"}</span>
                </button>
                {showDetails && (
                  <ul className="mt-2 space-y-1.5 font-mono text-[10px] text-slate-400">
                    {delivery.attempts.map((attempt, index) => (
                      <li key={`${attempt.channel}-${index}`} className="flex gap-2">
                        <span className={attempt.ok ? "text-emerald-400" : "text-amber-400"}>
                          {attempt.ok ? "✓" : "✕"}
                        </span>
                        <span className="text-slate-300">
                          {attempt.channel === "server" ? "company relay" : "formsubmit"}
                          {attempt.transport ? ` (${attempt.transport})` : ""}
                          {attempt.status ? ` → HTTP ${attempt.status}` : ""}:
                        </span>
                        <span className="flex-1">{attempt.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={handleCopyReceipt}
                className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-amber-400" />
                )}
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
          </div>
        )}
      </div>
    </div>
  );
}
