import React from 'react';
import { Phone, Mail, MapPin, MessageCircle, Calendar, CreditCard, Clock, Headset } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Testimonials from '../components/Testimonials';
import { COMPANY_INFO } from '../data/solarData';

export default function ContactPage({ onOpenBooking, onOpenVisitingCard }) {
  const tel = COMPANY_INFO.directPhone.replace(/\s/g, '');
  const wa = `https://wa.me/${tel.replace('+', '')}?text=${encodeURIComponent('Hi Grid Master! I am interested in a solar solution. Please share details.')}`;

  const cards = [
    { icon: Phone, label: 'Call the Head Engineer', value: COMPANY_INFO.phoneDisplay, href: `tel:${tel}`, mono: true },
    { icon: MessageCircle, label: 'WhatsApp Chat', value: 'Message us instantly', href: wa, external: true },
    { icon: Mail, label: 'Email Us', value: COMPANY_INFO.email, href: `mailto:${COMPANY_INFO.email}`, mono: true },
    { icon: MapPin, label: 'Visit Our Office', value: COMPANY_INFO.address },
  ];

  return (
    <>
      <PageHeader
        icon={Headset}
        eyebrow="Contact"
        title="Talk to a"
        highlight="Solar Engineer Today"
        description="Have a question about a rooftop, a bill or a quote? Reach us any way you like — or book a free site audit and we will come to you."
      />

      <section className="pt-4 pb-16 sm:pb-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map(({ icon: Icon, label, value, href, external, mono }) => {
              const body = (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400 mt-5">{label}</p>
                  <p className={`mt-2 text-sm text-slate-100 break-words ${mono ? 'font-mono' : ''}`}>{value}</p>
                </>
              );
              const cls = 'group block rounded-3xl bg-slate-900 border border-slate-800 p-6 hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300';
              return href ? (
                <a key={label} href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  {body}
                </a>
              ) : (
                <div key={label} className={cls}>{body}</div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-500/30 p-7 sm:p-9 gold-border-glow">
              <h2 className="text-xl sm:text-2xl font-black text-white">Book a free site audit</h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Choose your service, engineer, date and time slot online. You will get a booking reference and a receipt straight away.
              </p>
              <button
                onClick={() => onOpenBooking()}
                className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Calendar className="w-4 h-4" />
                Book Now
              </button>
            </div>

            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-7 sm:p-9">
              <h2 className="text-xl sm:text-2xl font-black text-white">Reach the Head Engineer</h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                GANDHAMANENI GOUTHAM personally oversees every design. Save his contact or scan his QR code from the digital visiting card.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenVisitingCard}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-950 border border-amber-500/40 text-amber-300 font-bold text-sm hover:bg-amber-500/10 transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  Open Visiting Card
                </button>
                <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Typically replies the same day
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Testimonials mode="faq" />
    </>
  );
}
