import React, { useState } from 'react';
import { 
  ShoppingBag, Search, CheckCircle2, Plus, Minus,
  Trash2, ChevronRight, X 
} from 'lucide-react';
import { EQUIPMENT_CATALOG, CURRENCY } from '../data/solarData';

export default function EquipmentCatalog({ onAddToQuote, onUpdateQuantity, selectedEquipment = [], onOpenBooking }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Solar Panels', 'Inverters', 'Battery Storage', 'Racking & Mounting'];

  const filteredEquipment = EQUIPMENT_CATALOG.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const typeMatch = (item.type || '').toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && (nameMatch || typeMatch || catMatch);
  });

  const totalQuoteAmount = selectedEquipment.reduce(
    (sum, item) => sum + (item.pricePerUnit || item.price || 0) * (item.quantity || 1),
    0
  );
  const totalQuoteUnits = selectedEquipment.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <section id="equipment" className="py-20 sm:py-28 bg-slate-900/40 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <ShoppingBag className="w-3.5 h-3.5" />
            Solar Installation Equipment & Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 tracking-tight">
            Tier-1 Solar Hardware <span className="solar-gradient-text">& Component Prices</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-4">
            Explore authentic prices for high-efficiency N-type solar modules, smart hybrid inverters, LiFePO4 battery banks, and wind-tested racking systems certified by Grid Master.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-3xl border border-slate-800 mb-10">
          
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search solar panels, inverters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {filteredEquipment.map((item) => {
            const isAdded = selectedEquipment.some(e => e.id === item.id);
            const price = item.pricePerUnit || item.price || 0;
            const badge = item.badge || item.tag || 'Tier-1 Quality';

            return (
              <div
                key={item.id}
                className="rounded-3xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between group"
              >
                <div>
                  {/* Real Equipment Image Header */}
                  <div className="relative h-64 overflow-hidden bg-slate-900">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%"><rect width="600" height="400" fill="#020617"/><rect x="50" y="30" width="500" height="340" rx="16" fill="#0f172a" stroke="#f59e0b" stroke-width="4"/><text x="300" y="200" font-family="sans-serif" font-size="20" font-weight="bold" fill="#f59e0b" text-anchor="middle">GRID MASTER HARDWARE</text></svg>`);
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/30 text-amber-300 font-bold text-xs">
                        {badge}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <div>
                        <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                          {CURRENCY.format(price)}
                        </span>
                        <span className="text-xs text-slate-400 block -mt-1 font-mono">
                          {item.unit || 'per unit'}
                        </span>
                      </div>

                      <div className="bg-amber-500/20 backdrop-blur-md px-3 py-1 rounded-xl border border-amber-500/30 text-amber-300 text-xs font-bold">
                        {item.wattage || item.efficiency}
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-6">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                      Category: {item.category}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1 group-hover:text-amber-300 transition-colors">
                      {item.name}
                    </h3>

                    <p className="text-xs text-slate-300 mt-2 font-medium">
                      Type: <span className="text-white">{item.type}</span> • Warranty: <span className="text-emerald-400">{item.warranty}</span>
                    </p>

                    {/* Specs List */}
                    <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <p className="text-[10px] text-amber-400 font-sans font-bold uppercase tracking-wider mb-2">
                        Engineering Highlights
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {Array.isArray(item.specs) ? (
                          item.specs.map((spec, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span>{spec}</span>
                            </li>
                          ))
                        ) : (
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span>{item.specs}</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-6 pt-0 border-t border-slate-900/80">
                  <button
                    onClick={() => onAddToQuote(item)}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      isAdded
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Added to System Quote</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Equipment to Quote</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Selected Equipment Quote Panel */}
        {selectedEquipment.length > 0 && (
          <div className="sticky bottom-6 mt-12 z-40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/50 p-4 sm:p-6 rounded-3xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex flex-col lg:flex-row gap-5">

              {/* Itemized list with quantity controls */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">
                      {totalQuoteUnits}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Your Custom Equipment Package
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Adjust quantities — the total updates instantly
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClearQuote}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors"
                    title="Remove all selected equipment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear all</span>
                  </button>
                </div>

                <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedEquipment.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5"
                    >
                      <div className="flex-1 min-w-[140px]">
                        <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {CURRENCY.format(item.pricePerUnit)} {item.unit}
                        </p>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="p-1.5 text-slate-300 hover:text-amber-400 transition-colors"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold font-mono text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-1.5 text-slate-300 hover:text-amber-400 transition-colors"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="w-20 sm:w-24 text-right text-xs font-bold font-mono text-amber-300">
                        {CURRENCY.format(item.pricePerUnit * item.quantity)}
                      </span>

                      <button
                        onClick={() => onAddToQuote(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label={`Remove ${item.name} from quote`}
                        title="Remove from quote"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Total + CTA */}
              <div className="w-full lg:w-72 flex-shrink-0 flex flex-col justify-between gap-4 lg:border-l lg:border-slate-800 lg:pl-5">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Estimated Component Total
                  </p>
                  <p className="text-2xl font-black font-mono text-amber-400">
                    {CURRENCY.format(totalQuoteAmount)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Excludes installation &amp; design fees — final quote after site audit
                  </p>
                </div>

                <button
                  onClick={() =>
                    onOpenBooking(
                      `Custom Equipment Package (${totalQuoteUnits} units — ${CURRENCY.format(totalQuoteAmount)})`
                    )
                  }
                  className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <span>Book Installation with This Package</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
