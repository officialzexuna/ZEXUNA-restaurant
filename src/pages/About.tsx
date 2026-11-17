import { Link } from 'react-router-dom';
import { ASSETS } from '../data/demoSeed';
import { SafeImage } from '../components/SafeImage';
import { useRestaurant } from '../context/RestaurantContext';

export function About() {
  const { settings } = useRestaurant();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C]">
            About ZEXUNA Restaurant
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white leading-tight">
            Where Culinary Heritage Meets Modern Precision
          </h1>
          <p className="text-base text-[#B8B8B8] leading-relaxed">
            {settings.description}
          </p>
          <p className="text-sm text-[#B8B8B8] leading-relaxed">
            Engineered as a flagship showcase by ZEXUNA — Technology Without Limits — every touchpoint combines authentic slow-fire dum cooking with real-time cloud reservations, dynamic menu pricing, direct WhatsApp ordering, and AI dining assistance.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/menu"
              className="px-6 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91]"
            >
              Browse Digital Menu
            </Link>
            <Link
              to="/reservations"
              className="px-6 py-3 border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#1C1C1C]"
            >
              Book a Table
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 overflow-hidden border border-white/10">
          <SafeImage
            src={ASSETS.interior}
            alt="ZEXUNA Restaurant interior dining sanctuary"
            className="w-full h-full min-h-[360px] object-cover"
          />
        </div>
      </div>

      {/* Three Editorial Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/10 pt-14">
        <div className="bg-[#121212] border border-white/10 p-7 space-y-3">
          <p className="font-mono text-xs text-[#C9A45C]">01.</p>
          <h2 className="font-display text-xl text-white">Slow-Sealed Dum Craft</h2>
          <p className="text-sm text-[#B8B8B8] leading-relaxed">
            Every handi of biryani is layered with aged basmati, saffron infusion, and freshly roasted whole spices sealed to lock in natural aroma.
          </p>
        </div>

        <div className="bg-[#121212] border border-white/10 p-7 space-y-3">
          <p className="font-mono text-xs text-[#C9A45C]">02.</p>
          <h2 className="font-display text-xl text-white">Real-Time Table Integrity</h2>
          <p className="text-sm text-[#B8B8B8] leading-relaxed">
            Online table reservations execute atomic database locks backed by Cloud Firestore to prevent double bookings and guarantee seating accuracy.
          </p>
        </div>

        <div className="bg-[#121212] border border-white/10 p-7 space-y-3">
          <p className="font-mono text-xs text-[#C9A45C]">03.</p>
          <h2 className="font-display text-xl text-white">Technology Without Limits</h2>
          <p className="text-sm text-[#B8B8B8] leading-relaxed">
            Designed and built by ZEXUNA to demonstrate how luxury hospitality brands unite editorial design, live operations, and Gemini AI concierge service.
          </p>
        </div>
      </div>
    </div>
  );
}
