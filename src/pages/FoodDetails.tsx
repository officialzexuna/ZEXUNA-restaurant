import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Minus, Plus } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useRestaurant } from '../context/RestaurantContext';
import { buildGeneralWhatsAppEnquiryUrl } from '../services/whatsapp';
import { formatCurrency, getEffectiveItemPricing } from '../utils/pricing';

export function FoodDetails() {
  const { id } = useParams<{ id: string }>();
  const { items, categories, offers, settings, addToCart, setCartOpen } = useRestaurant();
  const [quantity, setQuantity] = useState(1);

  const item = items.find((i) => i.itemId === id);

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
        <h1 className="font-display text-3xl text-white">Dish Not Found</h1>
        <p className="text-sm text-[#B8B8B8]">
          This menu item may have been removed or renamed by the restaurant.
        </p>
        <Link
          to="/menu"
          className="inline-block px-6 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider"
        >
          Return to Menu
        </Link>
      </div>
    );
  }

  const category = categories.find((c) => c.categoryId === item.categoryId);
  const pricing = getEffectiveItemPricing(item, offers);
  const askUrl = buildGeneralWhatsAppEnquiryUrl(
    settings.whatsappNumber,
    `I would like to ask about "${item.name}" (${formatCurrency(pricing.finalPrice, settings.currency)}).`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <Link
        to="/menu"
        className="inline-flex items-center gap-2 text-xs font-medium text-[#B8B8B8] hover:text-[#E6CC91]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Digital Menu</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6 overflow-hidden border border-white/10 bg-[#121212]">
          <SafeImage
            src={item.imageUrl}
            alt={item.name}
            eager
            className="w-full aspect-[4/3] object-cover"
          />
        </div>

        <div className="lg:col-span-6 bg-[#121212] border border-white/10 p-6 sm:p-10 space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#B8B8B8]">
            <span>{category?.name || item.categoryId}</span>
            <span aria-hidden="true">·</span>
            <span className={item.vegetarian ? 'text-emerald-400' : 'text-[#E6CC91]'}>
              {item.vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={item.available ? 'text-white' : 'text-red-400'}>
              {item.available ? 'Available Today' : 'Currently Unavailable'}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white leading-tight">
            {item.name}
          </h1>

          <div className="flex items-baseline gap-4 tabular-nums">
            <span className="font-mono text-3xl font-semibold text-[#E6CC91]">
              {formatCurrency(pricing.finalPrice, settings.currency)}
            </span>
            {pricing.discountAmount > 0 && (
              <>
                <span className="font-mono text-lg text-[#B8B8B8] line-through">
                  {formatCurrency(pricing.originalPrice, settings.currency)}
                </span>
                <span className="text-xs font-semibold text-[#C9A45C]">
                  Save {pricing.discountPercent}%
                  {pricing.appliedOfferTitle ? ` · ${pricing.appliedOfferTitle}` : ''}
                </span>
              </>
            )}
          </div>

          <p className="text-sm sm:text-base text-[#B8B8B8] leading-relaxed">
            {item.description}
          </p>

          <div className="border-t border-white/10 pt-5 text-xs text-[#B8B8B8] space-y-1.5">
            <p>
              <span className="text-white font-medium">Allergen Information:</span>{' '}
              {item.allergens.length > 0 ? item.allergens.join(', ') : 'None listed'}
            </p>
            <p>
              <span className="text-white font-medium">Dish Reference ID:</span>{' '}
              <span className="font-mono">{item.itemId}</span>
            </p>
          </div>

          {/* Contiguous Purchase / Order Controls */}
          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#B8B8B8]">Quantity</span>
              <div className="inline-flex items-center border border-white/15 bg-[#090909]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="p-2.5 text-white hover:text-[#E6CC91]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-mono text-sm tabular-nums text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  aria-label="Increase quantity"
                  className="p-2.5 text-white hover:text-[#E6CC91]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="font-mono text-sm text-[#E6CC91] tabular-nums">
                Total {formatCurrency(pricing.finalPrice * quantity, settings.currency)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={!item.available}
                onClick={() => {
                  addToCart(item, quantity);
                  setCartOpen(true);
                }}
                className="flex-1 py-3.5 px-6 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors disabled:opacity-40"
              >
                {item.available ? 'Add to Order Summary' : 'Currently Unavailable'}
              </button>
              <a
                href={askUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3.5 px-5 border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#1C1C1C]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Ask About This Dish</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
