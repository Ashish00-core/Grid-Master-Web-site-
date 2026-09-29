import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, DraftingCompass, Wrench, Zap, BatteryCharging, Building2,
  FileSpreadsheet, ShoppingBag, Calculator, Users, ClipboardCheck, PenTool, HardHat, Activity
} from 'lucide-react';
import Hero from '../components/Hero';
import Testimonials from '../components/Testimonials';
import CallToAction from '../components/CallToAction';
import { COMPANY_INFO, SERVICES_LIST } from '../data/solarData';

const ICONS = { DraftingCompass, Wrench, Zap, BatteryCharging, Building2 };

const EXPLORE = [
  { to: '/design-samples', icon: FileSpreadsheet, title: 'Design Samples', text: 'Browse real 3D CAD blueprints and single line diagrams.' },
  { to: '/equipment', icon: ShoppingBag, title: 'Equipment & Prices', text: 'Transparent Tier-1 hardware prices with a live quote builder.' },
  { to: '/calculator', icon: Calculator, title: 'System Calculator', text: 'Size your system and see savings and payback in seconds.' },
  { to: '/team', icon: Users, title: 'Engineering Team', text: 'Meet the certified engineers behind every design.' },
];

const STEPS = [
  { icon: ClipboardCheck, title: 'Free Site Audit', text: 'We study your roof, load and electricity bills.' },
  { icon: PenTool, title: 'CAD Design & Quote', text: '3D layout, yield simulation and a transparent price.' },
  { icon: HardHat, title: 'Installation', text: 'Certified crews install with full safety compliance.' },
  { icon: Activity, title: 'Grid Integration', text: 'Utility approval, commissioning and monitoring.' },
];

function SectionTitle({ eyebrow, title, highlight, text }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-12">
      <span className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
        {eyebrow}
      </span>
      <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 tracking-tight">
        {title} <span className="solar-gradient-text">{highlight}</span>
      </h2>
      {text && <p className="text-slate-300 text-sm sm:text-base mt-3">{text}</p>}
    </div>
  );
}

export default function HomePage({ onOpenBooking, onOpenVisitingCard }) {
  const stats = [
    { value: COMPANY_INFO.projectsCompleted, label: 'Projects Completed' },
    { value: COMPANY_INFO.totalMegawatts, label: 'Solar Capacity Installed' },
    { value: COMPANY_INFO.customerSatisfaction, label: 'Customer Satisfaction' },
    { value: `${new Date().getFullYear() - Number(COMPANY_INFO.founded)}+ yrs`, label: 'Engineering Experience' },
  ];

  return (
    <>
      <Hero onOpenBooking={onOpenBooking} onOpenVisitingCard={onOpenVisitingCard} />

      {/* Trust stats */}
      <section className="bg-slate-950 pb-16 sm:pb-24 -mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-3xl bg-slate-900 border border-amber-500/20 divide-x divide-y lg:divide-y-0 divide-slate-800 overflow-hidden shadow-2xl">
            {stats.map((s) => (
              <div key={s.label} className="py-7 px-4 text-center">
                <p className="text-3xl sm:text-4xl font-black solar-gradient-text">{s.value}</p>
                <p className="text-[11px] sm:text-xs text-slate-400 uppercase tracking-widest font-bold mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service highlights */}
      <section className="bg-slate-900/50 py-16 sm:py-24 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            eyebrow="What we do"
            title="End-to-end"
            highlight="solar engineering"
            text="Design, install and connect — one accountable team from first sketch to grid sync."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SERVICES_LIST.slice(0, 3).map((s) => {
              const Icon = ICONS[s.icon] || Zap;
              return (
                <Link
                  key={s.id}
                  to="/services"
                  className="group rounded-3xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white mt-5">{s.title}</h3>
                  <p className="text-xs text-amber-400 font-semibold mt-1">{s.subtitle}</p>
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed line-clamp-3">{s.description}</p>
                  <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-bold text-amber-400">
                    Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-950 border border-amber-500/40 text-amber-300 font-bold text-sm hover:bg-amber-500/10 transition-all"
            >
              View all services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-950 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle eyebrow="How it works" title="From site audit to" highlight="grid sync" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative rounded-3xl bg-slate-900 border border-slate-800 p-6">
                <span className="absolute top-4 right-5 text-4xl font-black text-slate-800 font-mono">0{i + 1}</span>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mt-5">{step.title}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore the site */}
      <section className="bg-slate-900/50 py-16 sm:py-24 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle eyebrow="Explore" title="Everything you need to" highlight="go solar" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {EXPLORE.map(({ to, icon: Icon, title, text }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-3xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/10"
              >
                <Icon className="w-8 h-8 text-amber-400" />
                <h3 className="text-base font-bold text-white mt-4 flex items-center justify-between">
                  {title}
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Testimonials mode="reviews" />

      <div className="pt-16 sm:pt-24 bg-slate-950">
        <CallToAction onOpenBooking={onOpenBooking} />
      </div>
    </>
  );
}
