import { useSearchParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { MenuGrid } from '../components/MenuGrid';
import { useRestaurant } from '../context/RestaurantContext';

export function Menu() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const { totalCartCount, setCartOpen } = useRestaurant();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
            Database-Synchronized Culinary Catalog
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
            Digital Menu
          </h1>
          <p className="text-sm text-[#B8B8B8] mt-3 max-w-2xl">
            Browse our full range of biryanis, charcoal starters, Indian and Indo-Chinese classics, desserts, and artisanal beverages. Add dishes to your order summary to send directly via WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="inline-flex items-center gap-2.5 px-5 py-3 bg-[#121212] border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#C9A45C] hover:text-[#090909] transition-colors whitespace-nowrap shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="tabular-nums">Order Summary ({totalCartCount})</span>
        </button>
      </div>

      <MenuGrid initialCategory={initialCategory} />
    </div>
  );
}
