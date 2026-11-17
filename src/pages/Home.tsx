import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HeroVideo } from '../components/HeroVideo';
import { OfferBanner } from '../components/OfferBanner';
import { FoodCard } from '../components/FoodCard';
import { SafeImage } from '../components/SafeImage';
import { ASSETS } from '../data/demoSeed';
import { useRestaurant } from '../context/RestaurantContext';

export function Home() {
  const { items, categories, settings } = useRestaurant();
  const categoryNameMap = new Map(categories.map((c) => [c.categoryId, c.name]));
  const featuredItems = items.filter((i) => i.featured && i.available).slice(0, 3);

  return (
    <div>
      {/* 1. Full-Screen Cinematic Video-Ready Hero */}
      <HeroVideo />

      {/* 2. Biryani Price-Drop Campaign */}
      <OfferBanner />

      {/* 3. Featured Signature Creations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-2">
              Curated From Our Kitchen
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white">
              Signature Creations
            </h2>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E6CC91] hover:text-white"
          >
            <span>Explore Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredItems.map((item) => (
            <FoodCard
              key={item.itemId}
              item={item}
              categoryName={categoryNameMap.get(item.categoryId)}
            />
          ))}
        </div>
      </section>

      {/* 4. Dining Sanctuary & ZEXUNA Philosophy */}
      <section className="bg-[#121212] border-t border-white/10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 overflow-hidden border border-white/10">
            <SafeImage
              src={ASSETS.interior}
              alt="ZEXUNA Restaurant candlelit luxury dining room"
              className="w-full h-full min-h-[320px] object-cover"
            />
          </div>
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C]">
              Hospitality & Craft
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white leading-tight">
              An Evening Designed Around Every Detail
            </h2>
            <p className="text-sm sm:text-base text-[#B8B8B8] leading-relaxed">
              {settings.description} Reserve your table online with live capacity verification or order directly to your door via WhatsApp.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/reservations"
                className="px-6 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors"
              >
                Reserve a Table
              </Link>
              <Link
                to="/about"
                className="px-6 py-3 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider hover:border-[#C9A45C]"
              >
                Our Story
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
