import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useRestaurant } from '../context/RestaurantContext';

export function Categories() {
  const { categories, items } = useRestaurant();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
          Ten Culinary Chapters
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
          Menu Categories
        </h1>
        <p className="text-sm text-[#B8B8B8] mt-3 max-w-2xl">
          Select a culinary category to explore dishes, dietary details, and active seasonal offers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const count = items.filter((i) => i.categoryId === cat.categoryId).length;
          return (
            <Link
              key={cat.categoryId}
              to={`/menu?category=${encodeURIComponent(cat.categoryId)}`}
              className="group bg-[#121212] border border-white/10 hover:border-[#C9A45C]/60 transition-colors overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#1C1C1C]">
                <SafeImage
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-xs text-[#C9A45C] tabular-nums mb-1.5">
                    {count} {count === 1 ? 'Dish' : 'Dishes'}
                  </p>
                  <h2 className="font-display text-xl font-semibold text-white group-hover:text-[#E6CC91] transition-colors mb-2">
                    {cat.name}
                  </h2>
                  <p className="text-sm text-[#B8B8B8] leading-relaxed">{cat.description}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E6CC91]">
                  <span>View Dishes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
