import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { FoodCard } from './FoodCard';
import { MenuSkeletonGrid } from './Loading';
import { useRestaurant } from '../context/RestaurantContext';
import { getEffectiveItemPricing } from '../utils/pricing';

interface MenuGridProps {
  initialCategory?: string;
}

export function MenuGrid({ initialCategory = 'all' }: MenuGridProps) {
  const { categories, items, offers, catalogLoading } = useRestaurant();
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [showUnavailable, setShowUnavailable] = useState(true);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.categoryId, c.name));
    return map;
  }, [categories]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((item) => {
      if (!showUnavailable && !item.available) return false;
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
      if (dietFilter === 'veg' && !item.vegetarian) return false;
      if (dietFilter === 'nonveg' && item.vegetarian) return false;
      if (q) {
        const hay = `${item.name} ${item.description} ${categoryNameMap.get(item.categoryId) || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'price-asc') {
        return getEffectiveItemPricing(a, offers).finalPrice - getEffectiveItemPricing(b, offers).finalPrice;
      }
      if (sortBy === 'price-desc') {
        return getEffectiveItemPricing(b, offers).finalPrice - getEffectiveItemPricing(a, offers).finalPrice;
      }
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, offers, selectedCategory, dietFilter, sortBy, showUnavailable, searchQuery, categoryNameMap]);

  if (catalogLoading) {
    return <MenuSkeletonGrid count={6} />;
  }

  return (
    <div className="space-y-8">
      {/* Search & Controls Toolbar */}
      <div className="bg-[#121212] border border-white/10 p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label htmlFor="menu-search" className="block text-xs text-[#B8B8B8] mb-1.5">
              Search dishes
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#B8B8B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="menu-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search biryani, kebabs, paneer..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#090909] border border-white/15 text-sm text-white placeholder:text-[#B8B8B8]/50 focus:outline-none focus:border-[#C9A45C]"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="menu-diet" className="block text-xs text-[#B8B8B8] mb-1.5">
              Dietary preference
            </label>
            <select
              id="menu-diet"
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value as 'all' | 'veg' | 'nonveg')}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
            >
              <option value="all">All dishes</option>
              <option value="veg">Vegetarian only</option>
              <option value="nonveg">Non-vegetarian</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="menu-sort" className="block text-xs text-[#B8B8B8] mb-1.5">
              Sort by
            </label>
            <select
              id="menu-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center h-[42px]">
            <label className="inline-flex items-center gap-2 text-xs text-[#B8B8B8] cursor-pointer">
              <input
                type="checkbox"
                checked={showUnavailable}
                onChange={(e) => setShowUnavailable(e.target.checked)}
                className="accent-[#C9A45C]"
              />
              <span>Show unavailable</span>
            </label>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Menu Categories"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
              selectedCategory === 'all'
                ? 'bg-[#C9A45C] text-[#090909] border-[#C9A45C]'
                : 'bg-[#090909] text-[#B8B8B8] border-white/10 hover:border-[#C9A45C]/50 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.categoryId}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.categoryId}
              onClick={() => setSelectedCategory(cat.categoryId)}
              className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                selectedCategory === cat.categoryId
                  ? 'bg-[#C9A45C] text-[#090909] border-[#C9A45C]'
                  : 'bg-[#090909] text-[#B8B8B8] border-white/10 hover:border-[#C9A45C]/50 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
        <span className="tabular-nums">
          Showing {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
        </span>
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#121212] border border-white/10 p-12 text-center">
          <p className="font-display text-xl text-white mb-2">No matching dishes found</p>
          <p className="text-sm text-[#B8B8B8] mb-5">
            Try clearing your search query or selecting another category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
              setDietFilter('all');
              setShowUnavailable(true);
            }}
            className="px-5 py-2.5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <FoodCard
              key={item.itemId}
              item={item}
              categoryName={categoryNameMap.get(item.categoryId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
