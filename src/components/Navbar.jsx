import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Sun, Moon, Calendar, Menu, X, CreditCard } from 'lucide-react';

export default function Navbar({ onOpenBooking, onOpenVisitingCard, theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/', end: true },
    { name: 'Services', href: '/services' },
    { name: 'Design Samples', href: '/design-samples' },
    { name: 'Equipment & Prices', href: '/equipment' },
    { name: 'Calculator', href: '/calculator' },
    { name: 'Engineering Team', href: '/team' },
    { name: 'Contact', href: '/contact' },
  ];

  const desktopLinkClass = ({ isActive }) =>
    `relative text-sm font-medium px-2.5 2xl:px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
      isActive
        ? 'text-amber-400 bg-amber-500/10 after:absolute after:left-3 after:right-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-amber-400'
        : 'text-slate-300 hover:text-amber-400 hover:bg-slate-900/60'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `text-sm font-medium px-3 py-2.5 rounded-lg transition-colors ${
      isActive ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300 hover:text-amber-400 hover:bg-slate-900'
    }`;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-slate-950/90 backdrop-blur-md border-b border-amber-500/20 py-3 shadow-xl' 
        : 'bg-gradient-to-b from-slate-950/80 to-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="Grid Master home">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sun className="w-6 h-6 text-amber-400 group-hover:rotate-45 transition-transform duration-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white font-sans">
                  GRID<span className="text-amber-400">MASTER</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hidden 2xl:inline-block whitespace-nowrap">
                  Solar Engineering
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block whitespace-nowrap">
                Design • Installation • Integration
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-0.5 xl:gap-1.5">
            {navLinks.map((link) => (
              <NavLink key={link.name} to={link.href} end={link.end} className={desktopLinkClass}>
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-2 xl:gap-3 ml-auto mr-3 xl:ml-0 xl:mr-0">
            <button
              onClick={onOpenVisitingCard}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-amber-500/30 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 hover:border-amber-400 transition-all shadow-sm"
              title="View Head Engineer Visiting Card"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden 2xl:inline">G. Goutham's Card</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-pressed={theme === 'light'}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="hidden xl:inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40 transition-colors"
            >
              {theme === 'dark' ? <Sun aria-hidden="true" className="w-4 h-4" /> : <Moon aria-hidden="true" className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onOpenBooking()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-bold text-xs xl:text-sm shadow-md shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Now</span>
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex xl:hidden items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-pressed={theme === 'light'}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="hidden min-[400px]:inline-flex p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40 transition-colors"
            >
              {theme === 'dark' ? <Sun aria-hidden="true" className="w-4 h-4" /> : <Moon aria-hidden="true" className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onOpenVisitingCard()}
              className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 sm:hidden"
              title="Head Engineer Visiting Card"
            >
              <CreditCard className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden max-h-[calc(100vh-4.5rem)] overflow-y-auto bg-slate-950/95 border-b border-amber-500/20 px-4 pt-3 pb-6 space-y-3 backdrop-blur-xl animate-in fade-in slide-in-from-top duration-200">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-pressed={theme === 'light'}
            className="min-[400px]:hidden sm:hidden w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 text-sm font-semibold"
          >
            {theme === 'dark' ? <Sun aria-hidden="true" className="w-4 h-4" /> : <Moon aria-hidden="true" className="w-4 h-4" />}
            <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Theme</span>
          </button>

          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.href}
                end={link.end}
                className={mobileLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenVisitingCard();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-sm font-semibold"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>G. Goutham's Visiting Card (Head Eng.)</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Solar Installation / Consultation</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
