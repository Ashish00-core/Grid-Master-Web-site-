import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center pt-32 pb-20 px-4 bg-slate-950">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Sun className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-5xl font-black text-white mt-6">404</h1>
        <p className="text-slate-300 mt-3">Sorry, we couldn't find that page.</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </section>
  );
}
