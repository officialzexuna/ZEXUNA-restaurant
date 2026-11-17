import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { SafeImage } from './SafeImage';
import { useRestaurant } from '../context/RestaurantContext';
import type { MenuItem } from '../types/restaurant';
import { formatCurrency, getEffectiveItemPricing } from '../utils/pricing';

interface FoodCardProps {
  item: MenuItem;
  categoryName?: string;
}

export function FoodCard({ item, categoryName }: FoodCardProps) {
  const { offers, settings, addToCart, setCartOpen } = useRestaurant();
  const pricing = getEffectiveItemPricing(item, offers);

  return (
    <article className="group bg-[#121212] border border-white/10 hover:border-[#C9A45C]/50 transition-colors flex flex-col">
      <Link to={`/food/${item.itemId}`} className="block relative overflow-hidden aspect-[4/3] bg-[#1C1C1C]">
        <SafeImage
          src={item.imageUrl}
          alt={item.name}
          fallbackLabel={item.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
            !item.available ? 'opacity-50 grayscale' : ''
          }`}
        />
      </Link>

      <div className="p-6 flex flex-col flex-1">
        {/* Unboxed typographic metadata (Zero-Pill Discipline) */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#B8B8B8] mb-2">
          {categoryName && <span>{categoryName}</span>}
          {categoryName && <span aria-hidden="true">·</span>}
          <span className={item.vegetarian ? 'text-emerald-400' : 'text-[#E6CC91]'}>
            {item.vegetarian ? 'Vegetarian' : 'Non-Veg'}
          </span>
          {pricing.discountPercent > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#C9A45C] font-medium tabular-nums">
                {pricing.discountPercent}% Off
              </span>
            </>
          )}
          {!item.available && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-red-400 font-medium">Unavailable</span>
            </>
          )}
        </div>

        <Link to={`/food/${item.itemId}`}>
          <h3 className="font-display text-lg font-semibold text-white group-hover:text-[#E6CC91] transition-colors mb-2">
            {item.name}
          </h3>
        </Link>

        <p className="text-sm text-[#B8B8B8] line-clamp-2 leading-relaxed mb-5 flex-1">
          {item.description}
        </p>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2.5 tabular-nums">
            <span className="font-mono text-base font-semibold text-[#E6CC91]">
              {formatCurrency(pricing.finalPrice, settings.currency)}
            </span>
            {pricing.discountAmount > 0 && (
              <span className="font-mono text-xs text-[#B8B8B8] line-through">
                {formatCurrency(pricing.originalPrice, settings.currency)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!item.available}
            onClick={() => {
              addToCart(item, 1);
              setCartOpen(true);
            }}
            aria-label={`Add ${item.name} to order summary`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1C1C] border border-[#C9A45C]/40 text-xs font-semibold text-[#E6CC91] uppercase tracking-wider hover:bg-[#C9A45C] hover:text-[#090909] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{item.available ? 'Add' : 'Sold Out'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
