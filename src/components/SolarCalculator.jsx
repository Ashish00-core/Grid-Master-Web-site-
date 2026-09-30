import React, { useState } from 'react';
import { 
  Calendar, ArrowRight, ShieldCheck, Home, Building2, Battery, Info
} from 'lucide-react';
import { CURRENCY, SOLAR_ASSUMPTIONS } from '../data/solarData';

const A = SOLAR_ASSUMPTIONS;

export default function SolarCalculator({ onOpenBooking }) {
  const [purpose, setPurpose] = useState('home'); // 'home' or 'building'
  const [roofArea, setRoofArea] = useState(800); // sq ft
  const [monthlyBill, setMonthlyBill] = useState(8000); // ₹ per month
  const [includeBattery, setIncludeBattery] = useState(true);

  // Calculation Logic (INR-based)
  // 1) Size from electricity bill, 2) cap by usable roof area, 3) apply floor/ceiling.
  const isHome = purpose === 'home';
  const billBasedKw = isHome ? monthlyBill / A.billPerKwHome : monthlyBill / A.billPerKwBuilding;
  const roofBasedKw = Math.floor((roofArea / (isHome ? A.sqFtPerKwHome : A.sqFtPerKwBuilding)) * 10) / 10;

  const estimatedCapacity = Math.min(
    Math.max(Math.round(billBasedKw * 10) / 10, isHome ? 3 : 10),
    isHome ? 30 : 500
  );
  const effectiveCapacity = Math.min(estimatedCapacity, roofBasedKw);
  const roofConstrained = estimatedCapacity > roofBasedKw;
  const systemKw = Math.max(effectiveCapacity, isHome ? 1 : 5); // display/estimate basis

  const estimatedMonthlyGen = Math.round(systemKw * A.monthlyGenPerKw); // kWh
  const estimatedMonthlySavings = Math.round(estimatedMonthlyGen * A.tariffPerKwhInr); // ₹

  const equipmentCost = Math.round(systemKw * (isHome ? A.equipmentCostPerKwHome : A.equipmentCostPerKwBuilding));
  const batteryCost = includeBattery ? (isHome ? A.batteryCostHome : A.batteryCostBuilding) : 0;
  const engineeringDesignFee = A.designFee; // Custom CAD by GANDHAMANENI GOUTHAM
  const installationIntegrationFee = Math.round(equipmentCost * A.installFeePct);

  const totalProjectCost = equipmentCost + batteryCost + engineeringDesignFee + installationIntegrationFee;
  const annualSavings = estimatedMonthlySavings * 12;
  const paybackYears = annualSavings > 0 ? (totalProjectCost / annualSavings).toFixed(1) : null;
  const twentyFiveYearSavings = Math.max(0, Math.round(annualSavings * 25 - totalProjectCost));

  return (
    <section id="calculator" className="pt-4 pb-16 sm:pb-24 bg-slate-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Inputs Column */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            
            {/* Step 1: Purpose Selection */}
            <div>
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-3">
                1. Select Installation Purpose
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPurpose('home');
                    if (roofArea > 2000) setRoofArea(800);
                    if (monthlyBill > 100000) setMonthlyBill(8000);
                  }}
                  className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm border transition-all ${
                    purpose === 'home'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home / Residential</span>
                </button>

                <button
                  onClick={() => {
                    setPurpose('building');
                    if (roofArea < 1500) setRoofArea(3500);
                    if (monthlyBill < 100000) setMonthlyBill(300000);
                  }}
                  className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm border transition-all ${
                    purpose === 'building'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Building / Commercial</span>
                </button>
              </div>
            </div>

            {/* Step 2: Available Roof Area */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  2. Available Rooftop Area
                </label>
                <span className="text-xs font-mono font-bold text-white bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  {roofArea.toLocaleString()} Sq. Ft.
                </span>
              </div>
              <input
                type="range"
                min={purpose === 'home' ? 200 : 1000}
                max={purpose === 'home' ? 3000 : 25000}
                step={purpose === 'home' ? 50 : 500}
                value={roofArea}
                onChange={(e) => setRoofArea(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>{purpose === 'home' ? '200 sq ft' : '1,000 sq ft'}</span>
                <span>{purpose === 'home' ? '3,000 sq ft' : '25,000 sq ft'}</span>
              </div>
            </div>

            {/* Step 3: Current Monthly Electricity Bill */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  3. Average Monthly Electricity Bill (₹)
                </label>
                <span className="text-xs font-mono font-bold text-amber-300 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  {CURRENCY.formatINR(monthlyBill)} / month
                </span>
              </div>
              <input
                type="range"
                min={purpose === 'home' ? 2000 : 10000}
                max={purpose === 'home' ? 100000 : 5000000}
                step={purpose === 'home' ? 500 : 10000}
                value={monthlyBill}
                onChange={(e) => setMonthlyBill(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>{CURRENCY.formatINR(purpose === 'home' ? 2000 : 10000)}</span>
                <span>{CURRENCY.formatINR(purpose === 'home' ? 100000 : 5000000)}</span>
              </div>
            </div>

            {/* Step 4: Battery Storage Option */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Battery className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Include Battery Energy Storage Bank?
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {purpose === 'home' ? '15.2 kWh PowerVault Battery' : '50 kWh Industrial Commercial Container'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIncludeBattery(!includeBattery)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  includeBattery ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-slate-950 absolute top-1 transition-transform ${
                    includeBattery ? 'right-1' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>

            {/* Lead Engineer Oversight Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className="text-slate-300">
                Calculations verified by Head Engineer <strong className="text-amber-400">GANDHAMANENI GOUTHAM</strong> for optimal grid synchronization & safety compliance.
              </p>
            </div>

          </div>

          {/* Right Results Column */}
          <div className="lg:col-span-6 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl gold-border-glow">
            
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  Estimated System Blueprint
                </span>
                <h3 className="text-xl font-black text-white">
                  {purpose === 'home' ? 'Home Solar' : 'Commercial Building'} Sizing Summary
                </h3>
              </div>

              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono">
                {systemKw} kW System
              </span>
            </div>

            {roofConstrained && (
              <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-slate-300">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p>
                  Your roof area ({roofArea.toLocaleString()} sq ft) can comfortably host up to{" "}
                  <strong className="text-amber-300">{roofBasedKw} kW</strong>, so the system below
                  is sized to the roof. Your bill could support more — ask us about multi-slope or
                  carport expansion options.
                </p>
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Est. Generation
                </span>
                <p className="text-xl font-black text-amber-300 font-mono mt-0.5">
                  {estimatedMonthlyGen.toLocaleString()} <span className="text-xs">kWh/mo</span>
                </p>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Est. Monthly Savings
                </span>
                <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                  {CURRENCY.formatINR(estimatedMonthlySavings)} <span className="text-xs">/mo</span>
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  ≈ {CURRENCY.formatUSD(CURRENCY.usdFromINR(estimatedMonthlySavings))}/mo
                </p>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Payback Period
                </span>
                <p className="text-xl font-black text-white font-mono mt-0.5">
                  {paybackYears ?? '—'} <span className="text-xs">Years</span>
                </p>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  25-Year Net Savings
                </span>
                <p className="text-xl font-black text-amber-400 font-mono mt-0.5">
                  {CURRENCY.formatINR(twentyFiveYearSavings)}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  ≈ {CURRENCY.formatUSD(CURRENCY.usdFromINR(twentyFiveYearSavings))}
                </p>
              </div>
            </div>

            {/* Price Breakdown Accordion / List */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Tier-1 Solar Panels & Inverter:</span>
                <span className="text-white">{CURRENCY.formatINR(equipmentCost)}</span>
              </div>
              {includeBattery && (
                <div className="flex justify-between text-slate-300">
                  <span>Battery Energy Vault:</span>
                  <span className="text-amber-300">{CURRENCY.formatINR(batteryCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-300">
                <span>CAD Designing & Engineering (G. Goutham):</span>
                <span className="text-amber-400">{CURRENCY.formatINR(engineeringDesignFee)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Installation & Grid Interconnection:</span>
                <span className="text-white">{CURRENCY.formatINR(installationIntegrationFee)}</span>
              </div>
              <div className="flex justify-between items-start pt-2 border-t border-slate-800 text-sm font-bold font-sans">
                <span className="text-white">Estimated Total Project Investment:</span>
                <span className="text-right">
                  <span className="text-amber-400 font-mono text-base">{CURRENCY.formatINR(totalProjectCost)}</span>
                  <span className="block text-[10px] font-mono font-medium text-slate-400">
                    ≈ {CURRENCY.formatUSD(CURRENCY.usdFromINR(totalProjectCost))}
                  </span>
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">
              Amounts in ₹ (US$ equivalents at reference rate ₹{CURRENCY.rate}/USD). Estimates
              assume a ₹{A.tariffPerKwhInr}/kWh average tariff and {A.monthlyGenPerKw} kWh
              generation per kW per month. Your final quote is confirmed after the on-site
              engineering audit.
            </p>

            {/* Direct Booking CTA */}
            <button
              onClick={() => onOpenBooking(`Calculated ${systemKw} kW ${purpose === 'home' ? 'Home' : 'Building'} System (Est. ${CURRENCY.formatINR(totalProjectCost)})`)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Installation for this Calculated Design</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>

        </div>

      </div>
    </section>
  );
}
