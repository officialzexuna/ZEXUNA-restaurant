import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ASSETS } from '../data/demoSeed';
import { useRestaurant } from '../context/RestaurantContext';

export function Footer() {
  const { settings, isAdmin } = useRestaurant();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!consent) {
      setFeedback({ type: 'err', text: 'Please check the consent box before subscribing.' });
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Unable to subscribe');
      setFeedback({ type: 'ok', text: 'Subscribed to ZEXUNA dining updates.' });
      setEmail('');
      setConsent(false);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Subscription failed',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="bg-[#090909] border-t border-[#C9A45C]/25 text-[#B8B8B8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand Column */}
        <div>
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <img src={ASSETS.logo} alt="ZEXUNA Logo" className="w-10 h-10 object-contain" />
            <span className="font-display text-xl text-white tracking-wider">ZEXUNA</span>
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-3">
            Technology Without Limits.
          </p>
          <p className="text-sm leading-relaxed">
            {settings.description}
          </p>
        </div>

        {/* Dining & Navigation */}
        <div>
          <h3 className="font-display text-base text-white mb-4">Dining & Experience</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/menu" className="hover:text-[#E6CC91] transition-colors">Digital Menu</Link></li>
            <li><Link to="/categories" className="hover:text-[#E6CC91] transition-colors">Menu Categories</Link></li>
            <li><Link to="/offers" className="hover:text-[#E6CC91] transition-colors">Biryani Price Drop</Link></li>
            <li><Link to="/reservations" className="hover:text-[#E6CC91] transition-colors">Reserve a Table</Link></li>
            <li><Link to="/reservation-status" className="hover:text-[#E6CC91] transition-colors">Reservation Status</Link></li>
            <li><Link to="/gallery" className="hover:text-[#E6CC91] transition-colors">Food Gallery</Link></li>
          </ul>
        </div>

        {/* Contact & Legal */}
        <div>
          <h3 className="font-display text-base text-white mb-4">Information & Legal</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/about" className="hover:text-[#E6CC91] transition-colors">About ZEXUNA</Link></li>
            <li><Link to="/contact" className="hover:text-[#E6CC91] transition-colors">Contact & Catering</Link></li>
            <li><Link to="/faq" className="hover:text-[#E6CC91] transition-colors">Frequently Asked Questions</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-[#E6CC91] transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-[#E6CC91] transition-colors">Terms & Conditions</Link></li>
            <li>
              <Link to={isAdmin ? '/admin' : '/admin/login'} className="text-[#C9A45C] hover:text-[#E6CC91] transition-colors">
                {isAdmin ? 'Admin Dashboard' : 'Admin Login'}
              </Link>
            </li>
          </ul>
        </div>

        {/* Newsletter with Explicit Consent */}
        <div>
          <h3 className="font-display text-base text-white mb-4">Private Invitations</h3>
          <p className="text-sm mb-4">
            Receive seasonal tasting menus and exclusive Biryani Price Drop alerts.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="space-y-3">
            <div>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 text-sm text-white placeholder:text-[#B8B8B8]/50 focus:outline-none focus:border-[#C9A45C]"
              />
            </div>
            <label className="flex items-start gap-2.5 text-xs text-[#B8B8B8] cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-[#C9A45C]"
              />
              <span>I consent to receive occasional culinary updates from ZEXUNA Restaurant.</span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#1C1C1C] border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#C9A45C] hover:text-[#090909] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Subscribing...' : 'Join Guest List'}
            </button>
            {feedback && (
              <p className={`text-xs ${feedback.type === 'ok' ? 'text-[#E6CC91]' : 'text-red-400'}`}>
                {feedback.text}
              </p>
            )}
          </form>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#B8B8B8]">
          <p>
            © {new Date().getFullYear()} {settings.restaurantName}. Technology Without Limits.
          </p>
          <p>
            {settings.address} · WhatsApp {settings.whatsappNumber}
          </p>
        </div>
      </div>
    </footer>
  );
}
