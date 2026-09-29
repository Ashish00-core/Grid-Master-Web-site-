import React from 'react';
import { Calendar, Phone } from 'lucide-react';
import { COMPANY_INFO } from '../data/solarData';

// Closing call-to-action band shown at the bottom of the inner pages.
export default function CallToAction({ onOpenBooking, title = 'Ready to switch to solar?', text }) {
  return (
    <section className="pb-20 sm:pb-28 bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/50 p-8 sm:p-12 text-center gold-border-glow">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <h2 className="relative text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h2>
          <p className="relative text-slate-300 text-sm sm:text-base mt-3 max-w-2xl mx-auto">
            {text || 'Book a free site audit and our engineers will prepare a custom design, transparent quote and grid-integration plan for your property.'}
          </p>
          <div className="relative mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenBooking()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Calendar className="w-4 h-4" />
              Book Free Site Audit
            </button>
            <a
              href={`tel:${COMPANY_INFO.directPhone.replace(/\s/g, '')}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-slate-950 border border-slate-700 hover:border-amber-500/50 text-slate-100 font-bold text-sm transition-all"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              Call {COMPANY_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
