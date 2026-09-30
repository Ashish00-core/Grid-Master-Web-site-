import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Phone, Mail, MapPin, ShieldCheck, CreditCard } from 'lucide-react';
import { COMPANY_INFO } from '../data/solarData';

export default function Footer({ onOpenBooking, onOpenVisitingCard }) {
  return (
    <footer className="bg-slate-950 border-t border-amber-500/20 pt-16 pb-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-slate-800">
          
          {/* Col 1: Brand Info (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 p-0.5 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sun className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <span className="text-2xl font-black text-white tracking-wider">
                GRID<span className="text-amber-400">MASTER</span>
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              {COMPANY_INFO.description}
            </p>

            <div className="pt-2">
              <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/30 inline-flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white">Engineering Oversight</p>
                  <p className="text-amber-400 font-semibold">GANDHAMANENI GOUTHAM (Head Eng.)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Col 2: Quick Navigation (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">
              Website Navigation
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li><Link to="/services" className="hover:text-amber-400 transition-colors">Services Scope</Link></li>
              <li><Link to="/design-samples" className="hover:text-amber-400 transition-colors">Designing Samples & CAD</Link></li>
              <li><Link to="/equipment" className="hover:text-amber-400 transition-colors">Equipment & Prices</Link></li>
              <li><Link to="/calculator" className="hover:text-amber-400 transition-colors">Solar System Calculator</Link></li>
              <li><Link to="/team" className="hover:text-amber-400 transition-colors">Engineering Team</Link></li>
              <li><Link to="/contact" className="hover:text-amber-400 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Col 3: Solar Purpose (3 cols) */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">
              Solar Purposes
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li><button onClick={() => onOpenBooking('Home Solar System')} className="hover:text-amber-400 transition-colors">Home Solar Systems</button></li>
              <li><button onClick={() => onOpenBooking('Building Solar System')} className="hover:text-amber-400 transition-colors">Building & Commercial Purpose</button></li>
              <li><button onClick={() => onOpenBooking('Hybrid Battery Storage')} className="hover:text-amber-400 transition-colors">Hybrid Battery Backup</button></li>
              <li><button onClick={() => onOpenBooking('High-Voltage Grid Integration')} className="hover:text-amber-400 transition-colors">High-Voltage Grid Integration</button></li>
              <li><button onClick={onOpenVisitingCard} className="text-amber-300 font-semibold flex items-center gap-1 hover:underline">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>G. Goutham's Visiting Card</span>
              </button></li>
            </ul>
          </div>

          {/* Col 4: Grid Master HQ Contact (3 cols - wide space for email) */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">
              Grid Master HQ Contact
            </h4>
            <ul className="space-y-3.5 text-xs text-slate-300 font-sans">
              <li className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <a href={`tel:${COMPANY_INFO.directPhone.replace(/\s/g, "")}`} className="text-amber-300 font-bold font-mono text-sm hover:underline">
                  {COMPANY_INFO.phoneDisplay}
                </a>
              </li>

              <li className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <a href={`mailto:${COMPANY_INFO.email}`} className="text-slate-100 font-medium font-mono text-xs hover:text-amber-300 transition-colors break-all">
                  {COMPANY_INFO.email}
                </a>
              </li>

              <li className="flex items-start gap-2.5 pt-1 text-slate-400 text-xs leading-snug">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span>{COMPANY_INFO.address}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} Grid Master Solar Systems. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>Head Engineer: <strong className="text-amber-400">GANDHAMANENI GOUTHAM</strong></span>
            <span>•</span>
            <span>Solar Designer: <strong className="text-slate-300">Ashish Kumar</strong></span>
            <span>•</span>
            <Link
              to="/mail-delivery"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors"
              title="Verify that automatic booking e-mails are being delivered"
            >
              <Mail className="w-3 h-3" />
              Mail Delivery Center
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
