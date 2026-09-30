import React, { useState, useEffect } from 'react';
import {
  Sun, ShieldCheck, Phone, Mail, MapPin, Award,
  Download, Copy, Check, RotateCw, Sparkles, Building2, Home
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TEAM_MEMBERS, COMPANY_INFO } from '../data/solarData';

export default function VisitingCard({ isModal = false, onClose }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close on Escape + lock background scroll while the modal card is open
  useEffect(() => {
    if (!isModal) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isModal, onClose]);

  const headEngineer = TEAM_MEMBERS.find(m => m.id === 'g-gowtham') || TEAM_MEMBERS[0];
  const vCardUrl = `tel:${headEngineer.phone.replace(/[^+\d]/g, '')}`;

  const handleCopyContact = () => {
    const infoText = `${headEngineer.name} - Head Engineer\nSolar Designing Engineer & Electrical Engineer\nCompany: Grid Master\nPhone: ${headEngineer.phone}\nEmail: ${headEngineer.email}\nAddress: ${COMPANY_INFO.address}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(infoText).catch(() => {});
    } else {
      const ta = document.createElement("textarea");
      ta.value = infoText;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadVCard = () => {
    const vCardData = `BEGIN:VCARD
VERSION:3.0
N:GOUTHAM;GANDHAMANENI;;;
FN:GANDHAMANENI GOUTHAM
ORG:Grid Master
TITLE:Head Engineer - Solar Designing & Electrical Engineer
TEL;TYPE=CELL:${headEngineer.phone}
TEL;TYPE=WORK:${COMPANY_INFO.phone}
EMAIL;TYPE=WORK:${headEngineer.email}
ADR;TYPE=WORK:;;Solar Tech Park, Suite 402;Hyderabad;Telangana;500081;India
NOTE:Head Engineer at Grid Master. Expert in Solar Designing & High-Voltage Electrical Engineering.
END:VCARD`;

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'GANDHAMANENI_GOUTHAM_Head_Engineer_GridMaster.vcf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cardContent = (
    <div className="w-full max-w-xl mx-auto">
      {/* Controls Bar */}
      <div className="flex items-center justify-between mb-4 bg-slate-900/80 p-3 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
            Official Digital Visiting Card
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Flip {isFlipped ? 'to Front' : 'to Back'}</span>
          </button>
          
          <button
            onClick={handleCopyContact}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-all"
            title="Copy Contact Info"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadVCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
            title="Download vCard"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save vCard</span>
          </button>
        </div>
      </div>

      {/* Flip Card Container */}
      <div className="perspective-1000 w-full min-h-[320px]">
        <div 
          className={`relative w-full rounded-2xl transition-transform duration-700 transform-style-3d shadow-2xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT OF VISITING CARD */}
          <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 rounded-2xl p-6 sm:p-8 border-2 border-amber-500/40 gold-border-glow backface-hidden flex flex-col justify-between min-h-[330px] relative overflow-hidden group">
            
            {/* Background Circuit Overlay effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Top Brand Header */}
            <div className="flex items-start justify-between relative z-10 border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-lg shadow-amber-500/30 flex-shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Sun className="w-7 h-7 text-amber-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-wider flex items-center gap-1.5 font-sans">
                    GRID<span className="text-amber-400">MASTER</span>
                  </h3>
                  <p className="text-[11px] font-semibold text-amber-300 uppercase tracking-widest">
                    Solar Engineering & Integration
                  </p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  HEAD ENGINEER
                </span>
              </div>
            </div>

            {/* Center Engineer Details */}
            <div className="my-5 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Initials Icon Badge (NO PHOTO AVATAR) */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-0.5 shadow-xl shadow-amber-500/20 flex-shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-xl font-mono border border-amber-500/30">
                      GG
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        GANDHAMANENI GOUTHAM
                      </h2>
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-amber-400">
                        Solar Designing Engineer & Electrical Engineer
                      </p>
                      <p className="text-[11px] text-slate-300 font-medium">
                        Head Engineer — Grid Master Solar Systems
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-amber-500/30 p-2.5 rounded-xl flex items-center gap-2.5 self-start sm:self-auto shadow-md">
                  <div className="px-2.5 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center font-mono text-amber-300 text-xs font-black border border-amber-500/40 whitespace-nowrap shadow-sm">
                    M.Tech
                  </div>
                  <div className="text-[11px] text-slate-300 leading-tight pr-1">
                    <span className="font-bold text-white block">NABCEP Master</span>
                    12+ Yrs Solar Arch.
                  </div>
                </div>
              </div>

              {/* Specialization Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 font-medium">
                  Residential & Commercial PV
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 font-medium">
                  3D PVsyst Design
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 font-medium">
                  High Voltage Integration
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 font-medium">
                  Microgrids & BIPV
                </span>
              </div>
            </div>

            {/* Bottom Contact Grid */}
            <div className="relative z-10 border-t border-slate-800/80 pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 font-mono">
              <a href={`tel:${headEngineer.phone}`} className="flex items-center gap-2 hover:text-amber-300 transition-colors font-bold text-amber-300">
                <Phone className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">{headEngineer.phone}</span>
              </a>
              <a href={`mailto:${headEngineer.email}`} className="flex items-center gap-2 hover:text-amber-300 transition-colors">
                <Mail className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">{headEngineer.email}</span>
              </a>
              <div className="flex items-center gap-2 sm:col-span-2 text-[11px] text-slate-400 font-sans">
                <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">{COMPANY_INFO.address}</span>
              </div>
            </div>

          </div>

          {/* BACK OF VISITING CARD */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-slate-950 via-slate-900 to-amber-950/60 rounded-2xl p-6 sm:p-8 border-2 border-amber-500/40 gold-border-glow backface-hidden rotate-y-180 flex flex-col justify-between overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Grid Master • Core Engineering Scope
                </h4>
                <p className="text-xs text-slate-300">Head Engineer Approval Seal</p>
              </div>
              <Sun className="w-6 h-6 text-amber-400" />
            </div>

            <div className="grid grid-cols-2 gap-3 my-2 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                  <Home className="w-4 h-4" />
                  <span>Home Solar</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  100% Rooftop yield optimization, battery backup integration, zero electric bills.
                </p>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                  <Building2 className="w-4 h-4" />
                  <span>Building Solar</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Commercial BIPV, Megawatt industrial arrays, high voltage grid feed-in.
                </p>
              </div>
            </div>

            {/* QR Code Simulation & Sign Off */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-3">
                {/* Real scannable QR — opens a direct call to the Head Engineer */}
                <div className="w-16 h-16 bg-white p-1.5 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                  <QRCodeSVG
                    value={vCardUrl}
                    size={56}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#020617"
                  />
                </div>
                <div className="text-[11px]">
                  <p className="text-white font-bold">Scan to Connect Directly</p>
                  <p className="text-amber-400 font-mono text-[10px]">G. GOUTHAM • Head Engineer</p>
                  <p className="text-slate-400 text-[10px]">Ph: {headEngineer.phone}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-serif italic text-amber-300 text-xs font-semibold border-b border-amber-400/40 pb-0.5 block">
                  G. Goutham
                </span>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">
                  Authorized Head Signature
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md theme-backdrop animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              Verified Head Engineer Visiting Card
            </span>
            <h2 className="text-2xl font-black text-white mt-2">GANDHAMANENI GOUTHAM</h2>
            <p className="text-xs text-slate-300">Solar Designing Engineer & Electrical Engineer — Grid Master</p>
          </div>

          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <section id="visiting-card" className="py-16 sm:py-24 bg-slate-950 relative overflow-hidden border-y border-amber-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Award className="w-3.5 h-3.5" />
            Head Engineer Contact Card
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 tracking-tight">
            Visiting Card of <span className="solar-gradient-text">GANDHAMANENI GOUTHAM</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2">
            Head Engineer (Solar Designing Engineer & Electrical Engineer) at Grid Master. Interact, flip the card, copy contact credentials (+91 7200745180), or download the vCard directly.
          </p>
        </div>

        {cardContent}
      </div>
    </section>
  );
}
