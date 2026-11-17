import { Link } from 'react-router-dom';
import { ASSETS } from '../data/demoSeed';
import { FoodCard } from '../components/FoodCard';
import { SafeImage } from '../components/SafeImage';
import { useRestaurant } from '../context/RestaurantContext';
import { buildGeneralWhatsAppEnquiryUrl } from '../services/whatsapp';
import { formatCurrency, getActiveOffers } from '../utils/pricing';

export function Offers() {
  const { offers, items, categories, settings } = useRestaurant();
  const activeOffers = getActiveOffers(offers);
  const categoryNameMap = new Map(categories.map((c) => [c.categoryId, c.name]));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
          Active Promotional Campaigns
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
          THE GREAT BIRYANI PRICE DROP!
        </h1>
        <p className="text-base text-[#E6CC91] mt-3 max-w-2xl">
          Your favourite flavours. Special prices. An experience worth coming back for.
        </p>
      </div>

      {activeOffers.length === 0 ? (
        <div className="bg-[#121212] border border-white/10 p-12 text-center space-y-4">
          <h2 className="font-display text-2xl text-white">No Active Campaigns Right Now</h2>
          <p className="text-sm text-[#B8B8B8] max-w-md mx-auto">
            Expired promotional campaigns are automatically removed. Explore our regular digital menu or subscribe for upcoming price-drop invitations.
          </p>
          <Link
            to="/menu"
            className="inline-block px-6 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider"
          >
            Explore Digital Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-14">
          {activeOffers.map((offer) => {
            const pct =
              offer.discountType === 'PERCENTAGE'
                ? offer.discountValue
                : offer.originalPrice > 0
                  ? Math.round(
                      ((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100
                    )
                  : 0;
            const eligibleDishes = items.filter(
              (item) =>
                offer.applicableItems.length === 0 ||
                offer.applicableItems.includes(item.itemId)
            );
            const waUrl = buildGeneralWhatsAppEnquiryUrl(
              settings.whatsappNumber,
              `Hello! I want to order from your "${offer.title}" (${pct}% off) campaign.`
            );

            return (
              <section key={offer.offerId} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#121212] border border-[#C9A45C]/30 p-6 sm:p-8 items-stretch">
                  <div className="lg:col-span-5 overflow-hidden border border-white/10">
                    <SafeImage
                      src={offer.imageUrl || ASSETS.heroFallback}
                      alt={offer.title}
                      className="w-full h-full min-h-[240px] object-cover"
                    />
                  </div>
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
                    <div>
                      <p className="text-xs text-[#C9A45C] uppercase tracking-[0.2em] mb-2">
                        Save {pct}% · Valid {new Date(offer.startAt).toLocaleDateString()} –{' '}
                        {new Date(offer.expiresAt).toLocaleDateString()}
                      </p>
                      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-3">
                        {offer.title}
                      </h2>
                      <p className="text-sm text-[#B8B8B8] leading-relaxed mb-4">
                        {offer.description}
                      </p>
                      <p className="text-xs text-[#B8B8B8]">Terms: {offer.terms}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                      <div className="flex items-baseline gap-3 tabular-nums">
                        <span className="font-mono text-2xl font-semibold text-[#E6CC91]">
                          {formatCurrency(offer.discountedPrice, settings.currency)}
                        </span>
                        <span className="font-mono text-sm text-[#B8B8B8] line-through">
                          {formatCurrency(offer.originalPrice, settings.currency)}
                        </span>
                      </div>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91]"
                      >
                        Enquire on WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                {eligibleDishes.length > 0 && (
                  <div>
                    <h3 className="font-display text-xl text-white mb-5">
                      Eligible Dishes in This Campaign
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {eligibleDishes.map((dish) => (
                        <FoodCard
                          key={dish.itemId}
                          item={dish}
                          categoryName={categoryNameMap.get(dish.categoryId)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
