import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { ASSETS } from '../data/demoSeed';
import { useRestaurant } from '../context/RestaurantContext';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalCartCount, setCartOpen, isAdmin } = useRestaurant();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-1 border-b ${
      isActive
        ? 'text-[#E6CC91] border-[#C9A45C]'
        : 'text-[#B8B8B8] border-transparent hover:text-white hover:border-[#C9A45C]/50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#090909]/95 backdrop-blur-md border-b border-[#C9A45C]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo & Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#C9A45C]"
          onClick={() => setMobileOpen(false)}
        >
          <img
            src={ASSETS.logo}
            alt="ZEXUNA Logo"
            className="w-9 h-9 object-contain"
          />
          <span className="font-display text-lg font-semibold tracking-wider text-white">
            ZEXUNA
          </span>
        </Link>

        {/* Zone 2: 5 concise single-line links */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-7">
          <NavLink to="/menu" className={navLinkClass}>
            Menu
          </NavLink>
          <NavLink to="/offers" className={navLinkClass}>
            Offers
          </NavLink>
          <NavLink to="/gallery" className={navLinkClass}>
            Gallery
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>

        {/* Zone 3: Primary Reservation CTA + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {totalCartCount > 0 && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open Order Summary (${totalCartCount} items)`}
              className="relative inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#E6CC91] border border-[#C9A45C]/40 hover:bg-[#1C1C1C] transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">{totalCartCount}</span>
            </button>
          )}

          <Link
            to="/reservations"
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 bg-[#C9A45C] text-[#090909] text-xs font-semibold tracking-wider uppercase hover:bg-[#E6CC91] transition-colors whitespace-nowrap shrink-0"
          >
            Reserve Table
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2.5 text-white border border-white/15 hover:border-[#C9A45C]/60"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#121212] border-b border-[#C9A45C]/25 px-6 py-5">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-3">
            {[
              { to: '/', label: 'Home' },
              { to: '/menu', label: 'Digital Menu' },
              { to: '/categories', label: 'Categories' },
              { to: '/offers', label: 'Special Offers' },
              { to: '/gallery', label: 'Food Gallery' },
              { to: '/reservations', label: 'Table Reservation' },
              { to: '/reservation-status', label: 'Reservation Status' },
              { to: '/about', label: 'About Us' },
              { to: '/contact', label: 'Contact Us' },
              { to: '/faq', label: 'FAQ' },
              { to: isAdmin ? '/admin' : '/admin/login', label: isAdmin ? 'Admin Dashboard' : 'Admin Portal' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm text-[#E6CC91] hover:text-white border-b border-white/5"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
