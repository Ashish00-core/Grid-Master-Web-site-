import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// Banner shown at the top of every inner page: breadcrumb, badge, title and intro.
export default function PageHeader({ icon: Icon, eyebrow, title, highlight, description, children }) {
  return (
    <section className="relative pt-32 pb-12 sm:pt-40 sm:pb-16 overflow-hidden bg-slate-950 border-b border-amber-500/10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,#000_60%,transparent_100%)] pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[320px] bg-amber-500/15 rounded-full blur-[110px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-6">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors">
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-amber-400 font-semibold">{eyebrow}</span>
        </nav>

        {Icon && (
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Icon className="w-7 h-7" />
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-5 tracking-tight leading-tight">
          {title} {highlight && <span className="solar-gradient-text">{highlight}</span>}
        </h1>

        {description && (
          <p className="text-slate-300 text-sm sm:text-base mt-4 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
        )}

        {children}
      </div>
    </section>
  );
}
