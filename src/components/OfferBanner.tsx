import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ASSETS } from '../data/demoSeed';
import { useRestaurant } from '../context/RestaurantContext';
import { buildGeneralWhatsAppEnquiryUrl } from '../services/whatsapp';
import { formatCurrency, getActiveOffers } from '../utils/pricing';
import { SafeImage } from './SafeImage';

export function OfferBanner() {
  const { offers, items, settings, addToCart, setCartOpen } = useRestaurant();
  const activeOffers = getActiveOffers(offers);

  if (activeOffers.length === 0) {
    return null;
  }

  const featuredOffer = activeOffers[0];
  const discountPct =
    featuredOffer.discountType === 'PERCENTAGE'
      ? featuredOffer.discountValue
      : featuredOffer.originalPrice > 0
        ? Math.round(
            ((featuredOffer.originalPrice - featuredOffer.discountedPrice) /
              featuredOffer.originalPrice) *
              100
          )
        : 0;

  const eligibleItems = items.filter(
    (item) =>
      item.available &&
      (featuredOffer.applicableItems.length === 0 ||
        featuredOffer.applicableItems.includes(item.itemId))
  );

  const waEnquiryUrl = buildGeneralWhatsAppEnquiryUrl(
    settings.whatsappNumber,
    `I would like to enquire about "${featuredOffer.title}" (${discountPct}% off).`
  );

  return (
    <section
      aria-labelledby="biryani-price-drop-heading"
      className="bg-[#121212] border-y border-[#C9A45C]/25 py-16 sm:py-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-3">
                Limited-Time Culinary Campaign · Save {discountPct}%
              </p>
              <h2
                id="biryani-price-drop-heading"
                className="font-display text-3xl sm:text-5xl font-semibold text-white leading-tight mb-4"
              >
                THE GREAT BIRYANI PRICE DROP!
              </h2>
              <p className="text-base sm:text-lg text-[#E6CC91] mb-4">
                Your favourite flavours. Special prices. An experience worth coming back for.
              </p>
              <p className="text-sm text-[#B8B8B8] leading-relaxed">
                {featuredOffer.description}
              </p>
            </div>

            <div className="bg-[#090909] border border-[#C9A45C]/30 p-6 flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-xs text-[#B8B8B8] mb-1">Campaign Highlight Pricing</p>
                <div className="flex items-baseline gap-3 tabular-nums">
                  <span className="font-mono text-2xl sm:text-3xl font-semibold text-[#E6CC91]">
                    {formatCurrency(featuredOffer.discountedPrice, settings.currency)}
                  </span>
                  <span className="font-mono text-base text-[#B8B8B8] line-through">
                    {formatCurrency(featuredOffer.originalPrice, settings.currency)}
                  </span>
                  <span className="text-xs font-semibold text-[#C9A45C]">
                    Save {discountPct}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-[#B8B8B8] tabular-nums">
                <p>Valid until</p>
                <p className="text-white font-medium mt-0.5">
                  {new Date(featuredOffer.expiresAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/offers"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors"
              >
                <span>View Offer Dishes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={waEnquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#1C1C1C] transition-colors"
              >
                WhatsApp Enquiry
              </a>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col gap-5">
            <div className="relative aspect-[16/10] lg:flex-1 overflow-hidden border border-white/10">
              <SafeImage
                src={featuredOffer.imageUrl || ASSETS.heroFallback}
                alt="The Great Biryani Price Drop signature presentation"
                className="w-full h-full object-cover"
              />
            </div>

            {eligibleItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {eligibleItems.slice(0, 3).map((dish) => (
                  <div
                    key={dish.itemId}
                    className="bg-[#090909] border border-white/10 p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-medium text-white line-clamp-1">{dish.name}</p>
                      <p className="font-mono text-xs text-[#E6CC91] mt-1 tabular-nums">
                        {formatCurrency(
                          dish.discountedPrice ?? featuredOffer.discountedPrice,
                          settings.currency
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(dish, 1);
                        setCartOpen(true);
                      }}
                      className="text-left text-[11px] font-semibold uppercase tracking-wider text-[#C9A45C] hover:text-[#E6CC91]"
                    >
                      Order Now →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
